import os
import google.generativeai as genai
from dotenv import load_dotenv
import json

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

def generate_resolution_suggestion(ticket_subject, ticket_description, kb_articles, past_resolutions):
    """
    Generates a resolution suggestion using Google Gemini.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

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
You are a Senior Level 3 IT Specialist. Provide a technical resolution plan for this ticket.

{context}

INSTRUCTIONS:
1. Technical Logic: Identify the likely root cause.
2. Search Context: Review the "Similar Past Resolutions". If a fix worked before, highlight it.
3. Troubleshooting Steps: Provide 4-6 deep technical steps (e.g., specific Windows services to restart, Registry paths, CLI commands).
4. Risk Level: If any step is dangerous (data loss), label it clearly.
5. Search Insights: Since you have access to general knowledge, include 1 expert tip from documented web/industry best practices.

Format the output as a valid JSON object:
{{
  "summary": "Technical analysis of the problem.",
  "steps": ["Step 1", "Step 2", "..."],
  "confidence": 0.85
}}

RAW JSON ONLY. No markdown tags.
"""

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return None

def chat_with_context(user_message, context_articles):
    """
    Chat with the AI using KB articles as context.
    """
    if not GEMINI_API_KEY:
        return "I'm sorry, my AI brain is currently offline. Please contact support manually."

    model = genai.GenerativeModel('gemini-2.0-flash')
    
    context = (
        "You are a helpful IT support assistant for Proserve. "
        "Use the following Knowledge Base articles to answer the user's question. "
        "If the answer isn't in the articles, offer general IT advice but mention you aren't sure specific to Proserve policies.\n\n"
    )
    
    for art in context_articles:
        context += f"Article: {art.title}\nContent: {art.content}\n\n"
        
    prompt = f"{context}\nUser Question: {user_message}\nAnswer:"

    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Gemini Chat Error: {e}")
        return "I'm having trouble processing your request right now."

def polish_text(raw_text, context_type="general", additional_context=None):
    """
    Translates Tanglish/Tamil to professional English and polishes rough English notes.
    """
    if not GEMINI_API_KEY:
        return "System Alert: AI Service is offline (Missing API Key). Please check server logs."

    # Use flash for better instruction following
    model = genai.GenerativeModel('gemini-2.0-flash')

    system_instruction = (
        "You are an expert linguistic translator and professional editor. "
        "Your task is to convert the input text into professional, formal English suitable for a workplace environment.\n"
        "CRITICAL INSTRUCTION: The input is likely in 'Tanglish' (Tamil words written in English alphabet) or broken English. "
        "You MUST translate the meaning to English first, then polish it.\n\n"
        "EXAMPLES:\n"
        "Input: \"naan leave edukanum\"\nOutput: \"I would like to request leave.\"\n\n"
        "Input: \"inniku late ah vanthen traffic nala\"\nOutput: \"I arrived late today due to heavy traffic.\"\n\n"
        "Input: \"system work aagala\"\nOutput: \"The system is not functioning correctly.\"\n\n"
        "Input: \"checkin panna maranthuten\"\nOutput: \"I forgot to check in.\"\n\n"
        "Input: \"na theriuma yestraday checkou click panieten sir en time vantha 8:pm\"\nOutput: \"Sir, I accidentally clicked checkout yesterday. My actual time was 8:00 PM.\"\n\n"
        "GUIDELINES:\n"
        "1. Identify the core meaning, regardless of language (Tamil/Tanglish/English).\n"
        "2. Output ONLY the final professional English text.\n"
        "3. Do not include quotes or explanations.\n"
    )

    if additional_context:
        system_instruction += f"Context: {additional_context}\n\n"

    prompt = f"{system_instruction}\nInput: \"{raw_text}\"\n\nProfessional English Output:"

    try:
        response = model.generate_content(prompt)
        return response.text.strip().replace('"', '')
    except Exception as e:
        error_msg = f"AI Error: {str(e)}"
        print(error_msg)
        return error_msg

