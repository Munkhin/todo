# timezone utilities for consistent UTC handling across the application
from datetime import datetime, timezone


def parse_iso_to_utc_naive(iso_string: str) -> datetime:
    """parse ISO datetime string to naive UTC datetime for database storage

    handles timezone-aware and naive ISO strings
    examples: "2025-11-07T09:00:00Z", "2025-11-07T09:00:00+08:00"

    Args:
        iso_string: ISO 8601 datetime string

    Returns:
        naive datetime in UTC (no tzinfo)
    """
    dt = datetime.fromisoformat(iso_string.replace('Z', '+00:00'))
    if dt.tzinfo is not None:
        # convert to UTC and make naive
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    # if naive, assume it's already UTC (for backwards compatibility)
    return dt


def naive_utc_to_iso_z(dt: datetime) -> str:
    """convert naive UTC datetime to ISO 8601 string with Z suffix

    Args:
        dt: naive datetime (assumed to be UTC)

    Returns:
        ISO 8601 string with Z suffix (e.g., "2025-11-07T09:00:00Z")
    """
    if dt is None:
        return None

    if dt.tzinfo is None:
        # assume naive datetime is UTC
        dt = dt.replace(tzinfo=timezone.utc)
    else:
        # convert to UTC if it has timezone info
        dt = dt.astimezone(timezone.utc)

    return dt.isoformat().replace('+00:00', 'Z')


def utc_now_naive() -> datetime:
    """get current UTC time as naive datetime for database storage

    Returns:
        naive datetime in UTC (no tzinfo)
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)
