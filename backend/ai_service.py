import os
import logging
import json
import re
import random
import time
from google import genai
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Model Constants - Using 2.0-flash based on key availability
PRIMARY_MODEL = "gemini-2.0-flash"
FALLBACK_MODEL = "gemini-2.0-flash-001"
ADVANCED_MODEL = "gemini-2.0-pro"

def _extract_json(text):
    """
    Robustly extracts JSON from a string, even if it has markdown formatting or extra text.
    """
    if not text:
        return None
        
    text = text.strip()
    
    # helper to clean AI specific formatting errors
    def clean_format(s):
        # Remove trailing commas before closing braces/brackets
        s = re.sub(r',\s*([\]\}])', r'\1', s)
        return s

    # 1. Try finding markdown JSON block
    json_match = re.search(r'```(?:json)?\s*(\{.*\}|\[.*\])\s*```', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(clean_format(json_match.group(1)))
        except: pass

    # 2. Try finding raw { } or [ ]
    json_match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
    if json_match:
        try:
            return json.loads(clean_format(json_match.group(1)))
        except:
            try:
                # Last resort: very aggressive single quote fix for keys/values
                # only if double quotes are entirely missing
                candidate = json_match.group(1)
                if '"' not in candidate:
                    candidate = candidate.replace("'", '"')
                return json.loads(clean_format(candidate))
            except: pass
            
    # 3. Final direct attempt
    try:
        return json.loads(text)
    except:
        pass
        
    return None

def _call_gemini(prompt, model=PRIMARY_MODEL, system_instruction=None, is_json=False):
    """
    Unified helper to call Gemini with retries, fallbacks, and error handling.
    """
    if not GEMINI_API_KEY:
        logger.error("Gemini API Key missing")
        return None

    client = genai.Client(api_key=GEMINI_API_KEY)
    
    # Relaxed safety settings for IT troubleshooting
    safety_settings = [
        {"category": "HATE_SPEECH", "threshold": "OFF"},
        {"category": "HARASSMENT", "threshold": "OFF"},
        {"category": "DANGEROUS_CONTENT", "threshold": "OFF"},
        {"category": "SEXUALLY_EXPLICIT", "threshold": "OFF"},
    ]

    try:
        config = {"safety_settings": safety_settings}
        if system_instruction:
            config["system_instruction"] = system_instruction
            
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=config
        )
        
        if not response or not response.text:
            logger.warning(f"Empty response from Gemini ({model})")
            return None
            
        return response.text.strip()
        
    except Exception as e:
        error_str = str(e).lower()
        logger.error(f"Gemini Error ({model}): {e}")
        
        # Fallback to another model if it's a model-not-found error (404) or overloaded
        if ("not found" in error_str or "404" in error_str or "overloaded" in error_str) and model != FALLBACK_MODEL:
            logger.info(f"Falling back to {FALLBACK_MODEL}")
            return _call_gemini(prompt, model=FALLBACK_MODEL, system_instruction=system_instruction, is_json=is_json)
            
        # Handle 403 specifically
        if "permission_denied" in error_str or "403" in error_str:
            return "ERROR_403: API Key Permission Denied. Please check Google AI Studio console to enable the Generative Language API."
            
        # Handle 429 specifically
        if "429" in error_str or "exhausted" in error_str:
            return "ERROR_429: AI Rate Limit Reached. Please wait a minute or upgrade your Gemini quota."
            
        return None

def generate_resolution_suggestion(ticket_subject, ticket_description, kb_articles, past_resolutions):
    """
    Generates a resolution suggestion using Google Gemini.
    """
    context = "You are a Senior IT System Administrator for Proserve acting as a Co-Pilot for a technician. "
    context += f"Ticket Subject: {ticket_subject}\n"
    context += f"Ticket Description: {ticket_description}\n\n"
    
    if kb_articles:
        context += "Relevant Knowledge Base Articles:\n"
        for art in kb_articles:
            context += f"- Title: {art.title}\n  Content excerpt: {art.content[:500]}...\n"
    
    if past_resolutions:
        context += "\nSimilar Past Resolutions (HISTORICAL DATA):\n"
        for res in past_resolutions:
             context += f"- Resolution: {res}\n"

    prompt = f"""
{context}

Provide a technical resolution plan for this ticket.
INSTRUCTIONS:
1. Identify the likely root cause.
2. Provide 4-6 deep technical steps (e.g., Windows services, registry, CLI).
3. Risk Level: Label dangerous steps clearly.

Format the output as a valid JSON object:
{{
  "summary": "Technical analysis of the problem.",
  "steps": ["Step 1", "Step 2", "..."],
  "confidence": 0.85
}}
RAW JSON ONLY.
"""
    response_text = _call_gemini(prompt)
    return response_text

