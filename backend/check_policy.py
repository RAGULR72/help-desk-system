from sqlalchemy import text
import sys
import os

# Add parent dir to path
sys.path.append(os.getcwd())
try:
    from database import SessionLocal
    from sla_system.sla_models import SLAPolicy
except ImportError as e:
    print(f"Import Error: {e}")
    sys.exit(1)

def check_policy():
    db = SessionLocal()
    try:
        policy = db.query(SLAPolicy).filter(SLAPolicy.is_active == True).first()
        if policy:
            print(f"ACTIVE POLICY FOUND: {policy.name}")
        else:
            print("NO ACTIVE SLA POLICY FOUND")
    finally:
        db.close()

if __name__ == "__main__":
    check_policy()
