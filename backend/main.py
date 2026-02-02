from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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

# Create database tables
Base.metadata.create_all(bind=engine)

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
        
        return JSONResponse(
            status_code=500,
            content={
                "detail": f"Internal Server Error",
                "msg": str(exc)
            }
        )

# Configure CORS - MUST be added AFTER catch_exceptions_middleware to ensure 
# it wraps it and adds headers even to error responses.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https?://.*", # Flexible for dev/network access
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
    return {"status": "healthy"}

@app.get("/api/health/status")
def api_health_check():
    return {"status": "ok", "message": "Service is healthy"}

@app.get("/api/statistics/homepage")
def homepage_stats():
    return {
        "active_tickets": 12,
        "resolved_tickets": 450,
        "satisfied_customers": 98,
        "uptime": "99.9%"
    }