def generate_kb_article(ticket_subject, ticket_description, resolution_note, steps=None):
    """
    Converts a resolved ticket into a professional KB article draft.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = (
        "You are an expert technical writer. Convert the following resolved IT ticket into a professional "
        "Knowledge Base (KB) Article. The article should be structured for future technical staff to reuse.\n\n"
        f"Original Subject: {ticket_subject}\n"
        f"Original Description: {ticket_description}\n"
        f"Resolution Logic: {resolution_note}\n"
    )

    if steps:
        prompt += f"Resolution Steps Taken: {steps}\n"

    prompt += (
        "\nFormat the output as a JSON object with the following keys:\n"
        "- title: A clear, professional title for the article.\n"
        "- content: The full article body in clean HTML format (using <h3>, <p>, <ul>, <li> tags).\n"
        "- excerpt: A short 1-2 sentence summary of what the article solves.\n"
        "- category: A suitable category (e.g., Software, Hardware, Network, etc.).\n"
        "- tags: A comma-separated string of relevant keywords.\n"
        "Do not include markdown formatting code blocks, just the JSON string."
    )

    try:
        response = model.generate_content(prompt)
        # Attempt to parse as JSON
        text = response.text.strip()
        # Clean potential markdown if AI ignored instruction
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini KB Generation Error: {e}")
        return None

def categorize_ticket(subject, description=None):
    """
    Predicts category, subcategory, and priority from ticket subject/description.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = (
        "You are an intelligent IT service desk dispatcher. Analyze the following ticket information "
        "and suggest the most appropriate Category, Subcategory, and Priority (low, normal, high, critical).\n\n"
        f"Subject: {subject}\n"
        f"Description: {description or 'N/A'}\n\n"
        "Categories usually include: Software, Hardware, Network, Access/Accounts, Email, Printers, Others.\n"
        "Format the output as a clean JSON object with keys: category, subcategory, priority.\n"
        "Do not include markdown or extra text."
    )

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini Categorization Error: {e}")
        return None
def generate_dashboard_insights(stats_summary):
    """
    Analyzes dashboard statistics and produces actionable insights for admins.
    """
    if not GEMINI_API_KEY:
         return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = (
        "You are a strategic IT Operations Manager. Analyze the following help-desk performance data "
        "and provide 3-5 high-level actionable insights or alerts for the administrator.\n\n"
        f"Data Summary:\n{json.dumps(stats_summary, indent=2)}\n\n"
        "Focus on pinpointing:\n"
        "1. Critical bottlenecks (e.g., high volume in a specific category).\n"
        "2. SLA violation trends or risks.\n"
        "3. Workforce/Resource suggestions (e.g., if many tickets are unassigned).\n"
        "4. Success trends (e.g., improvement in resolution time).\n\n"
        "Format the output as a JSON list of objects, each with 'type' (warning, info, success), 'title', and 'message'.\n"
        "Do not include markdown or extra text."
    )

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini Insights Error: {e}")
        return None
def analyze_ticket_sentiment(subject, description):
    """
    Analyzes ticket sentiment and urgency during creation.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = (
        "You are an empathetic IT Service Desk analyst. Analyze the following new ticket "
        "to detect the user's emotional state and the level of urgency implied in their language.\n\n"
        f"Subject: {subject}\n"
        f"Description: {description}\n\n"
        "Format the output as a clean JSON object with keys:\n"
        "- sentiment: 'Positive', 'Neutral', or 'Negative'\n"
        "- urgency_score: a number from 0 to 1 (1 being extremely urgent/emergency)\n"
        "- level: 'Normal' or 'High Alert' (use High Alert if user is very frustrated, angry, or has a critical emergency)\n"
        "- reason: a very short reason for this classification.\n"
        "Do not include markdown or extra text."
    )

    try:
        response = model.generate_content(prompt)
        text_res = response.text.strip()
        if text_res.startswith("```json"):
            text_res = text_res.replace("```json", "").replace("```", "").strip()
        return json.loads(text_res)
    except Exception as e:
        print(f"Gemini Ticket Sentiment Error: {e}")
        return None

def summarize_ticket(subject, description):
    """
    Generates a 2-line summary of the ticket.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = (
        "Summarize the following IT ticket into exactly 2 clear, professional sentences "
        "that help a technician understand the core issue immediately.\n\n"
        f"Subject: {subject}\n"
        f"Description: {description}\n\n"
        "Summary:"
    )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Summarization Error: {e}")
        return None

