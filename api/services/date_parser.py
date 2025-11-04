# date_parser.py
# DEPRECATED: This module is no longer used. AI agent now generates ISO 8601 datetime strings directly.
# Use datetime.fromisoformat() for parsing ISO strings instead.

from datetime import datetime, timedelta
from dateutil.parser import parse as dateutil_parse
from functools import lru_cache
import re

# cache for common date patterns (max 128 entries, auto-expires on date change)
@lru_cache(maxsize=128)
def _parse_relative_date_cached(text_lower: str, base_date_str: str) -> str:
    """cached parsing for relative date patterns (returns ISO string)"""
    base_date = datetime.fromisoformat(base_date_str)

    # now (immediate deadline)
    if text_lower == "now":
        return base_date.isoformat()

    # today
    if text_lower == "today":
        return base_date.replace(hour=23, minute=59, second=0, microsecond=0).isoformat()

    # tomorrow
    if "tomorrow" in text_lower:
        return (base_date + timedelta(days=1)).isoformat()

    # in X days/weeks/months
    if match := re.search(r'in (\d+) (day|week|month)s?', text_lower):
        num = int(match.group(1))
        unit = match.group(2)
        if unit == 'day':
            return (base_date + timedelta(days=num)).isoformat()
        elif unit == 'week':
            return (base_date + timedelta(weeks=num)).isoformat()
        elif unit == 'month':
            return (base_date + timedelta(days=num * 30)).isoformat()

    # next [weekday]
    weekdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    if match := re.search(r'next (monday|tuesday|wednesday|thursday|friday|saturday|sunday)', text_lower):
        target_day = weekdays.index(match.group(1))
        current_day = base_date.weekday()
        days_ahead = (target_day - current_day) % 7
        if days_ahead == 0:
            days_ahead = 7
        return (base_date + timedelta(days=days_ahead)).isoformat()

    return None  # no match, caller should try other parsing

def parse_natural_date(text: str, base_date: datetime = None) -> datetime:
    """parse natural language dates with caching for common patterns"""
    if base_date is None:
        base_date = datetime.now()

    text_lower = text.lower().strip()

    # use date string for cache key (changes daily, auto-invalidates cache)
    base_date_key = base_date.date().isoformat()

    # try cached relative parsing
    cached_result = _parse_relative_date_cached(text_lower, base_date_key)
    if cached_result:
        return datetime.fromisoformat(cached_result)

    # fallback to standard parsing (not cached due to complexity)
    try:
        return dateutil_parse(text, fuzzy=True, default=base_date)
    except:
        # default: 7 days from now
        return base_date + timedelta(days=7)
