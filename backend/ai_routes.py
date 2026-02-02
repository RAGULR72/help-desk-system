from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
import auth
import ai_service
from database import get_db
from models import User
from pydantic import BaseModel
from typing import List


router = APIRouter(prefix="/api/ai", tags=["ai"])

class PolishRequest(BaseModel):
    text: str
    context_type: Optional[str] = "general"
    additional_context: Optional[str] = None

@router.post("/polish")
async def polish_text_api(
    request: PolishRequest,
    current_user: User = Depends(auth.get_current_user)
):
    """
    Polishes raw text/notes into professional English.
    Accessible to all logged-in staff/users, but primarily for staff.
    """
    if not request.text.strip():
        return {"polished_text": ""}
        
    polished = ai_service.polish_text(
        raw_text=request.text,
        context_type=request.context_type,
        additional_context=request.additional_context
    )
    
    return {"polished_text": polished}

class CategorizeRequest(BaseModel):
    subject: str
    description: Optional[str] = None

@router.post("/categorize")
async def categorize_ticket_api(
    request: CategorizeRequest,
    current_user: User = Depends(auth.get_current_user)
):
    """
    Predicts categorization and priority based on ticket subject/description.
    """
    if not request.subject.strip():
        return {"category": None, "subcategory": None, "priority": "normal"}
        
    suggestion = ai_service.categorize_ticket(
        subject=request.subject,
        description=request.description
    )
    
    return suggestion or {"category": None, "subcategory": None, "priority": "normal"}

@router.post("/smart-suggestions")
async def get_smart_suggestions_api(
    request: CategorizeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Provides real-time self-help suggestions using internal KB and AI.
    """
    if len(request.subject.strip()) < 5:
        return {"suggestion": None}

    suggestion = ai_service.generate_smart_suggestions(
        db=db,
        subject=request.subject,
        description=request.description
    )
    
    return {"suggestion": suggestion}

