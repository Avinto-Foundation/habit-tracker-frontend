import { useEffect, useId, useRef, useState } from 'react'
import { parseApiError } from '../../api/errors'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import fieldStyles from '../../components/Field.module.css'
import { useAuth } from '../../hooks/useAuth'
import { getBrowserTimezone } from '../../utils/timezone'
import styles from './Onboarding.module.css'
import { timeIn, timezoneOptions, zoneLabel } from './timezones'

export interface TimezoneStepProps {
  /** Move focus to the heading (when the user comes back to this step). */
  focusHeading: boolean
  /** Called after the time zone is saved (or was already right). */
  onDone: () => void
}

/**
 * Onboarding step 1: confirm the time zone. It decides when "today" starts and
 * ends, so streaks are counted on the right days. Pre-filled with the zone saved
 * at sign-up (the device's); saved with PATCH /api/auth/me/ only if changed.
 *
 * Accessibility: a native `<select>` (type a letter to jump, e.g. "As" for Asia);
 * the local time there is shown so users can check it at a glance.
 */
export default function TimezoneStep({ focusHeading, onDone }: TimezoneStepProps) {
  const { user, updateUser } = useAuth()
  const saved = user?.timezone ?? getBrowserTimezone()
  const [zone, setZone] = useState(saved)
  const [saving, setSaving] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const selectId = useId()
  const [zones] = useState(() => timezoneOptions([saved, getBrowserTimezone()]))
  const now = timeIn(zone)

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setFieldError(null)
    setFormError(null)
    if (zone === saved) {
      onDone()
      return
    }
    setSaving(true)
    try {
      await updateUser({ timezone: zone })
      onDone()
    } catch (error) {
      const { fields, message } = parseApiError(error)
      if (fields.timezone) setFieldError(fields.timezone)
      else setFormError(message ?? Object.values(fields)[0] ?? null)
      setSaving(false)
    }
  }

  const describedBy = [`${selectId}-hint`, fieldError ? `${selectId}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
        Confirm your time zone
      </h1>
      <p className={styles.intro}>
        Your day starts and ends at midnight here, so streaks are counted on the right days.
      </p>

      {formError && <Alert>{formError}</Alert>}

      <div className={fieldStyles.field}>
        <label htmlFor={selectId} className={fieldStyles.label}>
          Time zone
        </label>
        <select
          id={selectId}
          className={styles.select}
          value={zone}
          aria-invalid={fieldError ? true : undefined}
          aria-describedby={describedBy}
          onChange={(event) => setZone(event.target.value)}
        >
          {zones.map((option) => (
            <option key={option} value={option}>
              {zoneLabel(option)}
            </option>
          ))}
        </select>
        <p id={`${selectId}-hint`} className={fieldStyles.hint}>
          {now ? `It's ${now} there now.` : null} We guessed this from your device.
        </p>
        {fieldError && (
          <p id={`${selectId}-error`} className={fieldStyles.error}>
            {fieldError}
          </p>
        )}
      </div>

      <Button type="submit" fullWidth loading={saving} loadingText="Saving…">
        Continue
      </Button>
    </form>
  )
}
