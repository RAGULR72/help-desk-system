from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class SystemSettingsBase(BaseModel):
    key: str
    value: str
    description: Optional[str] = None

class SystemSettingsResponse(SystemSettingsBase):
    id: int
    updated_at: datetime

    class Config:
        from_attributes = True

class SystemSettingsUpdate(BaseModel):
    value: str

class HolidayBase(BaseModel):
    name: str
    date: date
    type: str = "Public Holiday"
    description: Optional[str] = None

class HolidayResponse(HolidayBase):
    id: int

    class Config:
        orm_mode = True

class SequenceConfigResponse(BaseModel):
    prefix: str
    fy_start_month: int
    current_fy: Optional[int] = None
    next_number: int
    
    class Config:
        from_attributes = True  # Using Pydantic v2 convention as seen in other files

class SequenceConfigUpdate(BaseModel):
    prefix: Optional[str] = None
    fy_start_month: Optional[int] = None
    next_number: Optional[int] = None
    current_fy: Optional[int] = None

class ExpenseSequenceResponse(BaseModel):
    prefix: str
    next_number: int
    
    class Config:
        from_attributes = True

class ExpenseSequenceUpdate(BaseModel):
    prefix: Optional[str] = None
    next_number: Optional[int] = None
