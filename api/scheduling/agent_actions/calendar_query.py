"""Check calendar action for querying calendar events."""

from datetime import datetime, timezone

from api.database import get_calendar_events
from api.data_types.consts import CHECK_CALENDAR_DEV_PROMPT, CALENDAR_QUERY_SCHEMA

async def check_calendar(user_input, chatgpt_call):
    """Handle all queries about the calendar."""
    user_id = user_input.get("user_id")
    base_text = user_input.get("text", "")

    # fetch calendar events
    calendar_events = get_calendar_events(user_id) if user_id else []

    # get current datetime for context
    current_datetime = datetime.now(timezone.utc).isoformat()

    # enrich input with calendar data
    user_input_enriched = user_input.copy()
    user_input_enriched["text"] = (
        base_text
        + "\n\nCalendar events: " + str(calendar_events)
        + "\nCurrent datetime: " + current_datetime
    )

    return await chatgpt_call(
        user_input_enriched,
        CHECK_CALENDAR_DEV_PROMPT,
        "calendar_query",
        CALENDAR_QUERY_SCHEMA
    )
