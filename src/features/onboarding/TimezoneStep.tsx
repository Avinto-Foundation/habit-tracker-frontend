import { useEffect, useRef, useState } from 'react'
import { parseApiError } from '../../api/errors'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import TimezoneSelect from '../../components/TimezoneSelect'
import { useAuth } from '../../hooks/useAuth'
import { getBrowserTimezone } from '../../utils/timezone'
import styles from './Onboarding.module.css'

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
 */
export default function TimezoneStep({ focusHeading, onDone }: TimezoneStepProps) {
  const { user, updateUser } = useAuth()
  const saved = user?.timezone ?? getBrowserTimezone()
  const [zone, setZone] = useState(saved)
  const [saving, setSaving] = useState(false)
  const [fieldError, setFieldError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)

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

  return (
    <form onSubmit={handleSubmit} noValidate>
      <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
        Confirm your time zone
      </h1>
      <p className={styles.intro}>
        Your day starts and ends at midnight here, so streaks are counted on the right days.
      </p>

      {formError && <Alert>{formError}</Alert>}

      <TimezoneSelect
        value={zone}
        onChange={setZone}
        hint="We guessed this from your device."
        error={fieldError ?? undefined}
      />

      <Button type="submit" fullWidth loading={saving} loadingText="Saving…">
        Continue
      </Button>
    </form>
  )
}
