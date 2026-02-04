import sys # Updated imports structure
import os
# Ensure parent directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List, Any
# Debug: Re-touching file to force reload
from models import User, get_user_time
from admin_system import models as admin_models
from admin_system.models import UserActivity
from attendance_system.models import Attendance, LeaveRequest
from sla_system import sla_models
from workflow_system import workflow_models
from sqlalchemy import or_, func
from datetime import datetime, timedelta
from . import models as ticket_models

from chat_system import models as chat_models
from communication_system.models import TicketComment
from . import schemas
from .external_dispatcher import dispatcher
import auth
import notification_service
import email_service
import sms_service
from database import get_db
import json
from sla_system import sla_service
from ws_manager import manager
import ai_service
import re
from audit_logger import AuditLogger
import html


router = APIRouter(prefix="/api/tickets", tags=["tickets"])

@router.post("/", response_model=schemas.TicketResponse)
async def create_ticket(
    ticket: schemas.TicketCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Create a new ticket"""
    # XSS Protection: Escaping inputs
    ticket_dict = ticket.dict()
    if ticket_dict.get("subject"):
        ticket_dict["subject"] = html.escape(ticket_dict["subject"], quote=True)
    if ticket_dict.get("description"):
        ticket_dict["description"] = html.escape(ticket_dict["description"], quote=True)

    # Initialize history
    history = [{
        "type": "created",
        "description": ticket_dict["description"],
        "user": current_user.username,
        "timestamp": ticket_models.get_ist().isoformat()
    }]
    
    # Generate Custom ID
    from ticket_system import id_generator
    custom_ticket_id = id_generator.generate_ticket_id(db)

    db_ticket = ticket_models.Ticket(
        **ticket_dict,
        user_id=current_user.id,
        custom_id=custom_ticket_id,
        ticket_history=json.dumps(history)
    )
    # Default fallback, will be overwritten by SLA service if active
    db_ticket.sla_deadline = ticket_models.get_ist() + timedelta(hours=48)
    
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)

    # Initialize SLA
    sla_service.initialize_ticket_sla(db, db_ticket.id)

    # Trigger Auto-Assignment (AI Dispatcher)
    from auto_assignment_system.utils import trigger_auto_assignment_wrapper
    background_tasks.add_task(trigger_auto_assignment_wrapper, db_ticket.id)

    # Trigger AI Analysis (Sentiment & Summary)
    background_tasks.add_task(perform_ai_ticket_analysis, db_ticket.id)

    # Initialize assignment pending history if not already assigned by dispatcher 
    # (Dispatcher runs in background, so we still add pending for now, AI will update it)
    history = json.loads(db_ticket.ticket_history)
    history.append({
        "type": "assignment_pending",
        "description": "Ticket created. Smart Dispatcher is analyzing best technician...",
        "timestamp": ticket_models.get_ist().isoformat()
    })
    db_ticket.ticket_history = json.dumps(history)
    db.commit()

    # Send Ticket Creation Email Notification
    if current_user.email:
        background_tasks.add_task(
            email_service.send_ticket_update_email,
            current_user.email,
            current_user.username,
            db_ticket.id,
            "Created",
            db_ticket.subject
        )

    # Broadcast update for real-time dashboard
    await manager.broadcast_all({"type": "dashboard_update", "source": "tickets"})


    # Log activity
    ist_now = get_user_time(current_user.timezone)
    activity = UserActivity(
        user_id=current_user.id,
        activity_type="ticket_created",
        description=f"Created new ticket #{db_ticket.id}",
        icon="plus",
        link=f"/tickets/{db_ticket.id}",
        timestamp=ist_now
    )
    db.add(activity)
    
    # Audit Log
    AuditLogger.log_ticket_event(db, current_user.id, db_ticket.id, "created", f"Created ticket #{db_ticket.id}: {db_ticket.subject}")
    
    db.commit()

    # Dashboard Notification
    notification_service.create_notification(
        db=db,
        user_id=current_user.id,
        title="Ticket Created",
        message=f"Your ticket #{db_ticket.id} - '{db_ticket.subject}' has been successfully created.",
        type="ticket",
        link=f"/tickets/{db_ticket.id}"
    )

    # Notifications after creation
    try:
        if current_user.email_notifications_enabled:
            email_service.send_ticket_update_email(
                to_email=current_user.email,
                username=current_user.username,
                ticket_id=db_ticket.id,
                status="Created",
                subject=db_ticket.subject
            )

        # Notify Admins and Managers
        admin_users = db.query(User).filter(User.role.in_(["admin", "manager"])).all()
        for admin in admin_users:
            # Don't send duplicate email if admin is the creator (already handled above)
            if admin.id != current_user.id and admin.email_notifications_enabled:
                 email_service.send_ticket_update_email(
                    to_email=admin.email,
                    username=admin.username,
                    ticket_id=db_ticket.id,
                    status="New Ticket Created",
                    subject=f"New Ticket: {db_ticket.subject} (by {current_user.username})"
                )
        
        # SMS for critical tickets
        if getattr(db_ticket, 'priority', 'normal') == "critical" and current_user.sms_notifications_enabled:
            sms_service.send_critical_alert(
                to_phone=current_user.phone,
                message_body=f"Critical Alert: Ticket #{db_ticket.id} created - {db_ticket.subject}"
            )
    except Exception as e:
        # Log error but don't fail ticket creation
        logging.error(f"Non-critical notification error: {str(e)}")

    # Dispatch external notification
    dispatcher.dispatch_event("ticket_created", {
        "id": db_ticket.id,
        "custom_id": db_ticket.custom_id,
        "subject": db_ticket.subject,
        "status": db_ticket.status,
        "priority": db_ticket.priority,
        "reporter_name": current_user.full_name or current_user.username
    })

    return db_ticket

@router.get("/", response_model=List[schemas.TicketResponse])
def get_tickets(
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Get tickets based on user role with pagination"""
    # Safety limit
    limit = min(limit, 100)
    
    check_sla_expirations(db)
    query = db.query(ticket_models.Ticket)
    
    if current_user.role in ["admin", "manager"]:
        tickets = query.offset(offset).limit(limit).all()
    elif current_user.role == "technician":
        # Technicians see tickets assigned to them OR all open tickets
        tickets = query.offset(offset).limit(limit).all()
    else:
        # Regular users only see their own tickets
        tickets = query.filter(ticket_models.Ticket.user_id == current_user.id).offset(offset).limit(limit).all()
    
    return tickets

@router.get("/stats")
def get_ticket_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Get ticket statistics for the current user"""
    if current_user.role in ["admin", "manager", "technician"]:
        # Staff sees system-wide stats
        open_count = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.status == "open").count()
        in_progress_count = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.status == "in_progress").count()
        resolved_count = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.status == "resolved").count()
        total_count = db.query(ticket_models.Ticket).count()
    else:
        # Regular users see their own stats
        open_count = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.user_id == current_user.id, ticket_models.Ticket.status == "open").count()
        in_progress_count = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.user_id == current_user.id, ticket_models.Ticket.status == "in_progress").count()
        resolved_count = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.user_id == current_user.id, ticket_models.Ticket.status == "resolved").count()
        total_count = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.user_id == current_user.id).count()

    return {
        "open": open_count,
        "in_progress": in_progress_count,
        "resolved": resolved_count,
        "total": total_count
    }

@router.get("/analytics/dashboard")
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Resilient dashboard analytics calculation"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Initial state
    result = {
        "summary": {
            "totalTickets": 0, "total_tickets": 0,
            "avgResolutionTime": 0, "avg_resolution_time": 0,
            "resolutionRate": 0, "resolution_rate": 0,
            "activeAgents": 0, "active_agents": 0,
            "onLeave": 0, "on_leave": 0,
            "totalTravelSpend": 0, "monthlyTravelSpend": 0, "pendingTravelClaims": 0,
            "totalMessages": 0, "totalFilesShared": 0, "activeChatRooms": 0
        },
        "status_distribution": [],
        "category_distribution": [],
        "top_agents": [],
        "trend_data": [],
        "resolution_distribution": [
            {"name": "<1h", "value": 0}, {"name": "1-4h", "value": 0}, 
            {"name": "4-8h", "value": 0}, {"name": "8-24h", "value": 0}, {"name": ">24h", "value": 0}
        ]
    }

    try:
        # 1. CORE TICKET STATS
        try:
            total_count = db.query(ticket_models.Ticket).count()
            tickets_query = db.query(ticket_models.Ticket).all()
            resolved_tickets = [t for t in tickets_query if t.status in ['resolved', 'closed']]
            resolved_count = len(resolved_tickets)
            
            avg_res_time = 0
            if resolved_count > 0:
                total_seconds = sum((t.updated_at - t.created_at).total_seconds() for t in resolved_tickets if t.updated_at and t.created_at)
                avg_res_time = round((total_seconds / resolved_count) / 3600, 1) if resolved_count > 0 else 0
            
            res_rate = round((resolved_count / total_count * 100), 0) if total_count > 0 else 0
            
            result["summary"].update({
                "totalTickets": total_count, "total_tickets": total_count,
                "avgResolutionTime": avg_res_time, "avg_resolution_time": avg_res_time,
                "resolutionRate": res_rate, "resolution_rate": res_rate
            })

            # 2. DISTRIBUTIONS
            status_map = {}
            cat_map = {}
            for t in tickets_query:
                st = (t.status or "Unknown").replace('_', ' ').title()
                status_map[st] = status_map.get(st, 0) + 1
                cat = t.category or "General"
                cat_map[cat] = cat_map.get(cat, 0) + 1
            
            result["status_distribution"] = [{"name": k, "value": v} for k, v in status_map.items()]
            result["category_distribution"] = [{"name": k, "value": v} for k, v in cat_map.items()]

            # 3. RESOLUTION DISTRIBUTION
            for t in resolved_tickets:
                if t.updated_at and t.created_at:
                    h = (t.updated_at - t.created_at).total_seconds() / 3600
                    if h < 1: result["resolution_distribution"][0]["value"] += 1
                    elif h < 4: result["resolution_distribution"][1]["value"] += 1
                    elif h < 8: result["resolution_distribution"][2]["value"] += 1
                    elif h < 24: result["resolution_distribution"][3]["value"] += 1
                    else: result["resolution_distribution"][4]["value"] += 1
        except Exception as e:
            logging.error(f"Ticket stats core error: {e}")
            db.rollback()

        # 4. ATTENDANCE (Independent)
        try:
            today = datetime.utcnow().date()
            on_leave = db.query(LeaveRequest).filter(LeaveRequest.status == 'Approved', func.date(LeaveRequest.start_date) <= today, func.date(LeaveRequest.end_date) >= today).count()
            active_techs = db.query(User).filter(User.role == 'technician', User.status == 'Active').count()
            result["summary"].update({
                "activeAgents": max(0, active_techs - on_leave), "active_agents": max(0, active_techs - on_leave),
                "onLeave": on_leave, "on_leave": on_leave
            })
        except Exception as e: 
            logging.error(f"Attendance error: {e}")
            db.rollback()

        # 5. TRAVEL (REMOVED)
        pass

        # 6. CHAT (Independent)
        try:
            result["summary"].update({
                "totalMessages": db.query(chat_models.ChatMessage).count(),
                "totalFilesShared": db.query(chat_models.ChatMessage).filter(chat_models.ChatMessage.message_type != 'text').count(),
                "activeChatRooms": db.query(chat_models.ChatRoom).count()
            })
        except Exception as e: 
            logging.error(f"Chat error: {e}")
            db.rollback()

        # 7. TREND DATA
        try:
            for i in range(6, -1, -1):
                d = (datetime.utcnow() - timedelta(days=i)).date()
                c = db.query(ticket_models.Ticket).filter(func.date(ticket_models.Ticket.created_at) == d).count()
                r = db.query(ticket_models.Ticket).filter(func.date(ticket_models.Ticket.updated_at) == d, ticket_models.Ticket.status.in_(['resolved', 'closed'])).count()
                result["trend_data"].append({"date": d.strftime("%a"), "created": c, "resolved": r})
        except Exception as e: 
            logging.error(f"Trend error: {e}")
            db.rollback()

        # 8. TOP AGENTS
        try:
            techs = db.query(User).filter(User.role == 'technician').all()
            performance = []
            for tech in techs:
                res_tks = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.assigned_to == tech.id, ticket_models.Ticket.status.in_(['resolved', 'closed'])).all()
                if res_tks:
                    count = len(res_tks)
                    total_t = sum((rt.updated_at - rt.created_at).total_seconds() for rt in res_tks if rt.updated_at and rt.created_at)
                    performance.append({"name": tech.full_name or tech.username, "tickets": count, "avgTime": round((total_t / count) / 3600, 1), "satisfaction": 95})
            performance.sort(key=lambda x: x["tickets"], reverse=True)
            result["top_agents"] = performance[:4]
        except Exception as e: 
            logging.error(f"Perf error: {e}")
            db.rollback()

    except Exception as e:
        logging.error(f"Final Fallback Analytics Error: {e}")

    return result

@router.get("/analytics/ai-insights")
async def get_ai_dashboard_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Generates AI-powered insights based on current dashboard statistics.
    """
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    try:
        total_count = db.query(ticket_models.Ticket).count()
        tickets = db.query(ticket_models.Ticket).limit(1000).all() # Limit for speed
        
        status_counts = {}
        cat_counts = {}
        for t in tickets:
            st = t.status or "Open"
            status_counts[st] = status_counts.get(st, 0) + 1
            cat = t.category or "General"
            cat_counts[cat] = cat_counts.get(cat, 0) + 1
            
        unassigned_count = len([t for t in tickets if not t.assigned_to_id and t.status not in ["resolved", "closed"]])
        
        stats_summary = {
            "total_tickets": total_count,
            "status_distribution": status_counts,
            "category_distribution": cat_counts,
            "unassigned_tickets": unassigned_count
        }
        
        insights = ai_service.generate_dashboard_insights(stats_summary)
        return insights or []
    except Exception as e:
        print(f"Error generating AI insights: {e}")
        return []

@router.get("/technicians", response_model=List[schemas.UserResponse])
def get_technicians(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Get all assignable staff (technicians, managers, admins)"""
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized to view staff list")
        
    staff = db.query(User).filter(
        User.role.in_(["admin", "manager", "technician"]),
        User.is_approved == True
    ).all()
    return staff

@router.put("/bulk-assign")
async def bulk_assign_tickets(
    assignment: schemas.BulkAssign,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Assign multiple tickets to a technician"""
    # Authorization check
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized to assign tickets")

    # Verify target technician exists
    tech = db.query(User).filter(User.id == assignment.technician_id).first()
    if not tech:
        raise HTTPException(status_code=404, detail="Technician not found")

    tickets = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id.in_(assignment.ticket_ids)).all()
    
    for ticket in tickets:
        ticket.assigned_to = assignment.technician_id
        ticket.updated_at = datetime.utcnow()
        
        # Log activity
        activity = UserActivity(
            user_id=current_user.id,
            activity_type="ticket_assigned",
            description=f"Assigned ticket #{ticket.id} to {tech.full_name or tech.username}",
            icon="user-plus",
            link=f"/tickets/{ticket.id}"
        )
        db.add(activity)

        # Notify the technician
        notification_service.create_notification(
            db=db,
            user_id=tech.id,
            title="Ticket Assigned",
            message=f"You have been assigned to ticket #{ticket.id}: {ticket.subject}",
            type="ticket",
            link=f"/tickets/{ticket.id}"
        )

        # Dispatch external notification
        dispatcher.dispatch_event("ticket_assigned", {
            "id": ticket.id,
            "custom_id": ticket.custom_id,
            "subject": ticket.subject,
            "status": ticket.status,
            "priority": ticket.priority,
            "assignee_name": tech.full_name or tech.username
        })

    db.commit()
    await manager.broadcast_all({"type": "dashboard_update", "source": "tickets"})
    return {"message": f"Successfully assigned {len(tickets)} tickets to {tech.full_name or tech.username}"}

@router.put("/bulk-update-status")
async def bulk_update_status(
    update: schemas.BulkStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Update status of multiple tickets"""
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized to update ticket status")

    tickets = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id.in_(update.ticket_ids)).all()
    
    for ticket in tickets:
        ticket.status = update.status
        ticket.updated_at = datetime.utcnow()
        
        # Log activity
        activity = UserActivity(
            user_id=current_user.id,
            activity_type="ticket_status_updated",
            description=f"Bulk updated ticket #{ticket.id} status to {update.status}",
            icon="refresh-cw",
            link=f"/tickets/{ticket.id}"
        )
        db.add(activity)

    db.commit()
    await manager.broadcast_all({"type": "dashboard_update", "source": "tickets"})
    return {"message": f"Successfully updated {len(tickets)} tickets status to {update.status}"}

@router.get("/{ticket_id}", response_model=schemas.TicketResponse)
def get_ticket(
    ticket_id: int,

    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Permission check
    if current_user.role == "user" and ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this ticket")
        
    return ticket

@router.post("/{ticket_id}/summarize")
def summarize_ticket_history_endpoint(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Generates a 3-point summary of the ticket and its comments using AI"""
    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Permission check: Staff only for technical summarization
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized for AI summarization")
        
    # Fetch comments
    db_comments = db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id).order_by(TicketComment.created_at).all()
    
    comments_data = []
    for c in db_comments:
        author_name = "System"
        if c.user_id:
            author = db.query(User).filter(User.id == c.user_id).first()
            author_name = author.username if author else "Unknown"
        comments_data.append({"author": author_name, "text": c.text})
        
    summary = ai_service.summarize_ticket_history_3_points(ticket.subject, ticket.description, comments_data)
    
    if not summary:
        raise HTTPException(status_code=500, detail="Failed to generate AI summary")
        
    return {"summary": summary}

@router.put("/{ticket_id}", response_model=schemas.TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_update: schemas.TicketUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Update ticket status or assignment"""
    db_ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Authorization: 
    # 1. Staff (admin, manager, technician) can update any ticket.
    # 2. Users can only update their own tickets AND only if they are still 'open'.
    is_staff = current_user.role in ["admin", "manager", "technician"]
    is_owner = db_ticket.user_id == current_user.id
    
    if not is_staff:
        if not is_owner:
            raise HTTPException(status_code=403, detail="Not authorized to update this ticket")
        if db_ticket.status != "open":
            raise HTTPException(status_code=403, detail="Users can only edit tickets that are still 'open'")

    update_data = ticket_update.dict(exclude_unset=True)

    # XSS Protection: Escaping inputs
    if update_data.get("subject"):
        update_data["subject"] = html.escape(update_data["subject"], quote=True)
    if update_data.get("description"):
        update_data["description"] = html.escape(update_data["description"], quote=True)
    if update_data.get("resolution_note"):
        update_data["resolution_note"] = html.escape(update_data["resolution_note"], quote=True)
    if update_data.get("hold_reason"):
        update_data["hold_reason"] = html.escape(update_data["hold_reason"], quote=True)

    # Track status changes or resolution in history
    if "status" in update_data and update_data["status"] != db_ticket.status:
        history = json.loads(db_ticket.ticket_history) if db_ticket.ticket_history else []
        event = {
            "type": "status_change",
            "old_status": db_ticket.status,
            "new_status": update_data["status"],
            "user": current_user.username,
            "timestamp": ticket_models.get_ist().isoformat()
        }
        if update_data["status"] == "resolved":
            event["type"] = "resolved"
            event["resolution_note"] = update_data.get("resolution_note") or db_ticket.resolution_note
        elif update_data["status"] == "hold":
            event["type"] = "hold"
            event["hold_reason"] = update_data.get("hold_reason") or db_ticket.hold_reason
            event["text"] = f"Ticket put on hold. Reason: {event['hold_reason']}"
        
        history.append(event)
        db_ticket.ticket_history = json.dumps(history)

    for key, value in update_data.items():
        setattr(db_ticket, key, value)
    
    db_ticket.updated_at = datetime.utcnow()
    
    # Log activity
    activity = UserActivity(
        user_id=current_user.id,
        activity_type="ticket_updated",
        description=f"Updated ticket #{db_ticket.id}",
        icon="edit",
        link=f"/tickets/{db_ticket.id}"
    )
    db.add(activity)
    
    # Audit Log
    AuditLogger.log_ticket_event(db, current_user.id, db_ticket.id, "updated", f"Updated ticket #{db_ticket.id} (Status: {db_ticket.status})")
    
    db.commit()
    await manager.broadcast_all({"type": "dashboard_update", "source": "tickets"})

    # Dashboard Notification for the owner
    notification_service.create_notification(
        db=db,
        user_id=db_ticket.user_id,
        title="Ticket Updated",
        message=f"Your ticket #{db_ticket.id} has been updated to status: {db_ticket.status}.",
        type="ticket",
        link=f"/tickets/{db_ticket.id}"
    )

    db.refresh(db_ticket)

    # Dispatch external notification on resolution
    if update_data.get("status") == "resolved":
        dispatcher.dispatch_event("ticket_resolved", {
            "id": db_ticket.id,
            "custom_id": db_ticket.custom_id,
            "subject": db_ticket.subject,
            "status": db_ticket.status,
            "priority": db_ticket.priority,
            "assignee_name": current_user.full_name or current_user.username
        })

    # Notifications after update
    if current_user.email_notifications_enabled:
        email_service.send_ticket_update_email(
            to_email=current_user.email,
            username=current_user.username,
            ticket_id=db_ticket.id,
            status=db_ticket.status,
            subject=db_ticket.subject
        )

    # SMS for critical updates
    if db_ticket.priority == "critical" and current_user.sms_notifications_enabled:
         sms_service.send_critical_alert(
            to_phone=current_user.phone,
            message_body=f"Critical Alert: Ticket #{db_ticket.id} updated - {db_ticket.subject} (Status: {db_ticket.status})"
        )

    return db_ticket

@router.post("/{ticket_id}/extend")
def extend_ticket_sla(
    ticket_id: int,
    extension: schemas.TicketExtend,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Extend the SLA deadline for a ticket (Admins/Managers only)"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Only admins or managers can extend SLA deadlines")
        
    db_ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    if not db_ticket.sla_deadline:
        db_ticket.sla_deadline = db_ticket.created_at + timedelta(hours=48)
        
    db_ticket.sla_deadline += timedelta(hours=extension.extension_hours)
    # Reset notification so they get warned again if it expires again
    db_ticket.sla_expired_notified = 0
    
    db.commit()
    
    # Log extension
    activity = UserActivity(
        user_id=current_user.id,
        activity_type="ticket_sla_extended",
        description=f"Extended SLA for ticket #{db_ticket.id} by {extension.extension_hours} hours",
        icon="clock",
        link=f"/tickets/{db_ticket.id}",
        timestamp=ticket_models.get_ist()
    )
    db.add(activity)
    db.commit()
    
    return {"message": f"Deadline extended by {extension.extension_hours} hours", "new_deadline": db_ticket.sla_deadline}

def check_sla_expirations(db: Session):
    """Helper to check and notify about expired tickets"""
    try:
        now = ticket_models.get_ist()
    
        # Query all active tickets that haven't been notified for expiration yet
        active_tickets = db.query(ticket_models.Ticket).filter(
            ticket_models.Ticket.status.notin_(["resolved", "closed"]),
            ticket_models.Ticket.sla_expired_notified == 0
        ).all()
        
        expired_tickets = []
        for t in active_tickets:
            deadline = t.sla_deadline or (t.created_at + timedelta(hours=48))
            if deadline < now:
                expired_tickets.append(t)
        
        if not expired_tickets:
            return
            
        admin_users = db.query(User).filter(User.role.in_(["admin", "manager"])).all()
        
        for ticket in expired_tickets:
            # Mark as notified immediately to avoid racing
            ticket.sla_expired_notified = 1
            db.commit()
            
            for recipient in admin_users:
                if recipient.email_notifications_enabled:
                    email_service.send_ticket_update_email(
                        to_email=recipient.email,
                        username=recipient.username,
                        ticket_id=ticket.id,
                        status="EXPIRED (SLA Violation)",
                        subject=f"Urgent: SLA EXPIRED for Ticket #{ticket.id} - {ticket.subject}"
                    )
    except Exception as e:
        logging.error(f"Error in SLA expiration check: {str(e)}")

@router.post("/{ticket_id}/reopen")
async def reopen_ticket(
    ticket_id: int,
    reopen_data: schemas.TicketReopen,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Reopen a resolved or closed ticket"""
    db_ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Permission check: Only owner or staff can reopen
    is_staff = current_user.role in ["admin", "manager", "technician"]
    is_owner = db_ticket.user_id == current_user.id
    if not is_staff and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to reopen this ticket")

    db_ticket.status = "reopened"
    db_ticket.updated_at = ticket_models.get_ist()
    # Reset SLA notification if reopened
    db_ticket.sla_expired_notified = 0
    
    # Update Reopen Count and History
    db_ticket.reopen_count = (db_ticket.reopen_count or 0) + 1
    
    history = json.loads(db_ticket.ticket_history) if db_ticket.ticket_history else []
    history.append({
        "type": "reopened",
        "reason": reopen_data.reason,
        "new_description": reopen_data.description,
        "user": current_user.username,
        "timestamp": ticket_models.get_ist().isoformat(),
        "previous_resolution": db_ticket.resolution_note
    })
    db_ticket.ticket_history = json.dumps(history)

    # Update description with the new detailed description if provided
    if reopen_data.description:
        db_ticket.description = reopen_data.description

    # Clear resolution fields after saving to history
    db_ticket.resolution_note = None
    db_ticket.resolution_attachments = None
    
    # Log activity with reason
    activity = UserActivity(
        user_id=current_user.id,
        activity_type="ticket_reopened",
        description=f"Reopened ticket #{db_ticket.id}. Reason: {reopen_data.reason}",
        icon="rotate-ccw",
        link=f"/tickets/{db_ticket.id}",
        timestamp=ticket_models.get_ist()
    )
    db.add(activity)
    db.commit()
    await manager.broadcast_all({"type": "dashboard_update", "source": "tickets"})
    
    # Notifications
    recipients = []
    
    # 1. Admin & Managers
    staff_users = db.query(User).filter(User.role.in_(["admin", "manager"])).all()
    recipients.extend(staff_users)
    
    # 2. The Ticket Owner (if not the one reopening)
    owner = db.query(User).filter(User.id == db_ticket.user_id).first()
    if owner:
        if not any(r.id == owner.id for r in recipients):
            recipients.append(owner)
        
    # 3. The Assigned Technician
    if db_ticket.assigned_to:
        tech = db.query(User).filter(User.id == db_ticket.assigned_to).first()
        if tech:
            if not any(r.id == tech.id for r in recipients):
                recipients.append(tech)

    for r in recipients:
        # Dashboard Notification
        notification_service.create_notification(
            db=db,
            user_id=r.id,
            title="Ticket Reopened",
            message=f"Ticket #{db_ticket.id} has been reopened by {current_user.username}. Reason: {reopen_data.reason}",
            type="ticket",
            link=f"/tickets/{db_ticket.id}"
        )
        
        # Email Notification
        if r.email_notifications_enabled:
            email_service.send_ticket_update_email(
                to_email=r.email,
                username=r.username,
                ticket_id=db_ticket.id,
                status="REOPENED",
                subject=f"Ticket #{db_ticket.id} Reopened - {db_ticket.subject}"
            )
            
    return {"message": "Ticket reopened successfully", "status": "reopened"}


@router.put("/{ticket_id}/repair/init", response_model=schemas.TicketResponse)
async def init_repair(
    ticket_id: int,
    details: schemas.TicketRepairDetailsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Authorize (Tech, Admin, Manager)
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Create Repair Details
    repair_entry = ticket_models.TicketRepairDetails(
        ticket_id=ticket.id,
        issue_title=details.issue_title,
        reason_for_repair=details.reason_for_repair,
        pickup_location=details.pickup_location,
        pickup_time=ticket_models.get_ist(),
    )
    db.add(repair_entry)
    
    # Update Ticket Status
    ticket.status = "repairing"
    
    # History
    history = json.loads(ticket.ticket_history or '[]')
    history.append({
        "type": "status_change",
        "new_status": "repairing",
        "text": f"Repair Initiated: {details.issue_title}",
        "user": current_user.full_name or current_user.username,
        "timestamp": ticket_models.get_ist().isoformat()
    })
    ticket.ticket_history = json.dumps(history)

    db.commit()
    db.refresh(ticket)
    return ticket

@router.put("/{ticket_id}/repair/update", response_model=schemas.TicketResponse)
async def update_repair(
    ticket_id: int,
    update_data: schemas.TicketRepairDetailsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    # Staff check
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized to update repair workflow")
        
    if not ticket.repair_details:
        raise HTTPException(status_code=400, detail="Repair workflow not initiated")

    # Update logic (generic)
    rd = ticket.repair_details
    if update_data.tech_left_time: rd.tech_left_time = update_data.tech_left_time
    if update_data.tech_reached_time: rd.tech_reached_time = update_data.tech_reached_time
    if update_data.visiting_tech_id: rd.visiting_tech_id = update_data.visiting_tech_id
    if update_data.visit_type: rd.visit_type = update_data.visit_type
    
    db.commit()
    db.refresh(ticket)
    await manager.broadcast_all({"type": "dashboard_update", "source": "tickets"})
    return ticket

@router.put("/{ticket_id}/repair/report", response_model=schemas.TicketResponse)
async def submit_site_report(
    ticket_id: int,
    report: schemas.TicketRepairDetailsCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket or not ticket.repair_details:
        raise HTTPException(status_code=404, detail="Ticket or repair details not found")

    # Staff check
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized to submit site report")

    rd = ticket.repair_details
    rd.machine_photo = report.machine_photo
    rd.machine_condition = html.escape(report.machine_condition, quote=True) if report.machine_condition else None
    rd.issue_description = html.escape(report.issue_description, quote=True) if report.issue_description else None
    rd.solution_provided = html.escape(report.solution_provided, quote=True) if report.solution_provided else None
    rd.output_image = report.output_image
    rd.resolution_timestamp = ticket_models.get_ist() # Auto timestamp on resolve
    
    # Check mandatory output img
    if not rd.output_image:
        raise HTTPException(status_code=400, detail="Output image is mandatory")

    # Notify original assignee (if different from current user)
    original_assignee_id = ticket.assigned_to
    if original_assignee_id and original_assignee_id != current_user.id:
        notification_service.create_notification(
            db=db,
            user_id=original_assignee_id,
            title="Repair Completed",
            message=f"Ticket #{ticket.id} repair resolved by {current_user.full_name or current_user.username}. Ready for delivery.",
            type="system",
            link=f"/tickets/{ticket.id}"
        )

    db.commit()
    db.refresh(ticket)
    return ticket

@router.put("/{ticket_id}/repair/close", response_model=schemas.TicketResponse)
async def close_repair_ticket(
    ticket_id: int,
    close_data: schemas.TicketRepairDetailsCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket or not ticket.repair_details:
        raise HTTPException(status_code=404, detail="Ticket or repair details not found")
        
    # Staff check
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized to close repair workflow")
        
    ticket.status = "resolved"
    
    
    # History
    history = json.loads(ticket.ticket_history or '[]')
    history.append({
        "type": "status_change",
        "new_status": "resolved",
        "text": "Repair Workflow Completed & Ticket Resolved",
        "user": current_user.full_name or current_user.username,
        "timestamp": ticket_models.get_ist().isoformat()
    })
    ticket.ticket_history = json.dumps(history)

    db.commit()
    db.refresh(ticket)
    return ticket

@router.get("/{ticket_id}/ai-suggestion", response_model=schemas.AISuggestionResponse)
async def get_ai_suggestion(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Generate an AI-powered resolution suggestion for a ticket (Staff Only)"""
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="AI suggestions are restricted to technical staff.")

    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Extract keywords from subject (SMART matching)
    stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'not', 'can', 'cannot', 'could', 'issue', 'problem', 'help', 'with', 'my', 'your', 'and', 'but', 'or'}
    keywords = [kw.lower() for kw in re.findall(r'\b\w{4,}\b', ticket.subject) if kw.lower() not in stop_words]

    # Search similar resolved tickets
    query = db.query(ticket_models.Ticket).filter(
        ticket_models.Ticket.status.in_(["resolved", "closed"]),
        ticket_models.Ticket.id != ticket_id,
        ticket_models.Ticket.resolution_note != None
    )

    # Prefer same category matches first
    if ticket.category:
        query = query.order_by(
            (ticket_models.Ticket.category == ticket.category).desc(),
            ticket_models.Ticket.updated_at.desc()
        )

    if keywords:
        ticket_filters = [ticket_models.Ticket.subject.ilike(f"%{kw}%") for kw in keywords]
        query = query.filter(or_(*ticket_filters))
    
    similar_resolutions = query.limit(5).all()
    past_resolution_notes = [f"Ticket #{t.id} ({t.category}): {t.resolution_note}" for t in similar_resolutions if t.resolution_note]

    # Generate AI Suggestion
    import ai_service
    import json
    
    ai_response_json = ai_service.generate_resolution_suggestion(
        ticket.subject, 
        ticket.description or "No description provided", 
        [], # Empty KB since it's removed
        past_resolution_notes
    )

    if ai_response_json:
        try:
            # Clean json string if needed (sometimes LLMs add markdown)
            clean_json = ai_response_json.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean_json)
            
            return {
                "summary": data.get("summary", "AI Analysis Completed"),
                "steps": data.get("steps", []),
                "kb_articles": [],
                "confidence": float(data.get("confidence", 0.5))
            }
        except Exception as e:
            print(f"AI Parsing Error: {e}")
            pass

    # Fallback logic if AI fails
    steps = []
    if similar_resolutions:
        for st in similar_resolutions:
            if st.resolution_note:
                steps.append(f"Similar Fix (#{st.id}): {st.resolution_note[:150]}...")
    else:
        steps = [
            "1. Verify issue with the user via phone/chat.",
            "2. Check for recent system updates in this category.",
            "3. Attempt standard Level 1 troubleshooting.",
            "4. Search global logs for recent error patterns.",
            "5. Escalate to specialized team if diagnostic fails."
        ]

    summary = "No AI response. Suggestions based on similar historical tickets:" if similar_resolutions else "No direct matches. Standard protocol recommended:"

    return {
        "summary": summary,
        "steps": steps,
        "kb_articles": [],
        "confidence": 0.6 if similar_resolutions else 0.3
    }

async def perform_ai_ticket_analysis(ticket_id: int):
    """
    Background worker to analyze ticket sentiment, urgency, and generate a summary.
    """
    from database import SessionLocal
    db = SessionLocal()
    try:
        ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
        if not ticket:
            return

        import ai_service
        
        # 1. Perform Sentiment & Urgency Analysis
        analysis = ai_service.analyze_ticket_sentiment(ticket.subject, ticket.description)
        if analysis:
            ticket.sentiment = analysis.get("sentiment", "Neutral")
            # If "High Alert", we can potentially update priority if it's currently low
            if analysis.get("level") == "High Alert" and ticket.priority in ["low", "normal"]:
                # Optionally auto-escalate priority, but often better to just show the badge
                pass
            
            # Store full analysis in sentiment_data
            ticket.sentiment_data = json.dumps(analysis)
        
        # 2. Generate Summary
        summary = ai_service.summarize_ticket(ticket.subject, ticket.description)
        if summary:
            ticket.ai_summary = summary
        
        # 3. Smart Duplicate Detection (Check tickets from last 24 hours)
        from datetime import datetime, timedelta
        yesterday = datetime.now() - timedelta(days=1)
        recent_tickets = db.query(ticket_models.Ticket).filter(
            ticket_models.Ticket.id != ticket.id,
            ticket_models.Ticket.created_at >= yesterday,
            ticket_models.Ticket.status.in_(['open', 'in_progress', 'hold'])
        ).limit(10).all()

        if recent_tickets:
            recent_data = [{"id": r.id, "subject": r.subject, "description": r.description} for r in recent_tickets]
            dup_analysis = ai_service.detect_duplicate_tickets(
                {"subject": ticket.subject, "description": ticket.description},
                recent_data
            )
            
            if dup_analysis and dup_analysis.get("is_duplicate"):
                ticket.linked_to_id = dup_analysis.get("main_ticket_id")
                # Add internal history log
                history = json.loads(ticket.ticket_history or '[]')
                history.append({
                    "type": "duplicate_alert",
                    "description": f"AI detected this as a duplicate of Ticket #{ticket.linked_to_id}. Reason: {dup_analysis.get('reason')}",
                    "timestamp": ticket_models.get_ist().isoformat(),
                    "is_internal": True
                })
                ticket.ticket_history = json.dumps(history)

        # 4. AI Tech Co-Pilot (Technical steps for technician)
        # Smarter Keyword Matching for Co-Pilot
        stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'not', 'can', 'cannot', 'could', 'issue', 'problem', 'help', 'with', 'my', 'your', 'and', 'but', 'or'}
        keywords = [kw.lower() for kw in re.findall(r'\b\w{4,}\b', ticket.subject) if kw.lower() not in stop_words]
        
        query = db.query(ticket_models.Ticket).filter(
            ticket_models.Ticket.status.in_(['resolved', 'closed']),
            ticket_models.Ticket.id != ticket.id,
            ticket_models.Ticket.resolution_note != None
        )
        
        if keywords:
            query = query.filter(or_(*[ticket_models.Ticket.subject.ilike(f"%{kw}%") for kw in keywords]))
            
        similar_tickets = query.limit(5).all()
        past_resolutions = [f"Fix for #{st.id}: {st.resolution_note}" for st in similar_tickets]

        tech_guide = ai_service.generate_tech_co_pilot_guide(
            ticket.subject, 
            ticket.description, 
            [], 
            past_resolutions
        )
        if tech_guide:
            ticket.ai_tech_guide = tech_guide
            # Add internal history log
            history = json.loads(ticket.ticket_history or '[]')
            history.append({
                "type": "ai_tech_guide",
                "description": "AI Co-Pilot has generated technical resolution steps for internal use.",
                "timestamp": ticket_models.get_ist().isoformat(),
                "is_internal": True
            })
            ticket.ticket_history = json.dumps(history)

        db.commit()
    except Exception as e:
        print(f"AI Ticket Analysis Background Task Error: {e}")
    finally:
        db.close()



@router.get("/{ticket_id}/similar", response_model=schemas.SimilarTicketsResponse)
async def get_similar_tickets(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Find past resolved tickets that are similar to the current one.
    Helps technicians see who solved similar problems and how.
    """
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Access restricted to staff.")

    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Search similar resolved tickets
    keywords = [kw for kw in ticket.subject.split() if len(kw) > 3]
    
    query = db.query(ticket_models.Ticket).filter(
        ticket_models.Ticket.status.in_(["resolved", "closed"]),
        ticket_models.Ticket.id != ticket_id,
        ticket_models.Ticket.resolution_note != None
    )

    if keywords:
        filters = [ticket_models.Ticket.subject.ilike(f"%{kw}%") for kw in keywords]
        query = query.filter(or_(*filters))
    
    similar = query.order_by(ticket_models.Ticket.updated_at.desc()).limit(5).all()

    results = []
    for s in similar:
        results.append({
            "id": s.id,
            "custom_id": s.custom_id,
            "subject": s.subject,
            "resolution_note": s.resolution_note,
            "assignee_name": s.assignee.full_name or s.assignee.username if s.assignee else "System",
            "resolved_at": s.updated_at
        })

    return {"tickets": results}

@router.get("/{ticket_id}/ai-suggestion")
async def get_ai_ticket_suggestion(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Staff-only endpoint to get real-time technical diagnostics for a ticket.
    """
    if current_user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Access denied.")
    
    ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    suggestion = ai_service.generate_diagnostic_suggestion(
        db=db, 
        subject=ticket.subject, 
        description=ticket.description, 
        ticket_id=ticket_id
    )
    return suggestion
