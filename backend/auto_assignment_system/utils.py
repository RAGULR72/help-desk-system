"""
Common utilities for Auto-Assignment System
Shared functionality used across the system
"""

from sqlalchemy.orm import Session
from typing import Optional
from .service import AutoAssignmentService


from .ai_dispatcher import assign_ticket_with_ai, get_ai_dispatcher_config


def trigger_auto_assignment(db: Session, ticket_id: int, force: bool = False) -> Optional[int]:
    """
    Utility function to trigger auto-assignment for a ticket.
    Checks for global Auto-Assignment toggle first.
    """
    from admin_system.models import SystemSettings
    
    # 1. Check Global Toggle
    is_enabled = db.query(SystemSettings).filter(SystemSettings.key == "auto_assignment_enabled").first()
    if is_enabled and is_enabled.value != "true":
        print(f"Auto-Assignment is globally disabled for ticket {ticket_id}")
        return None

    # 2. Use Service for Assignment (AI or Balanced)
    service = AutoAssignmentService(db)
    return service.assign_ticket(ticket_id, force=force)


def trigger_auto_assignment_wrapper(ticket_id: int):
    """Background task wrapper that creates its own DB session"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        trigger_auto_assignment(db, ticket_id)
    finally:
        db.close()


def update_on_ticket_status_change(db: Session, ticket_id: int, new_status: str):
    """
    Update auto-assignment metrics when ticket status changes
    
    Args:
        db: Database session
        ticket_id: ID of the ticket
        new_status: New status of the ticket
    """
    service = AutoAssignmentService(db)
    
    if new_status in ['resolved', 'closed']:
        service.update_on_ticket_close(ticket_id)


def get_technician_workload(db: Session, user_id: int) -> dict:
    """
    Get current workload for a technician
    
    Args:
        db: Database session
        user_id: Technician's user ID
    
    Returns:
        Dictionary with workload information
    """
    from .models import TechnicianAvailability
    from ticket_system.models import Ticket
    
    availability = db.query(TechnicianAvailability).filter(
        TechnicianAvailability.user_id == user_id
    ).first()
    
    active_tickets = db.query(Ticket).filter(
        Ticket.assigned_to == user_id,
        Ticket.status.in_(['open', 'in_progress'])
    ).count()
    
    if availability:
        return {
            'user_id': user_id,
            'active_tickets': availability.active_tickets,
            'max_capacity': availability.max_capacity,
            'status': availability.status,
            'utilization_percent': (availability.active_tickets / availability.max_capacity * 100) if availability.max_capacity > 0 else 0
        }
    
    return {
        'user_id': user_id,
        'active_tickets': active_tickets,
        'max_capacity': 10,
        'status': 'unknown',
        'utilization_percent': (active_tickets / 10 * 100)
    }


def is_auto_assignment_enabled(db: Session) -> bool:
    """
    Check if auto-assignment is currently enabled
    
    Args:
        db: Database session
    
    Returns:
        Boolean indicating if auto-assignment is enabled
    """
    from .models import AutoAssignmentConfig
    
    config = db.query(AutoAssignmentConfig).first()
    return config.is_enabled if config else False
