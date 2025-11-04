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


class GetMeRequest(BaseModel):
    email: str
    name: Optional[str] = None


@router.post("/me")
async def get_or_create_user(req: GetMeRequest, db: Session = Depends(get_db)):
    """Get or create user from email - returns backend user_id"""
    print(f"[/api/user/me] email={req.email}, name={req.name}")

    try:
        # Find existing user by email
        user = db.query(User).filter(User.email == req.email).first()

        if user:
            print(f"[/api/user/me] Found existing user: id={user.id}")
            # Update name if provided and different
            if req.name and user.name != req.name:
                user.name = req.name
                db.commit()
            return {
                "user_id": user.id,
                "email": user.email,
                "name": user.name,
                "timezone": user.timezone or "UTC"
            }

        # Create new user
        new_user = User(
            email=req.email,
            name=req.name,
            timezone="UTC"  # Will be auto-detected on frontend
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        print(f"[/api/user/me] Created new user: id={new_user.id}")
        return {
            "user_id": new_user.id,
            "email": new_user.email,
            "name": new_user.name,
            "timezone": new_user.timezone or "UTC"
        }

    except Exception as e:
        import traceback
        print(f"[/api/user/me] Error: {str(e)}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Error getting user: {str(e)}")


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
