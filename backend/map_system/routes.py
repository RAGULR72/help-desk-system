from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import auth
from admin_system.models import SystemSettings
from ticket_system.models import Ticket
from models import User
from sla_system import sla_models

from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/map", tags=["map"])

class LocationResponse(BaseModel):
    id: int
    name: str
    lat: float
    lng: float
    type: str # 'ticket' or 'technician'
    status: str
    details: str

@router.get("/status")
def get_map_status(db: Session = Depends(get_db)):
    setting = db.query(SystemSettings).filter(SystemSettings.key == "live_map_enabled").first()
    return {"enabled": setting.value.lower() == "true" if setting else False}

@router.get("/locations", response_model=List[LocationResponse])
def get_live_locations(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    # Check if enabled
    setting = db.query(SystemSettings).filter(SystemSettings.key == "live_map_enabled").first()
    if not setting or setting.value.lower() != "true":
         raise HTTPException(status_code=403, detail="Live Map feature is disabled")

    locations = []
    
    # Get active tickets with location
    active_tickets = db.query(Ticket).filter(
        Ticket.status.in_(["open", "in_progress", "repairing", "hold"]),
        Ticket.latitude.isnot(None),
        Ticket.longitude.isnot(None)
    ).all()
    
    for t in active_tickets:
        locations.append(LocationResponse(
            id=t.id,
            name=t.subject,
            lat=t.latitude,
            lng=t.longitude,
            type="ticket",
            status=t.status,
            details=f"Ticket ID: {t.custom_id or t.id}"
        ))
        
    # Get active technicians with location
    technicians = db.query(User).filter(
        User.role == "technician",
        User.latitude.isnot(None),
        User.longitude.isnot(None)
    ).all()
    
    for tech in technicians:
        locations.append(LocationResponse(
            id=tech.id,
            name=tech.full_name or tech.username,
            lat=tech.latitude,
            lng=tech.longitude,
            type="technician",
            status=tech.status,
            details=f"Contact: {tech.phone or 'N/A'}"
        ))
        
    return locations

@router.post("/update-location")
def update_user_location(
    lat: float, 
    lng: float,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    current_user.latitude = lat
    current_user.longitude = lng
    current_user.last_location_update = datetime.utcnow()
    db.commit()
    return {"message": "Location updated"}
