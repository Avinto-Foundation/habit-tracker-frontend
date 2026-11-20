import { Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router'
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

/**
 * "Your habits" (`/habits`): every active habit with its icon, target and schedule,
 * an Edit link for each, and a "New habit" button. Shows "Habit created." etc. when
 * the form sends the user back here.
 *
 * Accessibility: one `<h1>`; the habits are a list; each Edit link names its habit
 * for screen readers ("Edit Read"), since many links all saying "Edit" are unclear.
 */
export default function HabitsPage() {
  const location = useLocation()
  const notice = pageNotice(location.state)
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let ignore = false // don't update the page after the user has left it
    listHabits()
      .then((habits) => !ignore && setState({ status: 'ready', habits }))
      .catch((error: unknown) => {
        if (!ignore) {
          setState({ status: 'error', message: parseApiError(error).message ?? '' })
        }
      })
    return () => {
      ignore = true
    }
  }, [])

  return (
    <section>
      <title>{`Your habits | ${APP_NAME}`}</title>
      <div className={styles.header}>
        <h1>Your habits</h1>
        <LinkButton to="/habits/new">
          <Plus size={18} aria-hidden="true" />
          New habit
        </LinkButton>
      </div>

      {notice && <Alert variant="success">{notice}</Alert>}

      {state.status === 'loading' && <LoadingScreen label="Loading your habits…" />}
      {state.status === 'error' && <Alert>{state.message}</Alert>}
      {state.status === 'ready' && state.habits.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No habits yet</p>
          <p>Start small: one habit you can do every day is plenty.</p>
          <Link to="/habits/new">Create your first habit</Link>
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
                <span className={styles.name}>{habit.name}</span>
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
