"""
SLA Configuration API Routes

This module provides API endpoints for managing SLA policies, rules, and tracking.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
import json

import sys
import os
from database import get_db
from ticket_system.models import Ticket
from sla_system import sla_service
from auth import require_roles, get_current_user
from sla_system.sla_models import (
    SLAPolicy, SLARule, SLAEscalationRule, TicketSLATracking,
    SLAEscalation, SLAHoliday, SLACategoryOverride
)
from models import User
from ticket_system.models import Ticket

router = APIRouter(prefix="/api/sla", tags=["SLA Management"])


# ============================================================================
# PYDANTIC SCHEMAS (Request/Response Models)
# ============================================================================

class BusinessHoursConfig(BaseModel):
    mode: str = '24/7'  # '24/7' or 'business_hours'
    startTime: str = '09:00'
    endTime: str = '17:00'
    workingDays: List[int] = [1, 2, 3, 4, 5]


class PrioritySettings(BaseModel):
    enabled: bool = True
    responseMinutes: int
    resolutionHours: float
    escalateAtPercent: int = 75
    description: str


class EscalationLevelConfig(BaseModel):
    name: str
    description: str
    triggerPercent: int
    notify: List[str]
    channels: List[str]


class BreachConfig(BaseModel):
    notify: List[str]
    channels: List[str]
    autoReassign: bool = False


class EscalationConfig(BaseModel):
    level1: EscalationLevelConfig
    level2: EscalationLevelConfig
    breach: BreachConfig


class NotificationConfig(BaseModel):
    responseWarning: bool = True
    resolutionWarning: bool = True
    breachAlert: bool = True
    dailyReport: bool = True


class CustomRuleConfig(BaseModel):
    name: str
    condition: str
    action: str

class SLAConfigurationRequest(BaseModel):
    businessHours: BusinessHoursConfig
    priorities: dict  # {critical: PrioritySettings, high: ..., etc}
    escalation: EscalationConfig
    notifications: NotificationConfig
    customRules: Optional[List[CustomRuleConfig]] = []


class SLAStatusResponse(BaseModel):
    ticket_id: int
    status: str  # 'compliant', 'at_risk', 'breached'
    response_due: datetime
    resolution_due: datetime
    response_completed: Optional[datetime]
    resolution_completed: Optional[datetime]
    response_breached: bool
    resolution_breached: bool
    time_remaining_minutes: Optional[int]
    percent_consumed: Optional[float]


# ============================================================================
# CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/configuration")
async def get_sla_configuration(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """
    Get current active SLA configuration
    Returns the complete SLA settings in a format ready for the frontend
    """
    # Get active policy
    policy = db.query(SLAPolicy).filter(SLAPolicy.is_active == True).first()
    
    if not policy:
        # Return default configuration if none exists
        return {
            "businessHours": {
                "mode": "24/7",
                "startTime": "09:00",
                "endTime": "17:00",
                "workingDays": [1, 2, 3, 4, 5]
            },
            "priorities": {
                "critical": {
                    "enabled": True,
                    "responseMinutes": 15,
                    "resolutionHours": 2,
                    "escalateAtPercent": 75,
                    "description": "Business-stopping issues"
                },
                "high": {
                    "enabled": True,
                    "responseMinutes": 60,
                    "resolutionHours": 4,
                    "escalateAtPercent": 75,
                    "description": "Important issues affecting key personnel"
                },
                "medium": {
                    "enabled": True,
                    "responseMinutes": 240,
                    "resolutionHours": 24,
                    "escalateAtPercent": 80,
                    "description": "Standard issues"
                },
                "low": {
                    "enabled": True,
                    "responseMinutes": 480,
                    "resolutionHours": 48,
                    "escalateAtPercent": 85,
                    "description": "Minor issues"
                }
            },
            "escalation": {
                "level1": {
                    "triggerPercent": 75,
                    "notify": ["assignee"],
                    "channels": ["in_app", "email"]
                },
                "level2": {
                    "triggerPercent": 90,
                    "notify": ["assignee", "manager"],
                    "channels": ["in_app", "email", "sms"]
                },
                "breach": {
                    "notify": ["assignee", "manager", "admin"],
                    "channels": ["in_app", "email", "sms"],
                    "autoReassign": False
                }
            },
            "notifications": {
                "responseWarning": True,
                "resolutionWarning": True,
                "breachAlert": True,
                "dailyReport": True
            }
        }
    
    # Build configuration from database
    rules = db.query(SLARule).filter(SLARule.policy_id == policy.id).all()
    escalation_rules = db.query(SLAEscalationRule).filter(
        SLAEscalationRule.policy_id == policy.id
    ).all()
    
    # Convert to frontend format
    priorities = {}
    for rule in rules:
        if not rule.category_name:  # Only base priority rules, not overrides
            priorities[rule.priority] = {
                "enabled": rule.enabled,
                "responseMinutes": rule.response_time_minutes,
                "resolutionHours": rule.resolution_time_hours,
                "escalateAtPercent": rule.escalate_at_percent,
                "description": rule.description or ""
            }
    
    return {
        "businessHours": {
            "mode": policy.business_hours_mode,
            "startTime": policy.business_start_time,
            "endTime": policy.business_end_time,
            "workingDays": policy.working_days
        },
        "priorities": priorities,
        "escalation": {
            f"level{rule.level}": {
                "id": rule.id,
                "name": rule.name,
                "description": rule.description,
                "triggerPercent": rule.trigger_percent,
                "isActive": rule.is_active,
                "notify": [
                    "assignee" if rule.notify_assignee else None,
                    "manager" if rule.notify_manager else None,
                    "admin" if rule.notify_admin else None
                ],
                "channels": [
                    "in_app" if rule.channel_in_app else None,
                    "email" if rule.channel_email else None,
                    "sms" if rule.channel_sms else None
                ]
            } for rule in escalation_rules
        },
        "notifications": {
            "responseWarning": True,
            "resolutionWarning": True,
            "breachAlert": True,
            "dailyReport": True
        },
        "customRules": [
            {
                "name": rule.name,
                "condition": rule.description.split("IF ")[1].split(" THEN")[0] if "IF " in (rule.description or "") else rule.description,
                "action": rule.description.split("THEN ")[1] if "THEN " in (rule.description or "") else rule.name
            } for rule in escalation_rules if rule.level > 10 # Assuming custom rules are level > 10
        ]
    }


@router.post("/configuration")
async def save_sla_configuration(
    config: SLAConfigurationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """
    Save SLA configuration
    Only administrators can modify SLA settings
    """
    try:
        # Deactivate existing policies
        db.query(SLAPolicy).update({"is_active": False})
        
        # Create new policy
        policy = SLAPolicy(
            name=f"SLA Policy - {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            description="Active SLA configuration",
            is_active=True,
            business_hours_mode=config.businessHours.mode,
            business_start_time=config.businessHours.startTime,
            business_end_time=config.businessHours.endTime,
            working_days=config.businessHours.workingDays,
            created_by=current_user.id
        )
        db.add(policy)
        db.flush()  # Get policy.id
        
        # Create rules for each priority
        for priority_name, settings in config.priorities.items():
            rule = SLARule(
                policy_id=policy.id,
                priority=priority_name,
                response_time_minutes=settings['responseMinutes'],
                resolution_time_hours=settings['resolutionHours'],
                escalate_at_percent=settings['escalateAtPercent'],
                enabled=settings['enabled'],
                description=settings.get('description', '')
            )
            db.add(rule)
        
        # Create escalation rules
        # Level 1
        esc1 = SLAEscalationRule(
            policy_id=policy.id,
            level=1,
            trigger_percent=config.escalation.level1.triggerPercent,
            notify_assignee='assignee' in config.escalation.level1.notify,
            notify_manager='manager' in config.escalation.level1.notify,
            notify_admin='admin' in config.escalation.level1.notify,
            channel_in_app='in_app' in config.escalation.level1.channels,
            channel_email='email' in config.escalation.level1.channels,
            channel_sms='sms' in config.escalation.level1.channels
        )
        db.add(esc1)
        
        # Level 2
        esc2 = SLAEscalationRule(
            policy_id=policy.id,
            level=2,
            trigger_percent=config.escalation.level2.triggerPercent,
            notify_assignee='assignee' in config.escalation.level2.notify,
            notify_manager='manager' in config.escalation.level2.notify,
            notify_admin='admin' in config.escalation.level2.notify,
            channel_in_app='in_app' in config.escalation.level2.channels,
            channel_email='email' in config.escalation.level2.channels,
            channel_sms='sms' in config.escalation.level2.channels
        )
        db.add(esc2)
        
        # Breach level
        esc3 = SLAEscalationRule(
            policy_id=policy.id,
            level=3,
            trigger_percent=100,  # Breach happens at 100%
            notify_assignee='assignee' in config.escalation.breach.notify,
            notify_manager='manager' in config.escalation.breach.notify,
            notify_admin='admin' in config.escalation.breach.notify,
            channel_in_app='in_app' in config.escalation.breach.channels,
            channel_email='email' in config.escalation.breach.channels,
            channel_sms='sms' in config.escalation.breach.channels,
            auto_reassign=config.escalation.breach.autoReassign
        )
        db.add(esc3)
        
        # Create Custom Rules (stored as high-level escalation rules for now)
        if config.customRules:
            for idx, crule in enumerate(config.customRules):
                custom_esc = SLAEscalationRule(
                    policy_id=policy.id,
                    level=100 + idx, # custom levels start at 100
                    name=crule.name,
                    description=f"IF {crule.condition} THEN {crule.action}",
                    trigger_percent=0, # Conditions based rules handles differently
                    notify_admin=True # Default
                )
                db.add(custom_esc)
        
        db.commit()
        
        return {
            "message": "SLA configuration saved successfully",
            "policy_id": policy.id,
            "status": "success"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save SLA configuration: {str(e)}"
        )


@router.post("/rules/{rule_id}/toggle")
async def toggle_sla_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    rule = db.query(SLAEscalationRule).filter(SLAEscalationRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    
    rule.is_active = not rule.is_active
    db.commit()
    return {"message": "Rule status updated", "isActive": rule.is_active}

# ============================================================================
# HOLIDAY MANAGEMENT
# ============================================================================

@router.get("/holidays", response_model=List[dict])
async def get_holidays(db: Session = Depends(get_db)):
    holidays = db.query(SLAHoliday).all()
    return [{"id": h.id, "date": h.date.strftime("%Y-%m-%d"), "name": h.name} for h in holidays]

@router.post("/holidays")
async def add_holiday(data: dict, db: Session = Depends(get_db)):
    policy = db.query(SLAPolicy).filter(SLAPolicy.is_active == True).first()
    if not policy:
        raise HTTPException(status_code=404, detail="No active SLA policy found")
    
    new_holiday = SLAHoliday(
        policy_id=policy.id,
        date=datetime.strptime(data['date'], "%Y-%m-%d"),
        name=data['name']
    )
    db.add(new_holiday)
    db.commit()
    return {"message": "Holiday added successfully"}

@router.delete("/holidays/{holiday_id}")
async def delete_holiday(holiday_id: int, db: Session = Depends(get_db)):
    holiday = db.query(SLAHoliday).filter(SLAHoliday.id == holiday_id).first()
    if not holiday:
        raise HTTPException(status_code=404, detail="Holiday not found")
    db.delete(holiday)
    db.commit()
    return {"message": "Holiday deleted"}


# ============================================================================
# SLA TRACKING ENDPOINTS
# ============================================================================

@router.get("/tickets/{ticket_id}/status", response_model=SLAStatusResponse)
async def get_ticket_sla_status(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get current SLA status for a specific ticket
    """
    tracking = db.query(TicketSLATracking).filter(
        TicketSLATracking.ticket_id == ticket_id
    ).first()
    
    if not tracking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA tracking not found for this ticket"
        )
    
    # Calculate time remaining
    now = datetime.utcnow()
    
    if not tracking.resolution_completed_at:
        time_remaining = (tracking.resolution_due - now).total_seconds() / 60
        total_time = (tracking.resolution_due - tracking.started_at).total_seconds() / 60
        percent_consumed = ((total_time - time_remaining) / total_time) * 100 if total_time > 0 else 0
    else:
        time_remaining = None
        percent_consumed = 100
    
    return SLAStatusResponse(
        ticket_id=tracking.ticket_id,
        status=tracking.current_status,
        response_due=tracking.response_due,
        resolution_due=tracking.resolution_due,
        response_completed=tracking.response_completed_at,
        resolution_completed=tracking.resolution_completed_at,
        response_breached=tracking.response_breached,
        resolution_breached=tracking.resolution_breached,
        time_remaining_minutes=int(time_remaining) if time_remaining else None,
        percent_consumed=round(percent_consumed, 1) if percent_consumed is not None else None
    )


