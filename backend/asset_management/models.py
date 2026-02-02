from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum, DateTime, Text, Boolean
from sqlalchemy.orm import relationship
from database import Base
import enum
from datetime import datetime
from models import get_ist

class AssetStatus(str, enum.Enum):
    AVAILABLE = "Available"
    ASSIGNED = "Assigned"
    MAINTENANCE = "Maintenance"
    RETIRED = "Retired"
    MISSING = "Missing"

class Asset(Base):
    __tablename__ = "assets"
    __table_args__ = {'extend_existing': True}

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String, index=True) # Laptop, Monitor, Networking, etc.
    model = Column(String)
    manufacturer = Column(String)
    
    # Identification
    tag_number = Column(String, unique=True, index=True) # Internal Asset Tag
    serial_number = Column(String, unique=True, index=True)
    
    # Ownership
    company_name = Column(String, index=True, nullable=True)
    
    # Lifecycle
    purchase_date = Column(Date)
    purchase_cost = Column(Float)
    vendor = Column(String)
    warranty_expiry = Column(Date)
    
    # Status & Location
    status = Column(String, default=AssetStatus.AVAILABLE)
    location = Column(String) # Office Room 201, Server Room, etc.
    
    # Assignment
    assigned_to_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_date = Column(DateTime, nullable=True)
    
    # Specs & Details
    specs = Column(Text, nullable=True) # JSON or text description
    image_url = Column(String, nullable=True)
    
    # Audit
    created_at = Column(DateTime, default=get_ist)
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)

    # Relationships
    assigned_to = relationship("User", backref="assets")
    maintenance_records = relationship("AssetMaintenance", back_populates="asset")
    history = relationship("AssetHistory", back_populates="asset")

class AssetMaintenance(Base):
    __tablename__ = "asset_maintenance"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    
    maintenance_date = Column(Date, default=datetime.now)
    type = Column(String) # Repair, Upgrade, Preventive
    description = Column(Text)
    cost = Column(Float, default=0.0)
    performed_by = Column(String) # External Vendor or Technician Name
    next_maintenance_date = Column(Date, nullable=True) # For scheduling
    
    status = Column(String, default="Completed") # Scheduled, In Progress, Completed
    
    created_at = Column(DateTime, default=get_ist)
    
    asset = relationship("Asset", back_populates="maintenance_records")

class AssetHistory(Base):
    __tablename__ = "asset_history"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"))
    
    action = Column(String) # Assigned, Unassigned, Status Change, Updated
    description = Column(String)
    performed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=get_ist)
    
    asset = relationship("Asset", back_populates="history")
    performed_by = relationship("User")

class InventoryItem(Base):
    __tablename__ = "inventory_items"
    __table_args__ = {'extend_existing': True}
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    category = Column(String) # Cables, Mouse, Keyboard, Connectors
    company_name = Column(String, index=True, nullable=True)
    
    quantity = Column(Integer, default=0)
    low_stock_threshold = Column(Integer, default=5)
    
    unit_price = Column(Float, default=0.0)
    location = Column(String)
    
    updated_at = Column(DateTime, default=get_ist, onupdate=get_ist)
