from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel
import auth
from database import get_db
from models import User
from ai_concierge import service

router = APIRouter(prefix="/api/ai/concierge", tags=["ai-concierge"])

class ChatMessage(BaseModel):
    role: str
    content: str

class ConciergeRequest(BaseModel):
    message: str
    history: List[ChatMessage]
    image_data: Optional[str] = None

@router.get("/config")
def get_concierge_config(db: Session = Depends(get_db)):
    """
    Returns the current concierge configuration (enabled status and bot name).
    """
    return service.get_concierge_config(db)

@router.post("/chat")
async def ai_concierge_chat(
    request: ConciergeRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """
    Intelligent KB-RAG chat for pre-ticket assistance.
    """
    config = service.get_concierge_config(db)
    
    # Convert chat history for service
    chat_history = [{"role": m.role, "content": m.content} for m in request.history]
    
    response = service.generate_concierge_response(
        user_query=request.message,
        chat_history=chat_history,
        kb_articles=[],
        bot_name=config["name"],
        image_data_base64=request.image_data
    )
    
    return response