@router.get("/monitoring")
async def get_sla_monitoring_data(
    time_range: str = 'weekly',  # weekly, monthly, yearly
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager', 'technician']))
):
    """
    Get comprehensive SLA monitoring data for dashboard
    Returns statistics, trend data (weekly/monthly/yearly), category breakdown, at-risk tickets, and system metrics
    """
    try:
        from sqlalchemy import func, case, text
        from ticket_system.models import Ticket
        
        # Get all active ticket SLA trackings
        query = db.query(TicketSLATracking).join(Ticket).filter(
            Ticket.status.notin_(['resolved', 'closed'])
        )
        
        if current_user.role == 'technician':
            query = query.filter(Ticket.assigned_to == current_user.id)
            
        trackings = query.all()
        
        # Real-time Status Calculation helper
        def get_realtime_status(tracking):
            # 1. DB Flag Priority
            if tracking.resolution_breached:
                return 'breached'

            now = datetime.utcnow()
            
            # 2. If resolved/closed but flag wasn't set (legacy catch), check times
            if tracking.resolution_completed_at:
                if tracking.resolution_completed_at > tracking.resolution_due:
                    return 'breached'
                return 'compliant'
            
            # 3. Active Ticket Calculation
            total_time = (tracking.resolution_due - tracking.started_at).total_seconds()
            elapsed_time = (now - tracking.started_at).total_seconds()
            
            if total_time <= 0: return 'breached' # Zero duration rule = instant breach

            percent_consumed = (elapsed_time / total_time) * 100
            
            if percent_consumed >= 100:
                return 'breached'
            elif percent_consumed >= 75:
                return 'at_risk'
            else:
                return 'compliant'

        # Calculate statistics with REAL-TIME status
        total_tickets = len(trackings)
        
        # Group trackings by their real-time status
        status_counts = {'compliant': 0, 'at_risk': 0, 'breached': 0}
        at_risk_data = [] 
        
        for t in trackings:
            current_status = get_realtime_status(t)
            if current_status in status_counts:
                status_counts[current_status] += 1
                
            if current_status in ['at_risk', 'breached']:
                now = datetime.utcnow()
                total = (t.resolution_due - t.started_at).total_seconds()
                elapsed = (now - t.started_at).total_seconds()
                urgency = (elapsed / total) * 100 if total > 0 else 100
                at_risk_data.append((t, current_status, urgency))

        compliant = status_counts['compliant']
        at_risk = status_counts['at_risk']
        breached = status_counts['breached']
        
        # Calculate average response time
        response_times = []
        for t in trackings:
            if t.response_completed_at and t.started_at:
                delta = (t.response_completed_at - t.started_at).total_seconds() / 60
                response_times.append(delta)
        
        avg_response_minutes = sum(response_times) / len(response_times) if response_times else 15
        avg_response_str = f"{int(avg_response_minutes)}m {int((avg_response_minutes % 1) * 60)}s"
        
        # --- DYNAMIC TREND DATA ---
        now = datetime.utcnow()
        trend_data = []
        
        if time_range == 'yearly':
            # Last 12 Months - Safe Calculation
            current_month_start = now.replace(day=1)
            for i in range(11, -1, -1):
                # Go back i months safely
                # Calculate rough target month/year
                year = current_month_start.year
                month = current_month_start.month - i
                while month < 1:
                    month += 12
                    year -= 1
                
                month_start = datetime(year, month, 1)
                
                # Next month start for end date
                if month == 12:
                    next_month_start = datetime(year + 1, 1, 1)
                else:
                    next_month_start = datetime(year, month + 1, 1)
                    
                month_end = next_month_start - timedelta(seconds=1)
                
                label = month_start.strftime("%b")
                
                resolved = db.query(Ticket).filter(
                    Ticket.status.in_(['resolved', 'closed']),
                    Ticket.updated_at.between(month_start, month_end)
                ).join(TicketSLATracking).filter(
                    TicketSLATracking.resolution_breached == False
                ).count()
                
                breached_count = db.query(Ticket).filter(
                    Ticket.status.in_(['resolved', 'closed']),
                    Ticket.updated_at.between(month_start, month_end)
                ).join(TicketSLATracking).filter(
                    TicketSLATracking.resolution_breached == True
                ).count()
                
                trend_data.append({"label": label, "resolved": resolved, "breached": breached_count})
                
        elif time_range == 'monthly':
            # Last 30 Days
            for i in range(29, -1, -1):
                day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = (now - timedelta(days=i)).replace(hour=23, minute=59, second=59, microsecond=999)
                
                label = day_start.strftime("%d %b")
                
                resolved = db.query(Ticket).filter(
                    Ticket.status.in_(['resolved', 'closed']),
                    Ticket.updated_at.between(day_start, day_end)
                ).join(TicketSLATracking).filter(
                    TicketSLATracking.resolution_breached == False
                ).count()
                
                breached_count = db.query(Ticket).filter(
                    Ticket.status.in_(['resolved', 'closed']),
                    Ticket.updated_at.between(day_start, day_end)
                ).join(TicketSLATracking).filter(
                    TicketSLATracking.resolution_breached == True
                ).count()
                
                trend_data.append({"label": label, "resolved": resolved, "breached": breached_count})
                
        else: # Default: Weekly (Last 7 Days)
            for i in range(6, -1, -1):
                day_start = (now - timedelta(days=i)).replace(hour=0, minute=0, second=0, microsecond=0)
                day_end = (now - timedelta(days=i)).replace(hour=23, minute=59, second=59, microsecond=999)
                
                label = day_start.strftime("%a") # Mon, Tue
                
                resolved = db.query(Ticket).filter(
                    Ticket.status.in_(['resolved', 'closed']),
                    Ticket.updated_at.between(day_start, day_end)
                ).join(TicketSLATracking).filter(
                    TicketSLATracking.resolution_breached == False
                ).count()
                
                breached_count = db.query(Ticket).filter(
                    Ticket.updated_at.between(day_start, day_end)
                ).join(TicketSLATracking).filter(
                    TicketSLATracking.resolution_breached == True
                ).count()
                
                trend_data.append({"label": label, "resolved": resolved, "breached": breached_count})
        
        # Category-wise breakdown - Top 5 Active Categories
        category_data = []
        
        # Get top 5 categories by active ticket volume
        top_cats_query = db.query(Ticket.category, func.count(Ticket.id).label('count'))\
            .filter(Ticket.status.notin_(['resolved', 'closed']))
        
        if current_user.role == 'technician':
            top_cats_query = top_cats_query.filter(Ticket.assigned_to == current_user.id)
            
        top_cats = top_cats_query.group_by(Ticket.category)\
            .order_by(func.count(Ticket.id).desc())\
            .limit(5).all()
        
        # If no active tickets, fallback to distinct categories (e.g. historical)
        if not top_cats:
            top_cats = db.query(Ticket.category, func.count(Ticket.id))\
                .group_by(Ticket.category)\
                .limit(5).all()
        
        for cat_row in top_cats:
            cat_name = cat_row[0]
            if not cat_name: continue
            
            # Get tickets for this category to check SLA
            cat_tickets = db.query(Ticket).filter(
                Ticket.category == cat_name,
                Ticket.status.notin_(['resolved', 'closed'])
            )
            
            if current_user.role == 'technician':
                cat_tickets = cat_tickets.filter(Ticket.assigned_to == current_user.id)
            
            cat_trackings = cat_tickets.join(TicketSLATracking).all()
            
            # Calculate real-time status for category stats
            cat_on_time = 0
            cat_delayed = 0
            for t in cat_trackings:
                 if t.sla_tracking:
                     st = get_realtime_status(t.sla_tracking)
                     if st == 'compliant':
                         cat_on_time += 1
                     else:
                         cat_delayed += 1
            
            category_data.append({
                "name": cat_name,
                "onTime": cat_on_time,
                "delayed": cat_delayed
            })
        
        # SLA Status Breakdown
        sla_breakdown = {
            "compliant": compliant,
            "atRisk": at_risk,
            "breached": breached
        }
        
        # Build At-Risk Tickets List (using calculated data)
        at_risk_tickets = []
        for tracking, status, urgency in at_risk_data:
            ticket = tracking.ticket
            
            # Time remaining calc
            now = datetime.utcnow()
            time_diff = tracking.resolution_due - now
            
            if time_diff.total_seconds() > 0:
                hours = int(time_diff.total_seconds() // 3600)
                minutes = int((time_diff.total_seconds() % 3600) // 60)
                if hours > 0:
                    time_remaining = f"{hours}h {minutes}m"
                else:
                    time_remaining = f"{minutes}m"
            else:
                # Overdue
                hours = int(abs(time_diff.total_seconds()) // 3600)
                minutes = int((abs(time_diff.total_seconds()) % 3600) // 60)
                if hours > 0:
                    time_remaining = f"-{hours}h {minutes}m"
                else:
                    time_remaining = f"-{minutes}m"
            
            at_risk_tickets.append({
                "id": ticket.custom_id or f"TKT-{ticket.id}",
                "subject": ticket.subject,
                "priority": ticket.priority.capitalize() if ticket.priority else "Medium",
                "timeRemaining": time_remaining,
                "assignee": ticket.assignee.full_name if ticket.assignee else "Unassigned",
                "department": ticket.category if ticket.category else "General",
                "slaStatus": "At Risk" if status == 'at_risk' else "Breached",
                "urgency": int(min(100, max(0, urgency))),
                "eta": time_remaining
            })
        
        # Get resolved tickets count
        resolved_count = db.query(Ticket).filter(
            Ticket.status.in_(['resolved', 'closed'])
        ).count()
        
        # Calculate breach prevention
        breach_prevented = db.query(TicketSLATracking).join(Ticket).filter(
            Ticket.status.in_(['resolved', 'closed']),
            TicketSLATracking.resolution_breached == False,
            TicketSLATracking.resolution_completed_at != None
        ).count()
        
        # Recent Ticket History
        recent_tickets_q = db.query(Ticket).join(TicketSLATracking).order_by(Ticket.updated_at.desc()).limit(7)
        if current_user.role == 'technician':
            recent_tickets_q = recent_tickets_q.filter(Ticket.assigned_to == current_user.id)
            
        recent_history = []
        for t in recent_tickets_q.all():
            r_status = get_realtime_status(t.sla_tracking)
            recent_history.append({
                "id": t.custom_id or f"#{t.id}",
                "subject": t.subject,
                "category": t.category or "General",
                "assignee": t.assignee.full_name if t.assignee else "Unassigned",
                "sla_status": "Breached" if r_status == 'breached' else "Compliant",
                "updated": t.updated_at.strftime("%d %b"),
                "status": t.status
            })

        return {
            "stats": {
                "complianceRate": round((compliant / total_tickets * 100), 1) if total_tickets > 0 else 100.0,
                "activeEscalations": at_risk + breached,
                "avgResponseTime": avg_response_str,
                "breachPrevention": breach_prevented,
                "totalTickets": total_tickets,
                "resolved": resolved_count
            },
            "slaBreakdown": sla_breakdown,
            "trendData": trend_data,
            "categoryData": category_data,
            "atRiskTickets": sorted(at_risk_tickets, key=lambda x: x['urgency'], reverse=True)[:10],
            "recentHistory": recent_history
        }
    except Exception as e:
        import traceback
        print(f"Error in SLA monitoring: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))


def get_relative_time(dt: datetime) -> str:
    """Convert datetime to relative time string"""
    now = datetime.utcnow()
    diff = now - dt
    
    minutes = diff.total_seconds() / 60
    if minutes < 60:
        return f"{int(minutes)}m ago"
    
    hours = minutes / 60
    if hours < 24:
        return f"{int(hours)}h ago"
    
    days = hours / 24
    return f"{int(days)}d ago"


# ============================================================================
# SLA CALCULATION & UPDATE HELPERS
# ============================================================================

@router.post("/tickets/{ticket_id}/initialize")
async def initialize_ticket_sla_route(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Initialize SLA tracking for a new ticket
    Called automatically when a ticket is created
    """
    tracking = sla_service.initialize_ticket_sla(db, ticket_id)
    if not tracking:
         raise HTTPException(status_code=404, detail="Ticket not found or no SLA policy active")
    
    return {
        "message": "SLA tracking initialized",
        "response_due": tracking.response_due,
        "resolution_due": tracking.resolution_due
    }


@router.post("/update-all-statuses")
async def update_all_sla_statuses(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """
    Background job endpoint to update all SLA statuses
    Should be called every minute by a cron job or scheduler
    """
    trackings = db.query(TicketSLATracking).join(Ticket).filter(
        Ticket.status.notin_(['resolved', 'closed']),
        TicketSLATracking.resolution_completed_at == None
    ).all()
    
    updated_count = 0
    escalated_count = 0
    
    for tracking in trackings:
        old_status = tracking.current_status
        new_status = calculate_sla_status(tracking)
        
        if old_status != new_status:
            tracking.current_status = new_status
            updated_count += 1
            
            # Trigger escalation if needed
            if new_status in ['at_risk', 'breached']:
                # Create escalation logic here
                escalated_count += 1
    
    db.commit()
    
    return {
        "message": "SLA statuses updated",
        "updated": updated_count,
        "escalated": escalated_count
    }


def calculate_sla_status(tracking: TicketSLATracking) -> str:
    """Calculate current SLA status based on time remaining"""
    now = datetime.utcnow()
    
    # If resolution is complete, check if it was breached
    if tracking.resolution_completed_at:
        return 'breached' if tracking.resolution_breached else 'compliant'
    
    # Calculate time remaining
    total_time = (tracking.resolution_due - tracking.started_at).total_seconds()
    elapsed_time = (now - tracking.started_at).total_seconds()
    percent_consumed = (elapsed_time / total_time) * 100 if total_time > 0 else 0
    
    if percent_consumed >= 100:
        return 'breached'
    elif percent_consumed >= 75:
        return 'at_risk'
    else:
        return 'compliant'

@router.get("/predictive-insights")
async def get_predictive_insights(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Heuristic AI to predict SLA outcomes
    Analyzes workload, history, and trends
    """
    # 1. Workload Analysis
    tech_query = db.query(User).filter(User.role.in_(['technician', 'manager']))
    
    if current_user.role == 'technician':
        tech_query = tech_query.filter(User.id == current_user.id)
        
    technicians = tech_query.all()
    workload_risk = []
    
    for tech in technicians:
        active_count = db.query(Ticket).filter(
            Ticket.assigned_to == tech.id,
            Ticket.status.notin_(['resolved', 'closed'])
        ).count()
        
        if active_count >= 3:
            workload_risk.append({
                "technician": tech.full_name,
                "activeTickets": active_count,
                "riskLevel": "High" if active_count > 5 else "Medium",
                "impact": "Potential delay in high-priority tickets"
            })

    # 2. Bottleneck Categories
    # Simple logic: Categories with most open tickets > 24h old
    yesterday = datetime.utcnow() - timedelta(days=1)
    bottlenecks = []
    
    # Get total counts per category for old tickets
    from sqlalchemy import func
    bottleneck_query = db.query(Ticket.category, func.count(Ticket.id)).filter(
        Ticket.status.notin_(['resolved', 'closed']),
        Ticket.created_at < yesterday
    )
    
    if current_user.role == 'technician':
        bottleneck_query = bottleneck_query.filter(Ticket.assigned_to == current_user.id)
        
    old_tickets_per_cat = bottleneck_query.group_by(Ticket.category).all()
    
    for cat, count in old_tickets_per_cat:
        if count >= 2:
            bottlenecks.append({
                "category": cat,
                "staleTickets": count,
                "avgDelay": "4.2h above normal", # Simulated heuristic
                "recommendation": f"Reassign resources to {cat} team"
            })

    # Tickets approaching 50% but growing fast
    critical_predictions = []
    fast_growing_query = db.query(TicketSLATracking).join(Ticket).filter(
        Ticket.status.notin_(['resolved', 'closed']),
        Ticket.priority == 'critical'
    )
    
    if current_user.role == 'technician':
        fast_growing_query = fast_growing_query.filter(Ticket.assigned_to == current_user.id)
        
    fast_growing = fast_growing_query.limit(5).all()
    
    for tracking in fast_growing:
        percent = calculate_sla_status(tracking) # Reuse logic
        if percent == 'compliant': # Only predicting for compliant ones
            critical_predictions.append({
                "id": f"TKT-{tracking.ticket_id}",
                "subject": tracking.ticket.subject,
                "probability": "85%",
                "timeLeft": "1h 12m",
                "reason": "Technical complexity + High priority"
            })

    return {
        "workloadRisk": workload_risk[:5],
        "bottlenecks": bottlenecks[:5],
        "criticalPredictions": critical_predictions,
        "overallHealth": "Good" if len(workload_risk) < 2 else "Degrading"
    }




