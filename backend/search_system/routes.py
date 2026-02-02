"""
Search routes for the help desk application
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
import json

from database import get_db
from auth import get_current_user
from models import User
from search_system.service import get_search_service
from search_system.schemas import (
    SearchRequest,
    SearchResponse,
    SavedSearchRequest,
    SavedSearchResponse,
    SearchHistoryResponse,
    AdvancedSearchRequest
)

router = APIRouter(prefix="/search", tags=["search"])


@router.post("/full-text", response_model=SearchResponse)
async def full_text_search(
    request: SearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform full-text search across tickets, users, and comments
    """
    service = get_search_service(db)
    
    # Add to search history
    service.add_to_search_history(
        user_id=current_user.id,
        search_query=request.query,
        results_count=0  # Will update after getting results
    )
    
    # Perform search
    results = service.full_text_search(
        query=request.query,
        entity_types=request.entity_types,
        limit=request.limit,
        offset=request.offset
    )
    
    # Update search history with results count
    # Note: In a real implementation, we'd need to update the count in the history
    # after we know the total results
    
    return SearchResponse(
        query=request.query,
        results=results,
        total=len(results)
    )


@router.post("/advanced", response_model=SearchResponse)
async def advanced_search(
    request: AdvancedSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Perform advanced search with filters
    """
    service = get_search_service(db)
    
    # Add to search history
    service.add_to_search_history(
        user_id=current_user.id,
        search_query=request.query,
        results_count=0  # Will update after getting results
    )
    
    # Perform advanced search
    results = service.advanced_search(
        query=request.query,
        filters=request.filters,
        limit=request.limit,
        offset=request.offset
    )
    
    return SearchResponse(
        query=request.query,
        results=results,
        total=len(results)
    )


@router.post("/save", response_model=SavedSearchResponse)
async def save_search(
    request: SavedSearchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Save a search query for future use
    """
    if current_user.role not in ["admin", "manager", "agent", "user"]:
        raise HTTPException(status_code=403, detail="Not authorized to save searches")
    
    service = get_search_service(db)
    
    saved_search = service.save_search(
        user_id=current_user.id,
        name=request.name,
        search_query=request.search_query,
        filters=request.filters,
        is_public=request.is_public
    )
    
    if not saved_search:
        raise HTTPException(status_code=500, detail="Failed to save search")
    
    return SavedSearchResponse(
        id=saved_search.id,
        user_id=saved_search.user_id,
        name=saved_search.name,
        search_query=saved_search.search_query,
        filters=json.loads(saved_search.filters) if saved_search.filters else None,
        is_public=saved_search.is_public,
        created_at=saved_search.created_at.isoformat()
    )


@router.get("/saved", response_model=List[SavedSearchResponse])
async def get_saved_searches(
    include_public: bool = Query(True, description="Include public searches"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get saved searches for the current user
    """
    service = get_search_service(db)
    
    saved_searches = service.get_saved_searches(
        user_id=current_user.id,
        include_public=include_public
    )
    
    return [
        SavedSearchResponse(
            id=search.id,
            user_id=search.user_id,
            name=search.name,
            search_query=search.search_query,
            filters=json.loads(search.filters) if search.filters else None,
            is_public=search.is_public,
            created_at=search.created_at.isoformat()
        ) for search in saved_searches
    ]


@router.delete("/saved/{search_id}")
async def delete_saved_search(
    search_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a saved search
    """
    service = get_search_service(db)
    
    success = service.delete_saved_search(search_id=search_id, user_id=current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Saved search not found or unauthorized")
    
    return {"message": "Saved search deleted successfully"}


@router.get("/history", response_model=List[SearchHistoryResponse])
async def get_search_history(
    favorites_only: bool = Query(False, description="Get only favorite searches"),
    limit: int = Query(20, ge=1, le=100, description="Number of results to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get search history for the current user
    """
    service = get_search_service(db)
    
    history_items = service.get_search_history(
        user_id=current_user.id,
        include_favorites_only=favorites_only,
        limit=limit
    )
    
    return [
        SearchHistoryResponse(
            id=item.id,
            search_query=item.search_query,
            results_count=item.search_results_count,
            is_favorite=item.is_favorite,
            searched_at=item.searched_at.isoformat()
        ) for item in history_items
    ]


@router.patch("/history/{history_id}/favorite")
async def toggle_favorite_search(
    history_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle favorite status for a search in history
    """
    service = get_search_service(db)
    
    success = service.toggle_favorite_search(history_id=history_id, user_id=current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Search history item not found or unauthorized")
    
    return {"message": "Favorite status updated successfully"}


@router.get("/popular", response_model=List[Dict])
async def get_popular_searches(
    limit: int = Query(10, ge=1, le=50, description="Number of results to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get popular searches across all users
    """
    service = get_search_service(db)
    
    popular_searches = service.get_popular_searches(limit=limit)
    
    return popular_searches


# Initialize search indexes when the module is loaded
def init_search_indexes(db: Session):
    """
    Initialize search indexes for existing data
    """
    service = get_search_service(db)
    service.update_search_indexes()


# Note: This would typically be called when the app starts up
# For now, we'll just define the function