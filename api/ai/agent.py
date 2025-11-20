# entry point for chat -> render on calendar flow

import asyncio # for parallel execution to drastically decrease runtime
import json
import logging
import os
import aiohttp
from collections.abc import Sequence
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any, MutableMapping, Sequence as TypingSequence
from api.ai.intent_classifier import classify_intent
from api.ai.semantic_matcher import match_tasks
from api.preprocess_user_input.file_processing import file_to_text
from api.data_types.consts import * # get all prompts and schemas
from api.database import (
    get_user_conversation_id,
    update_user_conversation_id,
    get_tasks_by_user,
    get_calendar_events_by_task_id,
    get_energy_profile,
    get_calendar_events,
    get_user_by_id,
    create_or_update_energy_profile,
    create_calendar_event,
    delete_calendar_event,
    create_task,
    create_tasks_batch,
    supabase,
)

# OpenAI API configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_API_URL = "https://api.openai.com/v1/responses"
OPENAI_RESPONSES_MODEL = os.getenv("OPENAI_RESPONSES_MODEL", "gpt-5-mini")

from api.business_logic.scheduler import schedule_tasks

logger = logging.getLogger(__name__)
TextPayload = str | TypingSequence[Any] | None
UserInput = MutableMapping[str, Any]


def _resolve_user_timezone(user_id: Any) -> str:
    if not user_id:
        return "UTC"
    try:
        user_record = get_user_by_id(user_id)
    except Exception:
        user_record = None
    tz_value = None
    if isinstance(user_record, dict):
        tz_value = user_record.get("timezone")
    return tz_value or "UTC"


def _now_in_timezone(tz_name: str) -> datetime:
    now_utc = datetime.now(timezone.utc)
    try:
        target_zone = ZoneInfo(tz_name)
    except Exception:
        target_zone = timezone.utc
    return now_utc.astimezone(target_zone)


def _ensure_text_value(value: TextPayload) -> str:
    """Guarantee downstream code always works with a strict string payload."""
    if value is None:
        return ""
    if isinstance(value, str):
        return value
    if isinstance(value, Sequence):
        return "\n".join(str(item) for item in value)
    raise TypeError("text payloads must be strings or iterables of strings")


def _summarize(text: str, limit: int = 120) -> str:
    return text if len(text) <= limit else text[:limit].rstrip() + "…"


def _drop_nulls(data: dict[str, Any]) -> dict[str, Any]:
    return {key: value for key, value in data.items() if value is not None}


def _build_task_payload(task: dict[str, Any], user_id: Any) -> dict[str, Any]:
    duration = task.get("duration")
    estimated_duration = None
    if isinstance(duration, (int, float)):
        estimated_duration = int(max(duration * 60, 0))

    priority_value = task.get("priority")
    if isinstance(priority_value, str):
        priority_value = priority_value.lower()
    else:
        priority_value = "medium"

    status_value = task.get("status") if isinstance(task.get("status"), str) else "pending"

    payload = {
        "user_id": user_id,
        "title": task.get("title") or task.get("description") or "Task",
        "description": task.get("description") or task.get("title") or "Task",
        "priority": priority_value,
        "difficulty": task.get("difficulty"),
        "status": status_value,
        "due_date": task.get("due_date"),
        "estimated_duration": estimated_duration,
        "scheduled_start": task.get("start_time") or task.get("scheduled_start"),
        "scheduled_end": task.get("end_time") or task.get("scheduled_end"),
    }
    return _drop_nulls(payload)


