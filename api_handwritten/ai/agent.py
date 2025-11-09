# entry point for chat -> render on calendar flow

import asyncio # for parallel execution to drastically decrease runtime
from datetime import datetime, timezone
from openai import OpenAI
from api_handwritten.ai.intent_classifier import classify_intent
from api_handwritten.ai.semantic_matcher import match_tasks
from api_handwritten.preprocess_user_input.file_processing import file_to_text
from api_handwritten.consts import * # get all prompts and schemas
from api_handwritten.database import get_user_conversation_id, update_user_conversation_id, get_tasks_by_user, get_calendar_events_by_task_id, get_energy_profile, get_calendar_events, create_or_update_energy_profile, supabase

client = OpenAI()

from api_handwritten.scheduler import schedule_tasks
from api_handwritten.calendar.user_actions import create_calendar_event, get_calendar_events, delete_calendar_event


async def run_agent(user_input):

    # intents handled
    allowed_intents = ["recommend-slots", "schedule-tasks", "delete-tasks", "reschedule", "check-calendar", "update-preferences"]
    
    # first classify the intent(s) with a lightweight model
    intents = classify_intent(user_input["text"], allowed_intents)

    # Check for unsupported intents
    unsupported = [i for i in intents if i not in allowed_intents]
    if unsupported:
        raise Exception(f"Intent(s) not supported: {unsupported}")

    # Build tasks list
    tasks = []
    if "recommend-slots" in intents:
        tasks.append(recommend_slots(user_input)) # text return

    if "schedule-tasks" in intents or "reschedule" in intents:
        tasks.append(schedule_tasks_into_calendar(user_input)) # effect
    
    if "delete-tasks" in intents:
        tasks.append(delete_tasks_from_calendar(user_input)) # effect

    if "check-calendar" in intents:
        tasks.append(check_calendar(user_input)) # text return

    if "update-preferences" in intents:
        tasks.append(update_preferences(user_input)) # effect

    # Run all tasks concurrently
    results = await asyncio.gather(*tasks)
    return results


# helper function for all chatgpt calls
def chatgpt_call(user_input, PROMPT, schema_name, SCHEMA):

    file_text =  file_to_text(user_input["file"])

    # get or create conversation id for this user
    user_id = user_input.get("user_id")
    conversation_id = get_user_conversation_id(user_id) if user_id else None

    if not conversation_id:
        conversation = client.conversations.create()
        conversation_id = conversation.id
        if user_id:
            update_user_conversation_id(user_id, conversation_id)
    else:
        conversation = type("obj", (object,), {"id": conversation_id})

    # build input messages
    input_messages = [
        {
            "role": "developer",
            "content": f"{PROMPT}",
        },
        {
            "role": "user",
            "content": f"{user_input["text"]}",
        },
        {
            "role": "user",
            "content": f"file contents: {file_text}"
        }
    ]


    response = client.responses.create(
        model="gpt-5",
        reasoning={"effort": "low"},
        input=input_messages,
        text={
            "format": {
            "type": f"{schema_name}",
            "name": "tasks",
            "strict": True,
            "schema": SCHEMA,
            }
        },
        conversation = conversation_id,
    )

    output = add_user_id(response.output_text, user_id)
    return output


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

    # fetch energy profile
    energy_profile = get_energy_profile(user_id) if user_id else None

    # fetch calendar events
    calendar_events = get_calendar_events(user_id) if user_id else []

    # get current datetime
    current_datetime = datetime.now(timezone.utc).isoformat()

    # append to user_input
    user_input_enriched = user_input.copy()  # shallow copy to avoid modifying original
    user_input_enriched["text"] = (
        user_input["text"]
        + "\n\nEnergy profile: " + str(energy_profile)
        + "\nCalendar events: " + calendar_events
        + "\nCurrent datetime: " + current_datetime
    )

    return chatgpt_call(user_input_enriched, RECOMMEND_SLOTS_DEV_PROMPT, "slots recommendation", SLOTS_SCHEMA)


