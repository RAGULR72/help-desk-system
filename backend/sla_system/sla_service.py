from sqlalchemy.orm import Session
from datetime import datetime, timedelta, date as date_obj
from sla_system.sla_models import TicketSLATracking, SLAPolicy, SLARule
from ticket_system.models import Ticket
import models as root_models
from admin_system import models as admin_models
import email_service
import logging

def get_holidays(db: Session):
    """Fetch all holiday dates from the db"""
    return {h.date for h in db.query(admin_models.Holiday).all()}

def is_working_day(dt: datetime, holidays: set) -> bool:
    """Check if a given datetime falls on a working day (Not Sunday, Not Holiday)"""
    return dt.weekday() != 6 and dt.date() not in holidays

def calculate_due_datetime(db: Session, start_dt: datetime, duration_minutes: int) -> datetime:
    """
    Calculate due datetime by skipping Sundays and Holidays.
    Saturday is considered a working day.
    """
    holidays = get_holidays(db)
    current_dt = start_dt
    remaining_minutes = duration_minutes
    
    # Optimization: If duration is large, we can skip days instead of minutes
    # but for typical SLA (few hours/days), minute-by-minute is fine and accurate
    max_days = 365 
    days_checked = 0
    
    while remaining_minutes > 0 and days_checked < max_days:
        current_dt += timedelta(minutes=1)
        if is_working_day(current_dt, holidays):
            remaining_minutes -= 1
            
        if current_dt.hour == 0 and current_dt.minute == 0:
            days_checked += 1
            
    return current_dt

def calculate_working_minutes_elapsed(db: Session, start_dt: datetime, end_dt: datetime) -> int:
    """Calculates working minutes between two datetimes, skipping Sundays and Holidays"""
    if end_dt <= start_dt:
        return 0
        
    holidays = get_holidays(db)
    elapsed_minutes = 0
    current_dt = start_dt
    
    while current_dt < end_dt:
        current_dt += timedelta(minutes=1)
        if is_working_day(current_dt, holidays):
            elapsed_minutes += 1
            
    return elapsed_minutes

def initialize_ticket_sla(db: Session, ticket_id: int):
    """
    Initialize SLA tracking for a new ticket.
    Returns the tracking record or None.
    """
    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return None
    
    # Get active policy
    policy = db.query(SLAPolicy).filter(SLAPolicy.is_active == True).first()
    if not policy:
        return None
    
    p_name = (ticket.priority or 'low').capitalize()
    
    # Get applicable SLA rule
    rule = db.query(SLARule).filter(
        SLARule.policy_id == policy.id,
        SLARule.priority == p_name,
        SLARule.enabled == True
    ).first()
    
    if not rule:
        # Try lowercase as fallback
        rule = db.query(SLARule).filter(
            SLARule.policy_id == policy.id,
            SLARule.priority == p_name.lower(),
            SLARule.enabled == True
        ).first()

    if not rule:
        # Fallback to Low
        rule = db.query(SLARule).filter(
            SLAPolicy.id == policy.id,
            SLARule.priority.in_(['Low', 'low']),
            SLARule.enabled == True
        ).first()

    if not rule:
        return None
    
    # Calculate due times skipping Holidays and Sundays
    now = datetime.utcnow()
    
    response_due = calculate_due_datetime(db, now, rule.response_time_minutes)
    resolution_due = calculate_due_datetime(db, now, rule.resolution_time_hours * 60)
    
    # Check if tracking already exists
    tracking = db.query(TicketSLATracking).filter(TicketSLATracking.ticket_id == ticket.id).first()
    if not tracking:
        tracking = TicketSLATracking(
            ticket_id=ticket.id,
            sla_rule_id=rule.id,
            response_due=response_due,
            resolution_due=resolution_due,
            current_status='compliant',
            started_at=now # Ensure started_at is set for percentage calculation
        )
        db.add(tracking)
    else:
        tracking.sla_rule_id = rule.id
        tracking.response_due = response_due
        tracking.resolution_due = resolution_due
        tracking.current_status = 'compliant'
        tracking.started_at = now
        
    # Also update the ticket's sla_deadline
    ticket.sla_deadline = resolution_due
    
    db.commit()
    db.refresh(tracking)
    return tracking

def check_all_expirations(db: Session):
    """
    Check and update expired SLA statuses for all active tickets.
    Updates DB flags and sends notifications.
    """
    try:
        # Use UTC to match initialize_ticket_sla time usage
        now = datetime.utcnow() 
        
        expired_tickets = db.query(Ticket).filter(
            Ticket.status.notin_(['resolved', 'closed']),
            Ticket.sla_deadline < now
        ).all()
        
        if not expired_tickets:
            return

        # Fetch admins once
        admin_users = db.query(root_models.User).filter(root_models.User.role.in_(["admin", "manager"])).all()
        
        for ticket in expired_tickets:
            # Update Tracking
            tracking = db.query(TicketSLATracking).filter(TicketSLATracking.ticket_id == ticket.id).first()
            breach_newly_detected = False
            
            if tracking:
                if not tracking.resolution_breached:
                    tracking.resolution_breached = True
                    tracking.current_status = 'breached'
                    db.add(tracking)
                    breach_newly_detected = True
            
            # Update Ticket Notification Flag OR updated_at if breach newly detected
            # This ensures the ticket appears in "Activity" trends for today
            if ticket.sla_expired_notified == 0 or breach_newly_detected:
                # Explicitly touch updated_at to ensure it shows in trends
                # Use server time (UTC) converted to IST as per model convention or just UTC if model handles it
                # Ticket model uses get_ist (UTC+5.5). We'll trust the DB to run onupdate or set it manually.
                ticket.updated_at = datetime.utcnow() + timedelta(minutes=330) # IST
                
                if ticket.sla_expired_notified == 0:
                    ticket.sla_expired_notified = 1
                    
                    # Send Email Notifications
                    for admin in admin_users:
                        if admin.email_notifications_enabled:
                            try:
                                email_service.send_ticket_update_email(
                                    to_email=admin.email,
                                    username=admin.username,
                                    ticket_id=ticket.id,
                                    status="EXPIRED (SLA VIOLATION)",
                                    subject=f"Urgent: SLA EXPIRED for Ticket #{ticket.id} - {ticket.subject}"
                                )
                            except Exception as e:
                                logging.error(f"Failed to send expiration email: {e}")
                
                db.add(ticket)
                            
        db.commit()
    except Exception as e:
        logging.error(f"Error in check_all_expirations: {e}")
        db.rollback()