def _standardize_existing_task(task: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(task, dict):
        return {}
    description = task.get("description") or task.get("title") or "Task"
    return {
        "user_id": task.get("user_id"),
        "description": description,
        "start_time": task.get("start_time") or task.get("scheduled_start"),
        "end_time": task.get("end_time") or task.get("scheduled_end"),
        "priority": task.get("priority"),
        "task_id": task.get("id") or task.get("task_id"),
    }


def _ensure_mapping(obj: Any, *, context: str) -> dict[str, Any]:
    if obj is None:
        return {}
    if isinstance(obj, str):
        try:
            obj = json.loads(obj)
        except json.JSONDecodeError as exc:
            logger.error("%s returned invalid JSON string", context, extra={"error": str(exc)})
            return {}
    if not isinstance(obj, dict):
        logger.error(
            "%s expected a dictionary result but received %s",
            context,
            type(obj).__name__,
        )
        return {}
    return obj


EVENT_ALLOWED_FIELDS = {
    "user_id",
    "title",
    "description",
    "start_time",
    "end_time",
    "event_type",
    "priority",
    "source",
    "task_id",
    "color_hex",
}


def _sanitize_event_payload(event: dict, default_user_id: Any = None) -> dict:
    """Remove fields that the calendar_events table doesn't understand."""
    sanitized: dict[str, Any] = {}
    resolved_user_id = event.get("user_id", default_user_id)
    if resolved_user_id is not None:
        sanitized["user_id"] = resolved_user_id

    for key in EVENT_ALLOWED_FIELDS:
        if key == "user_id":
            continue
        if key in event and event[key] is not None:
            sanitized[key] = event[key]

    if not sanitized.get("title"):
        sanitized["title"] = sanitized.get("description") or "Calendar Event"

    if not sanitized.get("event_type"):
        sanitized["event_type"] = "task"
    if not sanitized.get("source"):
        sanitized["source"] = "agent"
    if not sanitized.get("priority"):
        sanitized["priority"] = "medium"
    if not sanitized.get("color_hex"):
        sanitized["color_hex"] = "#000000"

    missing_required = [field for field in ("start_time", "end_time") if not sanitized.get(field)]
    if missing_required:
        raise ValueError(
            f"Calendar events require {', '.join(missing_required)} before creation."
        )

    return sanitized


async def run_agent(user_input: UserInput):

    # Make sure text payload is always a string to avoid concat crashes.
    user_input = user_input.copy()
    user_input["text"] = _ensure_text_value(user_input.get("text"))

    logger.info(
        "Agent invoked",
        extra={
            "user_id": user_input.get("user_id"),
            "text_preview": _summarize(user_input["text"]),
        },
    )

    # intents handled
    allowed_intents = ["recommend-slots", "schedule-tasks", "delete-tasks", "reschedule", "check-calendar", "update-preferences", "create-event"]
    
    # first classify the intent(s) with a lightweight model
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

    # Build tasks list
    tasks = []
    if "recommend-slots" in intents:
        tasks.append(recommend_slots(user_input)) # text return

    if "schedule-tasks" in intents or "reschedule" in intents:
        tasks.append(schedule_tasks_into_calendar(user_input)) # effect
    
    if "delete-tasks" in intents:
        tasks.append(delete_tasks_from_calendar(user_input)) # effect
    
    if "create-event" in intents:
        tasks.append(create_calendar_event_direct(user_input)) # effect

    if "check-calendar" in intents:
        tasks.append(check_calendar(user_input)) # text return

    if "update-preferences" in intents:
        tasks.append(update_preferences(user_input)) # effect

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


# helper function for all chatgpt calls
def _save_conversation_id(user_id, response, fallback_id=None):
    if not user_id:
        return
    conversation_id = fallback_id
    conversation_obj = getattr(response, "conversation", None)
    if conversation_obj:
        conversation_id = getattr(conversation_obj, "id", conversation_id)
    elif hasattr(response, "conversation_id"):
        conversation_id = response.conversation_id
    elif hasattr(response, "id") and not conversation_id:
        conversation_id = response.id

    if conversation_id:
        try:
            update_user_conversation_id(user_id, conversation_id)
        except Exception:
            pass


def _is_valid_conversation_id(value: Any) -> bool:
    return isinstance(value, str) and value.startswith("conv")


async def chatgpt_call(user_input: UserInput, PROMPT, schema_name, SCHEMA):
    """Async OpenAI Responses API call using aiohttp for true parallel execution."""
    
    sanitized_input = user_input.copy()
    sanitized_input["text"] = _ensure_text_value(user_input.get("text"))
    file_text = file_to_text(sanitized_input.get("file"))

    # get or create conversation id for this user
    user_id = sanitized_input.get("user_id")
    conversation_id = get_user_conversation_id(user_id) if user_id else None
    if conversation_id and not _is_valid_conversation_id(conversation_id):
        try:
            update_user_conversation_id(user_id, None)
        except Exception:
            pass
        conversation_id = None

    # build input messages
    input_messages = [
        {
            "role": "developer",
            "content": f"{PROMPT}",
        },
        {
            "role": "user",
            "content": sanitized_input["text"],
        },
        {
            "role": "user",
            "content": f"file contents: {file_text}"
        }
    ]

    logger.debug(
        "Calling OpenAI Responses API (async via aiohttp)",
        extra={"user_id": user_id, "schema": schema_name},
    )
    
    # Prepare request payload
    payload = {
        "model": OPENAI_RESPONSES_MODEL,
        "reasoning": {"effort": "low"},
        "input": input_messages,
        "text": {
            "format": {
                "type": "json_schema",
                "name": schema_name,
                "schema": SCHEMA,
                "strict": True
            }
        }
    }
    
    # Add conversation ID if available
    if conversation_id:
        payload["conversation"] = conversation_id
    
    # Make async HTTP request
    async with aiohttp.ClientSession() as session:
        async with session.post(
            OPENAI_API_URL,
            headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "Content-Type": "application/json"
            },
            json=payload
        ) as resp:
            if resp.status != 200:
                error_text = await resp.text()
                logger.error(
                    f"OpenAI API error: {resp.status}",
                    extra={"user_id": user_id, "error": error_text}
                )
                raise Exception(f"OpenAI API error {resp.status}: {error_text}")
            
            data = await resp.json()
            
            # Save conversation ID from response
            if "conversation" in data and hasattr(data["conversation"], "id"):
                _save_conversation_id(user_id, data, fallback_id=conversation_id)
            elif conversation_id:
                # Use fallback if response doesn't contain conversation
                update_user_conversation_id(user_id, conversation_id)
            
            # Extract output text
            output_text = data.get("output_text") or data.get("output", [{}])[0].get("content", [{}])[0].get("text", "")
            
            return add_user_id(output_text, user_id)



