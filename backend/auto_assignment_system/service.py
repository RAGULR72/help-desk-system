"""
Auto-Assignment Service
Core logic for intelligent ticket assignment
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
import json

from .models import (
    AssignmentRule, TechnicianSkill, TechnicianAvailability,
    AssignmentHistory, AutoAssignmentConfig
)
from ticket_system.models import Ticket
from models import User, get_ist


class AutoAssignmentService:
    """Service class for handling automatic ticket assignment"""
    
    def __init__(self, db: Session):
        self.db = db
        self.config = self._load_config()
    
    def _load_config(self) -> AutoAssignmentConfig:
        """Load global auto-assignment configuration"""
        config = self.db.query(AutoAssignmentConfig).first()
        if not config:
            # Create default config if not exists
            config = AutoAssignmentConfig(
                is_enabled=True,
                default_strategy='balanced',
                skill_weight=40,
                workload_weight=30,
                performance_weight=20,
                location_weight=10
            )
            self.db.add(config)
            self.db.commit()
            self.db.refresh(config)
        return config
    
    def assign_ticket(self, ticket_id: int, force: bool = False) -> Optional[int]:
        """
        Intelligent ticket assignment. 
        Tries AI Dispatcher first (if enabled), then falls back to Balanced Scoring.
        """
        from .ai_dispatcher import assign_ticket_with_ai, get_ai_dispatcher_config
        
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            return None

        # 1. Try AI Dispatcher
        if get_ai_dispatcher_config(self.db):
            return assign_ticket_with_ai(self.db, ticket_id)
        
        # 2. Fallback: Balanced Manual Assignment
        # Get all active technicians
        technicians = self.db.query(User).filter(User.role == "technician", User.status == "Active").all()
        if not technicians:
            return None

        best_tech_id = None
        max_total_score = -1

        for tech in technicians:
            # Skip if tech is at max capacity
            availability = self.db.query(TechnicianAvailability).filter(TechnicianAvailability.user_id == tech.id).first()
            if availability and availability.active_tickets >= availability.max_capacity:
                continue

            # Calculate weighted score
            skill_score = self._calculate_skill_match(tech.id, ticket) * (self.config.skill_weight / 100)
            workload_score = self._calculate_workload_score(tech.id) * (self.config.workload_weight / 100)
            perf_score = self._calculate_performance_score(tech.id) * (self.config.performance_weight / 100)
            loc_score = self._calculate_location_score(tech.id, ticket) * (self.config.location_weight / 100)

            total_score = skill_score + workload_score + perf_score + loc_score

            if total_score > max_total_score:
                max_total_score = total_score
                best_tech_id = tech.id

        if best_tech_id:
            # Assign ticket
            ticket.assigned_to = best_tech_id
            
            # Update history
            history = json.loads(ticket.ticket_history or "[]")
            history = [h for h in history if h.get("type") != "assignment_pending"]
            history.append({
                "type": "auto_assignment",
                "description": f"Ticket automatically assigned to technician based on workload and skills (Score: {round(max_total_score, 1)}).",
                "timestamp": get_ist().isoformat()
            })
            ticket.ticket_history = json.dumps(history)
            
            # Update workload
            self._update_technician_workload(best_tech_id, increment=1)
            self.db.commit()
            return best_tech_id
        
        return None
    
    def _calculate_skill_match(self, user_id: int, ticket: Ticket) -> float:
        """Calculate skill match score (0-100)"""
        # Map ticket category to skill name
        category_skill_map = {
            'Hardware': 'Hardware',
            'Software': 'Software',
            'Network': 'Network',
            'Firewall': 'Firewall',
            'Server': 'Server',
            'Database': 'Database',
            'Printer': 'Hardware',
            'Email': 'Software',
        }
        
        required_skill = category_skill_map.get(ticket.category, ticket.category)
        
        skill = self.db.query(TechnicianSkill).filter(
            TechnicianSkill.user_id == user_id,
            TechnicianSkill.skill_name == required_skill
        ).first()
        
        if skill:
            # Convert proficiency (1-5) to score (0-100)
            base_score = skill.proficiency_level * 20
            
            # Bonus for certification
            if skill.is_certified:
                base_score = min(100, base_score + 10)
            
            return base_score
        
        # Check user's general specialization
        user = self.db.query(User).filter(User.id == user_id).first()
        if user and user.specialization and required_skill in user.specialization:
            return 60.0  # Moderate match
        
        return 30.0  # Low/no match
    
    def _calculate_workload_score(self, user_id: int) -> float:
        """Calculate workload score (0-100, higher = less busy)"""
        availability = self.db.query(TechnicianAvailability).filter(
            TechnicianAvailability.user_id == user_id
        ).first()
        
        if availability:
            if availability.max_capacity == 0:
                return 50.0
            
            utilization = availability.active_tickets / availability.max_capacity
            # Invert so lower workload = higher score
            return max(0, 100 - (utilization * 100))
        
        # Count active tickets
        active_count = self.db.query(Ticket).filter(
            Ticket.assigned_to == user_id,
            Ticket.status.in_(['open', 'in_progress'])
        ).count()
        
        # Assume max 10, invert score
        return max(0, 100 - (active_count * 10))
    
    def _calculate_performance_score(self, user_id: int) -> float:
        """Calculate performance score based on past performance (0-100)"""
        # Get average customer rating
        avg_rating = self.db.query(func.avg(Ticket.rating)).filter(
            Ticket.assigned_to == user_id,
            Ticket.rating.isnot(None)
        ).scalar()
        
        if avg_rating:
            # Convert 1-5 rating to 0-100 score
            return (avg_rating / 5) * 100
        
        # Check skills table for aggregated performance
        skills = self.db.query(TechnicianSkill).filter(
            TechnicianSkill.user_id == user_id
        ).all()
        
        if skills:
            avg_satisfaction = sum(s.customer_satisfaction for s in skills) / len(skills)
            return (avg_satisfaction / 5) * 100
        
        return 70.0  # Default moderate score
    
    def _calculate_location_score(self, user_id: int, ticket: Ticket) -> float:
        """Calculate location proximity score (0-100)"""
        # Placeholder for location-based scoring
        # In a full implementation, this would use geolocation data
        
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            return 50.0
        
        # Simple location match
        if user.location and ticket.owner and user.location == ticket.owner.location:
            return 100.0
        
        return 50.0  # Neutral score if no location data
    
    def _update_technician_workload(self, user_id: int, increment: int = 1):
        """Update technician's active ticket count"""
        availability = self.db.query(TechnicianAvailability).filter(
            TechnicianAvailability.user_id == user_id
        ).first()
        
        if availability:
            availability.active_tickets += increment
            availability.updated_at = get_ist()
        else:
            # Create availability record
            availability = TechnicianAvailability(
                user_id=user_id,
                active_tickets=max(0, increment),
                status='available'
            )
            self.db.add(availability)
        
        self.db.commit()
    
    def _record_assignment(
        self, 
        ticket: Ticket, 
        technician: User, 
        rule: Optional[AssignmentRule],
        strategy: str
    ):
        """Record assignment history for analytics"""
        history = AssignmentHistory(
            ticket_id=ticket.id,
            assigned_to=technician.id,
            assigned_by='auto',
            rule_id=rule.id if rule else None,
            strategy_used=strategy,
            skill_match_score=self._calculate_skill_match(technician.id, ticket),
            workload_score=self._calculate_workload_score(technician.id),
            assignment_metadata={
                'ticket_category': ticket.category,
                'ticket_priority': ticket.priority,
                'tech_specialization': technician.specialization
            }
        )
        self.db.add(history)
        self.db.commit()
    
    def update_on_ticket_close(self, ticket_id: int):
        """Update metrics when a ticket is closed"""
        ticket = self.db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket or not ticket.assigned_to:
            return
        
        # Update workload
        self._update_technician_workload(ticket.assigned_to, increment=-1)
        
        # Update assignment history
        history = self.db.query(AssignmentHistory).filter(
            AssignmentHistory.ticket_id == ticket_id
        ).order_by(AssignmentHistory.assigned_at.desc()).first()
        
        if history:
            history.resolved_at = get_ist()
            if ticket.rating:
                history.customer_rating = ticket.rating
            
            # Calculate resolution time
            if ticket.created_at:
                time_diff = get_ist() - ticket.created_at
                history.resolution_time_hours = time_diff.total_seconds() / 3600
            
            self.db.commit()
