"""
Workflow automation schemas for the help desk application
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime


class WorkflowTemplateRequest(BaseModel):
    name: str
    description: str
    category: str
    definition: Dict[str, Any]  # JSON definition of the workflow (nodes and connections)
    status: Optional[str] = "draft"


class WorkflowTemplateResponse(BaseModel):
    id: int
    name: str
    description: str
    category: str
    status: str
    definition: Dict[str, Any]
    created_by: int
    creator_name: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class WorkflowInstanceResponse(BaseModel):
    id: int
    workflow_template_id: int
    entity_type: str
    entity_id: int
    status: str
    current_node_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class WorkflowRuleRequest(BaseModel):
    name: str
    description: str
    condition: Dict[str, Any]  # JSON definition of the condition
    action: Dict[str, Any]  # JSON definition of the action to take
    priority: int = 0
    is_active: bool = True


class WorkflowRuleResponse(BaseModel):
    id: int
    name: str
    description: str
    condition: Dict[str, Any]
    action: Dict[str, Any]
    priority: int
    is_active: bool
    created_by: int
    creator_name: str
    created_at: Optional[str] = None
    updated_at: Optional[str] = None


class WorkflowApprovalRequest(BaseModel):
    comments: Optional[str] = None


class WorkflowApprovalResponse(BaseModel):
    id: int
    workflow_instance_id: int
    node_id: str
    approver_id: int
    approver_name: str
    status: str
    comments: Optional[str] = None
    requested_at: Optional[str] = None
    approved_at: Optional[str] = None


class WorkflowEscalationRequest(BaseModel):
    workflow_instance_id: int
    rule_name: str
    trigger_condition: str
    target: Dict[str, Any]  # Who/what to escalate to (JSON format)
    notes: Optional[str] = None


class WorkflowEscalationResponse(BaseModel):
    id: int
    workflow_instance_id: int
    rule_name: str
    trigger_condition: str
    target: Dict[str, Any]
    executed_at: Optional[str] = None
    notes: Optional[str] = None


class WorkflowNode(BaseModel):
    id: str
    type: str  # start, condition, action, approval, end
    position: Dict[str, float]  # x, y coordinates
    data: Dict[str, Any]  # Node-specific data


class WorkflowConnection(BaseModel):
    id: str
    source: str  # Source node ID
    target: str  # Target node ID
    condition: Optional[str] = None  # Condition for this connection (e.g., "true", "false", "approved", "rejected")


class WorkflowDefinition(BaseModel):
    nodes: List[WorkflowNode]
    connections: List[WorkflowConnection]


class WorkflowCategoryCreate(BaseModel):
    name: str
    description: Optional[str] = None
    color: Optional[str] = "#6366f1"


class WorkflowCategoryResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    color: str
    tickets_count: Optional[int] = 0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class WorkflowConfigSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    steps_count: int
    tickets_processed: int
    avg_resolution: str


class WorkflowConfigAggregateResponse(BaseModel):
    workflows: List[WorkflowConfigSummary]
    automation_rules: List[Dict[str, Any]]
    categories: List[WorkflowCategoryResponse]