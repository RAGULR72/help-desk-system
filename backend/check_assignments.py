from sqlalchemy import text
import sys
import os

# Add parent dir to path
sys.path.append(os.getcwd())
try:
    from database import SessionLocal
    from ticket_system.models import Ticket
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def check_assignments():
    db = SessionLocal()
    try:
        tickets = db.query(Ticket).filter(Ticket.custom_id.in_(['TKT-2025-0011', 'TKT-2025-0012', 'PT-2025-0001', 'PT-2025-0002'])).all()
        for t in tickets:
            print(f"Ticket {t.custom_id}: AssignedTo={t.assigned_to}")
    finally:
        db.close()

if __name__ == "__main__":
    check_assignments()
