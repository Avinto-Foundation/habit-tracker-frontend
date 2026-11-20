import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { parseApiError } from '../../api/errors'
import type { HabitInput } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import LinkButton from '../../components/LinkButton'
import TextField from '../../components/TextField'
import styles from './HabitForm.module.css'
import { COLORS, ICONS, WEEKDAYS, withCurrent } from './habitOptions'
import { habitSchema, toHabitInput, type HabitFormValues } from './habitSchema'

/** Backend fields we can show an error under. Anything else goes in the alert. */
const FORM_FIELDS = [
  'name',
  'target',
  'icon',
  'color',
  'schedule_type',
  'weekdays',
  'times_per_week',
] as const
type FormField = (typeof FORM_FIELDS)[number]

const SCHEDULES = [
  { value: 'daily', label: 'Every day', hint: 'Due every day' },
  { value: 'weekdays', label: 'Specific days', hint: 'e.g. Mon, Wed, Fri' },
  { value: 'times_per_week', label: 'Times per week', hint: 'Any days, e.g. 3 times a week' },
] as const

export interface HabitFormProps {
  /** Starting values: `EMPTY_HABIT_FORM` for a new habit, or the saved habit's. */
  initialValues: HabitFormValues
  /** Text on the save button, e.g. "Create habit". */
  submitLabel: string
  /** Text on the save button while saving, e.g. "Creating…". */
  submittingText: string
  /** Saves the habit. Throw the API error and the form shows it. */
  onSubmit: (data: HabitInput) => Promise<void>
  /** Where "Cancel" goes. */
  cancelTo: string
}

/** An error message under a group of choices; `id` links it to the group. */
function GroupError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} className={styles.error}>
      <CircleAlert size={16} aria-hidden="true" />
      {message}
    </p>
  )
}

/**
 * The create / edit habit form: name, optional target, icon, colour and schedule.
 *
 * Checks the form in the browser first, then calls `onSubmit` with API-ready data.
 * Backend errors appear under the right field and focus moves to the first one.
 *
 * Accessibility: each group of choices is a `<fieldset>` with a `<legend>`; the icon,
 * colour and schedule choices are real radio buttons (arrow keys move between them)
 * and the days are real checkboxes, so they work with a keyboard and screen readers.
 * Each choice has a name ("Books", "Teal", "Monday") so meaning isn't by look only.
 */
