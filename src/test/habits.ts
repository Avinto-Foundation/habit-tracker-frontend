import { http, HttpResponse } from 'msw'
import type { Habit, Today, TodayHabit } from '../api/types'
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

/** One habit on the Today page. Pass fields to change. */
export function makeTodayHabit(
  habit: Partial<Habit> = {},
  overrides: Partial<TodayHabit> = {},
): TodayHabit {
  return {
    habit: makeHabit(habit),
    done_today: false,
    checkin: null,
    current_streak: 0,
    streak_unit: 'days',
    week_progress: null,
    ...overrides,
  }
}

/** A Today response; the "X of Y done" count is worked out from `due`. */
export function makeToday(due: TodayHabit[], notDue: TodayHabit[] = []): Today {
  return {
    date: '2026-11-20',
    summary: { done: due.filter((entry) => entry.done_today).length, total: due.length },
    due,
    not_due: notDue,
  }
}

/** Fake GET /habits/today/ answering with `today`. */
export function fakeToday(today: Today) {
  server.use(http.get(apiUrl('/habits/today/'), () => HttpResponse.json(today)))
}
