"""Recommend time slots action for agent."""

import asyncio
from datetime import datetime, timezone

from api.database import get_settings, get_calendar_events
from api.data_types.consts import RECOMMEND_SLOTS_DEV_PROMPT, SLOTS_SCHEMA


async def recommend_slots(user_input, chatgpt_call):
    """Recommend slots to user in natural language."""
    user_id = user_input.get("user_id")
    base_text = user_input.get("text", "")

    # fetch settings
    settings = await asyncio.to_thread(get_settings, user_id) if user_id else None

    # fetch calendar events
    calendar_events = await asyncio.to_thread(get_calendar_events, user_id) if user_id else []

    # get current datetime
    current_datetime = datetime.now(timezone.utc).isoformat()

    # append to user_input
    user_input_enriched = user_input.copy()  # shallow copy to avoid modifying original
    user_input_enriched["text"] = (
        base_text
        + "\n\nSettings: " + str(settings)
        + "\nCalendar events: " + str(calendar_events)
        + "\nCurrent datetime: " + current_datetime
    )

    return await chatgpt_call(user_input_enriched, RECOMMEND_SLOTS_DEV_PROMPT, "slots recommendation", SLOTS_SCHEMA)
