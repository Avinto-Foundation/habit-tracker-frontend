import { describe, expect, it } from 'vitest'
import {
  addDays,
  addMonths,
  formatDayMonth,
  formatMonth,
  localDate,
  monthOf,
  weekdayIndex,
} from './dates'

describe('date helpers', () => {
  it('addDays() crosses months and years', () => {
    expect(addDays('2026-11-20', -1)).toBe('2026-11-19')
    expect(addDays('2026-12-01', -1)).toBe('2026-11-30')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })

  it('monthOf() and addMonths() work with YYYY-MM', () => {
    expect(monthOf('2026-11-20')).toBe('2026-11')
    expect(addMonths('2026-11', -1)).toBe('2026-10')
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2027-01', -1)).toBe('2026-12')
  })

  it('formats months and days in words', () => {
    expect(formatMonth('2026-11')).toBe('November 2026')
    expect(formatDayMonth('2026-11-05')).toBe('5 November')
  })

  it('weekdayIndex() counts from Monday = 0', () => {
    expect(weekdayIndex('2026-11-16')).toBe(0) // Monday
    expect(weekdayIndex('2026-11-20')).toBe(4) // Friday
    expect(weekdayIndex('2026-11-22')).toBe(6) // Sunday
  })

  it("localDate() gives the day in the user's time zone", () => {
    // 20:00 UTC on the 19th is already 01:45 on the 20th in Kathmandu (UTC+5:45).
    expect(localDate('2026-11-19T20:00:00Z', 'Asia/Kathmandu')).toBe('2026-11-20')
    expect(localDate('2026-11-19T20:00:00Z', 'UTC')).toBe('2026-11-19')
    expect(localDate('2026-11-19T20:00:00Z', 'Not/AZone')).toBe('2026-11-19')
  })
})
