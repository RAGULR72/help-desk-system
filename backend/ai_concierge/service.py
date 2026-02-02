import os
import google.generativeai as genai
from dotenv import load_dotenv
import json
import base64
from io import BytesIO
from admin_system import models as admin_models
from sqlalchemy.orm import Session

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def get_concierge_config(db: Session):
    config = {
        "enabled": False,
        "name": "Proserve AI Concierge"
    }
    settings = db.query(admin_models.SystemSettings).filter(
        admin_models.SystemSettings.key.in_(["ai_concierge_enabled", "ai_concierge_name"])
    ).all()
    
    for s in settings:
        if s.key == "ai_concierge_enabled":
            config["enabled"] = s.value == "true"
        elif s.key == "ai_concierge_name":
            config["name"] = s.value
            
    return config

def generate_concierge_response(user_query, chat_history, kb_articles, bot_name="Proserve AI Concierge", image_data_base64=None):
    """
    Multimodal RAG-based chat for pre-ticket support.
    Includes MAXIMUM privacy and security guardrails.
    """
    if not GEMINI_API_KEY:
        return {"message": "AI Service Offline", "solved": False}

    model = genai.GenerativeModel('gemini-1.5-flash')

    context = (
        f"You are '{bot_name}', an intelligent multilingual support assistant for Proserve Help Desk. "
        "CRITICAL SECURITY & PRIVACY DIRECTIVES:\n"
        "1. DATA LEAK PREVENTION: NEVER share, mention, or discuss any internal system dates, server times, database timestamps, or global system metrics.\n"
        "2. ZERO SYSTEM KNOWLEDGE: You must act as if you have NO knowledge of the underlying server architecture, hosting details, or backend environment. Never answer questions about 'the system' or 'when the system was created'.\n"
        "3. NO GLOBAL DATA: Never discuss other users' data, ticket counts of other users, or any sensitive help desk statistics.\n"
        "4. STRICT TOPIC FILTER: You are ONLY allowed to discuss the user's current IT issue (e.g., 'my printer is broken', 'forgot password').\n"
        "5. MIRRORING: Reply only in the language and script used by the user (English, Tanglish, Tamil, Hindi, Telugu).\n"
        "6. EMERGENCY HANDLING: If a user asks about system-wide emergencies, data leaks, or security status, DO NOT PROVIDE ANY DATA. Politely state you can only assist with individual support tickets.\n\n"
        "Your goal: Help solve the user's specific IT problem using provided KB articles. "
        "Analyze images ONLY for visible IT errors (e.g., error codes on screen).\n\n"
        "Guidelines:\n"
        "- MIRROR script and language perfectly.\n"
        "- If a user asks 'How are you?', be polite but neutral.\n"
        "- If a ticket is needed, summarize the user's problem into 'subject' and 'description' without including any system metadata or internal timestamps.\n"
    )

    if kb_articles:
        context += "\nRelevant Knowledge Base Content:\n"
        for art in kb_articles:
            context += f"### {art.title}\n{art.content}\n\n"

    history_str = ""
    for msg in chat_history[-6:]:
        history_str += f"{msg['role'].upper()}: {msg['content']}\n"

    prompt_text = (
        f"{context}\n"
        f"Chat History:\n{history_str}\n"
        f"User Input: {user_query or 'Analyze the attached image'}\n\n"
        "Response Format (Strict JSON):\n"
        "{\n"
        "  \"message\": \"Your reply in the user's language\",\n"
        "  \"solved\": boolean,\n"
        "  \"ticket_ready\": boolean,\n"
        "  \"ticket_data\": { \"subject\": \"...\", \"description\": \"...\", \"category\": \"...\", \"priority\": \"...\" }\n"
        "}\n"
        "Do not include markdown code blocks."
    )

    content_parts = [prompt_text]
    
    if image_data_base64:
        try:
            if "," in image_data_base64:
                image_data_base64 = image_data_base64.split(",")[1]
            img_bytes = base64.b64decode(image_data_base64)
            content_parts.append({"mime_type": "image/jpeg", "data": img_bytes})
        except: pass

    try:
        response = model.generate_content(content_parts)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        if "'" in text and "\"" not in text:
             text = text.replace("'", "\"")
        return json.loads(text)
    except Exception as e:
        return {"message": "Semma confusion-a irukku. Naan ungaluku support ticket open panna help pannatuma?", "solved": False}
