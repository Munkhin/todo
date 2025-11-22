# entry point for chat -> render on calendar flow

# utils
import asyncio # for parallel execution to drastically decrease runtime
import json
import logging
import os
import aiohttp
from typing import Any, MutableMapping
from api.scheduling.agent_action.utils import chatgpt_call

# timezone awareness
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from api.timezone.conversions import resolve_user_timezone, now_in_timezone

# matching
from api.scheduling.matching.intent_classifier import classify_intent

# agent actions
from api.scheduling.agent_actions import (
    recommend_slots,
    schedule_tasks_into_calendar,
    delete_tasks_from_calendar,
    check_calendar,
    create_calendar_event_direct,
    update_preferences,
)

# core
from api.preprocess_user_input.file_processing import file_to_text
from api.data_types.consts import * # get all prompts and schemas
from api.database import (
    get_user_conversation_id,
    update_user_conversation_id,
)


# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1/responses"
OPENAI_RESPONSES_MODEL = os.getenv("OPENAI_RESPONSES_MODEL", "gpt-5-mini")

UserInput = MutableMapping[str, Any]

logger = logging.getLogger(__name__)


async def run_agent(user_input):

    """Natural language return and database update based on user query"""

    # shallow copy to avoid altering input
    user_input = user_input.copy()
    logger.info(
        "Agent invoked",
        extra={
            "user_id": user_input.get("user_id"),
            # Inline _summarize
            "text_preview": user_input["text"] if len(user_input["text"]) <= 120 else user_input["text"][:120].rstrip() + "…",
        },
    )

    # intents handled
    allowed_intents = ["recommend-slots", "schedule-tasks", "delete-tasks", "reschedule", "check-calendar", "update-preferences", "create-event"]
    
    # first classify the intent(s) using embeddings
    intents = await classify_intent(user_input["text"], allowed_intents)
    logger.info(
        "Intents classified",
        extra={"user_id": user_input.get("user_id"), "intents": intents},
    )

    # Check for unsupported intents
    unsupported = [i for i in intents if i not in allowed_intents]
    if unsupported:
        logger.error("Unsupported intents detected", extra={"unsupported": unsupported})
        raise Exception(f"Intent(s) not supported: {unsupported}")

    # Build tasks list - note: all actions now receive chatgpt_call as parameter
    tasks = []
    if "recommend-slots" in intents:
        tasks.append(recommend_slots(user_input, chatgpt_call)) # text return

    if "schedule-tasks" in intents or "reschedule" in intents:
        tasks.append(schedule_tasks_into_calendar(user_input, chatgpt_call)) # effect
    
    if "delete-tasks" in intents:
        tasks.append(delete_tasks_from_calendar(user_input)) # effect
    
    if "create-event" in intents:
        tasks.append(create_calendar_event_direct(user_input, chatgpt_call)) # effect

    if "check-calendar" in intents:
        tasks.append(check_calendar(user_input, chatgpt_call)) # text return

    if "update-preferences" in intents:
        tasks.append(update_preferences(user_input, chatgpt_call)) # effect

    logger.debug(
        "Executing agent tasks",
        extra={"user_id": user_input.get("user_id"), "task_count": len(tasks)},
    )

    # Run all tasks concurrently
    try:
        results = await asyncio.gather(*tasks)
    except Exception:
        logger.exception("Agent task execution failed", extra={"user_id": user_input.get("user_id")})
        raise

    logger.info(
        "Agent completed",
        extra={"user_id": user_input.get("user_id"), "result_count": len(results)},
    )
    return results