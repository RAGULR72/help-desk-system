from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from database import Base
from datetime import datetime

class KBArticle(Base):
    __tablename__ = "kb_articles"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    excerpt = Column(String(500))
    category = Column(String(100))
    tags = Column(String(255))
    is_published = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    author_id = Column(Integer, ForeignKey("users.id"))
