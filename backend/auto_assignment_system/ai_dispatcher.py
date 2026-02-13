from google import genai
import os
import json
from sqlalchemy.orm import Session
from models import User
from ticket_system.models import Ticket
from auto_assignment_system.models import TechnicianSkill, TechnicianAvailability
from admin_system.models import SystemSettings
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
# genai.configure moved to Client instantiation
# if GEMINI_API_KEY:
#     genai.configure(api_key=GEMINI_API_KEY)

def get_ai_dispatcher_config(db: Session):
    setting = db.query(SystemSettings).filter(SystemSettings.key == "ai_dispatcher_enabled").first()
    return setting.value == "true" if setting else False

def assign_ticket_with_ai(db: Session, ticket_id: int):
    """
    Uses Gemini to analyze technicians and assign the best one.
    """
    if not GEMINI_API_KEY:
        print("AI Dispatcher: GEMINI_API_KEY not found")
        return None

    ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
    if not ticket:
        return None

    # Get all active technicians
    technicians = db.query(User).filter(User.role == "technician", User.status == "Active").all()
    if not technicians:
        # Fallback to admins/managers if no technicians
        technicians = db.query(User).filter(User.role.in_(['admin', 'manager']), User.status == "Active").all()
        
    if not technicians:
        print("AI Dispatcher: No active technicians or staff found")
        return None

    tech_data = []
    for tech in technicians:
        skills = db.query(TechnicianSkill).filter(TechnicianSkill.user_id == tech.id).all()
        availability = db.query(TechnicianAvailability).filter(TechnicianAvailability.user_id == tech.id).first()
        
        tech_info = {
            "id": tech.id,
            "name": tech.full_name or tech.username,
            "specialization": tech.specialization or "General",
            "skills": [f"{s.skill_name} (Lvl {s.proficiency_level})" for s in skills],
            "active_tickets": availability.active_tickets if availability else 0,
            "max_capacity": availability.max_capacity if availability else 10,
            "status": availability.status if availability else "available"
        }
        tech_data.append(tech_info)

    client = genai.Client(api_key=GEMINI_API_KEY)

    prompt = (
        "You are an expert IT Ticket Dispatcher for Proserve Help Desk.\n"
        "Your goal is to assign the incoming ticket to the MOST QUALIFIED and AVAILABLE technician.\n\n"
        "INCOMING TICKET:\n"
        f"Subject: {ticket.subject}\n"
        f"Description: {ticket.description}\n"
        f"Category: {ticket.category}\n"
        f"Priority: {ticket.priority}\n\n"
        "TECHNICIANS LIST:\n"
        f"{json.dumps(tech_data, indent=2)}\n\n"
        "ASSIGNMENT LOGIC:\n"
        "1. Prioritize Skill Match: Match the ticket category/description to technician skills.\n"
        "2. Consider Workload: Do not assign to someone at maximum capacity unless absolutely necessary.\n"
        "3. Right person for the right problem.\n\n"
        "RESPONSE FORMAT (Strict JSON):\n"
        "{\n"
        "  \"assigned_tech_id\": integer,\n"
        "  \"reason\": \"Brief explanation of why this tech was chosen\"\n"
        "}\n"
        "Do not include markdown code blocks."
    )

    try:
        response = client.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt
        )
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(text)
        tech_id = result.get("assigned_tech_id")
        reason = result.get("reason", "AI Auto-assigned based on skill and workload.")

        if tech_id:
            # Verify tech exists and is in our list
            if any(t.id == tech_id for t in technicians):
                ticket.assigned_to = tech_id
                
                # Update history
                history = json.loads(ticket.ticket_history or "[]")
                # Remove pending assignment message if it exists
                history = [h for h in history if h.get("type") != "assignment_pending"]
                
                from ticket_system.models import get_ist
                history.append({
                    "type": "ai_assignment",
                    "description": f"AI Smart Dispatcher assigned this ticket to technician. Reason: {reason}",
                    "timestamp": get_ist().isoformat()
                })
                ticket.ticket_history = json.dumps(history)
                
                # Update workload
                from auto_assignment_system.service import AutoAssignmentService
                service = AutoAssignmentService(db)
                service._update_technician_workload(tech_id, increment=1)
                
                db.commit()
                print(f"AI Dispatcher: Assigned ticket {ticket_id} to {tech_id}")
                return tech_id
    except Exception as e:
        print(f"AI Dispatcher Error: {e}")
        return None

    return None
