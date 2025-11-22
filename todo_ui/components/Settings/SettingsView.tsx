"use client"
// react query
import React from "react"
import { useEnergyProfile } from "@/hooks/use-energy-profile"
// end react query
import { settingsStyles } from "./SettingsView.styles"
import { useUserId } from "@/hooks/use-user-id"
import EnergyGraph from "./EnergyGraph"
import DurationInput from "./DurationInput"
import { SubjectsManager } from "./SubjectsManager"

export default function SettingsView() {
  const userId = useUserId()
  const { settings, isLoading, error, updateField, save } = useEnergyProfile(userId)

  return (
    <section className={settingsStyles.container} aria-labelledby="settings-title">
      <h1 id="settings-title" className={settingsStyles.title}>Settings</h1>

      {/* Subjects Section - NEW */}
      <article className={settingsStyles.card}>
        <SubjectsManager />
      </article>

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
            <DurationInput
              label="Max Study Before Break"
              value={settings.max_study_duration_before_break}
              maxMinutes={120}
              plainNumberUnit="minutes"
              onChange={(minutes) => updateField('max_study_duration_before_break', minutes)}
            />
            <DurationInput
              label="Break Duration"
              value={settings.break_duration}
              maxMinutes={30}
              plainNumberUnit="minutes"
              onChange={(minutes) => updateField('break_duration', minutes)}
            />
          </div>

          <div className="mt-4">
            <EnergyGraph
              wakeHour={settings.wake_time ?? 7}
              sleepHour={settings.sleep_time ?? 23}
              energyLevels={settings.energy_levels}
              onChange={(levels) => updateField('energy_levels', levels)}
            />
          </div>
        </div>
      </article>

      {/* Save Button */}
      <article className={settingsStyles.card}>
        <button
          className={settingsStyles.saveBtn}
          onClick={save}
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
        {error && <p className={settingsStyles.error}>{error}</p>}
      </article>
    </section>
  )
}
