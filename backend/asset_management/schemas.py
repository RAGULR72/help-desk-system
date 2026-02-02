from pydantic import BaseModel
from typing import Optional, List, Any
from datetime import date, datetime
from enum import Enum

class AssetStatus(str, Enum):
    AVAILABLE = "Available"
    ASSIGNED = "Assigned"
    MAINTENANCE = "Maintenance"
    RETIRED = "Retired"
    MISSING = "Missing"

# --- Asset Schemas ---
class AssetBase(BaseModel):
    name: str
    category: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    tag_number: str
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = 0.0
    vendor: Optional[str] = None
    warranty_expiry: Optional[date] = None
    status: Optional[str] = AssetStatus.AVAILABLE
    location: Optional[str] = None
    company_name: Optional[str] = None
    specs: Optional[str] = None
    image_url: Optional[str] = None

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    model: Optional[str] = None
    manufacturer: Optional[str] = None
    tag_number: Optional[str] = None
    serial_number: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_cost: Optional[float] = None
    vendor: Optional[str] = None
    warranty_expiry: Optional[date] = None
    warranty_expiry: Optional[date] = None
    status: Optional[str] = None
    location: Optional[str] = None
    company_name: Optional[str] = None
    specs: Optional[str] = None
    image_url: Optional[str] = None

class AssetResponse(AssetBase):
    id: int
    assigned_to_id: Optional[int] = None
    assigned_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    assigned_to_name: Optional[str] = None # Calculated field helper

    class Config:
        from_attributes = True

# --- Maintenance Schemas ---
class MaintenanceBase(BaseModel):
    maintenance_date: Optional[date] = None
    type: str
    description: str
    cost: Optional[float] = 0.0
    performed_by: Optional[str] = None
    next_maintenance_date: Optional[date] = None
    status: Optional[str] = "Completed"

class MaintenanceCreate(MaintenanceBase):
    pass

class MaintenanceResponse(MaintenanceBase):
    id: int
    asset_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Inventory Schemas ---
class InventoryItemBase(BaseModel):
    name: str
    category: Optional[str] = None
    quantity: int
    low_stock_threshold: Optional[int] = 5
    unit_price: Optional[float] = 0.0
    location: Optional[str] = None
    company_name: Optional[str] = None

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    quantity: Optional[int] = None
    unit_price: Optional[float] = None
    location: Optional[str] = None
    low_stock_threshold: Optional[int] = None

class InventoryItemResponse(InventoryItemBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

class AssetStats(BaseModel):
    total_assets: int
    total_value: float
    assigned_assets: int
    maintenance_assets: int
    warranty_expiring_soon: int # Next 30 days
    low_stock_items: int

class AssetHistoryResponse(BaseModel):
    id: int
    action: str
    description: str
    created_at: datetime
    performed_by_name: Optional[str] = None

    class Config:
        orm_mode = True

