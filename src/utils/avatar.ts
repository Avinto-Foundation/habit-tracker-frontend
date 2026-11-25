/**
 * Helpers for showing a person without a profile photo: their initials on a
 * coloured circle. The colour comes from the username, so the same person always
 * gets the same colour.
 */

/** Dark enough for white letters (contrast at least 4.5:1, WCAG AA). */
export const AVATAR_COLORS = [
  '#0F766E', // teal
  '#1D4ED8', // blue
  '#6D28D9', // purple
  '#BE185D', // pink
  '#B91C1C', // red
  '#C2410C', // orange
  '#15803D', // green
  '#475569', // slate
] as const

/** "Sam Adhikari" → "SA", "sam" → "S", "" → "?". */
export function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return '?'
  const first = words[0][0]
  const last = words.length > 1 ? words[words.length - 1][0] : ''
  return (first + last).toUpperCase()
}

/** The same colour every time for the same username. */
export function avatarColor(username: string): string {
  let hash = 0
  for (const char of username) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}
