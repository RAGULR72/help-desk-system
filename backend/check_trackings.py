
from sqlalchemy.orm import Session
from database import SessionLocal
from sla_system.sla_models import TicketSLATracking
from ticket_system.models import Ticket
from datetime import datetime

def check_active_trackings():
    db = SessionLocal()
    try:
        active_tickets = db.query(Ticket).filter(
            Ticket.status.notin_(['resolved', 'closed'])
        ).all()
        print(f"Total active tickets: {len(active_tickets)}")
        
        missing_tracking = []
        for t in active_tickets:
            tracking = db.query(TicketSLATracking).filter(TicketSLATracking.ticket_id == t.id).first()
            if not tracking:
                missing_tracking.append(t.id)
        
        print(f"Active tickets missing SLA tracking: {len(missing_tracking)}")
        if missing_tracking:
            print(f"Missing IDs: {missing_tracking[:20]}")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_active_trackings()
