import type { HabitInput } from '../../api/types'

/**
 * Ready-made first habits: small, daily and easy to start (one tap creates it).
 * Users can change any of them later on the habit's Edit page.
 */
export const SUGGESTIONS: HabitInput[] = [
  { name: 'Read', target: '10 pages', icon: '📚', color: '#1D4ED8' },
  { name: 'Drink water', target: '8 glasses', icon: '💧', color: '#0F766E' },
  { name: 'Walk', target: '20 minutes', icon: '🏃', color: '#15803D' },
  { name: 'Meditate', target: '5 minutes', icon: '🧘', color: '#6D28D9' },
  { name: 'Sleep by 11 pm', target: '', icon: '😴', color: '#475569' },
  { name: 'Journal', target: '3 lines', icon: '✍️', color: '#BE185D' },
].map((habit): HabitInput => ({
  ...habit,
  schedule_type: 'daily',
  weekdays: [],
  times_per_week: null,
}))
