from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List, Optional
from datetime import datetime, timedelta, date

from database import get_db
from auth import get_current_user
from models import User
from . import models, schemas
from admin_system.models import SystemSettings
import json

router = APIRouter(prefix="/api/assets", tags=["Asset Management"])

# Helper to check permission (Technician or Admin) and System Status
def check_asset_permission(user: User, db: Session):
    # Check Global Setting
    setting = db.query(SystemSettings).filter(SystemSettings.key == "asset_management_active").first()
    if setting and setting.value == "false" and user.role != "admin":
        raise HTTPException(status_code=403, detail="Asset Management is currently disabled by administrator.")

    if user.role not in ["admin", "manager", "technician"]:
        raise HTTPException(status_code=403, detail="Not authorized to manage assets")

def get_allowed_companies(user: User) -> List[str]:
    if user.role == "admin":
        return [] # Empty list means ALL companies for Admin
    
    if not user.permissions:
        return []
        
    try:
        perms = json.loads(user.permissions)
        return perms.get("allowed_asset_companies", [])
    except:
        return []

# --- Stats ---
@router.get("/stats", response_model=schemas.AssetStats)
def get_asset_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    
    # Filter Logic
    allowed_companies = get_allowed_companies(current_user)
    
    asset_query = db.query(models.Asset)
    inv_query = db.query(models.InventoryItem)
    
    if current_user.role != "admin":
        # If allowed_companies is empty for non-admin, they see NOTHING (or maybe their own company? Let's assume strict config)
        if not allowed_companies:
             # Fallback: if no specific config, maybe show nothing? Or rely on user.company?
             # Requirement: "Admin decides". So if admin didn't set it, they see nothing.
             # To show nothing, filter by impossible condition
             asset_query = asset_query.filter(models.Asset.id == -1)
             inv_query = inv_query.filter(models.InventoryItem.id == -1)
        else:
             asset_query = asset_query.filter(models.Asset.company_name.in_(allowed_companies))
             inv_query = inv_query.filter(models.InventoryItem.company_name.in_(allowed_companies))

    total_assets = asset_query.count()
    total_value = asset_query.with_entities(func.sum(models.Asset.purchase_cost)).scalar() or 0.0
    assigned_assets = asset_query.filter(models.Asset.status == models.AssetStatus.ASSIGNED).count()
    maintenance_assets = asset_query.filter(models.Asset.status == models.AssetStatus.MAINTENANCE).count()
    
    thirty_days_from_now = date.today() + timedelta(days=30)
    warranty_expiring = asset_query.filter(
        models.Asset.warranty_expiry.isnot(None),
        models.Asset.warranty_expiry >= date.today(),
        models.Asset.warranty_expiry <= thirty_days_from_now
    ).count()
    
    low_stock = inv_query.filter(models.InventoryItem.quantity <= models.InventoryItem.low_stock_threshold).count()
    
    return {
        "total_assets": total_assets,
        "total_value": total_value,
        "assigned_assets": assigned_assets,
        "maintenance_assets": maintenance_assets,
        "warranty_expiring_soon": warranty_expiring,
        "low_stock_items": low_stock
    }

# --- Assets CRUD ---
@router.get("/", response_model=List[schemas.AssetResponse])
def get_assets(
    category: Optional[str] = None, 
    status: Optional[str] = None, 
    search: Optional[str] = None,
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    check_asset_permission(current_user, db)
    
    allowed = get_allowed_companies(current_user)
    query = db.query(models.Asset)
    
    if current_user.role != "admin":
        if not allowed:
             query = query.filter(models.Asset.id == -1)
        else:
             query = query.filter(models.Asset.company_name.in_(allowed))
            
    if category:
        query = query.filter(models.Asset.category == category)
    if status:
        query = query.filter(models.Asset.status == status)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (models.Asset.name.ilike(search_fmt)) | 
            (models.Asset.tag_number.ilike(search_fmt)) | 
            (models.Asset.serial_number.ilike(search_fmt))
        )
        
    assets = query.all()
    # Populate helper fields if needed (though SQLAlchemy relation helps, Pydantic needs specific access sometimes)
    for asset in assets:
        if asset.assigned_to:
            asset.assigned_to_name = asset.assigned_to.full_name
            
    return assets

