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

/** GET /habits/<id>/checkins/: check-ins, oldest first, optionally from/to (inclusive). */
export async function listCheckIns(
  habitId: number,
  range: { from?: string; to?: string } = {},
): Promise<CheckIn[]> {
  const response = await api.get<CheckIn[]>(`/habits/${habitId}/checkins/`, { params: range })
  return response.data
}

/** PATCH /habits/<id>/checkins/<date>/: change a check-in's note (empty string removes it). */
export async function updateCheckInNote(
  habitId: number,
  date: string,
  note: string,
): Promise<CheckIn> {
  const response = await api.patch<CheckIn>(`/habits/${habitId}/checkins/${date}/`, { note })
  return response.data
}
