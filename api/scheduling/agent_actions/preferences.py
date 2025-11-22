"""Update user preferences action."""

import asyncio

from api.database import get_settings, create_or_update_settings
from api.data_types.consts import UPDATE_PREFERENCES_DEV_PROMPT, PREFERENCE_UPDATES_SCHEMA
from api.scheduling.agent_actions.utils import ensure_mapping


async def update_preferences(user_input, chatgpt_call):
    """Handle all user preference updates."""
    user_id = user_input.get("user_id")
    base_text = user_input.get("text", "")

    # get current settings for context
    current_settings = await asyncio.to_thread(get_settings, user_id) if user_id else None

    # enrich input with current settings
    user_input_enriched = user_input.copy()
    user_input_enriched["text"] = (
        base_text
        + "\n\nCurrent settings: " + str(current_settings)
    )

    # extract desired updates from user input
    updates = await chatgpt_call(
        user_input_enriched,
        UPDATE_PREFERENCES_DEV_PROMPT,
        "preference_updates",
        PREFERENCE_UPDATES_SCHEMA
    )
    updates = ensure_mapping(updates)

    # apply updates to database
    if updates and any(v is not None for k, v in updates.items() if k != "user_id"):
        # remove user_id from updates dict before passing to db
        settings_data = {k: v for k, v in updates.items() if k != "user_id" and v is not None}
        await asyncio.to_thread(create_or_update_settings, user_id, settings_data)

        return {
            "text": "Updated preferences: " + ", ".join(settings_data.keys())
        }
    else:
        return {
            "text": "No preference changes detected"
        }
