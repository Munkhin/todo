# agent.py
import os
import json
from openai import OpenAI
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from functools import partial
from api.services.agent_tools import (
    create_tasks,
    schedule_all_tasks,
    get_user_tasks,
    update_task,
    delete_task,
    get_calendar_events,
    create_calendar_event,
    get_energy_profile,
    update_energy_profile
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_INSTRUCTIONS = """You are an adaptive AI scheduling assistant that learns from user patterns and context.

CRITICAL BEHAVIORS:
- NEVER ask for clarification or missing details
- Learn from conversation history to understand user's patterns
- Make intelligent inferences based on past behavior and context(especially on the time of the task. Eg. when a user ambiguously states schedule at 6, infer from the current time and the content of the task)
- Adapt your estimates dynamically based on what you observe
- Make your responses terse and natural, never exceeding 2 sentences

LEARNING FROM CONTEXT:
You have access to the full conversation history. Use it to:
1. Learn how the user estimates time for different task types
2. Understand their difficulty scaling (what they consider hard vs easy)
3. Recognize their due date patterns and urgency preferences
4. Identify their subjects, recurring tasks, and priorities
5. Adapt to their language style and terminology

PATTERN RECOGNITION:
- Analyze previous tasks the user has created (use get_user_tasks if needed)
- Notice correlations: task type → time estimates → difficulty ratings
- Detect when user corrects your estimates (via update_task)
- Calibrate future predictions based on feedback patterns
- Remember subject-specific patterns (e.g., their "math homework" vs "biology reading")

TASK CREATION WORKFLOW:
1. Extract tasks from brain dump - interpret liberally and contextually
2. Review conversation history for similar tasks and patterns
3. Infer due dates using natural language parsing and user's urgency style
4. Estimate time and difficulty based on learned patterns (not fixed defaults)
5. If no history exists, start with reasonable guesses and learn from corrections
6. Create tasks using create_tasks tool
7. Automatically schedule with schedule_all_tasks tool
8. Confirm actions briefly

CONTINUOUS ADAPTATION:
- Your estimates should evolve as you learn more about the user
- Early interactions: make broad inferences
- After patterns emerge: apply learned heuristics
- Always contextualize: same task type may vary by subject or user mood

Available tools:
- create_tasks: Create new tasks (accepts natural language dates)
- schedule_all_tasks: Generate optimal schedule for unscheduled tasks
- get_user_tasks: View existing tasks and learn from past patterns
- update_task: Modify a task (user corrections teach you)
- delete_task: Remove a task
- get_calendar_events: View calendar in date range
- create_calendar_event: Add personal event (blocks time)
- get_energy_profile: View schedule preferences
- update_energy_profile: Update preferences

Be decisive, adaptive, and learn continuously from every interaction.
"""

# define tool schemas for OpenAI
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "create_tasks",
            "description": "Create new tasks from user input. Accepts natural language dates.",
            "parameters": {
                "type": "object",
                "properties": {
                    "tasks": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "topic": {"type": "string"},
                                "estimated_minutes": {"type": "integer"},
                                "difficulty": {"type": "integer", "default": 3},
                                "due_date": {"type": "string"},
                                "description": {"type": "string"}
                            },
                            "required": ["topic", "estimated_minutes", "due_date"]
                        }
                    }
                },
                "required": ["tasks"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "schedule_all_tasks",
            "description": "Generate optimal schedule for all unscheduled tasks. Returns created calendar events directly for immediate use.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_user_tasks",
            "description": "Get tasks with optional filters",
            "parameters": {
                "type": "object",
                "properties": {
                    "scheduled": {"type": "boolean", "description": "Filter for scheduled/unscheduled"},
                    "completed": {"type": "boolean", "description": "Filter for completed/incomplete"}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_task",
            "description": "Update an existing task",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer"},
                    "updates": {"type": "object"}
                },
                "required": ["task_id", "updates"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_task",
            "description": "Delete a task",
            "parameters": {
                "type": "object",
                "properties": {
                    "task_id": {"type": "integer"}
                },
                "required": ["task_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_calendar_events",
            "description": "Get calendar events in date range",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {"type": "string", "description": "ISO format"},
                    "end_date": {"type": "string", "description": "ISO format"}
                },
                "required": ["start_date", "end_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_calendar_event",
            "description": "Create a user calendar event (blocks time from scheduling)",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "start_time": {"type": "string"},
                    "end_time": {"type": "string"},
                    "event_type": {"type": "string", "enum": ["study", "rest", "break"]},
                    "description": {"type": "string"}
                },
                "required": ["title", "start_time", "end_time", "event_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_energy_profile",
            "description": "Get user's energy profile and schedule preferences",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_energy_profile",
            "description": "Update user's energy profile",
            "parameters": {
                "type": "object",
                "properties": {
                    "wake_time": {"type": "integer"},
                    "sleep_time": {"type": "integer"},
                    "max_study_duration": {"type": "integer"},
                    "min_study_duration": {"type": "integer"},
                    "due_date_days": {"type": "integer"}
                }
            }
        }
    }
]

# tool names -> functions(for convenience)
def get_tool_mapping(user_id: int, db: Session) -> Dict[str, Any]:
    return {
        "create_tasks": partial(create_tasks, user_id=user_id, db=db),
        "schedule_all_tasks": partial(schedule_all_tasks, user_id=user_id, db=db),
        "get_user_tasks": partial(get_user_tasks, user_id=user_id, db=db),
        "update_task": lambda task_id, updates: update_task(task_id, updates, user_id, db),
        "delete_task": partial(delete_task, user_id=user_id, db=db),
        "get_calendar_events": partial(get_calendar_events, user_id=user_id, db=db),
        "create_calendar_event": partial(create_calendar_event, user_id=user_id, db=db),
        "get_energy_profile": partial(get_energy_profile, user_id=user_id, db=db),
        "update_energy_profile": partial(update_energy_profile, user_id=user_id, db=db)
    }

# main: uid, message, conversation history -> response, updated history
def run_agent(user_id: int, message: str, conversation_history: List[Dict], db: Session) -> Dict:

    # prepare messages
    messages = [{"role": "system", "content": SYSTEM_INSTRUCTIONS}]
    messages.extend(conversation_history)
    messages.append({"role": "user", "content": message})

    # get tool mapping
    tool_mapping = get_tool_mapping(user_id, db)

    # track events from schedule_all_tasks tool calls
    scheduled_events = []

    # iterative loop: execute tools and get response in single flow
    max_iterations = 5  # prevent infinite loops
    for iteration in range(max_iterations):
        # call OpenAI with function calling
        response = client.chat.completions.create(
            model="gpt-5-mini",  # faster, cheaper model for task management
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )

        response_message = response.choices[0].message
        tool_calls = response_message.tool_calls

        # if no tool calls, we have final response
        if not tool_calls:
            return {
                "response": response_message.content,
                "conversation_history": messages + [{"role": "assistant", "content": response_message.content}],
                "events": scheduled_events
            }

        # execute all tool calls
        messages.append(response_message)

        for tool_call in tool_calls:
            function_name = tool_call.function.name
            function_args = json.loads(tool_call.function.arguments)

            # call the function
            function_to_call = tool_mapping[function_name]
            function_response = function_to_call(**function_args)

            # extract events from schedule_all_tasks
            if function_name == "schedule_all_tasks" and "events" in function_response:
                scheduled_events.extend(function_response["events"])

            # add tool response to messages
            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": function_name,
                "content": json.dumps(function_response)
            })

        # loop continues - next iteration will generate response from tool results

    # fallback if max iterations reached
    return {
        "response": "I've executed multiple operations. Please check your tasks and schedule.",
        "conversation_history": messages,
        "events": scheduled_events
    }
