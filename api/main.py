# central api access point

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from api.database import Base, engine
import api.models as models  # to ensure tables are created

# Load environment variables
load_dotenv()

# import routers
from api.routes.auth_routes import router as auth_router
from api.routes.task_routes import router as task_router
from api.routes.schedule_routes import router as schedule_router
from api.routes.calendar_routes import router as calendar_router
from api.routes.chat_routes import router as chat_router
from api.routes.subscription_routes import router as subscription_router

# Initialize FastAPI app
app = FastAPI(
    title="Todo API",
    description="API for managing todos from Gmail with smart scheduling",
    version="1.0.0"
)

# CORS middleware configuration
default_origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]
extra_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
if extra_origins:
    default_origins.extend(
        origin.strip()
        for origin in extra_origins.split(",")
        if origin.strip()
    )

allowed_origins = sorted(set(default_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://localhost(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/")
def root():
    return {
        "message": "Todo API is running",
        "version": "1.0.0",
        "endpoints": {
            "health": "/health",
            "auth": "/api/auth",
            "tasks": "/api/tasks",
            "schedule": "/api/schedule",
            "calendar": "/api/calendar",
            "chat": "/api/chat",
            "subscription": "/api/subscription"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.get("/favicon.ico")
def favicon():
    # return 204 No Content to prevent 404 errors
    from fastapi.responses import Response
    return Response(status_code=204)

# register routers with prefixes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(task_router, prefix="/api/tasks", tags=["Tasks"])
app.include_router(schedule_router, prefix="/api/schedule", tags=["Scheduling"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(subscription_router, prefix="/api/subscription", tags=["Subscription"])

# startup event to create tables and start scheduler
@app.on_event("startup")
async def startup_event():
    """startup tasks"""
    # create database tables
    Base.metadata.create_all(bind=engine)
    # start background scheduler
    from api.services.cron_scheduler import start_scheduler
    start_scheduler()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Enable auto-reload during development
    )
