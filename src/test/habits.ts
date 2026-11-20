import { http, HttpResponse } from 'msw'
import type { Habit } from '../api/types'
import { apiUrl, server } from './server'

/** A sample habit as the backend would send it. Pass fields to change. */
export function makeHabit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 1,
    name: 'Read',
    target: '20 pages',
    icon: '📚',
    color: '#1D4ED8',
    schedule_type: 'daily',
    weekdays: [],
    times_per_week: null,
    archived: false,
    created_at: '2026-11-20T08:00:00Z',
    updated_at: '2026-11-20T08:00:00Z',
    ...overrides,
  }
}

/** Fake GET /habits/ answering with these habits. */
export function fakeHabitList(habits: Habit[]) {
  server.use(http.get(apiUrl('/habits/'), () => HttpResponse.json(habits)))
}
