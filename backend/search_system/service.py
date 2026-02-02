"""
Search service for the help desk application
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, cast, String
from sqlalchemy.dialects.postgresql import TSVECTOR, TEXT
from sqlalchemy.sql import text
from typing import Dict, List, Optional
import json
from datetime import datetime, timedelta
from models import User
from ticket_system.models import Ticket as TicketModel
from search_system.models import SearchIndex, SavedSearch, SearchHistory
from sqlalchemy.exc import SQLAlchemyError


class SearchService:
    """
    Service class for handling search operations
    """
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_search_index(self, entity_type: str, entity_id: int, content: str, title: str = None, tags: str = None):
        """
        Create a search index entry for an entity
        """
        try:
            # Check if index already exists
            existing_index = self.db.query(SearchIndex).filter(
                and_(
                    SearchIndex.entity_type == entity_type,
                    SearchIndex.entity_id == entity_id
                )
            ).first()
            
            if existing_index:
                # Update existing index
                existing_index.content = content
                existing_index.title = title
                existing_index.tags = tags
                existing_index.updated_at = datetime.utcnow()
            else:
                # Create new index
                search_index = SearchIndex(
                    entity_type=entity_type,
                    entity_id=entity_id,
                    content=content,
                    title=title,
                    tags=tags
                )
                self.db.add(search_index)
            
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
    
    def update_search_indexes(self):
        """
        Update search indexes for all existing data
        """
        try:
            # Index all tickets
            tickets = self.db.query(TicketModel).all()
            for ticket in tickets:
                content = f"{ticket.title} {ticket.description} {ticket.category} {ticket.priority}"
                if ticket.assigned_to:
                    assigned_user = self.db.query(User).filter(User.id == ticket.assigned_to).first()
                    if assigned_user:
                        content += f" {assigned_user.username} {assigned_user.first_name} {assigned_user.last_name}"
                
                self.create_search_index(
                    entity_type="ticket",
                    entity_id=ticket.id,
                    content=content,
                    title=ticket.title,
                    tags=f"{ticket.category},{ticket.priority},{ticket.status}"
                )
            
            # Index all users
            users = self.db.query(User).all()
            for user in users:
                content = f"{user.username} {user.email} {user.first_name} {user.last_name} {user.role}"
                self.create_search_index(
                    entity_type="user",
                    entity_id=user.id,
                    content=content,
                    title=f"{user.first_name} {user.last_name}",
                    tags=user.role
                )
            
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
    
    def full_text_search(self, query: str, entity_types: List[str] = None, limit: int = 50, offset: int = 0) -> List[Dict]:
        """
        Perform full-text search across indexed content
        """
        try:
            search_query = self.db.query(SearchIndex)
            
            if entity_types:
                search_query = search_query.filter(SearchIndex.entity_type.in_(entity_types))
            
            # Using PostgreSQL's full-text search capabilities
            # First try to match the query in the content
            search_query = search_query.filter(
                SearchIndex.content.ilike(f"%{query}%")
            ).order_by(SearchIndex.entity_type, SearchIndex.id.desc())
            
            results = search_query.offset(offset).limit(limit).all()
            
            formatted_results = []
            for result in results:
                formatted_result = {
                    'id': result.id,
                    'entity_type': result.entity_type,
                    'entity_id': result.entity_id,
                    'title': result.title,
                    'content_preview': result.content[:200] + "..." if len(result.content) > 200 else result.content,
                    'tags': result.tags.split(",") if result.tags else [],
                    'created_at': result.created_at.isoformat() if result.created_at else None
                }
                formatted_results.append(formatted_result)
            
            return formatted_results
        except SQLAlchemyError:
            return []
    
    def advanced_search(self, query: str = "", filters: Dict = None, limit: int = 50, offset: int = 0) -> List[Dict]:
        """
        Perform advanced search with filters
        """
        try:
            search_query = self.db.query(SearchIndex)
            
            # Apply text search if query is provided
            if query:
                search_query = search_query.filter(
                    or_(
                        SearchIndex.content.ilike(f"%{query}%"),
                        SearchIndex.title.ilike(f"%{query}%")
                    )
                )
            
            # Apply filters
            if filters:
                if filters.get('entity_types'):
                    search_query = search_query.filter(
                        SearchIndex.entity_type.in_(filters['entity_types'])
                    )
                
                if filters.get('date_from'):
                    date_from = datetime.fromisoformat(filters['date_from'].replace('Z', '+00:00'))
                    search_query = search_query.filter(SearchIndex.created_at >= date_from)
                
                if filters.get('date_to'):
                    date_to = datetime.fromisoformat(filters['date_to'].replace('Z', '+00:00'))
                    search_query = search_query.filter(SearchIndex.created_at <= date_to)
                
                if filters.get('tags'):
                    # Filter by tags (comma-separated)
                    tag_filters = []
                    for tag in filters['tags']:
                        tag_filters.append(SearchIndex.tags.ilike(f"%{tag}%"))
                    if tag_filters:
                        search_query = search_query.filter(or_(*tag_filters))
            
            search_query = search_query.order_by(SearchIndex.created_at.desc())
            
            results = search_query.offset(offset).limit(limit).all()
            
            formatted_results = []
            for result in results:
                formatted_result = {
                    'id': result.id,
                    'entity_type': result.entity_type,
                    'entity_id': result.entity_id,
                    'title': result.title,
                    'content_preview': result.content[:200] + "..." if len(result.content) > 200 else result.content,
                    'tags': result.tags.split(",") if result.tags else [],
                    'created_at': result.created_at.isoformat() if result.created_at else None
                }
                formatted_results.append(formatted_result)
            
            return formatted_results
        except SQLAlchemyError:
            return []
    
    def save_search(self, user_id: int, name: str, search_query: str, filters: Dict = None, is_public: bool = False) -> SavedSearch:
        """
        Save a search query for future use
        """
        try:
            saved_search = SavedSearch(
                user_id=user_id,
                name=name,
                search_query=search_query,
                filters=json.dumps(filters) if filters else None,
                is_public=is_public
            )
            self.db.add(saved_search)
            self.db.commit()
            self.db.refresh(saved_search)
            return saved_search
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def get_saved_searches(self, user_id: int, include_public: bool = True) -> List[SavedSearch]:
        """
        Get saved searches for a user
        """
        try:
            query = self.db.query(SavedSearch).filter(SavedSearch.user_id == user_id)
            
            if include_public:
                query = query.union(
                    self.db.query(SavedSearch).filter(SavedSearch.is_public == True)
                )
            
            return query.order_by(SavedSearch.created_at.desc()).all()
        except SQLAlchemyError:
            return []
    
    def delete_saved_search(self, search_id: int, user_id: int) -> bool:
        """
        Delete a saved search
        """
        try:
            saved_search = self.db.query(SavedSearch).filter(
                and_(
                    SavedSearch.id == search_id,
                    SavedSearch.user_id == user_id
                )
            ).first()
            
            if saved_search:
                self.db.delete(saved_search)
                self.db.commit()
                return True
            return False
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def add_to_search_history(self, user_id: int, search_query: str, results_count: int = 0) -> SearchHistory:
        """
        Add a search to user's history
        """
        try:
            search_history = SearchHistory(
                user_id=user_id,
                search_query=search_query,
                search_results_count=results_count
            )
            self.db.add(search_history)
            self.db.commit()
            self.db.refresh(search_history)
            return search_history
        except SQLAlchemyError:
            self.db.rollback()
            return None
    
    def get_search_history(self, user_id: int, include_favorites_only: bool = False, limit: int = 20) -> List[SearchHistory]:
        """
        Get search history for a user
        """
        try:
            query = self.db.query(SearchHistory).filter(SearchHistory.user_id == user_id)
            
            if include_favorites_only:
                query = query.filter(SearchHistory.is_favorite == True)
            
            return query.order_by(SearchHistory.searched_at.desc()).limit(limit).all()
        except SQLAlchemyError:
            return []
    
    def toggle_favorite_search(self, history_id: int, user_id: int) -> bool:
        """
        Toggle favorite status for a search in history
        """
        try:
            search_history = self.db.query(SearchHistory).filter(
                and_(
                    SearchHistory.id == history_id,
                    SearchHistory.user_id == user_id
                )
            ).first()
            
            if search_history:
                search_history.is_favorite = not search_history.is_favorite
                self.db.commit()
                return True
            return False
        except SQLAlchemyError:
            self.db.rollback()
            return False
    
    def get_popular_searches(self, limit: int = 10) -> List[Dict]:
        """
        Get popular searches across all users
        """
        try:
            # This would typically look at commonly searched terms
            # For now, return recently saved public searches
            popular_searches = self.db.query(SavedSearch).filter(
                SavedSearch.is_public == True
            ).order_by(SavedSearch.created_at.desc()).limit(limit).all()
            
            return [{
                'id': search.id,
                'name': search.name,
                'search_query': search.search_query,
                'created_at': search.created_at.isoformat() if search.created_at else None,
                'user': {
                    'id': search.user.id,
                    'username': search.user.username,
                    'full_name': f"{search.user.first_name} {search.user.last_name}"
                }
            } for search in popular_searches]
        except SQLAlchemyError:
            return []


# Global search service instance
search_service = None

def get_search_service(db: Session) -> SearchService:
    """
    Get search service instance
    """
    global search_service
    if search_service is None:
        search_service = SearchService(db)
    else:
        search_service.db = db  # Update session
    return search_service