def summarize_ticket_history_3_points(subject, description, comments):
    """
    Generates a professional 3-point summary of the ticket history.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    comments_str = ""
    for idx, c in enumerate(comments):
        comments_str += f"{idx+1}. Author: {c['author']}, Text: {c['text']}\n"

    prompt = f"""
    You are a Senior IT Support Lead. Please summarize the following ticket and its comment history into exactly 3 professional bullet points.
    Focus on:
    1. The core original problem.
    2. Key troubleshooting or investigation steps already taken.
    3. The current status or bottleneck preventing resolution.

    Ticket Subject: {subject}
    Ticket Description: {description}
    
    Conversation History:
    {comments_str if comments_str else "No comments yet."}

    Format the output as exactly 3 bullet points starting with '•'.
    Be technical and concise. No conversational filler.
    """

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini 3-Point Summarization Error: {e}")
        return None
def generate_concierge_response(user_query, chat_history, kb_articles):
    """
    RAG-based chat for pre-ticket support.
    """
    if not GEMINI_API_KEY:
        return {"message": "AI Service Offline", "solved": False}

    model = genai.GenerativeModel('gemini-2.0-flash')

    context = (
        "You are 'Proserve AI Concierge', an intelligent support assistant. "
        "Your goal is to help the user solve their IT problem using the Knowledge Base (KB) articles provided. "
        "If you solve it, congratulate them. If you cannot solve it or they are frustrated, "
        "offer to help them prepare a ticket.\n\n"
        "Rules:\n"
        "1. Be polite and professional.\n"
        "2. If referring to a KB article, summarize the steps clearly.\n"
        "3. If the user wants to raise a ticket, extract a 'subject' and 'description' from the conversation.\n"
    )

    if kb_articles:
        context += "\nRelevant Knowledge Base Content:\n"
        for art in kb_articles:
            context += f"### {art.title}\n{art.content}\n\n"

    history_str = ""
    for msg in chat_history[-6:]: # Last 6 messages for context
        history_str += f"{msg['role'].upper()}: {msg['content']}\n"

    prompt = (
        f"{context}\n"
        f"Chat History:\n{history_str}\n"
        f"User Message: {user_query}\n\n"
        "Response Format (JSON):\n"
        "{\n"
        "  'message': 'Your reply to the user (can include HTML like <b> or <ul>)',\n"
        "  'solved': boolean (true if issue seems resolved),\n"
        "  'ticket_ready': boolean (true if you think a ticket should be raised now),\n"
        "  'ticket_data': { 'subject': '...', 'description': '...' } (only if ticket_ready is true)\n"
        "}\n"
        "Do not include markdown blocks."
    )

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        # Handle single quotes if Gemini uses them
        if "'" in text and '"' not in text:
             text = text.replace("'", '"')
        return json.loads(text)
    except Exception as e:
        print(f"Concierge Error: {e}")
        return {"message": "I'm having trouble thinking. Should we just open a ticket?", "solved": False}
def detect_duplicate_tickets(new_ticket_data, recent_tickets_data):
    """
    Uses AI to identify if a new ticket is a duplicate of any recent tickets.
    """
    if not GEMINI_API_KEY or not recent_tickets_data:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = (
        "You are an IT Ops analyst. Check if the following NEW TICKET is a duplicate of any RECENT TICKETS listed.\n"
        "A duplicate is when multiple people report the same infrastructure issue (e.g., 'WiFi down', 'Printer in Room 3 broken').\n\n"
        f"NEW TICKET:\n- Subject: {new_ticket_data['subject']}\n- Description: {new_ticket_data['description']}\n\n"
        "RECENT TICKETS:\n"
    )

    for t in recent_tickets_data:
        prompt += f"- ID: {t['id']}, Subject: {t['subject']}, Desc: {t['description'][:100]}...\n"

    prompt += (
        "\nIf you find a strong match, return a JSON object with:\n"
        "- is_duplicate: true\n"
        "- main_ticket_id: the ID of the existing ticket it matches\n"
        "- reason: a short explanation of why they are duplicates.\n"
        "If no match, return {\"is_duplicate\": false}.\n"
        "Do not include markdown or extra text."
    )

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith("```json"):
            text = text.replace("```json", "").replace("```", "").strip()
        return json.loads(text)
    except Exception as e:
        print(f"Gemini Duplicate Detection Error: {e}")
        return None

def generate_ai_auto_reply(subject, description, kb_articles):
    """
    Generates a helpful self-help response for the user using KB articles.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    kb_context = ""
    if kb_articles:
        kb_context = "\nUse the following Knowledge Base articles to provide steps:\n"
        for art in kb_articles:
            kb_context += f"### {art.title}\n{art.content}\n\n"

    prompt = (
        "You are a helpful IT support assistant. A user has just raised a ticket. "
        "Review their issue and provide a friendly 'First Level' response. "
        "If you can find a solution in the provided KB articles, give them clear steps to try. "
        "If not, give general helpful advice and reassure them that a technician will be assigned soon.\n\n"
        f"User Problem:\nSubject: {subject}\nDescription: {description}\n"
        f"{kb_context}\n"
        "Your response should be in professional English, friendly, and well-formatted. "
        "Address the user as 'Valued User'. Max 5-6 sentences."
    )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Auto-Reply Error: {e}")
        return None

