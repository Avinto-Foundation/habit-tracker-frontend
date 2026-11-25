import { CircleAlert } from 'lucide-react'
import { useId, useMemo } from 'react'
import { timeIn, timezoneOptions, zoneLabel } from '../features/onboarding/timezones'
import { getBrowserTimezone } from '../utils/timezone'
import styles from './Field.module.css'

export interface TimezoneSelectProps {
  /** The chosen zone, e.g. "Asia/Kathmandu". */
  value: string
  onChange: (zone: string) => void
  label?: string
  /** Extra help after "It's 2:30 pm there now.", e.g. "We guessed this from your device." */
  hint?: string
  error?: string
  name?: string
  onBlur?: () => void
}

/**
 * A labelled list of every time zone, showing the current time in the chosen one
 * so people can check at a glance that it's right.
 *
 * Accessibility: a native `<select>` (type letters to jump, e.g. "As" for Asia);
 * the hint and any error are linked with `aria-describedby`.
 */
export default function TimezoneSelect({
  value,
  onChange,
  label = 'Time zone',
  hint,
  error,
  name,
  onBlur,
}: TimezoneSelectProps) {
  const id = useId()
  // The saved zone and the device's zone are always offered, even when the
  // browser's own list uses an older name for them.
  const zones = useMemo(() => timezoneOptions([value, getBrowserTimezone()]), [value])
  const now = timeIn(value)
  const hintText = [now ? `It's ${now} there now.` : null, hint].filter(Boolean).join(' ')
  const describedBy = [hintText ? `${id}-hint` : null, error ? `${id}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={styles.field}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        className={error ? `${styles.select} ${styles.selectInvalid}` : styles.select}
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
      >
        {zones.map((zone) => (
          <option key={zone} value={zone}>
            {zoneLabel(zone)}
          </option>
        ))}
      </select>
      {hintText && (
        <p id={`${id}-hint`} className={styles.hint}>
          {hintText}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className={styles.error}>
          <CircleAlert className={styles.errorIcon} size={16} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
