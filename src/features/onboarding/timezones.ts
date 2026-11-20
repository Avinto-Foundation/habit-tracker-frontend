/**
 * Every time zone the browser knows (e.g. "Asia/Kathmandu"), sorted, plus any
 * zones in `extra` that are missing from it. Browsers use some old names (their
 * list has "Asia/Katmandu" but reports "Asia/Kathmandu" as the device's zone, and
 * leaves out "UTC"), so the user's saved and detected zones are always added.
 */
export function timezoneOptions(extra: string[] = []): string[] {
  let zones: string[] = []
  try {
    zones = Intl.supportedValuesOf('timeZone')
  } catch {
    // Very old browser: just offer the extras.
  }
  return [...new Set([...zones, 'UTC', ...extra.filter(Boolean)])].sort((a, b) =>
    a.localeCompare(b),
  )
}

/** A zone name as people read it: "America/New_York" → "America / New York". */
export function zoneLabel(zone: string): string {
  return zone.replaceAll('_', ' ').replaceAll('/', ' / ')
}

/** The time right now in a zone, e.g. "2:30 pm", so people can check it's right. */
export function timeIn(timeZone: string, now: Date = new Date()): string | null {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone,
    }).format(now)
  } catch {
    return null
  }
}
