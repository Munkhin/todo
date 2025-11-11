# entry point for user actions

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


# Initialize FastAPI app
app = FastAPI(
    title="Todo API",
    description="API for managing todos from Gmail with smart scheduling",
    version="1.0.0"
)

# CORS configuration
origins_env = os.getenv("ALLOWED_ORIGINS", "https://todo.studybar.academy")
allowed_origins = [o.strip() for o in origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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
            "settings": "/api/settings",
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

# routes
from api.auth.auth_routes import router as auth_router
from api.calendar.event_routes import router as calendar_router
from api.tasks.task_routes import router as task_router
from api.ai.chat_routes import router as chat_router
from api.business_logic.subscription_routes import router as subscription_router
from api.auth.user_routes import router as user_router
from api.settings.energy_profile_routes import router as settings_router

# register routers with prefixes
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(calendar_router, prefix="/api/calendar", tags=["Calendar"])
app.include_router(task_router, prefix="/api", tags=["Tasks"])
app.include_router(chat_router, prefix="/api/chat", tags=["Chat"])
app.include_router(subscription_router, prefix="/api", tags=["Subscription"])
app.include_router(user_router, prefix="/api/user", tags=["User"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True  # Enable auto-reload during development
    )