# helper to add user id into chatgpt json response(since passing user id into chatgpt is unsafe)
def add_user_id(obj, user_id):
    stack = [obj]
    while stack:
        current = stack.pop()
        if isinstance(current, dict):
            if "user_id" in current:
                current["user_id"] = user_id
            stack.extend(current.values())
        elif isinstance(current, list):
            stack.extend(current)
    return obj


# recommend slots to user in natural language
async def recommend_slots(user_input):
    from datetime import datetime, timezone

    user_id = user_input.get("user_id")
    base_text = _ensure_text_value(user_input.get("text"))

    # fetch energy profile
    energy_profile = await asyncio.to_thread(get_energy_profile, user_id) if user_id else None

    # fetch calendar events
    calendar_events = await asyncio.to_thread(get_calendar_events, user_id) if user_id else []

    # get current datetime
    current_datetime = datetime.now(timezone.utc).isoformat()

    # append to user_input
    user_input_enriched = user_input.copy()  # shallow copy to avoid modifying original
    user_input_enriched["text"] = (
        base_text
        + "\n\nEnergy profile: " + str(energy_profile)
        + "\nCalendar events: " + str(calendar_events)
        + "\nCurrent datetime: " + current_datetime
    )

    return await chatgpt_call(user_input_enriched, RECOMMEND_SLOTS_DEV_PROMPT, "slots recommendation", SLOTS_SCHEMA)


