# chat endpoint for running agent

from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from api.ai.agent import run_agent

router = APIRouter()

class ChatRequest(BaseModel):
    text: str
    user_id: str
    file: Optional[dict] = None

    @field_validator("text", mode="before")
    def normalize_text(cls, value):
        """Accept strings or lists of strings and always return a single string."""
        if value is None:
            raise ValueError("text is required")
        if isinstance(value, str):
            return value
        if isinstance(value, list):
            if not value:
                return ""
            return "\n".join(str(item) for item in value)
        raise ValueError("text must be a string or list of strings")

@router.post("/")
async def chat_endpoint(request: ChatRequest):
    try:
        if not isinstance(request.text, str):
            raise HTTPException(status_code=400, detail="text must be a string")

        user_input = {
            "text": request.text,
            "user_id": request.user_id,
            "file": request.file
        }

        results = await run_agent(user_input)

        return {
            "success": True,
            "results": results
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
