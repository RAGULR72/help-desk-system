"""
Workflow automation routes for the help desk application
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from database import get_db
from auth import get_current_user
from workflow_system.workflow_service import get_workflow_service
from ticket_system.models import Ticket
from workflow_system.workflow_models import WorkflowStatus, WorkflowCategory, WorkflowRule, WorkflowTemplate, WorkflowInstance, WorkflowApproval
from workflow_system.workflow_schemas import (
    WorkflowTemplateRequest,
    WorkflowTemplateResponse,
    WorkflowInstanceResponse,
    WorkflowRuleRequest,
    WorkflowRuleResponse,
    WorkflowApprovalRequest,
    WorkflowApprovalResponse,
    WorkflowEscalationRequest,
    WorkflowEscalationResponse,
    WorkflowCategoryCreate,
    WorkflowCategoryResponse,
    WorkflowConfigAggregateResponse
)

router = APIRouter(prefix="/api/workflows", tags=["workflows"])


@router.post("/templates", response_model=WorkflowTemplateResponse)
async def create_workflow_template(
    request: WorkflowTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new workflow template
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to create workflows")
    
    service = get_workflow_service(db)
    
    template = service.create_workflow_template(
        name=request.name,
        description=request.description,
        category=request.category,
        definition=request.definition,
        created_by=current_user['id'],
        status=WorkflowStatus.DRAFT
    )
    
    if not template:
        raise HTTPException(status_code=500, detail="Failed to create workflow template")
    
    return WorkflowTemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        category=template.category,
        status=template.status.value,
        definition=template.definition,
        created_by=template.created_by,
        creator_name=f"{template.creator.first_name} {template.creator.last_name}" if template.creator else "Unknown",
        created_at=template.created_at.isoformat() if template.created_at else None,
        updated_at=template.updated_at.isoformat() if template.updated_at else None
    )


@router.get("/templates/{template_id}", response_model=WorkflowTemplateResponse)
async def get_workflow_template(
    template_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a workflow template by ID
    """
    service = get_workflow_service(db)
    
    template = service.get_workflow_template(template_id)
    
    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    
    if current_user.get("role") not in ["admin", "manager"] and template.created_by != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to view this workflow")
    
    return WorkflowTemplateResponse(
        id=template.id,
        name=template.name,
        description=template.description,
        category=template.category,
        status=template.status.value,
        definition=template.definition,
        created_by=template.created_by,
        creator_name=f"{template.creator.first_name} {template.creator.last_name}" if template.creator else "Unknown",
        created_at=template.created_at.isoformat() if template.created_at else None,
        updated_at=template.updated_at.isoformat() if template.updated_at else None
    )


