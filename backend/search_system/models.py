"""
Search system models for the help desk application
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
from datetime import datetime


class SearchIndex(Base):
    """
    Table to store searchable content with full-text search capabilities
    """
    __tablename__ = "search_indexes"
    
    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False)  # 'ticket', 'user', 'comment', etc.
    entity_id = Column(Integer, nullable=False)  # ID of the actual entity
    content = Column(Text, nullable=False)  # The searchable content
    title = Column(String(255), nullable=True)  # Title for better search results
    tags = Column(String(500), nullable=True)  # Comma-separated tags for filtering
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Index for full-text search
    __table_args__ = (
        Index('idx_search_content_gin', 'content', postgresql_using='gin', postgresql_ops={'content': 'gin_trgm_ops'}),
        Index('idx_entity_type_id', 'entity_type', 'entity_id'),
    )


class SavedSearch(Base):
    """
    Table to store user's saved searches
    """
    __tablename__ = "saved_searches"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who saved the search
    name = Column(String(255), nullable=False)  # Name for the saved search
    search_query = Column(Text, nullable=False)  # The search query parameters
    filters = Column(Text, nullable=True)  # Additional filters as JSON
    is_public = Column(Boolean, default=False)  # Whether the search is public
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationship
    user = relationship("User", back_populates="saved_searches")


class SearchHistory(Base):
    """
    Table to store user's search history
    """
    __tablename__ = "search_histories"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # User who performed the search
    search_query = Column(Text, nullable=False)  # The search query
    search_results_count = Column(Integer, default=0)  # Number of results returned
    is_favorite = Column(Boolean, default=False)  # Whether this search is marked as favorite
    searched_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationship
    user = relationship("User", back_populates="search_histories")


# Add relationships to existing User model
def extend_user_model():
    """
    Extend existing User model with relationships to search entities
    """
    from models import User
    
    User.saved_searches = relationship("SavedSearch", back_populates="user", lazy="dynamic")
    User.search_histories = relationship("SearchHistory", back_populates="user", lazy="dynamic")


# Call this function to establish relationships
extend_user_model()