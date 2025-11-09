"use client"
import { useEffect } from "react"
import { useSettingsStore } from "@/lib/store/useSettingsStore"
import { settingsStyles } from "./SettingsView.styles"
import { useUserId } from "@/hooks/use-user-id"
import EnergyGraph from "./EnergyGraph"

export default function SettingsView() {
  const { settings, isLoading, error, load, updateField, save } = useSettingsStore()
  const userId = useUserId()

  useEffect(() => {
    if (userId !== null && userId > 0) {
      load(userId).catch(() => {})
    }
  }, [load, userId])

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
            <label className={settingsStyles.label}>
              Min Study (min)
              <input
                type="number"
                min={15}
                className={settingsStyles.input}
                value={settings.min_study_duration}
                onChange={(e) => updateField('min_study_duration', Number(e.target.value))}
              />
            </label>
            <label className={settingsStyles.label}>
              Max Study (min)
              <input
                type="number"
                max={300}
                className={settingsStyles.input}
                value={settings.max_study_duration}
                onChange={(e) => updateField('max_study_duration', Number(e.target.value))}
              />
            </label>
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
            <label className={settingsStyles.label}>
              Short Break (min)
              <input
                type="number"
                min={1}
                className={settingsStyles.input}
                value={settings.short_break_min}
                onChange={(e) => updateField('short_break_min', Number(e.target.value))}
              />
            </label>
            <label className={settingsStyles.label}>
              Long Break (min)
              <input
                type="number"
                min={5}
                className={settingsStyles.input}
                value={settings.long_break_min}
                onChange={(e) => updateField('long_break_min', Number(e.target.value))}
              />
            </label>
            <label className={settingsStyles.label}>
              Long Study Threshold (min)
              <input
                type="number"
                min={30}
                className={settingsStyles.input}
                value={settings.long_study_threshold_min}
                onChange={(e) => updateField('long_study_threshold_min', Number(e.target.value))}
              />
            </label>
            <label className={settingsStyles.label}>
              Min Gap For Break (min)
              <input
                type="number"
                min={1}
                className={settingsStyles.input}
                value={settings.min_gap_for_break_min}
                onChange={(e) => updateField('min_gap_for_break_min', Number(e.target.value))}
              />
            </label>
          </div>
        </div>
        <div className={settingsStyles.actions}>
          <button
            className={settingsStyles.saveBtn}
            disabled={isLoading || userId === null || userId <= 0}
            onClick={() => {
              if (userId !== null && userId > 0) {
                save(userId)
              }
            }}
          >
            {isLoading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </article>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
