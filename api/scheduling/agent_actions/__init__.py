"""Agent actions package - exports all action functions."""

from .recommend_slots import recommend_slots
from .scheduling import schedule_tasks_into_calendar
from .deletion import delete_tasks_from_calendar
from .calendar_query import check_calendar
from .event_creation import create_calendar_event_direct
from .preferences import update_preferences

__all__ = [
    "recommend_slots",
    "schedule_tasks_into_calendar",
    "delete_tasks_from_calendar",
    "check_calendar",
    "create_calendar_event_direct",
    "update_preferences",
]
