import { isAxiosError } from 'axios'
import { ArrowLeft, Flame } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import { checkIn, listCheckIns, undoCheckIn, updateCheckInNote } from '../api/checkins'
import { parseApiError } from '../api/errors'
import { deleteHabit, getHabit, getHabitStats, updateHabit } from '../api/habits'
import type { CheckIn, Habit, HabitStats } from '../api/types'
import Alert from '../components/Alert'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import LinkButton from '../components/LinkButton'
import LoadingScreen from '../components/LoadingScreen'
import { addDays, addMonths, localDate, monthOf } from '../features/habits/dates'
import { scheduleLabel } from '../features/habits/habitOptions'
import MonthCalendar from '../features/habits/MonthCalendar'
import RecentDay from '../features/habits/RecentDay'
import { streakText } from '../features/today/greeting'
import { useAuth } from '../hooks/useAuth'
import { pageNotice } from '../routes/redirect'
import { APP_NAME } from '../utils/constants'
import styles from './HabitDetailPage.module.css'

interface Loaded {
  habit: Habit
  stats: HabitStats
  /** Check-ins for yesterday and today. */
  recent: CheckIn[]
  /** The calendar's month, "YYYY-MM". */
  month: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | ({ status: 'ready' } & Loaded)

/** Yesterday and today's check-ins for a habit, given today's date. */
function loadRecent(habitId: number, today: string) {
  return listCheckIns(habitId, { from: addDays(today, -1), to: today })
}

/**
 * A habit's own page (`/habits/:id`): its details, stats (streaks, last-30-days
 * rate, total), a month calendar, check-in / undo / note for today and yesterday,
 * and Edit, Archive and Delete.
 *
 * Everything shown is the server's: after any change the stats are reloaded,
 * because streaks depend on the whole history.
 */
export default function HabitDetailPage() {
  const { id } = useParams()
  const habitId = Number(id)
  const validId = Number.isInteger(habitId) && habitId > 0
  const { user } = useAuth()
  const timeZone = user?.timezone ?? 'UTC'
  const navigate = useNavigate()
  const location = useLocation()

  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [notice, setNotice] = useState<string | null>(pageNotice(location.state))
  const [error, setError] = useState<string | null>(null)
  const [calendarLoading, setCalendarLoading] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!validId) return
    let ignore = false // don't update the page after the user has left it
    // Start the calendar on this month in the user's time zone. The server's "today"
    // has the final say: if the guess was wrong (e.g. just after midnight on the 1st
    // in another time zone), ask again for the right month.
    const guess = monthOf(localDate(new Date().toISOString(), timeZone))
    Promise.all([getHabit(habitId), getHabitStats(habitId, guess)])
      .then(async ([habit, stats]) => {
        const month = monthOf(stats.today)
        const [finalStats, recent] = await Promise.all([
          month === guess ? stats : getHabitStats(habitId, month),
          loadRecent(habitId, stats.today),
        ])
        if (!ignore) setState({ status: 'ready', habit, stats: finalStats, recent, month })
      })
      .catch((err: unknown) => {
        if (ignore) return
        if (isAxiosError(err) && err.response?.status === 404) setState({ status: 'not-found' })
        else setState({ status: 'error', message: parseApiError(err).message ?? '' })
      })
    return () => {
      ignore = true
    }
  }, [habitId, validId, timeZone])

  if (!validId || state.status === 'not-found') {
    return (
      <section>
        <title>{`Habit not found | ${APP_NAME}`}</title>
        <h1>Habit not found</h1>
        <p>This habit doesn't exist or isn't yours.</p>
        <Link to="/habits">Back to your habits</Link>
      </section>
    )
  }
  if (state.status === 'loading') return <LoadingScreen label="Loading habit…" />
  if (state.status === 'error') {
    return (
      <section>
        <title>{`Habit | ${APP_NAME}`}</title>
        <h1>Habit</h1>
        <Alert>{state.message}</Alert>
        <Link to="/habits">Back to your habits</Link>
      </section>
    )
  }

  const { habit, stats, recent, month } = state
  const today = stats.today
  const yesterday = addDays(today, -1)
  const startDay = localDate(habit.created_at, timeZone)
  const firstMonth = monthOf(startDay)
  const lastMonth = monthOf(today)
  const checkinOn = (day: string) => recent.find((checkin) => checkin.date === day) ?? null

  /** Reload stats and recent check-ins after a change (the server works out streaks). */
  async function refresh() {
    const [newStats, newRecent] = await Promise.all([
      getHabitStats(habitId, month),
      loadRecent(habitId, today),
    ])
    setState((s) => (s.status === 'ready' ? { ...s, stats: newStats, recent: newRecent } : s))
  }

  async function toggleDay(day: string, done: boolean) {
    setNotice(null)
    if (done) await checkIn(habitId, { date: day })
    else await undoCheckIn(habitId, day)
    await refresh()
  }

  async function saveNote(day: string, note: string) {
    setNotice(null)
    const saved = await updateCheckInNote(habitId, day, note)
    setState((s) =>
      s.status === 'ready'
        ? { ...s, recent: s.recent.map((c) => (c.date === saved.date ? saved : c)) }
        : s,
    )
  }

  async function changeMonth(step: -1 | 1) {
    const next = addMonths(month, step)
    setCalendarLoading(true)
    setError(null)
    try {
      const newStats = await getHabitStats(habitId, next)
      setState((s) => (s.status === 'ready' ? { ...s, stats: newStats, month: next } : s))
    } catch (err) {
      setError(parseApiError(err).message)
    } finally {
      setCalendarLoading(false)
    }
  }

  async function setArchived(archived: boolean) {
    setArchiving(true)
    setError(null)
    setNotice(null)
    try {
      const saved = await updateHabit(habitId, { archived })
      if (archived) {
        navigate('/habits', {
          state: { notice: `“${saved.name}” was archived. Find it under “Archived”.` },
        })
        return
      }
      setState((s) => (s.status === 'ready' ? { ...s, habit: saved } : s))
      setNotice(`“${saved.name}” is active again.`)
    } catch (err) {
      setError(parseApiError(err).message)
    } finally {
      setArchiving(false)
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteHabit(habitId)
      navigate('/habits', { state: { notice: `“${habit.name}” was deleted.` } })
    } catch (err) {
      setDeleting(false)
      setConfirmDelete(false)
      setError(parseApiError(err).message)
    }
  }

  const rate = stats.completion_rate

  return (
    <section className={styles.page}>
      <title>{`${habit.name} | ${APP_NAME}`}</title>

      <Link to="/habits" className={styles.back}>
        <ArrowLeft size={16} aria-hidden="true" />
        All habits
      </Link>

      <div className={styles.header}>
        <span
          className={styles.icon}
          style={{ borderColor: habit.color, backgroundColor: `${habit.color}1A` }}
          aria-hidden="true"
        >
          {habit.icon}
        </span>
        <div className={styles.titles}>
          <h1>{habit.name}</h1>
          <p className={styles.meta}>
            {[habit.target, scheduleLabel(habit)].filter(Boolean).join(' · ')}
          </p>
        </div>
        <LinkButton to={`/habits/${habit.id}/edit`} variant="secondary">
          Edit<span className="sr-only"> {habit.name}</span>
        </LinkButton>
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}
      {error && <Alert>{error}</Alert>}

      {habit.archived && (
        <div className={styles.archived}>
          <p>
            This habit is archived: it's hidden from Today and can't be ticked off. Its history is
            kept.
          </p>
          <Button onClick={() => void setArchived(false)} loading={archiving}>
            Unarchive
          </Button>
        </div>
      )}

      <section aria-labelledby="stats-heading" className={styles.section}>
        <h2 id="stats-heading">Progress</h2>
        <dl className={styles.stats}>
          <div className={styles.stat}>
            <dt>Current streak</dt>
            <dd className={styles.streak}>
              <Flame size={20} aria-hidden="true" />
              {streakText(stats.current_streak, stats.streak_unit)}
            </dd>
          </div>
          <div className={styles.stat}>
            <dt>Longest streak</dt>
            <dd>{streakText(stats.longest_streak, stats.streak_unit)}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Last 30 days</dt>
            <dd>{rate === null ? 'Nothing due yet' : `${rate}%`}</dd>
          </div>
          <div className={styles.stat}>
            <dt>Total check-ins</dt>
            <dd>{stats.total_checkins}</dd>
          </div>
          {stats.week_progress && (
            <div className={styles.stat}>
              <dt>This week</dt>
              <dd>
                {stats.week_progress.done} of {stats.week_progress.goal}
              </dd>
            </div>
          )}
        </dl>
      </section>

      {!habit.archived && (
        <section aria-labelledby="checkin-heading" className={styles.section}>
          <h2 id="checkin-heading">Check in</h2>
          {yesterday >= startDay && (
            <p className={styles.hint}>Forgot yesterday? You can still tick it off.</p>
          )}
          <ul className={styles.days}>
            <RecentDay
              label="today"
              date={today}
              checkin={checkinOn(today)}
              onToggle={toggleDay}
              onSaveNote={saveNote}
            />
            {yesterday >= startDay && (
              <RecentDay
                label="yesterday"
                date={yesterday}
                checkin={checkinOn(yesterday)}
                onToggle={toggleDay}
                onSaveNote={saveNote}
              />
            )}
          </ul>
        </section>
      )}

      {stats.calendar && (
        <section aria-labelledby="calendar-heading" className={styles.section}>
          <h2 id="calendar-heading">Calendar</h2>
          <MonthCalendar
            month={month}
            days={stats.calendar.days}
            color={habit.color}
            today={today}
            onChangeMonth={(step) => void changeMonth(step)}
            canGoBack={month > firstMonth}
            canGoForward={month < lastMonth}
            loading={calendarLoading}
          />
        </section>
      )}

      <section aria-labelledby="manage-heading" className={styles.section}>
        <h2 id="manage-heading">Manage</h2>
        <div className={styles.manage}>
          {!habit.archived && (
            <Button
              variant="secondary"
              onClick={() => void setArchived(true)}
              loading={archiving}
              loadingText="Archiving…"
            >
              Archive habit
            </Button>
          )}
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            Delete habit
          </Button>
        </div>
        <p className={styles.hint}>
          Archive hides the habit but keeps its history. Delete removes it for good.
        </p>
      </section>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete “${habit.name}”?`}
        confirmLabel="Delete habit"
        busyLabel="Deleting…"
        busy={deleting}
        danger
        onConfirm={() => void handleDelete()}
        onCancel={() => setConfirmDelete(false)}
      >
        <p>
          This deletes the habit and all {stats.total_checkins} of its check-ins. You can't undo
          this. To keep its history, archive it instead.
        </p>
      </ConfirmDialog>
    </section>
  )
}
