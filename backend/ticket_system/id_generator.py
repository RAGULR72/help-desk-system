from sqlalchemy.orm import Session
from datetime import datetime
from admin_system import models as admin_models

def get_fiscal_year(date: datetime, start_month: int = 4) -> int:
    """
    Calculate Fiscal Year.
    If start_month is 4 (April), then:
    - Jan 2025 is FY 2024 (2024-25)
    - April 2025 is FY 2025 (2025-26)
    """
    if date.month >= start_month:
        return date.year
    else:
        return date.year - 1

def generate_ticket_id(db: Session, prefix_override: str = None) -> str:
    # 1. Get Sequence config
    sequence = db.query(admin_models.TicketSequence).first()
    
    # Initialize if not exists
    if not sequence:
        sequence = admin_models.TicketSequence(
            prefix="TKT",
            fy_start_month=4,
            current_fy=get_fiscal_year(datetime.utcnow()),
            next_number=1
        )
        db.add(sequence)
        db.commit()
        db.refresh(sequence)

    # 2. Check for FY Rollover
    today = datetime.utcnow()
    calculated_fy = get_fiscal_year(today, sequence.fy_start_month)

    if sequence.current_fy != calculated_fy:
        # Reset for new financial year
        sequence.current_fy = calculated_fy
        sequence.next_number = 1
    
    # 3. Generate ID
    # Format: PREFIX-FY-NUMBER (e.g., TKT-2024-0001)
    # Using last 2 digits of FY might be cleaner? User said "financial year".
    # Usually FY is represented by the start year.
    
    # Let's verify format. "ticket 1 2 3... next year 1"
    # User asked for "Financial Year" included?
    # "financial year appo ticket number... next financial year also same continue" NO
    # "next year from 1001 start agakudadhu 1 la irunthu start aganum" -> RESET
    
    # I will stick to full year for clarity: TKT-2024-001
    
    ticket_id_str = f"{sequence.prefix}-{sequence.current_fy}-{sequence.next_number:04d}"
    
    # 4. Increment and Save
    sequence.next_number += 1
    db.commit()
    
    return ticket_id_str
