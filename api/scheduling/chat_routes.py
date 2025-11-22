# chat endpoint for running agent

import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, field_validator

from api.scheduling.agent import run_agent

logger = logging.getLogger(__name__)
router = APIRouter()

class ChatRequest(BaseModel):
    text: str
    user_id: str
    file: Optional[dict] = None


def _summarize_text(text: str, length: int = 120) -> str:
    return text if len(text) <= length else text[:length].rstrip() + "…"


@router.post("/")
async def chat_endpoint(request: ChatRequest):
    try:
        # if text not str raise error
        if not isinstance(request.text, str):
            raise HTTPException(status_code=400, detail="text must be a string")

        # log the endpoint request
        logger.info(
            "Chat request received",
            extra={
                "user_id": request.user_id,
                "text_preview": _summarize_text(request.text),
                "has_file": bool(request.file),
            },
        )

        results = await run_agent(request)

        # log success details
        logger.info(
            "Chat request succeeded",
            extra={"user_id": request.user_id, "result_len": len(results)},
        )

        return {
            "success": True,
            "results": results
        }

    # error handling
    except HTTPException:
        logger.exception("Chat request failed with HTTPException", extra={"user_id": request.user_id})
        raise

    except Exception as e:
        logger.exception("Chat request failed", extra={"user_id": request.user_id})
        raise HTTPException(status_code=500, detail=str(e))
