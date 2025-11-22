import { api, APIError } from './client';
import {
  DEFAULT_DUE_DATE_DAYS,
  DEFAULT_ENERGY_LEVELS,
  DEFAULT_MAX_STUDY_DURATION,
  DEFAULT_MIN_STUDY_DURATION,
  DEFAULT_SLEEP_TIME,
  DEFAULT_WAKE_TIME,
  DEFAULT_INSERT_BREAKS,
  DEFAULT_SHORT_BREAK_MIN,
  DEFAULT_LONG_BREAK_MIN,
  DEFAULT_LONG_STUDY_THRESHOLD_MIN,
  DEFAULT_MIN_GAP_FOR_BREAK_MIN,
  DEFAULT_MAX_STUDY_DURATION_BEFORE_BREAK,
  DEFAULT_BREAK_DURATION,
} from '../constants/scheduling';

export interface EnergyProfilePayload {
  due_date_days: number;
  wake_time: number;
  sleep_time: number;
  max_study_duration: number;
  min_study_duration: number;
  energy_levels: Record<number, number>;
  // rest-aware
  insert_breaks: boolean;
  short_break_min: number;
  long_break_min: number;
  long_study_threshold_min: number;
  min_gap_for_break_min: number;
  max_study_duration_before_break?: number;
  break_duration?: number;
  onboarding_completed?: boolean;
  subject_colors?: Record<string, string>;
}

export interface EnergyProfileResponse {
  due_date_days?: number | null;
  wake_time: number;
  sleep_time: number;
  max_study_duration: number;
  min_study_duration: number;
  energy_levels: string | null;
  insert_breaks?: boolean;
  short_break_min?: number | null;
  long_break_min?: number | null;
  long_study_threshold_min?: number | null;
  min_gap_for_break_min?: number | null;
  max_study_duration_before_break?: number | null;
  break_duration?: number | null;
  onboarding_completed?: boolean;
  subject_colors?: Record<string, string> | null;
}

function parseEnergyLevels(levels: string | null): Record<number, number> {
  if (!levels) {
    return { ...DEFAULT_ENERGY_LEVELS };
  }

  try {
    const parsed = JSON.parse(levels) as Record<string, number>;
    return Object.entries(parsed).reduce<Record<number, number>>((acc, [key, value]) => {
      acc[Number(key)] = value;
      return acc;
    }, {});
  } catch {
    return { ...DEFAULT_ENERGY_LEVELS };
  }
}

export function normaliseResponse(response: EnergyProfileResponse | null): EnergyProfilePayload {
  if (!response) {
    return {
      due_date_days: DEFAULT_DUE_DATE_DAYS,
      wake_time: DEFAULT_WAKE_TIME,
      sleep_time: DEFAULT_SLEEP_TIME,
      max_study_duration: DEFAULT_MAX_STUDY_DURATION,
      min_study_duration: DEFAULT_MIN_STUDY_DURATION,
      energy_levels: { ...DEFAULT_ENERGY_LEVELS },
      insert_breaks: DEFAULT_INSERT_BREAKS,
      short_break_min: DEFAULT_SHORT_BREAK_MIN,
      long_break_min: DEFAULT_LONG_BREAK_MIN,
      long_study_threshold_min: DEFAULT_LONG_STUDY_THRESHOLD_MIN,
      min_gap_for_break_min: DEFAULT_MIN_GAP_FOR_BREAK_MIN,
    };
  }

  return {
    due_date_days:
      response.due_date_days === undefined || response.due_date_days === null
        ? DEFAULT_DUE_DATE_DAYS
        : response.due_date_days,
    wake_time: response.wake_time ?? DEFAULT_WAKE_TIME,
    sleep_time: response.sleep_time ?? DEFAULT_SLEEP_TIME,
    max_study_duration: response.max_study_duration ?? DEFAULT_MAX_STUDY_DURATION,
    min_study_duration: response.min_study_duration ?? DEFAULT_MIN_STUDY_DURATION,
    energy_levels: parseEnergyLevels(response.energy_levels),
    insert_breaks: response.insert_breaks ?? DEFAULT_INSERT_BREAKS,
    short_break_min: response.short_break_min ?? DEFAULT_SHORT_BREAK_MIN,
    long_break_min: response.long_break_min ?? DEFAULT_LONG_BREAK_MIN,
    long_study_threshold_min: response.long_study_threshold_min ?? DEFAULT_LONG_STUDY_THRESHOLD_MIN,
    min_gap_for_break_min: response.min_gap_for_break_min ?? DEFAULT_MIN_GAP_FOR_BREAK_MIN,
    max_study_duration_before_break: response.max_study_duration_before_break ?? DEFAULT_MAX_STUDY_DURATION_BEFORE_BREAK,
    break_duration: response.break_duration ?? DEFAULT_BREAK_DURATION,
    onboarding_completed: response.onboarding_completed ?? false,
    subject_colors: response.subject_colors ?? {},
  };
}

export async function fetchEnergyProfile(userId: number): Promise<EnergyProfilePayload> {
  try {
    const response = await api.get<EnergyProfileResponse>(`/api/settings/energy-profile?user_id=${userId}`);
    return normaliseResponse(response);
  } catch (error) {
    if (error instanceof APIError && error.status === 404) {
      return normaliseResponse(null);
    }
    throw error;
  }
}

export async function saveEnergyProfile(userId: number, payload: EnergyProfilePayload) {
  const body = {
    due_date_days: payload.due_date_days,
    wake_time: payload.wake_time,
    sleep_time: payload.sleep_time,
    max_study_duration: payload.max_study_duration,
    min_study_duration: payload.min_study_duration,
    energy_levels: JSON.stringify(payload.energy_levels),
    insert_breaks: payload.insert_breaks,
    short_break_min: payload.short_break_min,
    long_break_min: payload.long_break_min,
    long_study_threshold_min: payload.long_study_threshold_min,
    min_gap_for_break_min: payload.min_gap_for_break_min,
    max_study_duration_before_break: payload.max_study_duration_before_break,
    break_duration: payload.break_duration,
    onboarding_completed: payload.onboarding_completed,
    subject_colors: payload.subject_colors,
  };

  await api.post(`/api/settings/energy-profile?user_id=${userId}`, body);
}
