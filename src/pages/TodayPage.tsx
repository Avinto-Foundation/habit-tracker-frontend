import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { checkIn, undoCheckIn } from '../api/checkins'
import { parseApiError } from '../api/errors'
import { getToday } from '../api/habits'
import type { Today, TodayHabit } from '../api/types'
import Alert from '../components/Alert'
import LinkButton from '../components/LinkButton'
import LoadingScreen from '../components/LoadingScreen'
import { formatDay, greeting } from '../features/today/greeting'
import TodayHabitRow from '../features/today/TodayHabitRow'
import { withDone } from '../features/today/todayState'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../utils/constants'
import styles from './TodayPage.module.css'

type LoadState =
  { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; today: Today }

/**
 * The Today page (`/`, the home page): a greeting, "3 of 5 done" with a progress
 * bar, the habits due today with one-tap check-in, and the habits not due today
 * (can be ticked off as a bonus). A small celebration when everything is done.
 *
 * Tapping a check button updates the screen at once, then saves; if saving fails
 * the habit goes back and an error is shown. After saving, today's data is
 * reloaded quietly so streaks and weekly progress are exactly the server's.
 *
 * Accessibility: progress and the celebration are in a status region, so screen
 * readers announce "4 of 5 done" after each tap; the bar is a labelled progressbar.
 */
export default function TodayPage() {
  const { user } = useAuth()
  const [state, setState] = useState<LoadState>({ status: 'loading' })
  const [saving, setSaving] = useState<ReadonlySet<number>>(new Set())
  const [actionError, setActionError] = useState<string | null>(null)
  /** How many check-ins are being saved right now (see `toggle`). */
  const pending = useRef(0)
  const mounted = useRef(true)

  const load = useCallback(async () => {
    try {
      const today = await getToday()
      // Only use the reloaded data if no other tap is still saving, so a reload
      // can never undo a tap the server hasn't finished yet.
      if (mounted.current && pending.current === 0) setState({ status: 'ready', today })
    } catch (error) {
      if (mounted.current) {
        setState((current) =>
          // Keep showing the habits if only a quiet reload failed.
          current.status === 'ready'
            ? current
            : { status: 'error', message: parseApiError(error).message ?? '' },
        )
      }
    }
  }, [])

  useEffect(() => {
    mounted.current = true
    void load()
    return () => {
      mounted.current = false
    }
  }, [load])

  async function toggle(entry: TodayHabit) {
    if (state.status !== 'ready') return
    const id = entry.habit.id
    const wasDone = entry.done_today
    const day = entry.checkin?.date ?? state.today.date

    setActionError(null)
    setState((current) =>
      current.status === 'ready'
        ? { status: 'ready', today: withDone(current.today, id, !wasDone) }
        : current,
    )
    setSaving((current) => new Set(current).add(id))
    pending.current += 1

    let saved = false
    try {
      if (wasDone) await undoCheckIn(id, day)
      else await checkIn(id)
      saved = true
    } catch (error) {
      if (!mounted.current) return
      setState((current) =>
        current.status === 'ready'
          ? { status: 'ready', today: withDone(current.today, id, wasDone) }
          : current,
      )
      const action = wasDone ? 'undo' : 'save'
      setActionError(
        `Couldn't ${action} “${entry.habit.name}”. ${parseApiError(error).message ?? ''}`.trim(),
      )
    } finally {
      pending.current -= 1
      if (mounted.current) {
        setSaving((current) => {
          const next = new Set(current)
          next.delete(id)
          return next
        })
      }
    }
    if (saved) await load()
  }

  const firstName = user?.full_name.split(' ')[0] ?? ''
  const hello = `${greeting(new Date(), user?.timezone ?? 'UTC')}, ${firstName}`

  return (
    <section className={styles.page}>
      <title>{`Today | ${APP_NAME}`}</title>
      <div className={styles.header}>
        <div>
          {state.status === 'ready' && <p className={styles.date}>{formatDay(state.today.date)}</p>}
          <h1>{hello}</h1>
        </div>
        <LinkButton to="/habits" variant="secondary">
          Manage habits
        </LinkButton>
      </div>

      {state.status === 'loading' && <LoadingScreen label="Loading today's habits…" />}
      {state.status === 'error' && <Alert>{state.message}</Alert>}
      {state.status === 'ready' && (
        <TodayContent
          today={state.today}
          saving={saving}
          error={actionError}
          onToggle={(entry) => void toggle(entry)}
        />
      )}
    </section>
  )
}

interface TodayContentProps {
  today: Today
  saving: ReadonlySet<number>
  error: string | null
  onToggle: (entry: TodayHabit) => void
}

/** Progress, celebration and the two lists of habits. */
function TodayContent({ today, saving, error, onToggle }: TodayContentProps) {
  const { done, total } = today.summary
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)
  const allDone = total > 0 && done === total
  const noHabits = today.due.length === 0 && today.not_due.length === 0

  if (noHabits) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyTitle}>No habits yet</p>
        <p>Pick one small thing you'd like to do every day, and tick it off here.</p>
        <Link to="/habits/new">Create your first habit</Link>
      </div>
    )
  }

  return (
    <>
      {error && <Alert>{error}</Alert>}

      {total > 0 && (
        <div className={styles.progress}>
          <div role="status" className={styles.progressText}>
            <span id="today-progress">
              {done} of {total} done
            </span>
            {allDone && (
              <span className={styles.celebration}>
                <span aria-hidden="true">🎉 </span>All done for today. Great work!
              </span>
            )}
          </div>
          <div
            role="progressbar"
            aria-labelledby="today-progress"
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={done}
            className={styles.bar}
          >
            <div className={styles.barFill} style={{ width: `${percent}%` }} />
          </div>
        </div>
      )}

      {today.due.length > 0 ? (
        <section aria-labelledby="due-heading" className={styles.group}>
          <h2 id="due-heading" className={styles.groupTitle}>
            Due today
          </h2>
          <ul className={styles.list}>
            {today.due.map((entry) => (
              <TodayHabitRow
                key={entry.habit.id}
                entry={entry}
                saving={saving.has(entry.habit.id)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      ) : (
        <p className={styles.dayOff}>Nothing due today. Enjoy your day off!</p>
      )}

      {today.not_due.length > 0 && (
        <section aria-labelledby="not-due-heading" className={styles.group}>
          <h2 id="not-due-heading" className={styles.groupTitle}>
            Not due today
          </h2>
          <p className={styles.groupHint}>Feeling keen? Tick these off as a bonus.</p>
          <ul className={styles.list}>
            {today.not_due.map((entry) => (
              <TodayHabitRow
                key={entry.habit.id}
                entry={entry}
                saving={saving.has(entry.habit.id)}
                onToggle={onToggle}
              />
            ))}
          </ul>
        </section>
      )}
    </>
  )
}
