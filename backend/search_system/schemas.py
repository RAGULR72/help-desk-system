"""
Search schemas for the help desk application
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class SearchRequest(BaseModel):
    query: str
    entity_types: Optional[List[str]] = None
    limit: int = 50
    offset: int = 0


class SearchResult(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    title: Optional[str] = None
    content_preview: str
    tags: List[str]
    created_at: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total: int


class AdvancedSearchRequest(SearchRequest):
    filters: Optional[Dict[str, Any]] = None


class SavedSearchRequest(BaseModel):
    name: str
    search_query: str
    filters: Optional[Dict[str, Any]] = None
    is_public: bool = False


class SavedSearchResponse(BaseModel):
    id: int
    user_id: int
    name: str
    search_query: str
    filters: Optional[Dict[str, Any]] = None
    is_public: bool
    created_at: str


class SearchHistoryResponse(BaseModel):
    id: int
    search_query: str
    results_count: int
    is_favorite: bool
    searched_at: str