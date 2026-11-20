import { api } from './client'
import type { Habit, HabitInput, HabitStats, HabitUpdate, Today } from './types'

/** One function per backend habits endpoint. They return the response data or throw. */

/**
 * GET /habits/: my habits, oldest first. Active habits by default;
 * `{ archived: true }` gives only the archived ones.
 */
export async function listHabits({ archived = false } = {}): Promise<Habit[]> {
  const response = await api.get<Habit[]>('/habits/', {
    params: archived ? { archived: 'true' } : undefined,
  })
  return response.data
}

/** GET /habits/<id>/: one of my habits (404 if it doesn't exist or isn't mine). */
export async function getHabit(id: number): Promise<Habit> {
  const response = await api.get<Habit>(`/habits/${id}/`)
  return response.data
}

/** POST /habits/: create a habit. */
export async function createHabit(data: HabitInput): Promise<Habit> {
  const response = await api.post<Habit>('/habits/', data)
  return response.data
}

/** PATCH /habits/<id>/: change some fields, e.g. `{ archived: true }` to archive it. */
export async function updateHabit(id: number, data: HabitUpdate): Promise<Habit> {
  const response = await api.patch<Habit>(`/habits/${id}/`, data)
  return response.data
}

/** DELETE /habits/<id>/: delete a habit and all its check-ins for good. */
export async function deleteHabit(id: number): Promise<void> {
  await api.delete(`/habits/${id}/`)
}

/** GET /habits/today/: today's habits (due and not due), progress and streaks. */
export async function getToday(): Promise<Today> {
  const response = await api.get<Today>('/habits/today/')
  return response.data
}

/** GET /habits/<id>/stats/: streaks and progress, plus a calendar for `month` (YYYY-MM). */
export async function getHabitStats(id: number, month?: string): Promise<HabitStats> {
  const response = await api.get<HabitStats>(`/habits/${id}/stats/`, {
    params: month ? { month } : undefined,
  })
  return response.data
}
