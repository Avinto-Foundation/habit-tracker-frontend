import { z } from 'zod'
import type { Habit, HabitInput } from '../../api/types'
import { COLORS, ICONS } from './habitOptions'

/**
 * Rules for the create/edit habit form, checked in the browser first. They match
 * the backend's rules; the backend checks everything again and its errors are
 * shown under the same fields (field names match the backend's).
 *
 * Checkboxes and the select give strings, so `weekdays` is a list of strings
 * ("0" … "6") and `times_per_week` a string ("1" … "7") while the user types;
 * `toHabitInput()` turns them into numbers for the API.
 */
export const habitSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Give your habit a name.')
      .max(80, 'Use 80 characters or fewer.'),
    target: z.string().trim().max(80, 'Use 80 characters or fewer.'),
    icon: z.string().min(1, 'Choose an icon.'),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Choose a colour.'),
    schedule_type: z.enum(['daily', 'weekdays', 'times_per_week'], 'Choose how often.'),
    weekdays: z.array(z.string()),
    times_per_week: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.schedule_type === 'weekdays' && values.weekdays.length === 0) {
      ctx.addIssue({ code: 'custom', path: ['weekdays'], message: 'Pick at least one day.' })
    }
    if (values.schedule_type === 'times_per_week') {
      const times = Number(values.times_per_week)
      if (!Number.isInteger(times) || times < 1 || times > 7) {
        ctx.addIssue({
          code: 'custom',
          path: ['times_per_week'],
          message: 'How many times a week? Choose 1 to 7.',
        })
      }
    }
  })

/** What the form holds while the user types. */
export type HabitFormValues = z.input<typeof habitSchema>

/** A blank form: default icon and colour, every day, "3 times a week" ready if picked. */
export const EMPTY_HABIT_FORM: HabitFormValues = {
  name: '',
  target: '',
  icon: ICONS[0].value,
  color: COLORS[0].value,
  schedule_type: 'daily',
  weekdays: [],
  times_per_week: '3',
}

/** Fill the form from a saved habit (for editing). */
export function habitToFormValues(habit: Habit): HabitFormValues {
  return {
    name: habit.name,
    target: habit.target,
    icon: habit.icon,
    color: habit.color.toUpperCase(),
    schedule_type: habit.schedule_type,
    weekdays: habit.weekdays.map(String),
    times_per_week: String(habit.times_per_week ?? 3),
  }
}

/**
 * Turn the checked form into what the API expects. Only the chosen schedule's
 * details are sent: days for "specific days", a number for "times per week".
 */
export function toHabitInput(values: HabitFormValues): HabitInput {
  const type = values.schedule_type
  return {
    name: values.name.trim(),
    target: values.target.trim(),
    icon: values.icon,
    color: values.color,
    schedule_type: type,
    weekdays: type === 'weekdays' ? values.weekdays.map(Number).sort((a, b) => a - b) : [],
    times_per_week: type === 'times_per_week' ? Number(values.times_per_week) : null,
  }
}
