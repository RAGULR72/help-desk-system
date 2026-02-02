from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from ticket_system.schemas import UserResponse

class TicketCommentBase(BaseModel):
    text: str
    is_internal: bool = False

class TicketCommentCreate(TicketCommentBase):
    pass

class TicketCommentResponse(TicketCommentBase):
    id: int
    ticket_id: int
    user_id: int
    author: Optional[UserResponse] = None
    created_at: datetime

    class Config:
        from_attributes = True

class TicketFeedbackUpdate(BaseModel):
    rating: Optional[int] = None
    feedback: Optional[str] = None
