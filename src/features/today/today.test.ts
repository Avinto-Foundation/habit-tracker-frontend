import { describe, expect, it } from 'vitest'
import { makeToday, makeTodayHabit } from '../../test/habits'
import { formatDay, greeting, streakText } from './greeting'
import { withDone } from './todayState'

describe('greeting', () => {
  // 20 Nov 2026 in UTC; Kathmandu is UTC+5:45.
  it.each([
    ['2026-11-20T00:30:00Z', 'UTC', 'Good morning'],
    ['2026-11-20T11:59:00Z', 'UTC', 'Good morning'],
    ['2026-11-20T12:00:00Z', 'UTC', 'Good afternoon'],
    ['2026-11-20T17:59:00Z', 'UTC', 'Good afternoon'],
    ['2026-11-20T18:00:00Z', 'UTC', 'Good evening'],
    ['2026-11-20T23:00:00Z', 'UTC', 'Good evening'],
    ['2026-11-20T06:30:00Z', 'Asia/Kathmandu', 'Good afternoon'], // 12:15 there
    ['2026-11-20T20:00:00Z', 'Asia/Kathmandu', 'Good morning'], // 01:45 next day there
  ])('at %s in %s says "%s"', (time, timeZone, expected) => {
    expect(greeting(new Date(time), timeZone)).toBe(expected)
  })

  it("uses the computer's clock for an unknown time zone instead of crashing", () => {
    expect(greeting(new Date(), 'Not/AZone')).toMatch(/^Good (morning|afternoon|evening)$/)
  })
})

describe('formatDay', () => {
  it('writes the day in words and never shifts it', () => {
    expect(formatDay('2026-11-20')).toBe('Friday, 20 November')
    expect(formatDay('2027-01-01')).toBe('Friday, 1 January')
  })
})

describe('streakText', () => {
  it.each([
    [1, 'days', '1 day'],
    [5, 'days', '5 days'],
    [1, 'weeks', '1 week'],
    [3, 'weeks', '3 weeks'],
  ] as const)('%i %s → "%s"', (count, unit, text) => {
    expect(streakText(count, unit)).toBe(text)
  })
})

describe('withDone', () => {
  const today = makeToday(
    [makeTodayHabit({ id: 1 }), makeTodayHabit({ id: 2 }, { done_today: true })],
    [makeTodayHabit({ id: 3 })],
  )

  it('marks a due habit done and counts again', () => {
    const next = withDone(today, 1, true)

    expect(next.due[0].done_today).toBe(true)
    expect(next.summary).toEqual({ done: 2, total: 2 })
  })

  it('marks a habit not done and clears its check-in', () => {
    const next = withDone(today, 2, false)

    expect(next.due[1]).toMatchObject({ done_today: false, checkin: null })
    expect(next.summary).toEqual({ done: 0, total: 2 })
  })

  it('a bonus habit (not due) does not change the count', () => {
    const next = withDone(today, 3, true)

    expect(next.not_due[0].done_today).toBe(true)
    expect(next.summary).toEqual({ done: 1, total: 2 })
  })

  it('does not change the original', () => {
    withDone(today, 1, true)

    expect(today.due[0].done_today).toBe(false)
  })
})
