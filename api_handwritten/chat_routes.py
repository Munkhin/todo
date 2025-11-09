# chat endpoint for running agent

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api_handwritten.ai.agent import run_agent

router = APIRouter()

class ChatRequest(BaseModel):
    text: str
    user_id: str
    file: Optional[dict] = None

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
