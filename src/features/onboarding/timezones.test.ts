import { describe, expect, it } from 'vitest'
import { SUGGESTIONS } from './suggestions'
import { timeIn, timezoneOptions, zoneLabel } from './timezones'

describe('timezoneOptions', () => {
  it('lists zones sorted, with UTC and the extras added once', () => {
    const zones = timezoneOptions(['Asia/Kathmandu', 'Asia/Kathmandu', ''])

    expect(zones).toContain('UTC')
    expect(zones).toContain('Europe/London')
    expect(zones.filter((zone) => zone === 'Asia/Kathmandu')).toHaveLength(1)
    expect(zones).not.toContain('')
    expect([...zones].sort((a, b) => a.localeCompare(b))).toEqual(zones)
  })
})

describe('zoneLabel', () => {
  it('makes zone names readable', () => {
    expect(zoneLabel('America/New_York')).toBe('America / New York')
    expect(zoneLabel('UTC')).toBe('UTC')
  })
})

describe('timeIn', () => {
  it('gives the time in that zone', () => {
    const noonUtc = new Date('2026-11-20T12:00:00Z')

    expect(timeIn('UTC', noonUtc)).toBe('12:00 pm')
    expect(timeIn('Asia/Kathmandu', noonUtc)).toBe('5:45 pm')
  })

  it('gives null for an unknown zone', () => {
    expect(timeIn('Not/AZone')).toBeNull()
  })
})

describe('SUGGESTIONS', () => {
  it('are all valid daily habits', () => {
    for (const habit of SUGGESTIONS) {
      expect(habit).toMatchObject({ schedule_type: 'daily', weekdays: [], times_per_week: null })
      expect(habit.color).toMatch(/^#[0-9A-F]{6}$/)
      expect(habit.name.length).toBeLessThanOrEqual(80)
    }
  })
})
