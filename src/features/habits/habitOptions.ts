import type { Habit } from '../../api/types'

/** A choice in the icon or colour picker. `label` is what screen readers say. */
export interface Option {
  value: string
  label: string
}

/** Emoji icons to pick from. The first one is the default (same as the backend's). */
export const ICONS: Option[] = [
  { value: '✅', label: 'Check mark' },
  { value: '📚', label: 'Books' },
  { value: '🏃', label: 'Running' },
  { value: '💧', label: 'Water' },
  { value: '🧘', label: 'Meditation' },
  { value: '🥗', label: 'Salad' },
  { value: '😴', label: 'Sleep' },
  { value: '✍️', label: 'Writing' },
  { value: '🎸', label: 'Guitar' },
  { value: '💪', label: 'Strength' },
  { value: '🧹', label: 'Cleaning' },
  { value: '💊', label: 'Medicine' },
]

/**
 * Colours to pick from. All are dark enough for white text and 3:1 against the
 * white page (WCAG). Capitals because the backend saves colours in capitals,
 * so an edited habit's colour matches its option. The first one is the default.
 */
export const COLORS: Option[] = [
  { value: '#0F766E', label: 'Teal' },
  { value: '#1D4ED8', label: 'Blue' },
  { value: '#6D28D9', label: 'Purple' },
  { value: '#BE185D', label: 'Pink' },
  { value: '#B91C1C', label: 'Red' },
  { value: '#C2410C', label: 'Orange' },
  { value: '#A16207', label: 'Amber' },
  { value: '#15803D', label: 'Green' },
  { value: '#475569', label: 'Slate' },
]

/** Days of the week in the backend's numbering (0 = Monday … 6 = Sunday). */
export const WEEKDAYS = [
  { value: 0, short: 'Mon', label: 'Monday' },
  { value: 1, short: 'Tue', label: 'Tuesday' },
  { value: 2, short: 'Wed', label: 'Wednesday' },
  { value: 3, short: 'Thu', label: 'Thursday' },
  { value: 4, short: 'Fri', label: 'Friday' },
  { value: 5, short: 'Sat', label: 'Saturday' },
  { value: 6, short: 'Sun', label: 'Sunday' },
] as const

/**
 * Options for a picker, plus the habit's current value if it isn't one of them
 * (e.g. an emoji set in Django admin), so editing never loses it.
 */
export function withCurrent(options: Option[], current: string | undefined): Option[] {
  if (!current || options.some((option) => option.value === current)) return options
  return [...options, { value: current, label: `Current (${current})` }]
}

/** A short description of a habit's schedule, e.g. "Mon, Wed, Fri" or "3 times a week". */
export function scheduleLabel(habit: Pick<Habit, 'schedule_type' | 'weekdays' | 'times_per_week'>) {
  switch (habit.schedule_type) {
    case 'daily':
      return 'Every day'
    case 'weekdays':
      if (habit.weekdays.length === 7) return 'Every day'
      if (habit.weekdays.join() === '0,1,2,3,4') return 'Weekdays'
      if (habit.weekdays.join() === '5,6') return 'Weekends'
      return habit.weekdays.map((day) => WEEKDAYS[day]?.short).join(', ')
    case 'times_per_week': {
      const times = habit.times_per_week ?? 1
      return times === 1 ? 'Once a week' : `${times} times a week`
    }
  }
}
