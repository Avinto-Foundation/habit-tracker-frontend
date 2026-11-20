import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router'
import { parseApiError } from '../api/errors'
import { listHabits } from '../api/habits'
import type { Habit } from '../api/types'
import Alert from '../components/Alert'
import LinkButton from '../components/LinkButton'
import LoadingScreen from '../components/LoadingScreen'
import { scheduleLabel } from '../features/habits/habitOptions'
import { pageNotice } from '../routes/redirect'
import { APP_NAME } from '../utils/constants'
import styles from './HabitsPage.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; habits: Habit[] }

/** A loaded result and which list it's for (active or archived). */
type Loaded = Exclude<LoadState, { status: 'loading' }> & { archived: boolean }

/**
 * "Your habits" (`/habits`): every active habit with its icon, target and schedule.
 * Each name opens the habit's page; each has an Edit link; "New habit" adds one.
 * `/habits?archived=true` shows archived habits instead (to find and restore them).
 * Shows "Habit created." etc. when another page sends the user back here.
 *
 * Accessibility: one `<h1>`; the habits are a list; the Active / Archived switch
 * marks the current view with `aria-current`; each Edit link names its habit for
 * screen readers ("Edit Read"), since many links all saying "Edit" are unclear.
 */
export default function HabitsPage() {
  const location = useLocation()
  const notice = pageNotice(location.state)
  const [searchParams] = useSearchParams()
  const archived = searchParams.get('archived') === 'true'
  const [loaded, setLoaded] = useState<Loaded | null>(null)
  // Switching Active <-> Archived shows "loading" until that list arrives.
  const state: LoadState = loaded?.archived === archived ? loaded : { status: 'loading' }

  useEffect(() => {
    let ignore = false // don't update the page after the user has left it
    listHabits({ archived })
      .then((habits) => !ignore && setLoaded({ status: 'ready', habits, archived }))
      .catch((error: unknown) => {
        if (!ignore) {
          setLoaded({ status: 'error', message: parseApiError(error).message ?? '', archived })
        }
      })
    return () => {
      ignore = true
    }
  }, [archived])

  return (
    <section>
      <title>{`${archived ? 'Archived habits' : 'Your habits'} | ${APP_NAME}`}</title>
      <div className={styles.header}>
        <h1>{archived ? 'Archived habits' : 'Your habits'}</h1>
        <LinkButton to="/habits/new">
          <Plus size={18} aria-hidden="true" />
          New habit
        </LinkButton>
      </div>

      <nav aria-label="Habit list" className={styles.tabs}>
        <Link to="/habits" className={styles.tab} aria-current={archived ? undefined : 'page'}>
          Active
        </Link>
        <Link
          to="/habits?archived=true"
          className={styles.tab}
          aria-current={archived ? 'page' : undefined}
        >
          Archived
        </Link>
      </nav>

      {notice && <Alert variant="success">{notice}</Alert>}

      {state.status === 'loading' && <LoadingScreen label="Loading your habits…" />}
      {state.status === 'error' && <Alert>{state.message}</Alert>}
      {state.status === 'ready' && state.habits.length === 0 && !archived && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No habits yet</p>
          <p>Start small: one habit you can do every day is plenty.</p>
          <Link to="/habits/new">Create your first habit</Link>
        </div>
      )}
      {state.status === 'ready' && state.habits.length === 0 && archived && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No archived habits</p>
          <p>Habits you archive are kept here with their history.</p>
        </div>
      )}
      {state.status === 'ready' && state.habits.length > 0 && (
        <ul className={styles.list}>
          {state.habits.map((habit) => (
            <li key={habit.id} className={styles.item}>
              <span
                className={styles.icon}
                style={{ borderColor: habit.color, backgroundColor: `${habit.color}1A` }}
                aria-hidden="true"
              >
                {habit.icon}
              </span>
              <div className={styles.details}>
                <Link to={`/habits/${habit.id}`} className={styles.name}>
                  {habit.name}
                </Link>
                <span className={styles.meta}>
                  {[habit.target, scheduleLabel(habit)].filter(Boolean).join(' · ')}
                </span>
              </div>
              <Link to={`/habits/${habit.id}/edit`} className={styles.edit}>
                Edit<span className="sr-only"> {habit.name}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
