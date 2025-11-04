"""
Authentication routes for Google OAuth 2.0
"""

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from typing import Optional
from google_auth_oauthlib.flow import Flow
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os

router = APIRouter()

SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/calendar',
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile'
]

# In-memory session storage (for development - use Redis/DB in production)
sessions = {}


def _external_base_url(request: Request) -> str:
    """Best-effort external base URL using env or proxy headers."""
    # Allow explicit override for backend public URL
    override = os.getenv('BACKEND_PUBLIC_URL')
    if override:
        return override.rstrip('/')
    proto = request.headers.get('x-forwarded-proto', request.url.scheme)
    host = request.headers.get('x-forwarded-host', request.headers.get('host'))
    return f"{proto}://{host}".rstrip('/')


def _backend_callback_url(request: Request) -> str:
    return f"{_external_base_url(request)}/api/auth/google-oauth/callback"


def _frontend_base_url(request: Request) -> str:
    # Prefer explicit env for frontend domain; fallback to reasonable default
    env_frontend = os.getenv('FRONTEND_BASE_URL') or os.getenv('NEXT_PUBLIC_BASE_URL')
    if env_frontend:
        return env_frontend.rstrip('/')
    # Use external host as-is
    return _external_base_url(request)

@router.post("/login")
async def login(request: Request):
    """Login user (email/password or OAuth token)"""
    flow = Flow.from_client_secrets_file(
        'credentials.json',
        scopes=SCOPES,
        redirect_uri=_backend_callback_url(request),
    )

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )

    # store state in session
    sessions[state] = {'state': state}

    return RedirectResponse(url=authorization_url)

@router.post("/logout")
async def logout(session_id: str):
    """Logout and revoke session"""
    if session_id in sessions:
        del sessions[session_id]
        return {"message": "Logged out successfully"}

    raise HTTPException(status_code=404, detail="Session not found")

@router.get("/google-oauth")
async def google_oauth(request: Request):
    """Initiate Google OAuth for calendar integration"""
    flow = Flow.from_client_secrets_file(
        'credentials.json',
        scopes=SCOPES,
        redirect_uri=_backend_callback_url(request),
    )

    authorization_url, state = flow.authorization_url(
        access_type='offline',
        include_granted_scopes='true'
    )

    # store state in session
    sessions[state] = {'state': state}

    return RedirectResponse(url=authorization_url)

@router.get("/google-oauth/callback")
async def google_oauth_callback(request: Request, code: str = None, state: str = None):
    """Receive OAuth callback and store refresh/access tokens"""
    if not code or not state:
        raise HTTPException(status_code=400, detail="Missing code or state parameter")

    if state not in sessions:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    flow = Flow.from_client_secrets_file(
        'credentials.json',
        scopes=SCOPES,
        state=state,
        redirect_uri=_backend_callback_url(request),
    )

    # exchange authorization code for credentials
    flow.fetch_token(code=code)
    credentials = flow.credentials

    # store credentials in session
    sessions[state]['credentials'] = {
        'token': credentials.token,
        'refresh_token': credentials.refresh_token,
        'token_uri': credentials.token_uri,
        'client_id': credentials.client_id,
        'client_secret': credentials.client_secret,
        'scopes': credentials.scopes
    }

    # redirect to frontend dashboard
    frontend = _frontend_base_url(request)
    return RedirectResponse(url=f"{frontend}/dashboard?session={state}")

@router.get("/user")
async def get_user(session_id: str):
    """Retrieves authenticated user information from Google"""
    if session_id not in sessions or 'credentials' not in sessions[session_id]:
        raise HTTPException(status_code=401, detail="Not authenticated")

    credentials = Credentials(**sessions[session_id]['credentials'])

    # get user info from Google
    service = build('oauth2', 'v2', credentials=credentials)
    user_info = service.userinfo().get().execute()

    # create or update user in database
    from ..db_helpers import create_or_update_user, get_user_credits
    user_id = user_info.get('id')
    email = user_info.get('email')
    name = user_info.get('name')

    create_or_update_user(user_id, email, name)

    # get user's credit information
    credit_info = get_user_credits(user_id)
    if credit_info:
        user_info['credits'] = credit_info

    return user_info

@router.get("/status")
async def auth_status(session_id: str = None):
    """Checks if user is authenticated"""
    if not session_id or session_id not in sessions:
        return {"authenticated": False}

    return {
        "authenticated": True,
        "session_id": session_id
    }

