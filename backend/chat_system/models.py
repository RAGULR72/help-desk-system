from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime, timedelta
from models import EncryptedString

def get_ist():
    return datetime.utcnow() + timedelta(hours=5, minutes=30)

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True) # For group chats
    room_type = Column(String, default="direct") # direct, group
    created_at = Column(DateTime, default=get_ist)
    last_message_at = Column(DateTime, default=get_ist)
    is_restricted = Column(Boolean, default=False) # Security Mode: No Download/Screenshot
    description = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    creator_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    messages = relationship("ChatMessage", back_populates="room", cascade="all, delete-orphan")
    participants = relationship("ChatParticipant", back_populates="room", cascade="all, delete-orphan")
    creator = relationship("User")

class ChatParticipant(Base):
    __tablename__ = "chat_participants"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    role = Column(String, default="member") # member, admin
    joined_at = Column(DateTime, default=get_ist)
    last_read_at = Column(DateTime, default=get_ist)

    room = relationship("ChatRoom", back_populates="participants")
    user = relationship("User")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"))
    sender_id = Column(Integer, ForeignKey("users.id"))
    content = Column(EncryptedString, nullable=False)
    message_type = Column(String, default="text") # text, image, file
    attachment_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=get_ist)
    is_deleted = Column(Boolean, default=False)
    deleted_by = Column(Text, default="") # Comma separated user_ids for separate deletion

    room = relationship("ChatRoom", back_populates="messages")
    sender = relationship("User")
