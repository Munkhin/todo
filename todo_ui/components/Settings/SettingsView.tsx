"use client"
import { useEffect } from "react"
import { useSettingsStore } from "@/lib/store/useSettingsStore"
import { settingsStyles } from "./SettingsView.styles"
import { useUserId } from "@/hooks/use-user-id"

export default function SettingsView() {
  const { settings, isLoading, error, load, updateField, save } = useSettingsStore()
  const userId = useUserId()

  useEffect(() => {
    load(userId).catch(() => {})
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
        </div>
        <div className={settingsStyles.actions}>
          <button
            className={settingsStyles.saveBtn}
            disabled={isLoading}
            onClick={() => save(userId)}
          >
            {isLoading ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </article>

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </section>
  )
}
