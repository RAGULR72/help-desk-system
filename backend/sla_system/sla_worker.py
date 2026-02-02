"""
SLA Background Worker (Production Version)
This script monitors ticket SLA statuses and triggers escalations.
Run this as a separate process: `python backend/sla_worker.py`
"""

import logging
import time
import sys
import os
from datetime import datetime, timedelta

# Add parent directory (backend) to sys.path
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.append(parent_dir)

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from sla_system.sla_models import TicketSLATracking, SLARule, SLAEscalationRule, SLAEscalation, SLAPolicy
from workflow_system.workflow_models import AutomationRule
from ticket_system.models import Ticket
from models import User, Notification
from admin_system.models import UserActivity
from notification_service import create_notification
from email_service import send_sla_breach_email
import json
from workflow_system import workflow_models as wm
from sla_system import sla_service

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("sla_worker.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("SLAWorker")

def calculate_percent_consumed(db: Session, tracking: TicketSLATracking):
    """Calculates percentage of SLA time consumed based on working minutes"""
    # Get the rule to find total allocated minutes
    rule = db.query(SLARule).filter(SLARule.id == tracking.sla_rule_id).first()
    if not rule:
        return 0.0
        
    total_allowed_minutes = rule.resolution_time_hours * 60
    if total_allowed_minutes <= 0:
        return 100.0
        
    # Calculate how many working minutes have passed since started_at
    now = datetime.utcnow()
    # started_at can be None for old tickets, fallback to ticket created_at if possible
    started = tracking.started_at or tracking.ticket.created_at
    
    elapsed_working_minutes = sla_service.calculate_working_minutes_elapsed(db, started, now)
    
    percent = (elapsed_working_minutes / total_allowed_minutes) * 100
    return min(100.0, max(0.0, percent))

def process_sla_escalations():
    """Main job to check all active tickets for SLA compliance"""
    db = SessionLocal()
    try:
        logger.info("Starting SLA check cycle...")
        
        # 1. Fetch all tickets that are not resolved or closed and have SLA tracking
        active_trackings = db.query(TicketSLATracking).join(Ticket).filter(
            Ticket.status.notin_(['resolved', 'closed']),
            TicketSLATracking.resolution_completed_at == None
        ).all()
        
        if not active_trackings:
            logger.info("No active tickets to check.")
            return

        for tracking in active_trackings:
            ticket = tracking.ticket
            percent = calculate_percent_consumed(db, tracking)
            
            # Determine status based on percentage
            new_status = 'compliant'
            if percent >= 100:
                new_status = 'breached'
            elif percent >= 75:
                new_status = 'at_risk'
            
            # Update status if changed
            if tracking.current_status != new_status:
                logger.warning(f"Ticket {ticket.id} status changed: {tracking.current_status} -> {new_status}")
                tracking.current_status = new_status
                db.commit()

            # 2. Check for Escalation Triggers
            # We look for levels 1 (75%), 2 (90%), and 3 (100%)
            check_and_trigger_escalation(db, tracking, percent)

        logger.info(f"SLA check cycle completed. Processed {len(active_trackings)} tickets.")

    except Exception as e:
        logger.error(f"Error in SLA worker cycle: {str(e)}")
        db.rollback()
    finally:
        db.close()

def run_automation_rules():
    """Checks for general automation rules (e.g., Auto-close resolved tickets)"""
    db = SessionLocal()
    try:
        logger.info("Checking automation rules...")
        
        # 1. Fetch active rules
        rules = db.query(AutomationRule).filter(AutomationRule.is_active == True).all()
        
        for rule in rules:
            if rule.action == "close_ticket" and rule.trigger == "days_resolved":
                # Logic: Close tickets resolved > 3 days ago
                threshold = datetime.utcnow() - timedelta(days=3)
                tickets_to_close = db.query(Ticket).filter(
                    Ticket.status == "resolved",
                    Ticket.updated_at <= threshold
                ).all()
                
                for t in tickets_to_close:
                    logger.info(f"Auto-closing Ticket #{t.id} due to rule: {rule.name}")
                    t.status = "resolved"
                    
                    # Update History
                    history = json.loads(t.ticket_history or '[]')
                    history.append({
                        "type": "status_change",
                        "new_status": "resolved",
                        "text": f"Auto-resolved by system rule: {rule.name}",
                        "user": "System",
                        "timestamp": datetime.utcnow().isoformat()
                    })
                    t.ticket_history = json.dumps(history)
                    
                    # Create Activity
                    activity = UserActivity(
                        user_id=1, # System/Admin
                        activity_type="ticket_updated",
                        description=f"Auto-closed Ticket #{t.id}",
                        icon="check-circle"
                    )
                    db.add(activity)
                
                if tickets_to_close:
                    db.commit()
                    logger.info(f"Successfully auto-closed {len(tickets_to_close)} tickets.")

    except Exception as e:
        logger.error(f"Error in automation rules: {str(e)}")
        db.rollback()
    finally:
        db.close()

def check_and_trigger_escalation(db: Session, tracking: TicketSLATracking, percent: float):
    """Checks if any escalation level should be triggered for a ticket"""
    # Fetch active escalation rules for this policy
    policy = db.query(SLAPolicy).filter(SLAPolicy.is_active == True).first()
    if not policy:
        return

    esc_rules = db.query(SLAEscalationRule).filter(
        SLAEscalationRule.policy_id == policy.id
    ).order_by(SLAEscalationRule.level.asc()).all()

    for rule in esc_rules:
        # Check if this level has already been triggered for this ticket
        existing = db.query(SLAEscalation).filter(
            SLAEscalation.tracking_id == tracking.id,
            SLAEscalation.level == rule.level
        ).first()

        if not existing and percent >= rule.trigger_percent:
            trigger_escalation_event(db, tracking, rule)

def trigger_escalation_event(db: Session, tracking: TicketSLATracking, rule: SLAEscalationRule):
    """Executes the results of an escalation rule (Notifications, DB updates, Re-assignment)"""
    ticket = tracking.ticket
    logger.error(f"🔥 ESCALATION TRIGGERED: Ticket {ticket.id} reached Level {rule.level} ({rule.trigger_percent}%)")

    # 1. Create Audit Record
    escalation = SLAEscalation(
        tracking_id=tracking.id,
        ticket_id=ticket.id,
        level=rule.level,
        triggered_at=datetime.utcnow(),
        reason=f"Reached {rule.trigger_percent}% of SLA limit",
        action_taken=f"Notifications sent. Priority checked.",
        notified_users=[] 
    )
    db.add(escalation)
    db.commit()

    # 2. Automated Re-assignment (Manager Escalation)
    # If Level 2 (Critical) or Level 3 (Breach), reassign to a Manager
    escalated_to_manager = False
    if rule.level >= 2 or rule.auto_reassign:
        manager = db.query(User).filter(User.role == 'manager', User.status == 'Active').first()
        if manager and ticket.assigned_to != manager.id:
            old_assignee_id = ticket.assigned_to
            ticket.assigned_to = manager.id
            escalated_to_manager = True
            
            # Update History
            history = json.loads(ticket.ticket_history or '[]')
            history.append({
                "type": "sla_escalation",
                "level": rule.level,
                "description": f"🔥 SLA HIGH ALERT: Ticket automatically escalated to Manager ({manager.full_name or manager.username}) due to impending breach.",
                "timestamp": datetime.utcnow().isoformat()
            })
            ticket.ticket_history = json.dumps(history)
            
            # Update workloads if service is available
            try:
                from auto_assignment_system.service import AutoAssignmentService
                service = AutoAssignmentService(db)
                if old_assignee_id:
                    service._update_technician_workload(old_assignee_id, increment=-1)
                service._update_technician_workload(manager.id, increment=1)
            except Exception:
                pass

    # 3. Send Notifications
    notified_ids = []
    
    # Notify Assignee (Warning)
    if rule.notify_assignee and ticket.assigned_to and not escalated_to_manager:
        create_notification(
            db, 
            ticket.assigned_to, 
            f"SLA Warning: Level {rule.level}", 
            f"Ticket {ticket.id} is at {rule.trigger_percent}% SLA. Action needed!", 
            "ticket", 
            f"/dashboard/tickets/{ticket.id}"
        )
        notified_ids.append(ticket.assigned_to)

    # Notify Managers (High Alert)
    managers = db.query(User).filter(User.role == 'manager').all()
    for m in managers:
        alert_prefix = "🚨 HIGH ALERT Escalation" if escalated_to_manager else "SLA Risk"
        create_notification(
            db, 
            m.id, 
            f"{alert_prefix}: Ticket {ticket.id}", 
            f"Ticket {ticket.id} has reached the RED ZONE ({rule.trigger_percent}%). Immediate resolution required.", 
            "system", 
            f"/dashboard/tickets/{ticket.id}"
        )
        # Email Notification
        try:
            send_sla_breach_email(
                m.email,
                m.full_name or m.username,
                {
                    "id": ticket.id,
                    "subject": ticket.subject,
                    "priority": ticket.priority,
                    "category": ticket.category
                },
                rule.level,
                rule.trigger_percent
            )
        except Exception as e:
            logger.error(f"Failed to send escalation email: {e}")
            
        notified_ids.append(m.id)

    # Update escalation record
    escalation.notified_users = notified_ids
    escalation.action_taken = f"Auto-escalated to Manager: {escalated_to_manager}"
    db.commit()

    # Broadcast update for real-time dashboards
    try:
        from ws_manager import manager as ws_manager
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(ws_manager.broadcast_all({"type": "dashboard_update", "source": "sla_escalation"}))
    except Exception:
        pass

    # 3. Optional: Trigger External Webhook (n8n)
    # This is where neenga n8n call panni WhatsApp/Email logic trigger pannalam
    # trigger_n8n_webhook(ticket, rule)

def start_worker():
    """Starts the background scheduler"""
    scheduler = BackgroundScheduler()
    # Runs every 1 minute in production for SLA
    scheduler.add_job(process_sla_escalations, 'interval', minutes=1)
    
    # Runs every 1 hour for general automation (like auto-close)
    scheduler.add_job(run_automation_rules, 'interval', hours=1)
    
    logger.info("SLA & Automation Worker process started. Initializing scheduler...")
    scheduler.start()

    try:
        while True:
            time.sleep(1)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        logger.info("SLA Worker stopped.")

if __name__ == "__main__":
    start_worker()
