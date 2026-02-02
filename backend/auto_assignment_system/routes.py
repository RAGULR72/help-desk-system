"""
Auto-Assignment System API Routes
RESTful endpoints for managing auto-assignment
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from typing import List, Optional
from datetime import datetime, timedelta

from database import get_db
from auth import get_current_user, require_roles
from models import User

from .models import (
    AssignmentRule, TechnicianSkill, TechnicianAvailability,
    AssignmentHistory, AutoAssignmentConfig, get_ist
)
from .schemas import (
    AssignmentRuleCreate, AssignmentRuleUpdate, AssignmentRuleResponse,
    TechnicianSkillCreate, TechnicianSkillUpdate, TechnicianSkillResponse,
    TechnicianAvailabilityCreate, TechnicianAvailabilityUpdate, TechnicianAvailabilityResponse,
    AssignmentHistoryResponse, AutoAssignmentConfigUpdate, AutoAssignmentConfigResponse,
    AssignTicketRequest, AssignTicketResponse, AnalyticsRequest, AnalyticsResponse,
    WorkloadHeatmapResponse, WorkloadHeatmapItem
)
from .service import AutoAssignmentService

router = APIRouter(prefix="/api/auto-assignment", tags=["Auto Assignment"])


# ========== Assignment Rules ==========
@router.get("/rules", response_model=List[AssignmentRuleResponse])
def get_assignment_rules(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get all assignment rules"""
    rules = db.query(AssignmentRule).order_by(AssignmentRule.priority.desc()).all()
    return rules