# scheduling and rescheduling
async def schedule_tasks_into_calendar(user_input):

    inferred_tasks = await infer_tasks(user_input)
    tasks = inferred_tasks if isinstance(inferred_tasks, list) else []

    user_id = user_input["user_id"]

    prepared_tasks: list[dict[str, Any]] = []
    for task in tasks:
        if not isinstance(task, dict):
            continue
        task_copy = task.copy()
        task_copy["user_id"] = user_id
        db_payload = _build_task_payload(task_copy, user_id)
        prepared_tasks.append(db_payload)

    # Batch insert tasks
    if prepared_tasks:
        try:
            task_ids = await asyncio.to_thread(create_tasks_batch, prepared_tasks)
            # Map back IDs to task copies
            for i, task_id in enumerate(task_ids):
                if i < len(tasks):
                    tasks[i]["task_id"] = task_id
        except Exception:
            logger.exception(
                "Failed to batch persist inferred tasks",
                extra={"user_id": user_id},
            )

    existing_tasks_raw = await asyncio.to_thread(get_tasks_by_user, user_id)
    existing_tasks = [_standardize_existing_task(task) for task in (existing_tasks_raw or [])]

    logger.info(
        "Scheduling tasks",
        extra={
            "user_id": user_id,
            "new_task_count": len(prepared_tasks),
            "existing_task_count": len(existing_tasks),
        },
    )

    if not prepared_tasks:
        logger.info("No tasks inferred; returning informational response", extra={"user_id": user_id})
        return {"text": "I couldn't extract any actionable tasks from that message."}

    combined_for_conflict = tasks + existing_tasks # Use tasks which now have IDs
    requires_reschedule = conflict(combined_for_conflict)
    scheduling_payload = combined_for_conflict if requires_reschedule else tasks

    missing_timestamps = any(
        not task.get("start_time") or not task.get("end_time") for task in scheduling_payload
    )
    requires_scheduler = len(scheduling_payload) > 1 or missing_timestamps

    if not requires_scheduler:
        confirmations = []
        for event in tasks:
            try:
                sanitized_event = _sanitize_event_payload(event, user_id)
            except ValueError as exc:
                logger.info(
                    "Switching to scheduler because event lacks timestamps",
                    extra={"user_id": user_id, "error": str(exc)},
                )
                requires_scheduler = True
                break
            await asyncio.to_thread(create_calendar_event, sanitized_event)
            confirmations.append(event.get("description") or event.get("title", "task"))
        if not requires_scheduler:
            return {"text": "Scheduled " + ", ".join(confirmations)}

    energy_profile = await asyncio.to_thread(get_energy_profile, user_id)

    import numpy as np
    settings = type("obj", (object,), {
        "min_study_duration": energy_profile.get("min_study_duration", 30) if energy_profile else 30,
        "max_study_duration": energy_profile.get("max_study_duration", 180) if energy_profile else 180,
        "break_duration": energy_profile.get("short_break_min", 5) if energy_profile else 5,
        "max_study_duration_before_break": energy_profile.get("long_study_threshold_min", 90) if energy_profile else 90,
        "energy_plot": np.array(json.loads(energy_profile.get("energy_levels", "[]"))) if energy_profile and energy_profile.get("energy_levels") else np.ones(24)
    })()

    from datetime import timedelta
    start_date = datetime.now(timezone.utc)
    due_date_days = energy_profile.get("due_date_days", 7) if energy_profile else 7
    # Add 1-week buffer to end date for scheduling flexibility with fixed events
    end_date = start_date + timedelta(days=due_date_days + 7)

    schedule = await schedule_tasks(scheduling_payload, user_id, start_date, end_date, settings, supabase)
    for event in schedule:
        sanitized_event = _sanitize_event_payload(event, user_id)
        await asyncio.to_thread(create_calendar_event, sanitized_event)

    descriptions = [event.get("description") or event.get("title", "task") for event in schedule]

    return {
        "text": "Scheduled " + ", ".join(descriptions)
    }


async def infer_tasks(user_input):
    base_text = _ensure_text_value(user_input.get("text"))
    user_id = user_input.get("user_id")
    tz_name = _resolve_user_timezone(user_id)
    local_now = _now_in_timezone(tz_name)

    enriched_input = user_input.copy()
    enriched_input["text"] = (
        base_text
        + "\n\nUser timezone: " + tz_name
        + "\nCurrent local datetime: " + local_now.isoformat()
        + "\nIf a time is provided without a date, assume it refers to the above date."
    )

    tasks_payload = await chatgpt_call(enriched_input, GET_TASKS_DEV_PROMPT, "tasks", TASK_SCHEMA)
    if isinstance(tasks_payload, str):
        try:
            tasks_payload = json.loads(tasks_payload)
        except json.JSONDecodeError:
            logger.warning(
                "LLM task inference returned non-JSON text; defaulting to no tasks",
                extra={"user_id": user_id, "payload_preview": tasks_payload[:200]}
            )
            return []
    if tasks_payload is None:
        return []
    if isinstance(tasks_payload, list):
        # Backwards compatibility if model ignored wrapper
        return tasks_payload
    if not isinstance(tasks_payload, dict):
        raise TypeError("LLM task inference must return an object containing a tasks array.")
    tasks = tasks_payload.get("tasks")
    if tasks is None:
        return []
    if not isinstance(tasks, list):
        raise TypeError("LLM task inference 'tasks' field must be a list.")
    return tasks