export default function HabitForm({
  initialValues,
  submitLabel,
  submittingText,
  onSubmit,
  cancelTo,
}: HabitFormProps) {
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<HabitFormValues>({
    resolver: zodResolver(habitSchema),
    defaultValues: initialValues,
  })

  const scheduleType = useWatch({ control, name: 'schedule_type' })
  const icons = withCurrent(ICONS, initialValues.icon)
  const colors = withCurrent(COLORS, initialValues.color)

  const submit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await onSubmit(toHabitInput(values))
    } catch (error) {
      const { fields, message } = parseApiError(error)
      const fieldErrors = Object.entries(fields).filter(([name]) =>
        FORM_FIELDS.includes(name as FormField),
      )
      fieldErrors.forEach(([name, text], index) =>
        setError(name as FormField, { message: text }, { shouldFocus: index === 0 }),
      )
      const otherErrors = Object.entries(fields)
        .filter(([name]) => !FORM_FIELDS.includes(name as FormField))
        .map(([, text]) => text)
      setFormError(message ?? otherErrors[0] ?? null)
    }
  })

  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      {formError && <Alert>{formError}</Alert>}

      <TextField
        label="Name"
        placeholder="e.g. Read"
        autoComplete="off"
        maxLength={80}
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Target (optional)"
        hint='Shown with the habit, e.g. "20 pages" or "10 minutes"'
        autoComplete="off"
        maxLength={80}
        error={errors.target?.message}
        {...register('target')}
      />

      <fieldset
        className={styles.group}
        aria-describedby={errors.icon ? 'habit-icon-error' : undefined}
      >
        <legend className={styles.legend}>Icon</legend>
        <div className={styles.choices}>
          {icons.map((icon) => (
            <label key={icon.value} className={styles.iconChoice}>
              <input
                type="radio"
                value={icon.value}
                aria-label={icon.label}
                className="sr-only"
                {...register('icon')}
              />
              <span aria-hidden="true">{icon.value}</span>
            </label>
          ))}
        </div>
        <GroupError id="habit-icon-error" message={errors.icon?.message} />
      </fieldset>

      <fieldset
        className={styles.group}
        aria-describedby={errors.color ? 'habit-color-error' : undefined}
      >
        <legend className={styles.legend}>Colour</legend>
        <div className={styles.choices}>
          {colors.map((color) => (
            <label key={color.value} className={styles.colorChoice}>
              <input
                type="radio"
                value={color.value}
                aria-label={color.label}
                className="sr-only"
                {...register('color')}
              />
              <span
                className={styles.swatch}
                style={{ backgroundColor: color.value }}
                aria-hidden="true"
              />
            </label>
          ))}
        </div>
        <GroupError id="habit-color-error" message={errors.color?.message} />
      </fieldset>

      <fieldset
        className={styles.group}
        aria-describedby={errors.schedule_type ? 'habit-schedule-error' : undefined}
      >
        <legend className={styles.legend}>How often?</legend>
        <div className={styles.schedules}>
          {SCHEDULES.map((schedule) => (
            <label key={schedule.value} className={styles.scheduleChoice}>
              <input
                type="radio"
                value={schedule.value}
                className={styles.radio}
                aria-labelledby={`habit-schedule-${schedule.value}-label`}
                aria-describedby={`habit-schedule-${schedule.value}-hint`}
                {...register('schedule_type')}
              />
              <span>
                <span
                  id={`habit-schedule-${schedule.value}-label`}
                  className={styles.scheduleLabel}
                >
                  {schedule.label}
                </span>
                <span id={`habit-schedule-${schedule.value}-hint`} className={styles.hint}>
                  {schedule.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
        <GroupError id="habit-schedule-error" message={errors.schedule_type?.message} />
      </fieldset>

      {scheduleType === 'weekdays' && (
        <fieldset
          className={styles.group}
          aria-describedby={errors.weekdays ? 'habit-weekdays-error' : undefined}
        >
          <legend className={styles.legend}>Which days?</legend>
          <div className={styles.choices}>
            {WEEKDAYS.map((day) => (
              <label key={day.value} className={styles.dayChoice}>
                <input
                  type="checkbox"
                  value={String(day.value)}
                  aria-label={day.label}
                  className="sr-only"
                  {...register('weekdays')}
                />
                <span aria-hidden="true">{day.short}</span>
              </label>
            ))}
          </div>
          <GroupError id="habit-weekdays-error" message={errors.weekdays?.message} />
        </fieldset>
      )}

      {scheduleType === 'times_per_week' && (
        <div className={styles.group}>
          <label htmlFor="habit-times-per-week" className={styles.legend}>
            How many times a week?
          </label>
          <select
            id="habit-times-per-week"
            className={styles.select}
            aria-invalid={errors.times_per_week ? true : undefined}
            aria-describedby={errors.times_per_week ? 'habit-times-error' : undefined}
            {...register('times_per_week')}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((times) => (
              <option key={times} value={String(times)}>
                {times === 1 ? 'Once a week' : `${times} times a week`}
              </option>
            ))}
          </select>
          <GroupError id="habit-times-error" message={errors.times_per_week?.message} />
        </div>
      )}

      <div className={styles.actions}>
        <Button type="submit" loading={isSubmitting} loadingText={submittingText}>
          {submitLabel}
        </Button>
        <LinkButton to={cancelTo} variant="secondary">
          Cancel
        </LinkButton>
      </div>
    </form>
  )
}
