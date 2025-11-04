export const DEFAULT_DUE_DATE_DAYS = 7;
export const DEFAULT_MAX_STUDY_DURATION = 180;
export const DEFAULT_MIN_STUDY_DURATION = 30;
export const DEFAULT_WAKE_TIME = 7;
export const DEFAULT_SLEEP_TIME = 23;

// Rest-aware defaults
export const DEFAULT_INSERT_BREAKS = false;
export const DEFAULT_SHORT_BREAK_MIN = 5;
export const DEFAULT_LONG_BREAK_MIN = 15;
export const DEFAULT_LONG_STUDY_THRESHOLD_MIN = 90;
export const DEFAULT_MIN_GAP_FOR_BREAK_MIN = 3;

export const DEFAULT_ENERGY_LEVELS: Record<number, number> = {
  7: 6,
  8: 7,
  9: 9,
  10: 9,
  11: 8,
  12: 6,
  13: 5,
  14: 6,
  15: 7,
  16: 8,
  17: 7,
  18: 6,
  19: 5,
  20: 5,
  21: 4,
  22: 3,
};

export const HOURS_IN_DAY = Array.from({ length: 24 }, (_, index) => index);
