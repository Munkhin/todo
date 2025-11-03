import { api, APIError } from './client';
import {
  DEFAULT_DUE_DATE_DAYS,
  DEFAULT_ENERGY_LEVELS,
  DEFAULT_MAX_STUDY_DURATION,
  DEFAULT_MIN_STUDY_DURATION,
  DEFAULT_SLEEP_TIME,
  DEFAULT_WAKE_TIME,
} from '../constants/scheduling';

export interface EnergyProfilePayload {
  due_date_days: number;
  wake_time: number;
  sleep_time: number;
  max_study_duration: number;
  min_study_duration: number;
  energy_levels: Record<number, number>;
}

export interface EnergyProfileResponse {
  due_date_days?: number | null;
  wake_time: number;
  sleep_time: number;
  max_study_duration: number;
  min_study_duration: number;
  energy_levels: string | null;
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
  };
}

export async function fetchEnergyProfile(userId: number): Promise<EnergyProfilePayload> {
  try {
    const response = await api.get<EnergyProfileResponse>(`/api/schedule/energy-profile?user_id=${userId}`);
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
  };

  await api.post(`/api/schedule/energy-profile?user_id=${userId}`, body);
}
