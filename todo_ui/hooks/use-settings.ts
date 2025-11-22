// react query
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchEnergyProfile, saveEnergyProfile, type EnergyProfilePayload } from '@/lib/api/energyProfile'
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
} from '@/lib/constants/scheduling'

const DEFAULT_ENERGY_LEVEL = 5

function buildActiveHours(wake: number, sleep: number): number[] {
  if (wake === sleep) return [wake]

  if (wake < sleep) {
    return Array.from({ length: sleep - wake + 1 }, (_, index) => wake + index)
  }

  const hoursToMidnight = Array.from({ length: 24 - wake }, (_, index) => wake + index)
  const hoursFromMidnight = Array.from({ length: sleep + 1 }, (_, index) => index)
  return [...hoursToMidnight, ...hoursFromMidnight]
}

function normaliseEnergyLevelsForRange(
  existingLevels: Record<number, number>,
  wake: number,
  sleep: number
): Record<number, number> {
  const hours = buildActiveHours(wake, sleep)
  const nextLevels: Record<number, number> = {}

  hours.forEach((hour) => {
    nextLevels[hour] = existingLevels[hour] ?? DEFAULT_ENERGY_LEVEL
  })

  return nextLevels
}

function buildDefaults(): EnergyProfilePayload {
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
    max_study_duration_before_break: DEFAULT_MAX_STUDY_DURATION_BEFORE_BREAK,
    break_duration: DEFAULT_BREAK_DURATION,
  }
}

export function useSettings(userId: number | null) {
  const queryClient = useQueryClient()
  const [localSettings, setLocalSettings] = useState<EnergyProfilePayload>(buildDefaults())

  const { data, isLoading: isQueryLoading, error: queryError } = useQuery({
    queryKey: ['settings', userId],
    queryFn: async () => {
      if (!userId || userId <= 0) throw new Error('Invalid user ID')
      const profile = await fetchEnergyProfile(userId)
      const normalisedLevels = normaliseEnergyLevelsForRange(
        profile.energy_levels,
        profile.wake_time,
        profile.sleep_time
      )
      return { ...profile, energy_levels: normalisedLevels }
    },
    enabled: !!userId && userId > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const saveMutation = useMutation({
    mutationFn: async (payload: EnergyProfilePayload) => {
      if (!userId || userId <= 0) throw new Error('Invalid user ID')
      await saveEnergyProfile(userId, payload)
      const refreshed = await fetchEnergyProfile(userId)
      return refreshed
    },
    onSuccess: (refreshed) => {
      queryClient.setQueryData(['settings', userId], refreshed)
      setLocalSettings(refreshed)
    },
  })

  // Sync server data to local state when loaded
  useEffect(() => {
    if (data) {
      setLocalSettings(data)
    }
  }, [data])

  const updateField = useCallback(<K extends keyof EnergyProfilePayload>(
    field: K,
    value: EnergyProfilePayload[K]
  ) => {
    setLocalSettings((prev) => {
      let next = { ...prev, [field]: value }

      if (field === 'wake_time' || field === 'sleep_time') {
        const wake = field === 'wake_time' ? (value as number) : next.wake_time
        const sleep = field === 'sleep_time' ? (value as number) : next.sleep_time
        next = {
          ...next,
          energy_levels: normaliseEnergyLevelsForRange(prev.energy_levels, wake, sleep),
        }
      }

      return next
    })
  }, [])

  const save = useCallback(async () => {
    await saveMutation.mutateAsync(localSettings)
  }, [localSettings, saveMutation])

  return {
    settings: localSettings,
    isLoading: isQueryLoading || saveMutation.isPending,
    error: queryError instanceof Error ? queryError.message : saveMutation.error instanceof Error ? saveMutation.error.message : null,
    updateField,
    save,
  }
}
// end react query
