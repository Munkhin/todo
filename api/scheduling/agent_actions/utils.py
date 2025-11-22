"""Shared utility functions for agent actions."""

import json
import logging
from typing import Any

logger = logging.getLogger(__name__)

# universal chatgpt call function used in agent actions
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

# helper function for all chatgpt calls
def save_conversation_id(user_id, response_json):
    conversation_id = response_json.get("conversation", {}).get("id")

    if user_id and conversation_id:
        update_user_conversation_id(user_id, conversation_id)

    elif not user_id:
        raise ValueError("Cannot save conversation_id: user id was not provided")
    
    elif not conversation_id:
        raise ValueError("Cannot save conversation_id: conversation id not present in response json")

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
