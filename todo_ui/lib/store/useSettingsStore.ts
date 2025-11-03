import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  DEFAULT_DUE_DATE_DAYS,
  DEFAULT_ENERGY_LEVELS,
  DEFAULT_MAX_STUDY_DURATION,
  DEFAULT_MIN_STUDY_DURATION,
  DEFAULT_SLEEP_TIME,
  DEFAULT_WAKE_TIME,
} from '../constants/scheduling';
import { EnergyProfilePayload, fetchEnergyProfile, saveEnergyProfile } from '../api/energyProfile';

export type SchedulingSettings = EnergyProfilePayload;

interface SettingsState {
  settings: SchedulingSettings;
  isLoading: boolean;
  error: string | null;
  load: (_userId: number) => Promise<void>;
  updateField: <K extends keyof SchedulingSettings>(_field: K, _value: SchedulingSettings[K]) => void;
  updateEnergyLevel: (_hour: number, _level: number) => void;
  resetToDefaults: () => void;
  save: (_userId: number) => Promise<void>;
}

const DEFAULT_ENERGY_LEVEL = 5;

const buildDefaults = (): SchedulingSettings => ({
  due_date_days: DEFAULT_DUE_DATE_DAYS,
  wake_time: DEFAULT_WAKE_TIME,
  sleep_time: DEFAULT_SLEEP_TIME,
  max_study_duration: DEFAULT_MAX_STUDY_DURATION,
  min_study_duration: DEFAULT_MIN_STUDY_DURATION,
  energy_levels: { ...DEFAULT_ENERGY_LEVELS },
});

// defaults for resetting settings
// const defaults = buildDefaults();

const buildActiveHours = (wake: number, sleep: number): number[] => {
  if (wake === sleep) {
    return [wake];
  }

  if (wake < sleep) {
    return Array.from({ length: sleep - wake + 1 }, (_, index) => wake + index);
  }

  const hoursToMidnight = Array.from({ length: 24 - wake }, (_, index) => wake + index);
  const hoursFromMidnight = Array.from({ length: sleep + 1 }, (_, index) => index);
  return [...hoursToMidnight, ...hoursFromMidnight];
};

const normaliseEnergyLevelsForRange = (
  existingLevels: Record<number, number>,
  wake: number,
  sleep: number
): Record<number, number> => {
  const hours = buildActiveHours(wake, sleep);
  const nextLevels: Record<number, number> = {};

  hours.forEach((hour) => {
    nextLevels[hour] = existingLevels[hour] ?? DEFAULT_ENERGY_LEVEL;
  });

  return nextLevels;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: buildDefaults(),
      isLoading: false,
      error: null,
      load: async (userId: number) => {
        set({ isLoading: true, error: null });
        try {
          const profile = await fetchEnergyProfile(userId);
          const normalisedLevels = normaliseEnergyLevelsForRange(
            profile.energy_levels,
            profile.wake_time,
            profile.sleep_time
          );

          set({
            settings: {
              ...get().settings,
              ...profile,
              energy_levels: normalisedLevels,
            },
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false, error: error instanceof Error ? error.message : 'Failed to load settings' });
        }
      },
      updateField: (field, value) => {
        set((state) => {
          let nextSettings: SchedulingSettings = {
            ...state.settings,
            [field]: value,
          };

          if (field === 'wake_time' || field === 'sleep_time') {
            const wake = field === 'wake_time' ? (value as number) : nextSettings.wake_time;
            const sleep = field === 'sleep_time' ? (value as number) : nextSettings.sleep_time;
            nextSettings = {
              ...nextSettings,
              energy_levels: normaliseEnergyLevelsForRange(state.settings.energy_levels, wake, sleep),
            };
          }

          return {
            settings: nextSettings,
          };
        });
      },
      updateEnergyLevel: (hour, level) => {
        set((state) => ({
          settings: {
            ...state.settings,
            energy_levels: {
              ...state.settings.energy_levels,
              [hour]: Math.min(10, Math.max(1, level)),
            },
          },
        }));
      },
      resetToDefaults: () => {
        set({
          settings: buildDefaults(),
          error: null,
        });
      },
      save: async (userId: number) => {
        const { settings } = get();
        const payload: EnergyProfilePayload = {
          due_date_days: settings.due_date_days,
          wake_time: settings.wake_time,
          sleep_time: settings.sleep_time,
          max_study_duration: settings.max_study_duration,
          min_study_duration: settings.min_study_duration,
          energy_levels: settings.energy_levels,
        };

        await saveEnergyProfile(userId, payload);
      },
    }),
    {
      name: 'scheduling-settings',
      partialize: (state) => ({
        settings: state.settings,
      }),
    }
  )
);
