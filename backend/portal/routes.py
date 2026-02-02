from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from ticket_system.models import Ticket
from models import User
from pydantic import BaseModel
from typing import Optional
import os
from admin_system.models import SystemSettings

router = APIRouter(prefix="/api/portal", tags=["Portal"])
print("DEBUG: Portal Router Initialized!")

def check_portal_access(db: Session, current_user_role: Optional[str] = None):
    portal_active = db.query(SystemSettings).filter(SystemSettings.key == "portal_active").first()
    if portal_active and portal_active.value == "false":
        raise HTTPException(status_code=403, detail="Portal is currently disabled by Admin")
    
    allowed_roles = db.query(SystemSettings).filter(SystemSettings.key == "portal_allowed_roles").first()
    if allowed_roles:
        roles_list = allowed_roles.value.split(",")
        role_to_check = current_user_role if current_user_role else "public"
        if role_to_check not in roles_list:
            raise HTTPException(status_code=403, detail="You do not have permission to access the portal")

@router.get("/settings")
def get_portal_settings(db: Session = Depends(get_db)):
    active = db.query(SystemSettings).filter(SystemSettings.key == "portal_active").first()
    roles = db.query(SystemSettings).filter(SystemSettings.key == "portal_allowed_roles").first()
    return {
        "active": active.value == "true" if active else True,
        "allowed_roles": roles.value.split(",") if roles else ["public", "user", "technician", "manager", "admin"]
    }

@router.get("/config/maps")
def get_maps_config():
    """Return the Google Maps API Key for frontend use"""
    return {"apiKey": os.getenv("GOOGLE_MAPS_API_KEY") or os.getenv("GEMINI_API_KEY", "")}

class TicketStatusRequest(BaseModel):
    ticket_id: str
    email: str

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@router.get("/track-ticket")
def track_ticket(ticket_id: str = Query(...), email: str = Query(...), db: Session = Depends(get_db)):
    check_portal_access(db)
    # Find ticket by custom_id (e.g. TKT-2023-0001) or standard id
    ticket = db.query(Ticket).filter(
        (Ticket.custom_id == ticket_id) | (Ticket.id.cast(str) == ticket_id)
    ).first()
    
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    # Check if the email matches the owner's email
    if ticket.owner.email.lower() != email.lower():
        raise HTTPException(status_code=403, detail="Email does not match ticket owner")
    
    return {
        "id": ticket.id,
        "custom_id": ticket.custom_id,
        "subject": ticket.subject,
        "status": ticket.status,
        "created_at": ticket.created_at,
        "updated_at": ticket.updated_at,
        "priority": ticket.priority,
        "category": ticket.category,
        "asset_status": ticket.asset_status if hasattr(ticket, 'asset_status') else None
    }

@router.post("/chat")
def portal_chat(request: ChatRequest, db: Session = Depends(get_db)):
    check_portal_access(db)
    msg = request.message.lower()
    
    # 2. Use AI for response
    import ai_service
    reply = ai_service.chat_with_context(request.message, [])

    return {"reply": reply}
