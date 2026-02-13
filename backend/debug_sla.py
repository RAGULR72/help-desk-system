
from sqlalchemy.orm import Session
from database import SessionLocal
from sla_system.sla_models import TicketSLATracking
from ticket_system.models import Ticket
from datetime import datetime

def check_sla():
    db = SessionLocal()
    try:
        now = datetime.utcnow()
        print(f"Current UTC time: {now}")
        
        # All tracking records
        trackings = db.query(TicketSLATracking).all()
        print(f"Total tracking records: {len(trackings)}")
        
        # Tracking for active tickets
        active_trackings = db.query(TicketSLATracking).join(Ticket).filter(
            Ticket.status.notin_(['resolved', 'closed'])
        ).all()
        print(f"Active ticket tracking records: {len(active_trackings)}")
        
        breached_count = 0
        for t in active_trackings:
            ticket = t.ticket
            is_breached = False
            
            if t.resolution_breached:
                is_breached = True
            elif t.resolution_due < now:
                is_breached = True
                
            if is_breached:
                breached_count += 1
                print(f"Breached Ticket: {ticket.custom_id or ticket.id}, Status: {ticket.status}, Resolution Due: {t.resolution_due}")
        
        print(f"Total active breached tickets calculated: {breached_count}")
        
    finally:
        db.close()

if __name__ == "__main__":
    check_sla()
