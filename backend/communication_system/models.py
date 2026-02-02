from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship, backref
from datetime import datetime, timedelta
from database import Base

def get_ist():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class TicketComment(Base):
    __tablename__ = "ticket_comments"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    ticket_id = Column(Integer, ForeignKey("tickets.id"), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), index=True)
    text = Column(Text, nullable=False)
    is_internal = Column(Integer, default=0) # 0: public, 1: internal
    created_at = Column(DateTime, default=get_ist)

    # Relationships
    # Relationship disabled - ticket_id is sufficient
    author = relationship("models.User", foreign_keys=[user_id])
