from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    email: str
    role: str
    phone: Optional[str] = None

    class Config:
        from_attributes = True

class BulkAssign(BaseModel):
    ticket_ids: List[int]
    technician_id: int

class BulkStatusUpdate(BaseModel):
    ticket_ids: List[int]
    status: str

class TicketBase(BaseModel):
    subject: str
    description: str
    priority: str = "normal"
    category: str
    subcategory: Optional[str] = None
    attachments: Optional[str] = None

class TicketCreate(TicketBase):
    pass

class TicketUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    category: Optional[str] = None
    subcategory: Optional[str] = None
    assigned_to: Optional[int] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None
    sla_deadline: Optional[datetime] = None
    resolution_note: Optional[str] = None
    resolution_attachments: Optional[str] = None
    asset_taken: Optional[int] = None
    asset_status: Optional[str] = None
    asset_reason: Optional[str] = None
    asset_repairer_id: Optional[int] = None
    asset_repair_note: Optional[str] = None
    asset_repair_attachments: Optional[str] = None
    reopen_count: Optional[int] = None
    ticket_history: Optional[str] = None
    hold_reason: Optional[str] = None

class TicketOwner(BaseModel):
    username: str
    full_name: Optional[str] = None
    email: str
    phone: Optional[str] = None
    address: Optional[str] = None
    company: Optional[str] = None
    
    class Config:
        from_attributes = True

class TicketRepairDetailsBase(BaseModel):
    issue_title: Optional[str] = None
    reason_for_repair: Optional[str] = None
    pickup_location: Optional[str] = "Proserve Office"
    pickup_time: Optional[datetime] = None
    tech_left_time: Optional[datetime] = None
    tech_reached_time: Optional[datetime] = None
    resolution_timestamp: Optional[datetime] = None
    delivery_time: Optional[datetime] = None
    closing_timestamp: Optional[datetime] = None
    visit_type: Optional[str] = None
    visiting_tech_id: Optional[int] = None
    machine_photo: Optional[str] = None
    machine_condition: Optional[str] = None
    issue_description: Optional[str] = None
    solution_provided: Optional[str] = None
    output_image: Optional[str] = None
    overall_solution_details: Optional[str] = None
    final_images: Optional[str] = None

class TicketRepairDetailsCreate(TicketRepairDetailsBase):
    pass

class TicketRepairDetailsResponse(TicketRepairDetailsBase):
    id: int
    ticket_id: int
    visiting_tech: Optional[TicketOwner] = None

    class Config:
        from_attributes = True

class TicketResponse(TicketBase):
    id: int
    custom_id: Optional[str] = None
    status: str
    user_id: int
    owner: Optional[TicketOwner] = None
    assignee: Optional[TicketOwner] = None
    rating: Optional[int] = None
    feedback: Optional[str] = None
    assigned_to: Optional[int] = None
    attachments: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sla_deadline: Optional[datetime] = None
    resolution_note: Optional[str] = None
    resolution_attachments: Optional[str] = None
    asset_taken: Optional[int] = None
    asset_status: Optional[str] = None
    asset_reason: Optional[str] = None
    asset_repairer_id: Optional[int] = None
    asset_repair_note: Optional[str] = None
    asset_repair_attachments: Optional[str] = None
    asset_repairer: Optional[TicketOwner] = None
    reopen_count: Optional[int] = 0
    ticket_history: Optional[str] = None
    hold_reason: Optional[str] = None
    ai_summary: Optional[str] = None
    sentiment: Optional[str] = None
    sentiment_data: Optional[str] = None
    ai_auto_reply: Optional[str] = None
    ai_tech_guide: Optional[str] = None
    linked_to_id: Optional[int] = None
    repair_details: Optional[TicketRepairDetailsResponse] = None

    class Config:
        from_attributes = True

class TicketExtend(BaseModel):
    extension_hours: int

class TicketReopen(BaseModel):
    reason: str
    description: Optional[str] = None

class AISuggestionResponse(BaseModel):
    summary: str
    steps: List[str]
    kb_articles: List[dict] = []
    confidence: float

class SimilarTicket(BaseModel):
    id: int
    custom_id: Optional[str] = None
    subject: str
    resolution_note: Optional[str] = None
    assignee_name: Optional[str] = None
    resolved_at: Optional[datetime] = None

class SimilarTicketsResponse(BaseModel):
    tickets: List[SimilarTicket]