# scheduling and rescheduling
async def schedule_tasks_into_calendar(user_input):

    tasks = await infer_tasks(user_input)

    user_id = user_input["user_id"]
    existing_tasks = get_tasks_by_user(user_id)

    # if conflict reschedule all
    if conflict(tasks + existing_tasks):
        tasks += existing_tasks

    # if many tasks process first
    if len(tasks) >= 1:
        # get energy profile settings
        energy_profile = get_energy_profile(user_id)

        # create settings object
        import json
        import numpy as np
        settings = type("obj", (object,), {
            "min_study_duration": energy_profile.get("min_study_duration", 30) if energy_profile else 30,
            "max_study_duration": energy_profile.get("max_study_duration", 180) if energy_profile else 180,
            "break_duration": energy_profile.get("short_break_min", 5) if energy_profile else 5,
            "max_study_duration_before_break": energy_profile.get("long_study_threshold_min", 90) if energy_profile else 90,
            "energy_plot": np.array(json.loads(energy_profile.get("energy_levels", "[]"))) if energy_profile and energy_profile.get("energy_levels") else np.ones(24)
        })()

        # determine scheduling window
        from datetime import timedelta
        start_date = datetime.now(timezone.utc)
        due_date_days = energy_profile.get("due_date_days", 7) if energy_profile else 7
        end_date = start_date + timedelta(days=due_date_days)

        schedule = await schedule_tasks(tasks, user_id, start_date, end_date, settings, supabase)
        for event in schedule:
            create_calendar_event(event)
        

        # text return for user to see
        descriptions = [event["description"] for event in schedule]

        # Join them into a single string
        result = "Scheduled " + ", ".join(descriptions)

        return {
            "text": result
        }

    # else schedule just one
    else:
        event = tasks[0]
        create_calendar_event(event)
        return {
            "text": f"Scheduled {event["description"]}"
        }


async def infer_tasks(user_input):
    return chatgpt_call(user_input, GET_TASKS_DEV_PROMPT, "tasks", TASK_SCHEMA)


def conflict(tasks):
    tasks = sorted(tasks, key=lambda x: x[0])  # sort by start time

    for i in range(1, len(tasks)):
        prev_end = tasks[i - 1]["end_time"]
        curr_start = tasks[i]["start_time"]
        if curr_start < prev_end:
            return True  # overlap
    return False


# search semanticlly for task in calendar and delete them, along with their calendar events
async def delete_tasks_from_calendar(user_input):

    user_id = user_input["user_id"]
    existing_tasks = get_tasks_by_user(user_id) 

    tasks_to_delete = match_tasks(user_input, existing_tasks)

    for task in tasks_to_delete:
        events = get_calendar_events_by_task_id(task["task_id"]) 
        for event in events:
            delete_calendar_event(event["event_id"])

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

    # fetch calendar events
    calendar_events = get_calendar_events(user_id) if user_id else []

    # get current datetime for context
    current_datetime = datetime.now(timezone.utc).isoformat()

    # enrich input with calendar data
    user_input_enriched = user_input.copy()
    user_input_enriched["text"] = (
        user_input["text"]
        + "\n\nCalendar events: " + str(calendar_events)
        + "\nCurrent datetime: " + current_datetime
    )

    return chatgpt_call(
        user_input_enriched,
        CHECK_CALENDAR_DEV_PROMPT,
        "calendar_query",
        CALENDAR_QUERY_SCHEMA
    )


# all preferences
async def update_preferences(user_input):

    user_id = user_input.get("user_id")

    # get current energy profile for context
    current_profile = get_energy_profile(user_id) if user_id else None

    # enrich input with current settings
    user_input_enriched = user_input.copy()
    user_input_enriched["text"] = (
        user_input["text"]
        + "\n\nCurrent energy profile: " + str(current_profile)
    )

    # extract desired updates from user input
    updates = chatgpt_call(
        user_input_enriched,
        UPDATE_PREFERENCES_DEV_PROMPT,
        "preference_updates",
        PREFERENCE_UPDATES_SCHEMA
    )

    # apply updates to database
    if updates and any(v is not None for v in updates.values() if v != "user_id"):
        # remove user_id from updates dict before passing to db
        profile_data = {k: v for k, v in updates.items() if k != "user_id" and v is not None}
        create_or_update_energy_profile(user_id, profile_data)

        return {
            "text": f"Updated preferences: {", ".join(profile_data.keys())}"
        }
    else:
        return {
            "text": "No preference changes detected"
        }