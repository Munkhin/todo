from datetime import time, timedelta
from sqlalchemy.orm import Session
from typing import Dict
import json

# default constants (used as fallback)
DEFAULT_DUE_DATE_DAYS = 7  # default due date is 7 days from now
DEFAULT_MAX_STUDY_DURATION = 180  # max study duration in minutes
DEFAULT_MIN_STUDY_DURATION = 30  # min study duration in minutes
DEFAULT_WAKE_TIME = 7  # wake up time (7 AM)
DEFAULT_SLEEP_TIME = 23  # sleep time (11 PM)

# rest/break defaults
DEFAULT_INSERT_BREAKS = False  # insert short/long breaks between sessions
DEFAULT_SHORT_BREAK_MIN = 5
DEFAULT_LONG_BREAK_MIN = 15
DEFAULT_LONG_STUDY_THRESHOLD_MIN = 90
DEFAULT_MIN_GAP_FOR_BREAK_MIN = 3

# default energy levels throughout the day (hour: energy_level 1-10)
DEFAULT_ENERGY_LEVELS = {
    7: 6,   # 7 AM - waking up
    8: 7,   # 8 AM - morning
    9: 9,   # 9 AM - peak morning
    10: 9,  # 10 AM - peak morning
    11: 8,  # 11 AM - late morning
    12: 6,  # 12 PM - lunch
    13: 5,  # 1 PM - post-lunch dip
    14: 6,  # 2 PM - afternoon
    15: 7,  # 3 PM - afternoon
    16: 8,  # 4 PM - late afternoon peak
    17: 7,  # 5 PM - evening
    18: 6,  # 6 PM - dinner
    19: 5,  # 7 PM - evening
    20: 5,  # 8 PM - evening
    21: 4,  # 9 PM - late evening
    22: 3,  # 10 PM - wind down
}

def get_user_constants(user_id: int, db: Session) -> Dict:
    """
    get user-specific constants from database, fallback to defaults
    returns dict with all scheduling constants
    """
    try:
        from models import EnergyProfile  # type: ignore
    except Exception:
        from api.models import EnergyProfile

    # try to get user's energy profile
    profile = db.query(EnergyProfile).filter(EnergyProfile.user_id == user_id).first()

    if profile:
        # parse energy levels from JSON if exists
        energy_levels = DEFAULT_ENERGY_LEVELS
        if profile.energy_levels:
            try:
                energy_levels = {int(k): v for k, v in json.loads(profile.energy_levels).items()}
            except:
                energy_levels = DEFAULT_ENERGY_LEVELS

        return {
            'DUE_DATE_DAYS': profile.due_date_days if profile.due_date_days is not None else DEFAULT_DUE_DATE_DAYS,
            'WAKE_TIME': profile.wake_time,
            'SLEEP_TIME': profile.sleep_time,
            'MAX_STUDY_DURATION': profile.max_study_duration,
            'MIN_STUDY_DURATION': profile.min_study_duration,
            'ENERGY_LEVELS': energy_levels,
            # rest-aware settings (with safe fallbacks if columns absent)
            'INSERT_BREAKS': getattr(profile, 'insert_breaks', DEFAULT_INSERT_BREAKS) if profile.insert_breaks is not None else DEFAULT_INSERT_BREAKS,
            'SHORT_BREAK_MIN': getattr(profile, 'short_break_min', DEFAULT_SHORT_BREAK_MIN) if getattr(profile, 'short_break_min', None) is not None else DEFAULT_SHORT_BREAK_MIN,
            'LONG_BREAK_MIN': getattr(profile, 'long_break_min', DEFAULT_LONG_BREAK_MIN) if getattr(profile, 'long_break_min', None) is not None else DEFAULT_LONG_BREAK_MIN,
            'LONG_STUDY_THRESHOLD_MIN': getattr(profile, 'long_study_threshold_min', DEFAULT_LONG_STUDY_THRESHOLD_MIN) if getattr(profile, 'long_study_threshold_min', None) is not None else DEFAULT_LONG_STUDY_THRESHOLD_MIN,
            'MIN_GAP_FOR_BREAK_MIN': getattr(profile, 'min_gap_for_break_min', DEFAULT_MIN_GAP_FOR_BREAK_MIN) if getattr(profile, 'min_gap_for_break_min', None) is not None else DEFAULT_MIN_GAP_FOR_BREAK_MIN,
        }
    else:
        # return defaults
        return {
            'DUE_DATE_DAYS': DEFAULT_DUE_DATE_DAYS,
            'WAKE_TIME': DEFAULT_WAKE_TIME,
            'SLEEP_TIME': DEFAULT_SLEEP_TIME,
            'MAX_STUDY_DURATION': DEFAULT_MAX_STUDY_DURATION,
            'MIN_STUDY_DURATION': DEFAULT_MIN_STUDY_DURATION,
            'ENERGY_LEVELS': DEFAULT_ENERGY_LEVELS,
            'INSERT_BREAKS': DEFAULT_INSERT_BREAKS,
            'SHORT_BREAK_MIN': DEFAULT_SHORT_BREAK_MIN,
            'LONG_BREAK_MIN': DEFAULT_LONG_BREAK_MIN,
            'LONG_STUDY_THRESHOLD_MIN': DEFAULT_LONG_STUDY_THRESHOLD_MIN,
            'MIN_GAP_FOR_BREAK_MIN': DEFAULT_MIN_GAP_FOR_BREAK_MIN,
        }
