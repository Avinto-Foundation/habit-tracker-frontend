import type { Today } from '../../api/types'

/**
 * Today's data with one habit marked done or not done, and the "X of Y done"
 * count worked out again. Used to update the screen instantly when a check button
 * is tapped, before the server answers ("optimistic update"), and to put it back
 * if the server fails. Streaks are left alone: the page reloads them from the
 * server afterwards, because only the server knows the full history.
 */
export function withDone(today: Today, habitId: number, done: boolean): Today {
  const update = (entries: Today['due']) =>
    entries.map((entry) =>
      entry.habit.id === habitId
        ? { ...entry, done_today: done, checkin: done ? entry.checkin : null }
        : entry,
    )
  const due = update(today.due)
  return {
    ...today,
    due,
    not_due: update(today.not_due),
    summary: { done: due.filter((entry) => entry.done_today).length, total: due.length },
  }
}
