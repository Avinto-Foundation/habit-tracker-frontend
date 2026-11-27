import { http, HttpResponse } from 'msw'
import type { CalendarDay, CheckIn, Habit, HabitStats, Today, TodayHabit } from '../api/types'
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
    visibility: 'friends',
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

/** Stats for a habit page (calendar for November 2026, today = 20 Nov). */
export function makeStats(overrides: Partial<HabitStats> = {}): HabitStats {
  const days: CalendarDay[] = Array.from({ length: 30 }, (_, i) => {
    const day = i + 1
    const date = `2026-11-${String(day).padStart(2, '0')}`
    const status: CalendarDay['status'] =
      day < 10 ? 'before_start' : day === 20 ? 'pending' : day > 20 ? 'future' : 'done'
    return { date, status }
  })
  return {
    habit: 1,
    today: '2026-11-20',
    current_streak: 10,
    longest_streak: 10,
    streak_unit: 'days',
    completion_rate: 100,
    total_checkins: 10,
    done_today: false,
    week_progress: null,
    calendar: { month: '2026-11', days },
    ...overrides,
  }
}

/** A check-in as the backend sends it. */
export function makeCheckIn(habitId: number, date: string, note = ''): CheckIn {
  return { id: Number(date.replaceAll('-', '')), habit: habitId, date, note, created_at: '' }
}

/**
 * Fake everything a habit's page loads: the habit, its stats (any month) and
 * yesterday/today's check-ins.
 */
export function fakeHabitPage(
  habit: Habit,
  stats: HabitStats = makeStats({ habit: habit.id }),
  recent: CheckIn[] = [],
) {
  server.use(
    http.get(apiUrl(`/habits/${habit.id}/`), () => HttpResponse.json(habit)),
    http.get(apiUrl(`/habits/${habit.id}/stats/`), () => HttpResponse.json(stats)),
    http.get(apiUrl(`/habits/${habit.id}/checkins/`), () => HttpResponse.json(recent)),
  )
}
