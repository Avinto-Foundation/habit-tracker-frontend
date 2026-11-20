/**
 * Small helpers for the calendar dates the API uses: days as "YYYY-MM-DD" and
 * months as "YYYY-MM". They work on plain dates (UTC), so a day never shifts
 * because of the computer's time zone; the API already gives days in the user's
 * profile time zone.
 */

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`)
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/** The day `days` after `isoDate` (negative for before). */
export function addDays(isoDate: string, days: number): string {
  const date = toDate(isoDate)
  date.setUTCDate(date.getUTCDate() + days)
  return toIso(date)
}

/** The month a day is in: "2026-11-20" → "2026-11". */
export function monthOf(isoDate: string): string {
  return isoDate.slice(0, 7)
}

/** The month `months` after `month` (negative for before): "2026-12" + 1 → "2027-01". */
export function addMonths(month: string, months: number): string {
  const date = toDate(`${month}-01`)
  date.setUTCMonth(date.getUTCMonth() + months)
  return monthOf(toIso(date))
}

/** "2026-11" → "November 2026". */
export function formatMonth(month: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toDate(`${month}-01`))
}

/** "2026-11-20" → "20 November". */
export function formatDayMonth(isoDate: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(toDate(isoDate))
}

/** Day of the week with Monday = 0 … Sunday = 6 (like the backend). */
export function weekdayIndex(isoDate: string): number {
  return (toDate(isoDate).getUTCDay() + 6) % 7
}

/**
 * The calendar day of a moment (e.g. a habit's `created_at`) in a time zone:
 * "2026-11-19T20:00:00Z" in Asia/Kathmandu → "2026-11-20".
 */
export function localDate(isoDateTime: string, timeZone: string): string {
  try {
    // en-CA writes dates as YYYY-MM-DD.
    return new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(isoDateTime))
  } catch {
    return isoDateTime.slice(0, 10) // unknown time zone: use the UTC day
  }
}
