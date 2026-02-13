
import sqlite3
import os
from datetime import datetime

# Assuming it might be sqlite for local dev, or I can try to connect to pg if I know how.
# But I'll just check if there's a database.db file first.
if os.path.exists('backend/database.db'):
    conn = sqlite3.connect('backend/database.db')
    cursor = conn.cursor()
    
    print("Checking active tickets without SLA tracking...")
    cursor.execute("""
        SELECT id, subject, status FROM tickets 
        WHERE status NOT IN ('resolved', 'closed') 
        AND id NOT IN (SELECT ticket_id FROM ticket_sla_tracking)
    """)
    missing = cursor.fetchall()
    print(f"Count: {len(missing)}")
    for m in missing[:5]:
        print(f"ID: {m[0]}, Subject: {m[1]}, Status: {m[2]}")
        
    print("\nChecking breached tickets in tracking...")
    cursor.execute("""
        SELECT t.id, t.subject, tr.resolution_due, tr.resolution_breached 
        FROM tickets t 
        JOIN ticket_sla_tracking tr ON t.id = tr.ticket_id 
        WHERE t.status NOT IN ('resolved', 'closed') 
        AND (tr.resolution_breached = 1 OR tr.resolution_due < datetime('now'))
    """)
    breached = cursor.fetchall()
    print(f"Count: {len(breached)}")
    for b in breached[:5]:
        print(f"ID: {b[0]}, Subject: {b[1]}, Due: {b[2]}, Flag: {b[3]}")
        
    conn.close()
else:
    print("database.db not found. Might be using PostgreSQL.")
