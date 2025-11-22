"""Direct calendar event creation action (no task decomposition)."""

import asyncio
import logging
from datetime import datetime

from api.database import get_calendar_events, create_calendar_event
from api.data_types.consts import CREATE_EVENT_DEV_PROMPT, EVENT_EXTRACTION_SCHEMA
from api.timezone.conversions import resolve_user_timezone, now_in_timezone
from api.scheduling.agent_actions.utils import ensure_mapping

logger = logging.getLogger(__name__)


async def create_calendar_event_direct(user_input, chatgpt_call):
    """Simple calendar event creation without task decomposition."""
    user_id = user_input.get("user_id")
    base_text = user_input.get("text", "")
    tz_name = resolve_user_timezone(user_id)
    local_now = now_in_timezone(tz_name)
    
    # Enrich input with timezone and datetime context
    enriched_input = user_input.copy()
    enriched_input["text"] = (
        base_text
        + "\\n\\nUser timezone: " + tz_name
        + "\\nCurrent local datetime: " + local_now.isoformat()
    )
    
    # Extract event details using LLM
    event_data = await chatgpt_call(
        enriched_input,
        CREATE_EVENT_DEV_PROMPT,
        "event_extraction",
        EVENT_EXTRACTION_SCHEMA
    )
    event_data = ensure_mapping(event_data, context="Event extraction")
    
    if not event_data or not event_data.get("start_time") or not event_data.get("end_time"):
        logger.warning(
            "Event extraction failed or incomplete",
            extra={"user_id": user_id, "extracted": event_data}
        )
        return {"text": "I couldn't extract complete event details from your request. Please specify the time and title."}
    
    # Check for conflicts with existing events
    start_time = event_data.get("start_time")
    end_time = event_data.get("end_time")
    
    calendar_events = await asyncio.to_thread(get_calendar_events, user_id) if user_id else []
    conflicting_events = []
    
    for event in calendar_events:
        event_start = event.get("start_time")
        event_end = event.get("end_time")
        
        # Check for overlap: new event overlaps if it starts before existing ends AND ends after existing starts
        if start_time < event_end and end_time > event_start:
            conflicting_events.append(event)
    
    # If conflicts detected, return them to user for resolution
    if conflicting_events:
        conflict_details = []
        for event in conflicting_events:
            try:
                evt_start = datetime.fromisoformat(event.get("start_time").replace("Z", "+00:00"))
                evt_end = datetime.fromisoformat(event.get("end_time").replace("Z", "+00:00"))
                conflict_details.append(
                    f"- {event.get('title', 'Untitled')} from {evt_start.strftime('%I:%M %p')} to {evt_end.strftime('%I:%M %p')}"
                )
            except Exception:
                conflict_details.append(f"- {event.get('title', 'Untitled')}")
        
        conflict_text = "\\n".join(conflict_details)
        return {
            "text": f"⚠️ Time conflict detected! You already have the following event(s) during that time:\\n\\n{conflict_text}\\n\\nWould you like to:\\n(a) Reschedule the conflicting event(s)\\n(b) Choose a different time\\n(c) Create anyway (events will overlap)"
        }
    
    # No conflict - create the event
    event_payload = {
        "user_id": user_id,
        "title": event_data.get("title"),
        "description": event_data.get("description"),
        "start_time": start_time,
        "end_time": end_time,
        "event_type": event_data.get("event_type", "personal"),
        "priority": event_data.get("priority", "medium"),
        "source": "user",  # Mark as user-created
        "task_id": None,  # No associated task
        "color_hex": "#000000"
    }
    
    try:
        await asyncio.to_thread(create_calendar_event, event_payload)
        return {
            "text": f"✓ Created event: {event_payload['title']} from {start_time} to {end_time}"
        }
    except Exception as exc:
        logger.error(
            "Failed to create calendar event",
            extra={"user_id": user_id, "error": str(exc)}
        )
        return {"text": f"Failed to create event: {str(exc)}"}
