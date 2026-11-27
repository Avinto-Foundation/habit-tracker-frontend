import { describe, expect, it } from 'vitest'
import { makeHabit } from '../../test/habits'
import { COLORS, ICONS, scheduleLabel, withCurrent } from './habitOptions'
import {
  EMPTY_HABIT_FORM,
  habitSchema,
  habitToFormValues,
  toHabitInput,
  type HabitFormValues,
} from './habitSchema'

function errorsFor(values: Partial<HabitFormValues>) {
  const result = habitSchema.safeParse({ ...EMPTY_HABIT_FORM, name: 'Read', ...values })
  if (result.success) return {}
  return Object.fromEntries(result.error.issues.map((issue) => [issue.path[0], issue.message]))
}

describe('habitSchema', () => {
  it('accepts a simple daily habit', () => {
    expect(errorsFor({})).toEqual({})
  })

  it.each([
    [{ name: '' }, 'name', 'Give your habit a name.'],
    [{ name: '   ' }, 'name', 'Give your habit a name.'],
    [{ name: 'x'.repeat(81) }, 'name', 'Use 80 characters or fewer.'],
    [{ target: 'x'.repeat(81) }, 'target', 'Use 80 characters or fewer.'],
    [{ color: 'red' }, 'color', 'Choose a colour.'],
    [{ schedule_type: 'weekdays', weekdays: [] }, 'weekdays', 'Pick at least one day.'],
    [
      { schedule_type: 'times_per_week', times_per_week: '9' },
      'times_per_week',
      'How many times a week? Choose 1 to 7.',
    ],
  ] as const)('rejects %o', (values, field, message) => {
    expect(errorsFor(values as Partial<HabitFormValues>)).toMatchObject({ [field]: message })
  })

  it('ignores days and times that the chosen schedule does not use', () => {
    expect(errorsFor({ schedule_type: 'daily', weekdays: [], times_per_week: '0' })).toEqual({})
  })
})

describe('toHabitInput', () => {
  it('trims text and sends sorted day numbers for "specific days"', () => {
    const input = toHabitInput({
      ...EMPTY_HABIT_FORM,
      name: '  Read ',
      target: ' 20 pages ',
      schedule_type: 'weekdays',
      weekdays: ['4', '0', '2'],
    })

    expect(input).toMatchObject({
      name: 'Read',
      target: '20 pages',
      schedule_type: 'weekdays',
      weekdays: [0, 2, 4],
      times_per_week: null,
    })
  })

  it('sends a number for "times per week" and no days', () => {
    const input = toHabitInput({
      ...EMPTY_HABIT_FORM,
      name: 'Gym',
      schedule_type: 'times_per_week',
      weekdays: ['1'],
      times_per_week: '3',
    })

    expect(input).toMatchObject({ weekdays: [], times_per_week: 3 })
  })

  it('sends no days or times for "every day"', () => {
    const input = toHabitInput({ ...EMPTY_HABIT_FORM, name: 'Walk', weekdays: ['1'] })

    expect(input).toMatchObject({ schedule_type: 'daily', weekdays: [], times_per_week: null })
  })
})

describe('habitToFormValues', () => {
  it('turns a saved habit into form values (strings for days and times)', () => {
    const habit = makeHabit({ schedule_type: 'weekdays', weekdays: [1, 3], color: '#1d4ed8' })

    expect(habitToFormValues(habit)).toEqual({
      name: 'Read',
      target: '20 pages',
      icon: '📚',
      color: '#1D4ED8',
      schedule_type: 'weekdays',
      weekdays: ['1', '3'],
      times_per_week: '3',
      visibility: 'friends',
    })
  })
})

describe('habitOptions', () => {
  it.each([
    [{ schedule_type: 'daily', weekdays: [], times_per_week: null }, 'Every day'],
    [{ schedule_type: 'weekdays', weekdays: [0, 2, 4], times_per_week: null }, 'Mon, Wed, Fri'],
    [{ schedule_type: 'weekdays', weekdays: [0, 1, 2, 3, 4], times_per_week: null }, 'Weekdays'],
    [{ schedule_type: 'weekdays', weekdays: [5, 6], times_per_week: null }, 'Weekends'],
    [{ schedule_type: 'times_per_week', weekdays: [], times_per_week: 1 }, 'Once a week'],
    [{ schedule_type: 'times_per_week', weekdays: [], times_per_week: 3 }, '3 times a week'],
  ] as const)('scheduleLabel(%o) is "%s"', (habit, label) => {
    expect(scheduleLabel({ ...habit, weekdays: [...habit.weekdays] })).toBe(label)
  })

  it('withCurrent() keeps a saved value that is not one of the options', () => {
    expect(withCurrent(ICONS, '🦄').at(-1)).toEqual({ value: '🦄', label: 'Current (🦄)' })
    expect(withCurrent(COLORS, COLORS[2].value)).toBe(COLORS)
  })
})