@router.get("/credits")
async def get_credits(session_id: str):
    """Get user's credit balance and plan information"""
    if session_id not in sessions or 'credentials' not in sessions[session_id]:
        raise HTTPException(status_code=401, detail="Not authenticated")

    credentials = Credentials(**sessions[session_id]['credentials'])
    service = build('oauth2', 'v2', credentials=credentials)
    user_info = service.userinfo().get().execute()

    from ..db_helpers import get_user_credits
    user_id = user_info.get('id')

    credit_info = get_user_credits(user_id)
    if not credit_info:
        raise HTTPException(status_code=404, detail="User credit information not found")

    return credit_info

@router.post("/upgrade-plan")
async def upgrade_plan(session_id: str, plan_type: str):
    """Upgrade user's subscription plan (valid: 'free', 'pro', 'unlimited')"""
    if session_id not in sessions or 'credentials' not in sessions[session_id]:
        raise HTTPException(status_code=401, detail="Not authenticated")

    if plan_type not in ['free', 'pro', 'unlimited']:
        raise HTTPException(status_code=400, detail="Invalid plan type")

    credentials = Credentials(**sessions[session_id]['credentials'])
    service = build('oauth2', 'v2', credentials=credentials)
    user_info = service.userinfo().get().execute()

    from ..db_helpers import update_user_plan, get_user_credits
    user_id = user_info.get('id')

    success = update_user_plan(user_id, plan_type)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to update plan")

    # return updated credit info
    credit_info = get_user_credits(user_id)
    return {
        "message": f"Successfully upgraded to {plan_type} plan",
        "credits": credit_info
    }

class NextAuthSessionRequest(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None

@router.post("/register-nextauth-session")
async def register_nextauth_session(request: Request):
    """
    Register NextAuth session with backend.
    Creates a session entry using the access token as session_id.
    This allows NextAuth-authenticated users to use backend APIs.
    """
    print("=" * 80)
    print("REGISTER-NEXTAUTH-SESSION CALLED")

    try:
        # Parse raw body first to debug
        body = await request.json()
        print(f"Raw body received: {body}")

        # Validate against schema
        validated = NextAuthSessionRequest(**body)
        print(f"Access token received: {validated.access_token[:20] if validated.access_token else 'None'}...")
        print(f"Refresh token received: {bool(validated.refresh_token)}")
        print("=" * 80)

        access_token = validated.access_token
        refresh_token = validated.refresh_token
        # use access_token as session_id for consistency
        session_id = access_token

        # build credentials object
        creds_dict = {
            'token': access_token,
            'refresh_token': refresh_token,
            'token_uri': 'https://oauth2.googleapis.com/token',
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'scopes': [
                'openid',
                'https://www.googleapis.com/auth/userinfo.email',
                'https://www.googleapis.com/auth/userinfo.profile',
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.send',
                'https://www.googleapis.com/auth/classroom.courses.readonly',
                'https://www.googleapis.com/auth/classroom.coursework.me.readonly',
                'https://www.googleapis.com/auth/calendar',
            ]
        }

        # store in sessions dict
        sessions[session_id] = {
            'state': session_id,
            'credentials': creds_dict
        }
        print(f"Session stored with ID: {session_id[:20]}...")
        print(f"Sessions dict now has {len(sessions)} entries")
        print(f"Session keys: {[k[:20] + '...' for k in list(sessions.keys())[:3]]}")

        # get user info and create user in database
        from ..db_helpers import create_or_update_user
        credentials = Credentials(**creds_dict)
        service = build('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()

        user_id = user_info.get('id')
        email = user_info.get('email')
        name = user_info.get('name')

        print(f"User info retrieved: {email}")
        db_user_id = create_or_update_user(user_id, email, name)
        print(f"User created/updated in database: {db_user_id}")

        return {
            "session_id": session_id,
            "message": "Session registered successfully",
            "user": user_info,
            "db_user_id": db_user_id,
        }

    except Exception as e:
        import traceback
        print(f"ERROR in register-nextauth-session: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error registering session: {str(e)}")


class UpdateTimezoneRequest(BaseModel):
    user_id: int
    timezone: str  # IANA timezone like "America/Los_Angeles"


@router.post("/update-timezone")
async def update_user_timezone(request: UpdateTimezoneRequest):
    """Update user's timezone setting"""
    from api.database import SessionLocal
    from api.models import User

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == request.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        user.timezone = request.timezone
        db.commit()

        return {"success": True, "timezone": request.timezone}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating timezone: {str(e)}")
    finally:
        db.close()