@router.post("/rules", response_model=AssignmentRuleResponse, status_code=status.HTTP_201_CREATED)
def create_assignment_rule(
    rule: AssignmentRuleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """Create a new assignment rule"""
    db_rule = AssignmentRule(**rule.model_dump(), created_by=current_user.id)
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.get("/rules/{rule_id}", response_model=AssignmentRuleResponse)
def get_assignment_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get specific assignment rule"""
    rule = db.query(AssignmentRule).filter(AssignmentRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")
    return rule


@router.put("/rules/{rule_id}", response_model=AssignmentRuleResponse)
def update_assignment_rule(
    rule_id: int,
    rule_update: AssignmentRuleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """Update an assignment rule"""
    db_rule = db.query(AssignmentRule).filter(AssignmentRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")
    
    for key, value in rule_update.model_dump(exclude_unset=True).items():
        setattr(db_rule, key, value)
    
    db_rule.updated_at = get_ist()
    db.commit()
    db.refresh(db_rule)
    return db_rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_assignment_rule(
    rule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """Delete an assignment rule"""
    db_rule = db.query(AssignmentRule).filter(AssignmentRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Assignment rule not found")
    
    db.delete(db_rule)
    db.commit()
    return None


# ========== Technician Skills ==========
@router.get("/skills", response_model=List[TechnicianSkillResponse])
def get_all_skills(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager', 'technician']))
):
    """Get technician skills (optionally filtered by user)"""
    query = db.query(TechnicianSkill)
    
    if user_id:
        query = query.filter(TechnicianSkill.user_id == user_id)
    elif current_user.role == 'technician':
        # Technicians can only see their own skills
        query = query.filter(TechnicianSkill.user_id == current_user.id)
    
    skills = query.all()
    return skills


@router.post("/skills", response_model=TechnicianSkillResponse, status_code=status.HTTP_201_CREATED)
def create_technician_skill(
    skill: TechnicianSkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Add a skill to a technician"""
    # Check if skill already exists
    existing = db.query(TechnicianSkill).filter(
        and_(
            TechnicianSkill.user_id == skill.user_id,
            TechnicianSkill.skill_name == skill.skill_name
        )
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Skill already exists for this technician")
    
    db_skill = TechnicianSkill(**skill.model_dump())
    db.add(db_skill)
    db.commit()
    db.refresh(db_skill)
    return db_skill


@router.put("/skills/{skill_id}", response_model=TechnicianSkillResponse)
def update_technician_skill(
    skill_id: int,
    skill_update: TechnicianSkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Update a technician skill"""
    db_skill = db.query(TechnicianSkill).filter(TechnicianSkill.id == skill_id).first()
    if not db_skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    for key, value in skill_update.model_dump(exclude_unset=True).items():
        setattr(db_skill, key, value)
    
    db_skill.updated_at = get_ist()
    db.commit()
    db.refresh(db_skill)
    return db_skill


@router.delete("/skills/{skill_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_technician_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Delete a technician skill"""
    db_skill = db.query(TechnicianSkill).filter(TechnicianSkill.id == skill_id).first()
    if not db_skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    
    db.delete(db_skill)
    db.commit()
    return None


# ========== Technician Availability ==========
@router.get("/availability", response_model=List[TechnicianAvailabilityResponse])
def get_all_availability(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get availability status for all technicians"""
    availability = db.query(TechnicianAvailability).all()
    return availability


@router.get("/availability/{user_id}", response_model=TechnicianAvailabilityResponse)
def get_technician_availability(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get availability for a specific technician"""
    # Users can view their own, admins/managers can view all
    if current_user.role not in ['admin', 'manager'] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to view this availability")
    
    availability = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.user_id == user_id
    ).first()
    
    if not availability:
        raise HTTPException(status_code=404, detail="Availability record not found")
    
    return availability


@router.post("/availability", response_model=TechnicianAvailabilityResponse, status_code=status.HTTP_201_CREATED)
def create_availability(
    availability: TechnicianAvailabilityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Create availability record for a technician"""
    existing = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.user_id == availability.user_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Availability record already exists")
    
    db_availability = TechnicianAvailability(**availability.model_dump())
    db.add(db_availability)
    db.commit()
    db.refresh(db_availability)
    return db_availability


@router.put("/availability/{user_id}", response_model=TechnicianAvailabilityResponse)
def update_availability(
    user_id: int,
    availability_update: TechnicianAvailabilityUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update technician availability"""
    # Users can update their own, admins/managers can update all
    if current_user.role not in ['admin', 'manager'] and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to update this availability")
    
    db_availability = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.user_id == user_id
    ).first()
    
    if not db_availability:
        raise HTTPException(status_code=404, detail="Availability record not found")
    
    for key, value in availability_update.model_dump(exclude_unset=True).items():
        setattr(db_availability, key, value)
    
    db_availability.updated_at = get_ist()
    db.commit()
    db.refresh(db_availability)
    return db_availability


# ========== Configuration ==========
@router.get("/config", response_model=AutoAssignmentConfigResponse)
def get_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get auto-assignment configuration"""
    config = db.query(AutoAssignmentConfig).first()
    if not config:
        # Create default config
        config = AutoAssignmentConfig()
        db.add(config)
        db.commit()
        db.refresh(config)
    return config


@router.put("/config", response_model=AutoAssignmentConfigResponse)
def update_config(
    config_update: AutoAssignmentConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin']))
):
    """Update auto-assignment configuration"""
    db_config = db.query(AutoAssignmentConfig).first()
    
    if not db_config:
        db_config = AutoAssignmentConfig()
        db.add(db_config)
    
    for key, value in config_update.model_dump(exclude_unset=True).items():
        setattr(db_config, key, value)
    
    db_config.updated_by = current_user.id
    db_config.updated_at = get_ist()
    db.commit()
    db.refresh(db_config)
    return db_config


# ========== Assignment Actions ==========
@router.post("/assign", response_model=AssignTicketResponse)
def assign_ticket(
    request: AssignTicketRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager', 'technician']))
):
    """Manually trigger auto-assignment for a ticket"""
    service = AutoAssignmentService(db)
    
    assigned_to = service.assign_ticket(request.ticket_id, force=request.force)
    
    if assigned_to:
        return AssignTicketResponse(
            success=True,
            assigned_to=assigned_to,
            message=f"Ticket successfully assigned to technician {assigned_to}"
        )
    else:
        return AssignTicketResponse(
            success=False,
            assigned_to=None,
            message="Failed to find suitable technician for assignment"
        )


# ========== History & Analytics ==========
@router.get("/history", response_model=List[AssignmentHistoryResponse])
def get_assignment_history(
    ticket_id: Optional[int] = None,
    technician_id: Optional[int] = None,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get assignment history with optional filters"""
    query = db.query(AssignmentHistory)
    
    if ticket_id:
        query = query.filter(AssignmentHistory.ticket_id == ticket_id)
    
    if technician_id:
        query = query.filter(AssignmentHistory.assigned_to == technician_id)
    
    history = query.order_by(AssignmentHistory.assigned_at.desc()).limit(limit).all()
    return history


@router.post("/analytics", response_model=AnalyticsResponse)
def get_analytics(
    request: AnalyticsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get auto-assignment analytics"""
    query = db.query(AssignmentHistory)
    
    # Apply filters
    if request.start_date:
        query = query.filter(AssignmentHistory.assigned_at >= request.start_date)
    
    if request.end_date:
        query = query.filter(AssignmentHistory.assigned_at <= request.end_date)
    
    if request.technician_id:
        query = query.filter(AssignmentHistory.assigned_to == request.technician_id)
    
    assignments = query.all()
    
    if not assignments:
        return AnalyticsResponse(
            total_assignments=0,
            auto_assignments=0,
            manual_assignments=0,
            avg_skill_match=0.0,
            avg_workload_score=0.0,
            avg_resolution_time=0.0,
            avg_customer_rating=0.0,
            strategy_breakdown={},
            top_performers=[]
        )
    
    # Calculate metrics
    total = len(assignments)
    auto = sum(1 for a in assignments if a.assigned_by == 'auto')
    manual = total - auto
    
    avg_skill = sum(a.skill_match_score for a in assignments) / total
    avg_workload = sum(a.workload_score for a in assignments) / total
    
    resolved = [a for a in assignments if a.resolution_time_hours is not None]
    avg_resolution = sum(a.resolution_time_hours for a in resolved) / len(resolved) if resolved else 0.0
    
    rated = [a for a in assignments if a.customer_rating is not None]
    avg_rating = sum(a.customer_rating for a in rated) / len(rated) if rated else 0.0
    
    # Strategy breakdown
    strategy_breakdown = {}
    for a in assignments:
        if a.strategy_used:
            strategy_breakdown[a.strategy_used] = strategy_breakdown.get(a.strategy_used, 0) + 1
    
    # Top performers
    tech_performance = {}
    for a in assignments:
        if a.assigned_to not in tech_performance:
            tech_performance[a.assigned_to] = {
                'technician_id': a.assigned_to,
                'assignments': 0,
                'avg_rating': 0.0,
                'ratings_count': 0,
                'avg_resolution_time': 0.0,
                'resolution_count': 0
            }
        
        tech_performance[a.assigned_to]['assignments'] += 1
        
        if a.customer_rating:
            tech_performance[a.assigned_to]['avg_rating'] += a.customer_rating
            tech_performance[a.assigned_to]['ratings_count'] += 1
        
        if a.resolution_time_hours:
            tech_performance[a.assigned_to]['avg_resolution_time'] += a.resolution_time_hours
            tech_performance[a.assigned_to]['resolution_count'] += 1
    
    # Calculate averages
    for tech_id, perf in tech_performance.items():
        if perf['ratings_count'] > 0:
            perf['avg_rating'] = perf['avg_rating'] / perf['ratings_count']
        if perf['resolution_count'] > 0:
            perf['avg_resolution_time'] = perf['avg_resolution_time'] / perf['resolution_count']
    
    # Sort by rating and get top 5
    top_performers = sorted(
        tech_performance.values(),
        key=lambda x: (x['avg_rating'], -x['avg_resolution_time']),
        reverse=True
    )[:5]
    
    return AnalyticsResponse(
        total_assignments=total,
        auto_assignments=auto,
        manual_assignments=manual,
        avg_skill_match=avg_skill,
        avg_workload_score=avg_workload,
        avg_resolution_time=avg_resolution,
        avg_customer_rating=avg_rating,
        strategy_breakdown=strategy_breakdown,
        top_performers=top_performers
    )


@router.get("/workload-heatmap", response_model=WorkloadHeatmapResponse)
def get_workload_heatmap(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(['admin', 'manager']))
):
    """Get real-time workload and online status for all technicians"""
    from ws_manager import manager
    from .schemas import WorkloadHeatmapItem
    
    # 1. Get all active technicians
    technicians = db.query(User).filter(
        User.role == "technician", 
        User.status == "Active"
    ).all()
    
    heatmap_data = []
    
    for tech in technicians:
        # Get availability data
        availability = db.query(TechnicianAvailability).filter(
            TechnicianAvailability.user_id == tech.id
        ).first()
        
        # Check online status from WS manager
        is_online = tech.id in manager.active_connections
        
        item = WorkloadHeatmapItem(
            user_id=tech.id,
            full_name=tech.full_name or tech.username,
            username=tech.username,
            active_tickets=availability.active_tickets if availability else 0,
            max_capacity=availability.max_capacity if availability else 10,
            is_online=is_online,
            status=availability.status if availability else "available",
            avatar_url=tech.avatar_url
        )
        heatmap_data.append(item)
    
    return WorkloadHeatmapResponse(
        technicians=heatmap_data,
        timestamp=get_ist()
    )
