import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarDay, CalendarStatus } from '../../api/types'
import { formatDayMonth, formatMonth, weekdayIndex } from './dates'
import { STATUS_TEXT, WEEKDAYS } from './habitOptions'
import styles from './MonthCalendar.module.css'

/** A small mark per status, so the meaning isn't shown by colour alone. */
const MARK: Partial<Record<CalendarStatus, string>> = { done: '✓', bonus: '★', missed: '✕' }

/** Statuses shown in the legend (the others explain themselves). */
const LEGEND: CalendarStatus[] = ['done', 'bonus', 'missed', 'pending', 'off']

export interface MonthCalendarProps {
  /** "YYYY-MM" */
  month: string
  days: CalendarDay[]
  /** The habit's colour for "done" days. */
  color: string
  /** Today (YYYY-MM-DD), marked with `aria-current="date"`. */
  today: string
  /** Go to another month: -1 = previous, +1 = next. Buttons hidden when not allowed. */
  onChangeMonth: (step: -1 | 1) => void
  canGoBack: boolean
  canGoForward: boolean
  /** True while another month loads (buttons disabled). */
  loading?: boolean
}

/**
 * A month of days, Monday first, each showing whether the habit was done.
 *
 * Accessibility: a real `<table>` with the month as its caption and the weekdays
 * as column headers; each day says its status in words ("20 November: Done"),
 * marks ✓ ★ ✕ back up the colours, and today has `aria-current="date"`.
 */
export default function MonthCalendar({
  month,
  days,
  color,
  today,
  onChangeMonth,
  canGoBack,
  canGoForward,
  loading = false,
}: MonthCalendarProps) {
  // Pad the first week with empty cells so day 1 falls under the right weekday.
  const cells: (CalendarDay | null)[] = [
    ...Array<null>(days.length ? weekdayIndex(days[0].date) : 0).fill(null),
    ...days,
  ]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7))

  return (
    <div className={styles.calendar}>
      <div className={styles.nav}>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => onChangeMonth(-1)}
          disabled={!canGoBack || loading}
          aria-label="Previous month"
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
        <p className={styles.month} aria-hidden="true">
          {formatMonth(month)}
        </p>
        <button
          type="button"
          className={styles.navButton}
          onClick={() => onChangeMonth(1)}
          disabled={!canGoForward || loading}
          aria-label="Next month"
        >
          <ChevronRight size={20} aria-hidden="true" />
        </button>
      </div>

      <table className={styles.table} aria-busy={loading || undefined}>
        <caption className="sr-only">{formatMonth(month)}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((day) => (
              <th key={day.value} scope="col" abbr={day.label}>
                {day.short}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, row) => (
            <tr key={row}>
              {week.map((day, col) =>
                day ? (
                  <td key={day.date}>
                    <span
                      className={`${styles.day} ${styles[day.status]}`}
                      style={
                        day.status === 'done'
                          ? { backgroundColor: color, borderColor: color }
                          : day.status === 'bonus'
                            ? { borderColor: color }
                            : undefined
                      }
                      aria-current={day.date === today ? 'date' : undefined}
                    >
                      <span aria-hidden="true">{Number(day.date.slice(8))}</span>
                      {MARK[day.status] && (
                        <span className={styles.mark} aria-hidden="true">
                          {MARK[day.status]}
                        </span>
                      )}
                      <span className="sr-only">
                        {formatDayMonth(day.date)}: {STATUS_TEXT[day.status]}
                      </span>
                    </span>
                  </td>
                ) : (
                  <td key={`empty-${col}`} />
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className={styles.legend} aria-label="Calendar key">
        {LEGEND.map((status) => (
          <li key={status}>
            <span
              className={`${styles.swatch} ${styles[status]}`}
              style={
                status === 'done'
                  ? { backgroundColor: color, borderColor: color }
                  : status === 'bonus'
                    ? { borderColor: color }
                    : undefined
              }
              aria-hidden="true"
            >
              {MARK[status]}
            </span>
            {STATUS_TEXT[status]}
          </li>
        ))}
      </ul>
    </div>
  )
}
