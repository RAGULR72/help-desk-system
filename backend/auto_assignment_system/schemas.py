"""
Pydantic Schemas for Auto-Assignment System
Request/Response models for API endpoints
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Assignment Rule Schemas
class AssignmentRuleBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True
    priority: int = 0
    criteria: Dict[str, Any] = {}
    strategy: str = 'balanced'
    tech_pool: List[Any] = []
    consider_workload: bool = True
    consider_skills: bool = True
    consider_location: bool = False
    consider_performance: bool = True
    max_tickets_per_tech: int = 10


class AssignmentRuleCreate(AssignmentRuleBase):
    created_by: Optional[int] = None


class AssignmentRuleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    criteria: Optional[Dict[str, Any]] = None
    strategy: Optional[str] = None
    tech_pool: Optional[List[Any]] = None
    consider_workload: Optional[bool] = None
    consider_skills: Optional[bool] = None
    consider_location: Optional[bool] = None
    consider_performance: Optional[bool] = None
    max_tickets_per_tech: Optional[int] = None


class AssignmentRuleResponse(AssignmentRuleBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Technician Skill Schemas
class TechnicianSkillBase(BaseModel):
    user_id: int
    skill_name: str
    proficiency_level: int = Field(ge=1, le=5)
    is_certified: bool = False
    certification_name: Optional[str] = None


class TechnicianSkillCreate(TechnicianSkillBase):
    pass


class TechnicianSkillUpdate(BaseModel):
    skill_name: Optional[str] = None
    proficiency_level: Optional[int] = Field(None, ge=1, le=5)
    is_certified: Optional[bool] = None
    certification_name: Optional[str] = None


class TechnicianSkillResponse(TechnicianSkillBase):
    id: int
    tickets_resolved: int
    avg_resolution_time_hours: float
    customer_satisfaction: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Technician Availability Schemas
class TechnicianAvailabilityBase(BaseModel):
    user_id: int
    status: str = 'available'
    working_hours: Dict[str, Any] = {}
    active_tickets: int = 0
    max_capacity: int = 10
    current_location: Optional[str] = None
    is_field_tech: bool = False


class TechnicianAvailabilityCreate(TechnicianAvailabilityBase):
    pass


class TechnicianAvailabilityUpdate(BaseModel):
    status: Optional[str] = None
    working_hours: Optional[Dict[str, Any]] = None
    active_tickets: Optional[int] = None
    max_capacity: Optional[int] = None
    current_location: Optional[str] = None
    is_field_tech: Optional[bool] = None


class TechnicianAvailabilityResponse(TechnicianAvailabilityBase):
    id: int
    last_active_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Assignment History Schemas
class AssignmentHistoryResponse(BaseModel):
    id: int
    ticket_id: int
    assigned_to: int
    assigned_by: str
    rule_id: Optional[int]
    strategy_used: Optional[str]
    skill_match_score: float
    workload_score: float
    location_score: float
    overall_score: float
    was_reassigned: bool
    reassignment_reason: Optional[str]
    resolution_time_hours: Optional[float]
    customer_rating: Optional[int]
    assignment_metadata: Optional[Dict[str, Any]]
    assigned_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


# Auto-Assignment Config Schemas
class AutoAssignmentConfigBase(BaseModel):
    is_enabled: bool = True
    default_strategy: str = 'balanced'
    skill_weight: int = 40
    workload_weight: int = 30
    performance_weight: int = 20
    location_weight: int = 10
    fallback_to_manager: bool = True
    manager_id: Optional[int] = None
    notify_on_assignment: bool = True
    notify_tech_via_email: bool = True
    notify_tech_via_sms: bool = False
    prevent_overload: bool = True
    respect_working_hours: bool = True


class AutoAssignmentConfigUpdate(BaseModel):
    is_enabled: Optional[bool] = None
    default_strategy: Optional[str] = None
    skill_weight: Optional[int] = None
    workload_weight: Optional[int] = None
    performance_weight: Optional[int] = None
    location_weight: Optional[int] = None
    fallback_to_manager: Optional[bool] = None
    manager_id: Optional[int] = None
    notify_on_assignment: Optional[bool] = None
    notify_tech_via_email: Optional[bool] = None
    notify_tech_via_sms: Optional[bool] = None
    prevent_overload: Optional[bool] = None
    respect_working_hours: Optional[bool] = None
    updated_by: Optional[int] = None


class AutoAssignmentConfigResponse(AutoAssignmentConfigBase):
    id: int
    updated_at: datetime
    updated_by: Optional[int]

    class Config:
        from_attributes = True


# Request/Response for Manual Actions
class AssignTicketRequest(BaseModel):
    ticket_id: int
    force: bool = False


class AssignTicketResponse(BaseModel):
    success: bool
    assigned_to: Optional[int]
    message: str


class AnalyticsRequest(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    technician_id: Optional[int] = None


class AnalyticsResponse(BaseModel):
    total_assignments: int
    auto_assignments: int
    manual_assignments: int
    avg_skill_match: float
    avg_workload_score: float
    avg_resolution_time: float
    avg_customer_rating: float
    strategy_breakdown: Dict[str, int]
    top_performers: List[Dict[str, Any]]


class WorkloadHeatmapItem(BaseModel):
    user_id: int
    full_name: str
    username: str
    active_tickets: int
    max_capacity: int
    is_online: bool
    status: str
    avatar_url: Optional[str] = None


class WorkloadHeatmapResponse(BaseModel):
    technicians: List[WorkloadHeatmapItem]
    timestamp: datetime