def _normalize_time(value):
    """Return a consistent string representation for sorting/comparison."""
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    return str(value)


def conflict(tasks):
    # Only consider entries that have measurable start and end timestamps.
    timed_tasks = [
        task
        for task in tasks
        if task.get("start_time") and task.get("end_time")
    ]
    timed_tasks.sort(key=lambda task: _normalize_time(task.get("start_time")))

    for i in range(1, len(timed_tasks)):
        prev_end = _normalize_time(timed_tasks[i - 1].get("end_time"))
        curr_start = _normalize_time(timed_tasks[i].get("start_time"))
        if prev_end and curr_start and curr_start < prev_end:
            return True  # overlap
    return False


# search semanticlly for task in calendar and delete them, along with their calendar events
async def delete_tasks_from_calendar(user_input):

    user_id = user_input["user_id"]
    existing_tasks = await asyncio.to_thread(get_tasks_by_user, user_id)

    query_text = _ensure_text_value(user_input.get("text"))
    tasks_to_delete = match_tasks(query_text, existing_tasks)

    for task in tasks_to_delete:
        events = await asyncio.to_thread(get_calendar_events_by_task_id, task["task_id"])
        for event in events:
            await asyncio.to_thread(delete_calendar_event, event["id"])

    # text return for user to see
    descriptions = [tasks["description"] for tasks in tasks_to_delete]

    # Join them into a single string
    result = "Deleted " + ", ".join(descriptions) + ", and their respective calendar events" 

    return {
        "text": result
    }


# all queries about the calendar
async def check_calendar(user_input):
    user_id = user_input.get("user_id")
    base_text = _ensure_text_value(user_input.get("text"))

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


# simple calendar event creation (no task decomposition)
async def create_calendar_event_direct(user_input):
    from api.data_types.consts import CREATE_EVENT_DEV_PROMPT, EVENT_EXTRACTION_SCHEMA
    
    user_id = user_input.get("user_id")
    base_text = _ensure_text_value(user_input.get("text"))
    tz_name = _resolve_user_timezone(user_id)
    local_now = _now_in_timezone(tz_name)
    
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
    event_data = _ensure_mapping(event_data, context="Event extraction")
    
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
        from datetime import datetime as dt
        conflict_details = []
        for event in conflicting_events:
            try:
                evt_start = dt.fromisoformat(event.get("start_time").replace("Z", "+00:00"))
                evt_end = dt.fromisoformat(event.get("end_time").replace("Z", "+00:00"))
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


# all preferences
async def update_preferences(user_input):

    user_id = user_input.get("user_id")
    base_text = _ensure_text_value(user_input.get("text"))

    # get current energy profile for context
    current_profile = await asyncio.to_thread(get_energy_profile, user_id) if user_id else None

    # enrich input with current settings
    user_input_enriched = user_input.copy()
    user_input_enriched["text"] = (
        base_text
        + "\n\nCurrent energy profile: " + str(current_profile)
    )

    # extract desired updates from user input
    updates = await chatgpt_call(
        user_input_enriched,
        UPDATE_PREFERENCES_DEV_PROMPT,
        "preference_updates",
        PREFERENCE_UPDATES_SCHEMA
    )
    updates = _ensure_mapping(updates, context="Preference extraction")

    # apply updates to database
    if updates and any(v is not None for k, v in updates.items() if k != "user_id"):
        # remove user_id from updates dict before passing to db
        profile_data = {k: v for k, v in updates.items() if k != "user_id" and v is not None}
        await asyncio.to_thread(create_or_update_energy_profile, user_id, profile_data)

        return {
            "text": "Updated preferences: " + ", ".join(profile_data.keys())
        }
    else:
        return {
            "text": "No preference changes detected"
        }
