from fastapi import FastAPI, Request, Depends
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import datetime
from database import get_db
from dotenv import load_dotenv
import os
import traceback
import logging

# Load environment variables from .env file
load_dotenv()

from database import engine, Base
from ticket_system import admin_routes, auth_routes, ticket_routes, notification_routes
import ai_routes
from ticket_system import models as ticket_models # Register models
from sla_system import sla_models
from workflow_system import workflow_models # Register Workflow models
from chat_system import models as chat_models # Register Chat models
from chat_system import routes as chat_routes # Missing import fixed
from attendance_system import models as attendance_models
from admin_system import models as admin_models
from expense_system import models as expense_models

from communication_system import models as comms_models
from auto_assignment_system import models as auto_assignment_models
from search_system import models as search_models
from search_system import routes as search_routes
from asset_management import models as asset_models  # Register Asset models
from sla_system import sla_routes 
from knowledge_base import models as kb_models

from sqlalchemy import text
from fix_db import fix_users_table

import time

# Create database tables with retry logic
for i in range(5):
    try:
        print(f"Database initialization attempt {i+1}/5...")
        with engine.connect() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS pg_trgm"))
            connection.commit()
        Base.metadata.create_all(bind=engine)
        # Run schema fixes for existing tables
        fix_users_table()
        print("Database initialized successfully.")
        break
    except Exception as e:
        print(f"Database initialization attempt {i+1} failed: {e}")
        if i < 4:
            time.sleep(5)
        else:
            print("Warning: Could not initialize database after 5 attempts. Starting app anyway...")

app = FastAPI(title="Proserve API", version="1.0.0")



# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configure CORS
origins_str = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in origins_str.split(",") if o.strip()]

@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as exc:
        # Don't catch HTTPException, let FastAPI handle it
        from fastapi import HTTPException
        if isinstance(exc, HTTPException):
            raise exc
            
        err_msg = f"Unhandled error: {str(exc)}\n{traceback.format_exc()}"
        logging.error(err_msg)
        
        # Log to Audit DB if possible
        try:
            from database import SessionLocal
            from audit_logger import AuditLogger
            db = SessionLocal()
            try:
                AuditLogger.log_api_error(
                    db=db,
                    path=request.url.path,
                    method=request.method,
                    error=str(exc),
                    ip_address=request.client.host
                )
            finally:
                db.close()
        except:
            pass # Don't let logging fail the response
        
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Internal Server Error: {str(exc)}",
                "msg": str(exc),
                "trace": traceback.format_exc() if os.getenv("ENVIRONMENT") == "development" else "Refer to logs"
            }
        )

# Configure CORS
# Hardcode critical origins to avoid wildcard * issues when credentials=True
allowed_origins = [
    "https://www.proservehelpdesk.in",
    "https://proservehelpdesk.in",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://help-desk-system-b5gy.onrender.com",
    "https://help-desk-system-one.vercel.app"
]

# Add any extra origins from env, but filter out '*' if exists
if origins:
    for o in origins:
        if o != "*":
            allowed_origins.append(o)

# Security Middleware will be added first, then CORSMiddleware will wrap it
# to ensure CORS headers are added even to rejected requests.

# Add Security Middleware (Rate Limiting, IP Blocking, Security Headers)
from security_middleware import SecurityMiddleware, set_security_middleware_instance
app.add_middleware(SecurityMiddleware)

# Add CORS Middleware LAST so it is the OUTERMOST middleware
# This ensures CORS headers are present even when SecurityMiddleware blocks a request (e.g. 403 or 429)
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
import upload_routes 
from attendance_system import routes as attendance_routes
from admin_system import routes as sys_config_routes

app.include_router(auth_routes.router)
app.include_router(admin_routes.router)
app.include_router(ticket_routes.router)
app.include_router(notification_routes.router)
app.include_router(sla_routes.router)
from workflow_system.workflow_routes import router as workflow_router
app.include_router(workflow_router)
app.include_router(upload_routes.router)
app.include_router(attendance_routes.router)

app.include_router(chat_routes.router)
app.include_router(sys_config_routes.router)


from communication_system import routes as comms_routes
from expense_system import routes as expense_routes

app.include_router(comms_routes.router)
app.include_router(expense_routes.router)
app.include_router(search_routes.router)

from auto_assignment_system import routes as auto_assignment_routes
from admin_system import dashboard_routes as dashboard_api

app.include_router(auto_assignment_routes.router)
app.include_router(dashboard_api.router)


from portal import routes as portal_routes
from asset_management import routes as asset_routes

app.include_router(portal_routes.router)
app.include_router(asset_routes.router)
from map_system import routes as map_routes
from ai_concierge import routes as concierge_routes
app.include_router(map_routes.router)
app.include_router(concierge_routes.router)
app.include_router(ai_routes.router)


@app.get("/")
def read_root():
    return {"message": "Welcome to Proserve API"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@app.get("/api/health/status")
def api_health_check(db: Session = Depends(get_db)):
    from sqlalchemy import inspect
    try:
        # Check database connectivity
        db.execute(text("SELECT 1"))
        db_status = "connected"
        
        # Check columns for users table
        inspector = inspect(engine)
        user_cols = [c['name'] for c in inspector.get_columns('users')]
        log_cols = [c['name'] for c in inspector.get_columns('login_logs')]
    except Exception as e:
        db_status = f"error: {str(e)}"
        user_cols = []
        log_cols = []
        
    return {
        "status": "ok" if db_status == "connected" else "degraded",
        "database": db_status,
        "users_columns": user_cols,
        "logs_columns": log_cols,
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/statistics/homepage")
def homepage_stats():
    return {
        "active_tickets": 12,
        "resolved_tickets": 450,
        "satisfied_customers": 98,
        "uptime": "99.9%"
    }