/**
 * The user's time zone from their browser/computer settings, e.g. "Asia/Kathmandu".
 * Falls back to "UTC" if the browser can't tell.
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}