@router.get("/templates", response_model=List[WorkflowTemplateResponse])
async def get_workflow_templates(
    category: str = None,
    status: str = None,
    limit: int = 20,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get workflow templates with optional filters
    """
    service = get_workflow_service(db)
    
    # Convert status string to enum
    status_enum = None
    if status:
        try:
            status_enum = WorkflowStatus(status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid status value")
    
    templates = service.get_workflow_templates(
        category=category,
        status=status_enum,
        limit=limit,
        offset=offset
    )
    
    # Filter templates based on user role
    if current_user.get("role") not in ["admin", "manager"]:
        templates = [t for t in templates if t.created_by == current_user['id']]
    
    return [
        WorkflowTemplateResponse(
            id=template.id,
            name=template.name,
            description=template.description,
            category=template.category,
            status=template.status.value,
            definition=template.definition,
            created_by=template.created_by,
            creator_name=f"{template.creator.first_name} {template.creator.last_name}" if template.creator else "Unknown",
            created_at=template.created_at.isoformat() if template.created_at else None,
            updated_at=template.updated_at.isoformat() if template.updated_at else None
        ) for template in templates
    ]


@router.put("/templates/{template_id}", response_model=WorkflowTemplateResponse)
async def update_workflow_template(
    template_id: int,
    request: WorkflowTemplateRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update a workflow template
    """
    service = get_workflow_service(db)
    
    # Check if user is authorized to edit this template
    template = service.get_workflow_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    
    if current_user.get("role") not in ["admin", "manager"] and template.created_by != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized to edit this workflow")
    
    success = service.update_workflow_template(
        template_id=template_id,
        name=request.name,
        description=request.description,
        category=request.category,
        definition=request.definition,
        status=WorkflowStatus(request.status) if request.status else None
    )
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update workflow template")
    
    # Return updated template
    updated_template = service.get_workflow_template(template_id)
    return WorkflowTemplateResponse(
        id=updated_template.id,
        name=updated_template.name,
        description=updated_template.description,
        category=updated_template.category,
        status=updated_template.status.value,
        definition=updated_template.definition,
        created_by=updated_template.created_by,
        creator_name=f"{updated_template.creator.first_name} {updated_template.creator.last_name}" if updated_template.creator else "Unknown",
        created_at=updated_template.created_at.isoformat() if updated_template.created_at else None,
        updated_at=updated_template.updated_at.isoformat() if updated_template.updated_at else None
    )


@router.post("/templates/{template_id}/activate")
async def activate_workflow_template(
    template_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Activate a workflow template
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to activate workflows")
    
    service = get_workflow_service(db)
    
    success = service.activate_workflow_template(template_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Workflow template not found")
    
    return {"message": "Workflow template activated successfully"}


@router.post("/instances", response_model=WorkflowInstanceResponse)
async def start_workflow_instance(
    entity_type: str,
    entity_id: int,
    initial_context: dict = None,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Start a new workflow instance
    """
    # In a real implementation, you'd have a more specific request schema
    # For now, we'll use the path parameters directly
    
    # Verify user has access to the entity
    if entity_type == "ticket":
        from ticket_system.models import Ticket
        ticket = db.query(Ticket).filter(Ticket.id == entity_id).first()
        if not ticket or (current_user.get("role") not in ["admin", "manager", "agent"] and ticket.user_id != current_user['id']):
            raise HTTPException(status_code=403, detail="Not authorized to start workflow for this entity")
    
    service = get_workflow_service(db)
    
    # Find an appropriate active workflow template for this entity type
    # In a real system, you'd have more sophisticated logic to select the right template
    template = db.query(WorkflowTemplate).filter(
        and_(
            WorkflowTemplate.status == WorkflowStatus.ACTIVE,
            WorkflowTemplate.category == f"{entity_type}_workflow"  # Simple mapping
        )
    ).first()
    
    if not template:
        # Default to a general workflow if no specific one is found
        template = db.query(WorkflowTemplate).filter(
            and_(
                WorkflowTemplate.status == WorkflowStatus.ACTIVE,
                WorkflowTemplate.name.contains("Default")
            )
        ).first()
    
    if not template:
        raise HTTPException(status_code=404, detail="No active workflow template found for this entity type")
    
    instance = service.start_workflow_instance(
        template_id=template.id,
        entity_type=entity_type,
        entity_id=entity_id,
        initial_context=initial_context
    )
    
    if not instance:
        raise HTTPException(status_code=500, detail="Failed to start workflow instance")
    
    return WorkflowInstanceResponse(
        id=instance.id,
        workflow_template_id=instance.workflow_template_id,
        entity_type=instance.entity_type,
        entity_id=instance.entity_id,
        status=instance.status,
        current_node_id=instance.current_node_id,
        context=instance.context,
        started_at=instance.started_at.isoformat() if instance.started_at else None,
        completed_at=instance.completed_at.isoformat() if instance.completed_at else None
    )


@router.post("/rules", response_model=WorkflowRuleResponse)
async def create_workflow_rule(
    request: WorkflowRuleRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a conditional routing rule
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to create workflow rules")
    
    service = get_workflow_service(db)
    
    rule = service.create_workflow_rule(
        name=request.name,
        description=request.description,
        condition=request.condition,
        action=request.action,
        priority=request.priority,
        created_by=current_user['id'],
        is_active=request.is_active
    )
    
    if not rule:
        raise HTTPException(status_code=500, detail="Failed to create workflow rule")
    
    return WorkflowRuleResponse(
        id=rule.id,
        name=rule.name,
        description=rule.description,
        condition=rule.condition,
        action=rule.action,
        priority=rule.priority,
        is_active=rule.is_active,
        created_by=rule.created_by,
        creator_name=f"{rule.creator.first_name} {rule.creator.last_name}" if rule.creator else "Unknown",
        created_at=rule.created_at.isoformat() if rule.created_at else None,
        updated_at=rule.updated_at.isoformat() if rule.updated_at else None
    )


@router.post("/approvals/{instance_id}/{node_id}/approve")
async def approve_workflow_node(
    instance_id: int,
    node_id: str,
    request: WorkflowApprovalRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Approve a workflow node
    """
    service = get_workflow_service(db)
    
    success = service.approve_workflow_node(
        instance_id=instance_id,
        node_id=node_id,
        approver_id=current_user['id'],
        comments=request.comments
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Approval request not found or already processed")
    
    return {"message": "Workflow node approved successfully"}


@router.post("/approvals/{instance_id}/{node_id}/reject")
async def reject_workflow_node(
    instance_id: int,
    node_id: str,
    request: WorkflowApprovalRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Reject a workflow node
    """
    service = get_workflow_service(db)
    
    success = service.reject_workflow_node(
        instance_id=instance_id,
        node_id=node_id,
        approver_id=current_user['id'],
        comments=request.comments
    )
    
    if not success:
        raise HTTPException(status_code=404, detail="Approval request not found or already processed")
    
    return {"message": "Workflow node rejected successfully"}


@router.get("/approvals/pending", response_model=List[WorkflowApprovalResponse])
async def get_pending_approvals(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get pending approval requests for the current user
    """
    approvals = db.query(WorkflowApproval).filter(
        and_(
            WorkflowApproval.approver_id == current_user['id'],
            WorkflowApproval.status == 'pending'
        )
    ).all()
    
    return [
        WorkflowApprovalResponse(
            id=approval.id,
            workflow_instance_id=approval.workflow_instance_id,
            node_id=approval.node_id,
            approver_id=approval.approver_id,
            approver_name=f"{approval.approver.first_name} {approval.approver.last_name}" if approval.approver else "Unknown",
            status=approval.status,
            comments=approval.comments,
            requested_at=approval.requested_at.isoformat() if approval.requested_at else None,
            approved_at=approval.approved_at.isoformat() if approval.approved_at else None
        ) for approval in approvals
    ]


@router.post("/escalations", response_model=WorkflowEscalationResponse)
async def create_escalation(
    request: WorkflowEscalationRequest,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create an escalation
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to create escalations")
    
    service = get_workflow_service(db)
    
    escalation = service.create_escalation(
        workflow_instance_id=request.workflow_instance_id,
        rule_name=request.rule_name,
        trigger_condition=request.trigger_condition,
        target=request.target,
        notes=request.notes
    )
    
    if not escalation:
        raise HTTPException(status_code=500, detail="Failed to create escalation")
    
    return WorkflowEscalationResponse(
        id=escalation.id,
        workflow_instance_id=escalation.workflow_instance_id,
        rule_name=escalation.rule_name,
        trigger_condition=escalation.trigger_condition,
        target=escalation.target,
        executed_at=escalation.executed_at.isoformat() if escalation.executed_at else None,
        notes=escalation.notes
    )


@router.get("/check-escalations")
async def check_for_escalations(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Check for workflows that need to be escalated
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to check escalations")
    
    service = get_workflow_service(db)
    service.check_for_escalations()
    
    return {"message": "Escalation check completed"}


# ========== Configuration & Categories ==========

@router.get("/config", response_model=WorkflowConfigAggregateResponse)
async def get_workflow_config(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive workflow configuration
    """
    # 1. Get Workflows with basic stats
    workflows = db.query(WorkflowTemplate).filter(
        WorkflowTemplate.status != WorkflowStatus.ARCHIVED
    ).all()
    
    workflow_data = []
    for wf in workflows:
        # Calculate Mock Stats for now (or real if available)
        instance_count = db.query(WorkflowInstance).filter(
            WorkflowInstance.workflow_template_id == wf.id
        ).count()
        
        # Calculate steps count from definition
        steps_count = len(wf.definition.get('nodes', [])) if wf.definition else 0
        
        workflow_data.append({
            "id": wf.id,
            "name": wf.name,
            "description": wf.description,
            "status": wf.status.value,
            "steps_count": steps_count,
            "tickets_processed": instance_count,
            "avg_resolution": "2.4h" # Placeholder for now
        })
        
    # 2. Get Automation Rules
    rules = db.query(WorkflowRule).order_by(WorkflowRule.priority.desc()).all()
    rule_data = [
        {
            "id": r.id,
            "name": r.name,
            "description": r.description,
            "is_active": r.is_active,
            "priority": r.priority
        } for r in rules
    ]
    
    # 3. Get Categories
    categories = db.query(WorkflowCategory).all()
    category_data = []
    
    for cat in categories:
        # Count tickets in this category
        # Assumes Ticket model has a 'category' string field matching category name
        # or we update Ticket to map to this ID. For now assuming name match.
        count = db.query(Ticket).filter(Ticket.category == cat.name).count()
        
        category_data.append({
            "id": cat.id,
            "name": cat.name,
            "description": cat.description,
            "color": cat.color,
            "tickets_count": count
        })
        
    return {
        "workflows": workflow_data,
        "automation_rules": rule_data,
        "categories": category_data
    }


@router.post("/categories", response_model=WorkflowCategoryResponse)
async def create_category(
    category: WorkflowCategoryCreate,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a new ticket category
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage categories")
        
    # Check for duplicate
    existing = db.query(WorkflowCategory).filter(WorkflowCategory.name == category.name).first()
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
        
    new_cat = WorkflowCategory(
        name=category.name,
        description=category.description,
        color=category.color
    )
    db.add(new_cat)
    db.commit()
    db.refresh(new_cat)
    
    return WorkflowCategoryResponse(
        id=new_cat.id,
        name=new_cat.name,
        description=new_cat.description,
        color=new_cat.color,
        created_at=new_cat.created_at,
        updated_at=new_cat.updated_at
    )


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a ticket category
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage categories")
        
    cat = db.query(WorkflowCategory).filter(WorkflowCategory.id == category_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found")
        
    db.delete(cat)
    db.commit()
    return {"message": "Category deleted successfully"}


@router.post("/rules/{rule_id}/toggle")
async def toggle_rule(
    rule_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Toggle a workflow rule active status
    """
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage rules")
        
    rule = db.query(WorkflowRule).filter(WorkflowRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
        
    rule.is_active = not rule.is_active
    db.commit()
    
    return {"message": "Rule status updated", "is_active": rule.is_active}