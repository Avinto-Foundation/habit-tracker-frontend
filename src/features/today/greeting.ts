/**
 * "Good morning" / "Good afternoon" / "Good evening" for the time `now` in the
 * user's time zone (their profile's, not the computer's): morning until 12:00,
 * afternoon until 18:00, then evening.
 */
export function greeting(now: Date, timeZone: string): string {
  let hour: number
  try {
    hour = Number(
      new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(now),
    )
  } catch {
    hour = now.getHours() // unknown time zone: use the computer's clock
  }
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * A day from the API (YYYY-MM-DD) as words, e.g. "Friday, 20 November".
 * The API already gives the day in the user's time zone, so it's read as a plain
 * date (UTC) and never shifted to the computer's time zone.
 */
export function formatDay(isoDate: string): string {
  // Built from parts: browsers disagree on the comma in en-GB ("Friday 20 November").
  const parts = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).formatToParts(new Date(`${isoDate}T00:00:00Z`))
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${part('weekday')}, ${part('day')} ${part('month')}`
}

/** "1 day" / "5 days" / "2 weeks". */
export function streakText(count: number, unit: 'days' | 'weeks'): string {
  const word = unit === 'weeks' ? 'week' : 'day'
  return `${count} ${word}${count === 1 ? '' : 's'}`
}
