from sqlalchemy import text
import sys
import os

# Add parent dir to path
sys.path.append(os.getcwd())
try:
    from database import SessionLocal
    from ticket_system.models import Ticket
    from sla_system.sla_models import TicketSLATracking
    from models import get_ist
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def check_breaches():
    db = SessionLocal()
    try:
        now = get_ist()
        print(f"Current IST Time: {now}")
        
        # Check for breached tickets
        trackings = db.query(TicketSLATracking).all()
        print(f"Total SLA Tracking records: {len(trackings)}")
        
        for bt in trackings:
            ticket = db.query(Ticket).filter(Ticket.id == bt.ticket_id).first()
            if not ticket:
                print(f"Orphan Tracking: ID {bt.id}, Ticket ID {bt.ticket_id}")
                continue
                
            is_overdue = bt.resolution_due < now
            print(f"Ticket {ticket.custom_id or ticket.id}: Status={ticket.status}, Due={bt.resolution_due}, Overdue={is_overdue}, BreachedFlag={bt.resolution_breached}")
    finally:
        db.close()

if __name__ == "__main__":
    check_breaches()
