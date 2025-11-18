# chat endpoint for running agent

from typing import Optional, Union

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from api.ai.agent import run_agent

router = APIRouter()

class ChatRequest(BaseModel):
    text: Union[str, list[str]]
    user_id: str
    file: Optional[dict] = None

    @field_validator("text", mode="before")
    def normalize_text(cls, value):
        if isinstance(value, list):
            return "\n".join(str(item) for item in value)
        return value

@router.post("/")
async def chat_endpoint(request: ChatRequest):
    try:
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
