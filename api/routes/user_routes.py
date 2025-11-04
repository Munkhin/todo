"""
User profile and settings routes
"""

from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from api.database import get_db
from api.models import User
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
import os

router = APIRouter()


class UpdateTimezoneRequest(BaseModel):
    user_id: int
    timezone: str  # IANA timezone like "America/Los_Angeles"


class RegisterSessionRequest(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None


@router.post("/timezone")
async def update_user_timezone(request: UpdateTimezoneRequest, db: Session = Depends(get_db)):
    """Update user's timezone setting"""
    try:
        print(f"[update_user_timezone] Received user_id={request.user_id}, timezone={request.timezone}")
        user = db.query(User).filter(User.id == request.user_id).first()
        print(f"[update_user_timezone] User query result: {user}")
        if not user:
            print(f"[update_user_timezone] User {request.user_id} not found in database")
            raise HTTPException(status_code=404, detail=f"User not found: {request.user_id}")

        user.timezone = request.timezone
        db.commit()
        print(f"[update_user_timezone] Successfully updated user {request.user_id} timezone to {request.timezone}")

        return {"success": True, "timezone": request.timezone}
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        print(f"[update_user_timezone] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error updating timezone: {str(e)}")


@router.post("/register-session")
async def register_user_session(req: RegisterSessionRequest):
    """Register NextAuth session - creates user in backend database"""
    print("=" * 80)
    print("[register-session] Called")
    print(f"[register-session] Access token: {req.access_token[:20] if req.access_token else 'None'}...")
    print(f"[register-session] Refresh token: {bool(req.refresh_token)}")

    try:
        # Build credentials and get user info from Google
        creds_dict = {
            'token': req.access_token,
            'refresh_token': req.refresh_token,
            'token_uri': 'https://oauth2.googleapis.com/token',
            'client_id': os.getenv('GOOGLE_CLIENT_ID'),
            'client_secret': os.getenv('GOOGLE_CLIENT_SECRET'),
            'scopes': ['openid', 'email', 'profile']
        }

        credentials = Credentials(**creds_dict)
        service = build('oauth2', 'v2', credentials=credentials)
        user_info = service.userinfo().get().execute()

        google_user_id = user_info.get('id')
        email = user_info.get('email')
        name = user_info.get('name')

        print(f"[register-session] User info: {email}")

        # Create or update user in database
        from api.db_helpers import create_or_update_user
        db_user_id = create_or_update_user(google_user_id, email, name)

        print(f"[register-session] User created/updated: db_user_id={db_user_id}")
        print("=" * 80)

        return {
            "db_user_id": db_user_id,
            "email": email,
            "name": name
        }

    except Exception as e:
        import traceback
        print(f"[register-session] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error registering session: {str(e)}")
