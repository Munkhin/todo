# chat_routes.py
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional
import os
import json

from api.database import get_db
from api.agent import run_agent
from api.models import BrainDump
from api.schemas import CalendarEventOut
from datetime import datetime, timezone
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

router = APIRouter()

# store conversation history for long term learning by agent
conversation_store = {}

class ChatMessageRequest(BaseModel):
    session_id: str | None = None
    user_id: int | None = None
    message: str

class ChatMessageResponse(BaseModel):
    response: str
    timestamp: datetime
    events: Optional[List[CalendarEventOut]] = []


# standardize the time
def _to_utc_iso(dt: datetime) -> str:
    if dt.tzinfo is None:
        local_tz = datetime.now().astimezone().tzinfo
        dt = dt.replace(tzinfo=local_tz)
    return dt.astimezone(timezone.utc).isoformat().replace('+00:00', 'Z')


def _serialize_event_utc(ev) -> dict:
    return {
        "id": ev.id,
        "user_id": ev.user_id,
        "title": ev.title,
        "description": ev.description,
        "start_time": _to_utc_iso(ev.start_time),
        "end_time": _to_utc_iso(ev.end_time),
        "start_ts": int(ev.start_time.timestamp() * 1000),
        "end_ts": int(ev.end_time.timestamp() * 1000),
        "event_type": ev.event_type,
        "source": getattr(ev, 'source', 'system'),
        "task_id": ev.task_id,
    }

# IMPT converts session id from google auth to user id
def _get_user_id_from_session(session_id: str) -> int:
    from .auth_routes import sessions
    if not session_id or session_id not in sessions or 'credentials' not in sessions[session_id]:
        raise HTTPException(status_code=401, detail="Not authenticated")
    credentials = Credentials(**sessions[session_id]['credentials'])
    service = build('oauth2', 'v2', credentials=credentials)
    user_info = service.userinfo().get().execute()
    # Map Google account to our numeric DB user id
    try:
        from api.db_helpers import create_or_update_user
        google_id = user_info.get('id')
        email = user_info.get('email')
        name = user_info.get('name')
        db_user_id = create_or_update_user(google_id, email, name)
        return int(db_user_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to resolve DB user id: {str(e)}")

# get user id based on information present
def get_user_id(request: ChatMessageRequest) -> int:
    effective_user_id: int

    # if have, use
    if request.user_id is not None:
        effective_user_id = int(request.user_id)
        return effective_user_id

    # if dont have, generate from session id
    elif request.session_id:
        effective_user_id = _get_user_id_from_session(request.session_id)
        return effective_user_id

    # if both dont have, something is wrong
    else:
        raise HTTPException(status_code=400, detail="session_id or user_id required")


# send message -> events created, new conversation history  
@router.post("/message", response_model=ChatMessageResponse)
async def send_message(request: ChatMessageRequest, db: Session = Depends(get_db)):
    try:
        effective_user_id = get_user_id(request)

        # get or create conversation history for this user
        if effective_user_id not in conversation_store:
            conversation_store[effective_user_id] = []

        conversation_history = conversation_store[effective_user_id]

        # run agent
        result = run_agent(
            user_id=effective_user_id,
            message=request.message,
            conversation_history=conversation_history,
            db=db
        )

        # update conversation history
        conversation_store[effective_user_id] = result["conversation_history"]

        # serialize events if present
        events_data = []
        if "events" in result and result["events"]:
            events_data = [_serialize_event_utc(event) for event in result["events"]]

        return {
            "response": result["response"],
            "timestamp": datetime.utcnow().isoformat().replace('+00:00', 'Z'),
            "events": events_data
        } # return the stack of events created

    except Exception as e:
        print(f"Error in chat: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# upload file -> brain dump record
@router.post("/upload")
async def upload_file(
    session_id: str | None = None,
    user_id: int | None = None,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    try:
        # create request object for get_user_id
        req = ChatMessageRequest(session_id=session_id, user_id=user_id, message="")
        effective_user_id = get_user_id(req)

        # save file temporarily
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{effective_user_id}_{file.filename}")

        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        # extract text based on file type
        extracted_text = ""
        if file.filename.endswith('.pdf'):
            from api.services.file_processor import extract_text_from_pdf
            extracted_text = extract_text_from_pdf(file_path)
        elif file.filename.endswith(('.png', '.jpg', '.jpeg')):
            from api.services.file_processor import extract_text_from_image
            extracted_text = extract_text_from_image(file_path)
        else:
            extracted_text = content.decode('utf-8', errors='ignore')

        # create brain dump record
        brain_dump = BrainDump(
            user_id=effective_user_id,
            raw_text=extracted_text,
            attached_files=file.filename,
            processing_status="completed"
        )
        db.add(brain_dump)
        db.commit()

        return {
            "success": True,
            "extracted_text": extracted_text[:500],  # preview
            "brain_dump_id": brain_dump.id,
            "message": "File processed successfully. You can now ask me to create tasks from this content."
        }

    except Exception as e:
        print(f"Error uploading file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# user id -> conversation history
@router.get("/history/{user_id}")
async def get_chat_history(user_id: int):
    try:
        if user_id not in conversation_store:
            return {"messages": []}

        history = conversation_store[user_id]

        # filter to only user and assistant messages
        filtered_messages = [
            msg for msg in history
            if msg.get("role") in ["user", "assistant"]
        ]

        return {
            "messages": [
                {
                    "role": msg["role"],
                    "content": msg.get("content", "")
                }
                for msg in filtered_messages
            ]
        }

    except Exception as e:
        print(f"Error getting history: {e}")
        return {"messages": []}


@router.delete("/history/{user_id}")
async def clear_chat_history(user_id: int):
    """clear conversation history"""
    try:
        if user_id in conversation_store:
            conversation_store[user_id] = []

        return {"success": True, "message": "Chat history cleared"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
