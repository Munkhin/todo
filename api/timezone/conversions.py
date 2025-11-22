from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any

# time formatting: 2025-11-08 10:00:00+00:00 (offset from utc)

def utc_now():
    return datetime.now(timezone.utc)


def utc_to_timezone(utc_dt: datetime, tz_str: str) -> datetime:
    
    # no timezone info -> treated as utc
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=timezone.utc)
    
    return utc_dt.astimezone(ZoneInfo(tz_str))


def timezone_to_utc(local_dt: datetime, tz_str: str) -> datetime:
    
    # if no timezone info attach timezone info
    if local_dt.tzinfo is None:
        local_dt = local_dt.replace(tzinfo=ZoneInfo(tz_str))
    
    return local_dt.astimezone(timezone.utc)


def resolve_user_timezone(user_id: Any) -> str:
    """Resolve user's timezone from database, defaulting to UTC."""
    if not user_id:
        return "UTC"
    
    # Import here to avoid circular dependency
    from api.database import get_user_by_id
    
    try:
        user_record = get_user_by_id(user_id)
    except Exception:
        user_record = None
    
    tz_value = None
    if isinstance(user_record, dict):
        tz_value = user_record.get("timezone")
    return tz_value or "UTC"


def now_in_timezone(tz_name: str) -> datetime:
    """Get current time in the specified timezone."""
    now_utc = datetime.now(timezone.utc)
    try:
        target_zone = ZoneInfo(tz_name)
    except Exception:
        target_zone = timezone.utc
    return now_utc.astimezone(target_zone)
