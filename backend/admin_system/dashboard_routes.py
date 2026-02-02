from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Dict, Any
from datetime import datetime, timedelta
import models as root_models
from ticket_system.models import Ticket
from sla_system.sla_models import TicketSLATracking
from auth import get_current_user
from database import get_db
import random

router = APIRouter(prefix="/api/admin/command-center", tags=["Admin Command Center"])

def get_current_admin(current_user: root_models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can access the Command Center")
    return current_user

@router.get("/stats")
def get_command_center_stats(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_admin)):
    # 1. Ticket Distribution by Location (Real-time Matrix)
    # We use User.location as the source of truth for location stats
    location_stats = db.query(
        root_models.User.location,
        func.count(Ticket.id)
    ).join(Ticket, Ticket.user_id == root_models.User.id)\
     .filter(Ticket.status.in_(['open', 'in_progress', 'hold']))\
     .group_by(root_models.User.location).all()
    
    locations = [{"name": loc or "Main Office", "count": count, "coords": [random.uniform(-10, 10), random.uniform(-10, 10)]} for loc, count in location_stats]
    if not locations:
        # Fallback Mock for UI demo if no data
        locations = [
            {"name": "Floor 1 (IT Hub)", "count": 12, "coords": [2, 5]},
            {"name": "Floor 2 (Workplace)", "count": 8, "coords": [-4, 3]},
            {"name": "Floor 3 (Operations)", "count": 5, "coords": [6, -2]},
            {"name": "Remote (VPN)", "count": 15, "coords": [-8, -6]}
        ]

    # 2. SLA Breach Matrix (Neon Indicators)
    # Filter for tickets that are breached but not yet resolved
    breaches = db.query(TicketSLATracking).filter(
        and_(
            TicketSLATracking.current_status == 'breached',
            TicketSLATracking.resolution_completed_at == None
        )
    ).all()
    
    breach_list = []
    for b in breaches:
        t = b.ticket
        breach_list.append({
            "id": t.id,
            "subject": t.subject,
            "priority": t.priority,
            "breach_time": b.resolution_due.isoformat() if b.resolution_due else None,
            "severity": "CRITICAL" if t.priority == 'critical' else "WARNING"
        })

    # 3. AI Predictive Volume (7-Day Forecast)
    # Simple logic: average of last 7 days + random growth factor
    last_7_days = []
    today = datetime.utcnow().date()
    for i in range(7):
        day = today - timedelta(days=i)
        count = db.query(Ticket).filter(func.date(Ticket.created_at) == day).count()
        last_7_days.append({"date": day.isoformat(), "actual": count})
    
    # Mock future prediction based on actuals
    avg = sum(d['actual'] for d in last_7_days) / 7 if last_7_days else 10
    predictions = []
    for i in range(1, 8):
        future_day = today + timedelta(days=i)
        pred_val = int(avg * (1 + random.uniform(-0.1, 0.2))) + 2
        predictions.append({"date": future_day.isoformat(), "predict": pred_val})

    return {
        "locations": locations,
        "breaches": breach_list,
        "prediction": predictions,
        "live_headcount": db.query(root_models.User).filter(root_models.User.status == 'online').count() or 4
    }