def chat_with_context(user_message, context_articles):
    """
    Chat with the AI using KB articles as context.
    """
    context = (
        "You are a helpful IT support assistant for Proserve. "
        "Use the following Knowledge Base articles to answer the user's question. "
        "If the answer isn't in the articles, offer general IT advice but mention you aren't sure specific to Proserve policies.\n\n"
    )
    
    for art in context_articles:
        context += f"Article: {art.title}\nContent: {art.content}\n\n"
        
    prompt = f"{context}\nUser Question: {user_message}\nAnswer:"

    response_text = _call_gemini(prompt)
    if response_text and "ERROR_403" in response_text:
        return "System Alert: Gemini API Key Permission Denied. Please contact your IT administrator."
    return response_text or "I'm having trouble processing your request right now."

def polish_text(raw_text, context_type="general", additional_context=None):
    """
    Translates Tanglish/Tamil to professional English and polishes rough English notes.
    """
    system_instruction = (
        "You are an expert linguistic translator and professional editor. "
        "Convert the input text into professional, formal English. "
        "Input might be in 'Tanglish' (Tamil in English alphabet) or Tamil. "
        "Translate to English first, then polish. Output ONLY the polished English."
    )

    context_str = f"Context: {additional_context}\n\n" if additional_context else ""
    prompt = f"Input: \"{raw_text}\"\n\nProfessional English Output:"

    response_text = _call_gemini(prompt, system_instruction=system_instruction)
    if response_text and "ERROR_403" in response_text:
        return "AI Error: API Key Permission Denied (403). Check console."
    
    if response_text:
        return response_text.strip().replace('"', '')
    return "AI Error: Could not process text."

def generate_kb_article(ticket_subject, ticket_description, resolution_note, steps=None):
    """
    Converts a resolved ticket into a professional KB article draft.
    """
    prompt = (
        "You are an expert technical writer. Convert the following resolved IT ticket into a professional KB Article.\n\n"
        f"Subject: {ticket_subject}\n"
        f"Description: {ticket_description}\n"
        f"Resolution: {resolution_note}\n"
        f"Steps: {steps or 'N/A'}\n\n"
        "Format as JSON: { 'title': '...', 'content': 'HTML body', 'excerpt': '...', 'category': '...', 'tags': '...' }"
    )

    response_text = _call_gemini(prompt)
    if response_text:
        return _extract_json(response_text)
    return None

def categorize_ticket(subject, description=None):
    """
    Predicts category, subcategory, and priority from ticket subject/description.
    """
    prompt = (
        "Analyze the following ticket and suggest Category, Subcategory, and Priority (low, normal, high, critical).\n\n"
        f"Subject: {subject}\n"
        f"Description: {description or 'N/A'}\n\n"
        "Format as JSON focus on keys: category, subcategory, priority."
    )

    response_text = _call_gemini(prompt)
    if response_text:
        return _extract_json(response_text)
    return None

def generate_dashboard_insights(stats_summary):
    """
    Analyzes dashboard statistics and produces actionable insights for admins.
    """
    prompt = (
        "You are a strategic IT Operations Manager. Analyze this data and provide 3-5 high-level insights.\n"
        f"Data: {json.dumps(stats_summary)}\n"
        "Format as JSON list: [{ 'type': 'warning/info/success', 'title': '...', 'message': '...' }]"
    )
    response_text = _call_gemini(prompt)
    if response_text:
        return _extract_json(response_text)
    return None

def analyze_ticket_sentiment(subject, description):
    """
    Analyzes ticket sentiment and urgency during creation.
    """
    prompt = (
        "Analyze the user's emotional state and urgency.\n"
        f"Subject: {subject}\n"
        f"Description: {description}\n"
        "Format as JSON: { 'sentiment': '...', 'urgency_score': 0.0-1.0, 'level': 'Normal/High Alert', 'reason': '...' }"
    )
    response_text = _call_gemini(prompt)
    if response_text:
        return _extract_json(response_text)
    return None

def summarize_ticket(subject, description):
    """
    Generates a 2-line summary of the ticket.
    """
    prompt = (
        f"Summarize this ticket into exactly 2 professional sentences.\n"
        f"Subject: {subject}\n"
        f"Description: {description}"
    )
    return _call_gemini(prompt)