@router.post("/", response_model=schemas.AssetResponse)
def create_asset(asset: schemas.AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    
    existing = db.query(models.Asset).filter(models.Asset.tag_number == asset.tag_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Asset Tag Number already exists")
    
    db_asset = models.Asset(**asset.dict())
    db.add(db_asset)
    db.commit()
    db.refresh(db_asset)
    
    # Log creation
    log = models.AssetHistory(
        asset_id=db_asset.id,
        action="Created",
        description=f"Asset {db_asset.name} created",
        performed_by_id=current_user.id
    )
    db.add(log)
    db.commit()
    
    return db_asset

@router.get("/{asset_id}", response_model=schemas.AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if asset.assigned_to:
        asset.assigned_to_name = asset.assigned_to.full_name
    return asset

@router.put("/{asset_id}", response_model=schemas.AssetResponse)
def update_asset(asset_id: int, update_data: schemas.AssetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    update_dict = update_data.dict(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(asset, key, value)
        
    db.commit()
    db.refresh(asset)
    
    log = models.AssetHistory(
        asset_id=asset.id,
        action="Updated",
        description="Asset details updated",
        performed_by_id=current_user.id
    )
    db.add(log)
    db.commit()
    
    if asset.assigned_to:
        asset.assigned_to_name = asset.assigned_to.full_name
    return asset

# --- Assignment ---
@router.post("/{asset_id}/assign", response_model=schemas.AssetResponse)
def assign_asset(asset_id: int, user_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    target_user = db.query(User).filter(User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    asset.assigned_to_id = user_id
    asset.assigned_date = datetime.now()
    asset.status = models.AssetStatus.ASSIGNED
    db.commit()
    
    log = models.AssetHistory(
        asset_id=asset.id,
        action="Assigned",
        description=f"Assigned to {target_user.full_name}",
        performed_by_id=current_user.id
    )
    db.add(log)
    db.refresh(asset)
    asset.assigned_to_name = target_user.full_name
    return asset

@router.post("/{asset_id}/return", response_model=schemas.AssetResponse)
def return_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    prev_user = asset.assigned_to.full_name if asset.assigned_to else "Unknown"
    
    asset.assigned_to_id = None
    asset.assigned_date = None
    asset.status = models.AssetStatus.AVAILABLE
    db.commit()
    
    log = models.AssetHistory(
        asset_id=asset.id,
        action="Returned",
        description=f"Returned from {prev_user}",
        performed_by_id=current_user.id
    )
    db.add(log)
    db.refresh(asset)
    return asset

# --- Maintenance ---
@router.post("/{asset_id}/maintenance", response_model=schemas.MaintenanceResponse)
def add_maintenance(asset_id: int, record: schemas.MaintenanceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    
    asset = db.query(models.Asset).filter(models.Asset.id == asset_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
        
    m_record = models.AssetMaintenance(**record.dict(), asset_id=asset_id)
    db.add(m_record)
    
    # Auto update status if maintenance is ongoing
    if record.status != "Completed":
        asset.status = models.AssetStatus.MAINTENANCE
        
    db.commit()
    db.refresh(m_record)
    return m_record

@router.get("/{asset_id}/maintenance", response_model=List[schemas.MaintenanceResponse])
def get_maintenance_history(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    return db.query(models.AssetMaintenance).filter(models.AssetMaintenance.asset_id == asset_id).order_by(models.AssetMaintenance.maintenance_date.desc()).all()


# --- Inventory (Spare Parts) ---
@router.get("/inventory", response_model=List[schemas.InventoryItemResponse])
def get_inventory(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    
    query = db.query(models.InventoryItem)
    allowed = get_allowed_companies(current_user)
    
    if current_user.role != "admin":
        if not allowed:
             query = query.filter(models.InventoryItem.id == -1)
        else:
             query = query.filter(models.InventoryItem.company_name.in_(allowed))
             
    return query.all()

@router.post("/inventory", response_model=schemas.InventoryItemResponse)
def create_inventory_item(item: schemas.InventoryItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    db_item = models.InventoryItem(**item.dict())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@router.put("/inventory/{item_id}", response_model=schemas.InventoryItemResponse)
def update_inventory_item(item_id: int, update: schemas.InventoryItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    item = db.query(models.InventoryItem).filter(models.InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    if update.quantity is not None:
        item.quantity = update.quantity
    if update.unit_price is not None:
        item.unit_price = update.unit_price
    if update.location is not None:
        item.location = update.location
    if update.low_stock_threshold is not None:
        item.low_stock_threshold = update.low_stock_threshold
        
    db.commit()
    db.refresh(item)
    db.refresh(item)
    return item

@router.get("/{asset_id}/history", response_model=List[schemas.AssetHistoryResponse])
def get_asset_history(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    check_asset_permission(current_user, db)
    history = db.query(models.AssetHistory).filter(models.AssetHistory.asset_id == asset_id).order_by(models.AssetHistory.created_at.desc()).all()
    
    # Populate user names
    for record in history:
        if record.performed_by:
            record.performed_by_name = record.performed_by.full_name
            
    return history