def generate_tech_co_pilot_guide(subject, description, kb_articles, past_resolutions):
    """
    Generates a technical co-pilot guide for technicians.
    """
    if not GEMINI_API_KEY:
        return None

    model = genai.GenerativeModel('gemini-2.0-flash')

    context = "You are a Senior IT System Administrator acting as a Co-Pilot for a technician. "
    context += f"Problem Statement:\nSubject: {subject}\nDescription: {description}\n\n"
    
    if kb_articles:
        context += "Relevant Internal Documentation (KB):\n"
        for art in kb_articles:
            context += f"- {art.title}: {art.content[:300]}...\n"
            
    if past_resolutions:
        context += "\nHistorical Resolution Patterns:\n"
        for res in past_resolutions:
            context += f"- {res}\n"

    prompt = f"""
You are a Senior IT System Administrator acting as a Co-Pilot for a technician for Proserve.
Provide a highly technical, step-by-step resolution guide for the following issue.

{context}

INSTRUCTIONS for CO-PILOT:
1. Pattern Analysis: Review historical fix patterns provided. Identify if this is a recurring system failure.
2. Technical Steps: Suggest 4-6 deep technical steps (CLI commands, registry checks, network diagnostics, etc.).
3. Risk Assessment: Warn about any steps that might cause downtime or data loss.
4. Resolution Logic: Explain WHY these steps are recommended based on past successes.

Tone: Professional, terse, and highly technical.
Format: Use Markdown with clear headings (Diagnostics, Action Plan, Risk Level).
"""

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Gemini Tech Co-Pilot Error: {e}")
        return None
