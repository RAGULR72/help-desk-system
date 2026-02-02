from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
import models as root_models
from admin_system import models as admin_models
from admin_system import schemas as admin_schemas
from auth import get_current_user
from database import get_db

router = APIRouter(prefix="/api/system/config", tags=["System Configuration"])

def get_current_admin(current_user: root_models.User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

@router.get("/", response_model=List[admin_schemas.SystemSettingsResponse])
def get_all_configs(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_admin)):
    # Initialize defaults if not exists
    defaults = {
        "auto_travel_allowance": "true",
        "portal_active": "true",
        "portal_allowed_roles": "public,user,technician,manager,admin",
        "asset_management_active": "true",
        "auto_assignment_enabled": "true",
        "ai_dispatcher_enabled": "true"
    }
    for key, val in defaults.items():
        exists = db.query(admin_models.SystemSettings).filter(admin_models.SystemSettings.key == key).first()
        if not exists:
            db.add(admin_models.SystemSettings(key=key, value=val, description=f"Automatic {key.replace('_', ' ')}"))
    db.commit()
    return db.query(admin_models.SystemSettings).all()

@router.get("/sequence", response_model=admin_schemas.SequenceConfigResponse)
def get_sequence_config(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_admin)):
    seq = db.query(admin_models.TicketSequence).first()
    if not seq:
        from datetime import datetime
        seq = admin_models.TicketSequence(
            prefix="TKT",
            fy_start_month=4,
            current_fy=datetime.utcnow().year, # Approximate initial
            next_number=1
        )
        db.add(seq)
        db.commit()
    return seq

@router.put("/sequence")
def update_sequence_config(config: admin_schemas.SequenceConfigUpdate, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_admin)):
    seq = db.query(admin_models.TicketSequence).first()
    if not seq:
        # Should exist by now via GET or auto-create logic elsewhere, but good to handle
        seq = admin_models.TicketSequence()
        db.add(seq)
    
    if config.prefix is not None:
        seq.prefix = config.prefix
    if config.fy_start_month is not None:
        seq.fy_start_month = config.fy_start_month
    if config.next_number is not None:
        seq.next_number = config.next_number
    if config.current_fy is not None:
        seq.current_fy = config.current_fy
    
    db.commit()
    return {"message": "Sequence updated successfully"}

@router.get("/expense-sequence", response_model=admin_schemas.ExpenseSequenceResponse)
def get_expense_sequence_config(db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_admin)):
    seq = db.query(admin_models.ExpenseSequence).first()
    if not seq:
        seq = admin_models.ExpenseSequence(prefix="REI", next_number=1001)
        db.add(seq)
        db.commit()
    return seq

@router.put("/expense-sequence")
def update_expense_sequence_config(config: admin_schemas.ExpenseSequenceUpdate, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_admin)):
    seq = db.query(admin_models.ExpenseSequence).first()
    if not seq:
        seq = admin_models.ExpenseSequence()
        db.add(seq)
    
    if config.prefix is not None:
        seq.prefix = config.prefix
    if config.next_number is not None:
        seq.next_number = config.next_number
    
    db.commit()
    return {"message": "Expense sequence updated successfully"}

@router.put("/{key}")
def update_config(key: str, update: admin_schemas.SystemSettingsUpdate, db: Session = Depends(get_db), current_user: root_models.User = Depends(get_current_admin)):
    setting = db.query(admin_models.SystemSettings).filter(admin_models.SystemSettings.key == key).first()
    if not setting:
        setting = admin_models.SystemSettings(key=key, value=update.value)
        db.add(setting)
    else:
        setting.value = update.value
    db.commit()
    return {"message": f"Config {key} updated to {update.value}"}
