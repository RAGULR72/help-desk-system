from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from database import get_db
from ticket_system import models as ticket_models
from . import schemas
from . import models as comms_models
import auth
from ticket_system.external_dispatcher import dispatcher
from models import User
import ai_service
import html

router = APIRouter(prefix="/api/communication", tags=["communication"])

def perform_sentiment_analysis(ticket_id: int, feedback_text: str):
    """Background task to analyze feedback sentiment"""
    from database import SessionLocal
    db = SessionLocal()
    try:
        analysis = ai_service.analyze_sentiment(feedback_text)
        if analysis:
            db_ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
            if db_ticket:
                db_ticket.sentiment = analysis.get('sentiment')
                db_ticket.sentiment_data = json.dumps(analysis)
                db.commit()
    except Exception as e:
        print(f"Background Sentiment Error: {e}")
    finally:
        db.close()

@router.post("/tickets/{ticket_id}/comments", response_model=schemas.TicketCommentResponse)
def post_comment(
    ticket_id: int,
    comment: schemas.TicketCommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Post a comment or internal note on a ticket"""
    db_ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Permission check for internal notes
    is_staff = current_user.role in ["admin", "manager", "technician"]
    is_owner = db_ticket.user_id == current_user.id
    
    if not is_staff and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to comment on this ticket")

    if comment.is_internal and not is_staff:
        raise HTTPException(status_code=403, detail="Only staff can post internal notes")

    # XSS Protection: Escaping inputs
    sanitized_text = html.escape(comment.text, quote=True)

    db_comment = comms_models.TicketComment(
        ticket_id=ticket_id,
        user_id=current_user.id,
        text=sanitized_text,
        is_internal=1 if comment.is_internal else 0
    )
    db.add(db_comment)
    
    # Add to ticket history as well for legacy compatibility
    history = json.loads(db_ticket.ticket_history or '[]')
    history.append({
        "type": "comment",
        "text": sanitized_text,
        "user": current_user.full_name or current_user.username,
        "is_internal": comment.is_internal,
        "timestamp": ticket_models.get_ist().isoformat()
    })
    db_ticket.ticket_history = json.dumps(history)
    db_ticket.updated_at = ticket_models.get_ist()

    db.commit()
    db.refresh(db_comment)
    return db_comment

@router.get("/tickets/{ticket_id}/comments", response_model=List[schemas.TicketCommentResponse])
def get_comments(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Fetch comments for a ticket"""
    db_ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Permission check: Only owner or staff can see comments
    is_staff = current_user.role in ["admin", "manager", "technician"]
    is_owner = db_ticket.user_id == current_user.id

    if not is_staff and not is_owner:
        raise HTTPException(status_code=403, detail="Not authorized to view comments for this ticket")

    query = db.query(comms_models.TicketComment).filter(comms_models.TicketComment.ticket_id == ticket_id)
    
    # Non-staff users should not see internal notes
    if current_user.role not in ["admin", "manager", "technician"]:
        query = query.filter(comms_models.TicketComment.is_internal == 0)
    
    comments = query.order_by(comms_models.TicketComment.created_at.asc()).all()
    return comments

@router.put("/tickets/{ticket_id}/feedback")
def submit_ticket_feedback(
    ticket_id: int,
    rating_data: schemas.TicketFeedbackUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Submit rating and feedback for a resolved/closed ticket"""
    db_ticket = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if db_ticket.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Only the ticket owner can submit feedback")

    if db_ticket.status not in ["resolved", "closed"]:
        raise HTTPException(status_code=400, detail="Feedback can only be submitted for resolved or closed tickets")

    if rating_data.rating is not None:
        db_ticket.rating = rating_data.rating
    if rating_data.feedback is not None:
        db_ticket.feedback = html.escape(rating_data.feedback, quote=True)
    
    db_ticket.updated_at = ticket_models.get_ist()
    db.commit()
    
    if rating_data.feedback and rating_data.feedback.strip():
        background_tasks.add_task(perform_sentiment_analysis, db_ticket.id, rating_data.feedback)
    
    return {"message": "Feedback submitted successfully"}

@router.get("/feedback/summary")
def get_feedback_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(auth.get_current_user)
):
    """Get all feedback with ratings for Admin/Manager"""
    if current_user.role not in ["admin", "manager"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get tickets that have a rating
    feedback_tickets = db.query(ticket_models.Ticket).filter(ticket_models.Ticket.rating.isnot(None)).order_by(ticket_models.Ticket.updated_at.desc()).all()
    
    # Calculate average
    total_ratings = [t.rating for t in feedback_tickets if t.rating is not None]
    avg_rating = sum(total_ratings) / len(total_ratings) if total_ratings else 0
    
    return {
        "average_rating": avg_rating,
        "total_feedbacks": len(total_ratings),
        "feedbacks": [
            {
                "ticket_id": t.id,
                "custom_id": t.custom_id,
                "subject": t.subject,
                "rating": t.rating,
                "feedback": t.feedback,
                "user": t.owner.full_name if t.owner else "Unknown",
                "timestamp": t.updated_at
            } for t in feedback_tickets
        ]
    }
