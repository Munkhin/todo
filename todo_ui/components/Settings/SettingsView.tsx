"use client"
// react query
import React from "react"
import { useSettings } from "@/hooks/use-settings"
// end react query
import { settingsStyles } from "./SettingsView.styles"
import { useUserId } from "@/hooks/use-user-id"
import EnergyGraph from "./EnergyGraph"
import DurationInput from "./DurationInput"

export default function SettingsView() {
  const userId = useUserId()
  const { settings, isLoading, error, updateField, save } = useSettings(userId)

  return (
    <section className={settingsStyles.container} aria-labelledby="settings-title">
      <h1 id="settings-title" className={settingsStyles.title}>Settings</h1>

      <article className={settingsStyles.card}>
        <div className={settingsStyles.section}>
          <h2 className={settingsStyles.sectionTitle}>Energy Profile</h2>
          <p className={settingsStyles.sectionDesc}>Help us schedule during your peak productivity hours</p>

          <div className={settingsStyles.formGrid}>
            <label className={settingsStyles.label}>
              Wake Time (hour, 0-23)
              <input
                type="number"
                min={0}
                max={23}
                className={settingsStyles.input}
                value={settings.wake_time}
                onChange={(e) => updateField('wake_time', Number(e.target.value))}
              />
            </label>
            <label className={settingsStyles.label}>
              Sleep Time (hour, 0-23)
              <input
                type="number"
                min={0}
                max={23}
                className={settingsStyles.input}
                value={settings.sleep_time}
                onChange={(e) => updateField('sleep_time', Number(e.target.value))}
              />
            </label>
            <DurationInput
              label="Min Study Duration"
              value={settings.min_study_duration}
              minMinutes={15}
              plainNumberUnit="minutes"
              onChange={(minutes) => updateField('min_study_duration', minutes)}
            />
            <DurationInput
              label="Max Study Duration"
              value={settings.max_study_duration}
              maxMinutes={300}
              plainNumberUnit="minutes"
              onChange={(minutes) => updateField('max_study_duration', minutes)}
            />
            <label className={settingsStyles.label}>
              Default Due Date (days)
              <input
                type="number"
                min={1}
                className={settingsStyles.input}
                value={settings.due_date_days}
                onChange={(e) => updateField('due_date_days', Number(e.target.value))}
              />
            </label>
          </div>

          {/* Energy Profile Graph */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Hourly Energy Levels</h3>
            <EnergyGraph
              wakeHour={settings.wake_time ?? 7}
              sleepHour={settings.sleep_time ?? 23}
              energyLevels={settings.energy_levels ?? {}}
              onChange={(levels) => updateField('energy_levels', levels)}
            />
          </div>
        </div>
        <div className={settingsStyles.section}>
          <h2 className={settingsStyles.sectionTitle}>Breaks & Rest</h2>
          <p className={settingsStyles.sectionDesc}>Configure short/long breaks between study sessions</p>

          {/* Insert Breaks checkbox - inline with larger text */}
          <div className="mb-4">
            <label className="flex items-center gap-3 text-base font-medium text-gray-700 cursor-pointer">
              <span>Insert Breaks</span>
              <input
                type="checkbox"
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                checked={!!settings.insert_breaks}
                onChange={(e) => updateField('insert_breaks', e.target.checked)}
              />
            </label>
          </div>

          <div className={settingsStyles.formGrid}>
            <DurationInput
              label="Short Break"
              value={settings.short_break_min}
              minMinutes={1}
              onChange={(minutes) => updateField('short_break_min', minutes)}
            />
            <DurationInput
              label="Long Break"
              value={settings.long_break_min}
              minMinutes={5}
              onChange={(minutes) => updateField('long_break_min', minutes)}
            />
            <DurationInput
              label="Long Study Threshold"
              value={settings.long_study_threshold_min}
              minMinutes={30}
              onChange={(minutes) => updateField('long_study_threshold_min', minutes)}
            />
            <DurationInput
              label="Min Gap For Break"
              value={settings.min_gap_for_break_min}
              minMinutes={1}
              onChange={(minutes) => updateField('min_gap_for_break_min', minutes)}
            />
          </div>
        </div>
        <div className={settingsStyles.actions}>
          <button
            className={settingsStyles.saveBtn}
            disabled={isLoading || userId === null || userId <= 0}
            onClick={() => save()}
          >
            {isLoading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </article>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