def generate_smart_suggestions(db, subject, description=None):
    """
    Combines internal knowledge (past tickets, KB) and general AI knowledge 
    to suggest immediate fixes during ticket creation.
    """
    if not GEMINI_API_KEY:
        return None

    from ticket_system.models import Ticket
    from knowledge_base.models import KBArticle
    from sqlalchemy import or_, desc

    # 1. Search similar resolved tickets
    query = subject.split(' ')[0] # Simple keyword
    past_tickets = db.query(Ticket).filter(
        Ticket.status.in_(['resolved', 'closed']),
        Ticket.title.ilike(f"%{query}%"),
        Ticket.resolution_notes.isnot(None)
    ).order_by(desc(Ticket.created_at)).limit(3).all()

    # 2. Search KB
    kb_articles = db.query(KBArticle).filter(
        or_(
            KBArticle.title.ilike(f"%{query}%"),
            KBArticle.excerpt.ilike(f"%{query}%")
        )
    ).limit(2).all()

    # 3. Construct Context
    context = ""
    if past_tickets:
        context += "\n--- SIMILAR PAST RESOLUTIONS ---\n"
        for t in past_tickets:
            context += f"- Ticket: {t.title}\n  Resolution: {t.resolution_notes[:300]}\n"
    
    if kb_articles:
        context += "\n--- KB ARTICLES ---\n"
        for art in kb_articles:
            context += f"- {art.title}: {art.excerpt}\n"

    model = genai.GenerativeModel('gemini-2.0-flash')

    prompt = (
        "You are an Elite IT Support Architect for Proserve.\n"
        "A user is typing a support ticket. Your goal: Provide a high-premium diagnostic guide.\n\n"
        f"ISSUE SUBJECT: {subject}\n"
        f"ISSUE DESCRIPTION: {description or 'N/A'}\n"
        f"INTERNAL DATABASE (KB/Tickets): {context}\n\n"
        "OUTPUT STRUCTURE (STRICT):\n"
        "1. Start with '💡 **PROSERVE SMART DIAGNOSTIC**'\n"
        "2. Section: **[INTERNAL MATCH]** -> If you found something in the INTERNAL DATABASE, mention it first. If not, say 'No direct internal match found; checking global expert database...'\n"
        "3. Section: **[EXPERT WEB INSIGHT]** -> Provide the #1 most successful industry fix for this specific problem (e.g. from Microsoft, Apple, or Cisco documentation logic).\n"
        "4. Section: **[IMMEDIATE STEPS]** -> 3 bullet points of what the user should do RIGHT NOW.\n"
        "5. Section: **[VERDICT]** -> One-liner on whether they should proceed with the ticket or if this might solve it.\n\n"
        "TONE: High-end, technical, yet helpful. NO placeholders. NO greetings."
    )

    try:
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        print(f"Smart Suggestions Error: {e}")
        return None

def generate_diagnostic_suggestion(db, subject, description, ticket_id):
    """
    Expert-level JSON diagnostic for the Smart Co-Pilot Card.
    """
    if not GEMINI_API_KEY:
        return {
            "summary": "AI Diagnostics Offline. Please consult standard L1 procedures.",
            "steps": ["Scan local logs", "Verify connectivity", "Escalate if persistent"],
            "confidence": 0.5
        }

    from ticket_system.models import Ticket
    from sqlalchemy import or_, desc

    # Search past similar resolutions
    keywords = [kw.lower() for kw in subject.split(' ') if len(kw) > 3]
    query = db.query(Ticket).filter(
        Ticket.status.in_(['resolved', 'closed']),
        Ticket.id != ticket_id,
        Ticket.resolution_notes.isnot(None)
    )
    if keywords:
        query = query.filter(or_(*[Ticket.subject.ilike(f"%{kw}%") for kw in keywords]))
    
    similar_t = query.order_by(desc(Ticket.created_at)).limit(3).all()
    context = ""
    if similar_t:
        context = "PAST SUCCESSFUL FIXES:\n" + "\n".join([f"- {t.subject}: {t.resolution_notes}" for t in similar_t])

    model = genai.GenerativeModel('gemini-2.0-flash')
    prompt = f"""
    Internal Issue: {subject}
    Description: {description}
    {context}

    Task: Provide a high-end technical resolution plan for an IT Technician.
    Your response must be VALID JSON with exactly these keys:
    - summary: A 2-sentence veteran-level analysis of the pattern.
    - steps: A list of 4 specific, actionable technical steps.
    - confidence: A float between 0 and 1.

    Rule: No markdown code blocks. Just the raw JSON object.
    """
    
    try:
        response = model.generate_content(prompt)
        text = response.text.strip().replace("```json", "").replace("```", "")
        import json
        return json.loads(text)
    except Exception as e:
        print(f"Diagnostic AI Error: {e}")
        return {
            "summary": "Pattern analysis failed. Baseline protocol recommended.",
            "steps": ["Review hardware logs", "Clear system cache", "Verify user permissions"],
            "confidence": 0.4
        }
