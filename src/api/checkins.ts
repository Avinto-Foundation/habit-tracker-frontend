import { api } from './client'
import type { CheckIn } from './types'

/** One function per backend check-in endpoint. They return the response data or throw. */

/**
 * POST /habits/<id>/checkins/: mark a habit as done. Today by default; `date` can
 * be yesterday (YYYY-MM-DD). Checking in twice is safe: you get the same check-in.
 */
export async function checkIn(
  habitId: number,
  data: { date?: string; note?: string } = {},
): Promise<CheckIn> {
  const response = await api.post<CheckIn>(`/habits/${habitId}/checkins/`, data)
  return response.data
}

/** DELETE /habits/<id>/checkins/<date>/: undo a check-in (today or yesterday only). */
export async function undoCheckIn(habitId: number, date: string): Promise<void> {
  await api.delete(`/habits/${habitId}/checkins/${date}/`)
}
