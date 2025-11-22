"""Delete tasks from calendar action."""

import asyncio

from api.database import get_tasks_by_user, get_calendar_events_by_task_id, delete_calendar_event
from api.scheduling.matching.semantic_matcher import match_tasks


async def delete_tasks_from_calendar(user_input):
    """Search semantically for tasks in calendar and delete them, along with their calendar events."""
    user_id = user_input["user_id"]
    existing_tasks = await asyncio.to_thread(get_tasks_by_user, user_id)

    query_text = user_input.get("text", "")
    tasks_to_delete = match_tasks(query_text, existing_tasks)

    for task in tasks_to_delete:
        events = await asyncio.to_thread(get_calendar_events_by_task_id, task["task_id"])
        for event in events:
            await asyncio.to_thread(delete_calendar_event, event["id"])

    # text return for user to see
    descriptions = [task["description"] for task in tasks_to_delete]

    # Join them into a single string
    result = "Deleted " + ", ".join(descriptions) + ", and their respective calendar events"

    return {
        "text": result
    }
