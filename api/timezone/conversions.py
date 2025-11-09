from datetime import datetime, timezone
from zoneinfo import ZoneInfo

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