def summarize_ticket_history_3_points(subject, description, comments):
    """
    Generates a professional 3-point summary of the ticket history.
    """
    comments_str = "\n".join([f"- {c['author']}: {c['text']}" for c in comments])
    prompt = (
        "Summarize the ticket and history into exactly 3 bullet points (•).\n"
        f"Subject: {subject}\n"
        f"Desc: {description}\n"
        f"History:\n{comments_str}"
    )
    return _call_gemini(prompt)

def generate_concierge_response(user_query, chat_history, kb_articles):
    """
    RAG-based chat for pre-ticket support.
    """
    context = "You are 'Proserve AI Concierge'. Help solve the issue using KB articles.\n"
    if kb_articles:
        for art in kb_articles:
            context += f"### {art.title}\n{art.content}\n"

    history_str = "\n".join([f"{msg['role'].upper()}: {msg['content']}" for msg in chat_history[-5:]])
    prompt = f"{context}\nHistory:\n{history_str}\nUser: {user_query}\n\nFormat as JSON with keys: message, solved, ticket_ready, ticket_data."
    
    response_text = _call_gemini(prompt)
    if response_text:
        return _extract_json(response_text)
    return {"message": "Semma confusion-a irukku. Should we open a ticket?", "solved": False}

def detect_duplicate_tickets(new_ticket_data, recent_tickets_data):
    """
    Uses AI to identify if a new ticket is a duplicate of any recent tickets.
    """
    prompt = f"Check if this NEW TICKET is a duplicate of any RECENT TICKETS.\nNEW: {new_ticket_data['subject']}\nRECENT:\n"
    for t in recent_tickets_data:
        prompt += f"- ID: {t['id']}, Subject: {t['subject']}\n"
    
    prompt += "\nReturn JSON: { 'is_duplicate': bool, 'main_ticket_id': ID, 'reason': '...' }"
    
    response_text = _call_gemini(prompt)
    if response_text:
        return _extract_json(response_text)
    return None

def generate_ai_auto_reply(subject, description, kb_articles):
    """
    Generates a helpful self-help response for the user using KB articles.
    """
    kb_context = "\n".join([f"### {art.title}\n{art.content}" for art in kb_articles])
    prompt = (
        f"Provide a friendly First Level response for the issue: {subject}.\n"
        f"Desc: {description}\nKnowledge Base:\n{kb_context}\n"
        "Address as 'Valued User'. Max 5 sentences."
    )
    return _call_gemini(prompt)

def generate_tech_co_pilot_guide(subject, description, kb_articles, past_resolutions):
    """
    Generates a technical co-pilot guide for technicians.
    """
    context = f"Problem: {subject}\nDesc: {description}\n"
    if past_resolutions:
        context += "Past Fixes:\n" + "\n".join(past_resolutions)
    
    prompt = (
        f"{context}\nProvide a technical resolution guide with Diagnostics and Action Plan."
    )
    return _call_gemini(prompt)

def generate_smart_suggestions(db, subject, description=None):
    """
    Combines internal knowledge (past tickets, KB) and general AI knowledge.
    """
    from ticket_system.models import Ticket
    from knowledge_base.models import KBArticle
    from sqlalchemy import or_, desc

    # Search internal DB
    query_word = subject.split(' ')[0]
    past_tickets = db.query(Ticket).filter(Ticket.status.in_(['resolved', 'closed']), Ticket.title.ilike(f"%{query_word}%")).limit(2).all()
    kb_articles = db.query(KBArticle).filter(KBArticle.title.ilike(f"%{query_word}%")).limit(2).all()

    context = f"Internal Tickets: {[t.title for t in past_tickets]}\nKB: {[a.title for a in kb_articles]}"
    prompt = (
        f"Suggest immediate fixes for: {subject}\n{context}\n"
        "Format with headings: [INTERNAL MATCH], [EXPERT WEB INSIGHT], [IMMEDIATE STEPS]."
    )
    return _call_gemini(prompt)

def generate_diagnostic_suggestion(db, subject, description, ticket_id):
    """
    Expert-level JSON diagnostic for the Smart Co-Pilot Card.
    """
    prompt = (
        f"Technical diagnostic for: {subject}\nDesc: {description}\n"
        "Format as JSON: { 'summary': '...', 'steps': [], 'confidence': 0.0-1.0 }"
    )
    response_text = _call_gemini(prompt)
    if response_text:
        return _extract_json(response_text)
    return {"summary": "Baseline protocol recommended.", "steps": ["Check connectivity", "Check logs"], "confidence": 0.5}
