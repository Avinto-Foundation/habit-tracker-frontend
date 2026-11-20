import { isAxiosError } from 'axios'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { parseApiError } from '../api/errors'
import { getHabit, updateHabit } from '../api/habits'
import type { Habit } from '../api/types'
import Alert from '../components/Alert'
import LoadingScreen from '../components/LoadingScreen'
import HabitForm from '../features/habits/HabitForm'
import { habitToFormValues } from '../features/habits/habitSchema'
import { APP_NAME } from '../utils/constants'

type LoadState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'error'; message: string }
  | { status: 'ready'; habit: Habit }

/**
 * "Edit habit" (`/habits/:id/edit`): loads the habit, fills the form with it and
 * saves changes with `PATCH /api/habits/<id>/`, then goes back to the habits list.
 *
 * A habit that doesn't exist or belongs to someone else (the API says 404 for both,
 * so nobody can tell which) shows "Habit not found".
 */
export default function EditHabitPage() {
  const { id } = useParams()
  const habitId = Number(id)
  const validId = Number.isInteger(habitId) && habitId > 0
  const navigate = useNavigate()
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    if (!validId) return
    let ignore = false // don't update the page after the user has left it
    getHabit(habitId)
      .then((habit) => !ignore && setState({ status: 'ready', habit }))
      .catch((error: unknown) => {
        if (ignore) return
        if (isAxiosError(error) && error.response?.status === 404) {
          setState({ status: 'not-found' })
        } else {
          setState({ status: 'error', message: parseApiError(error).message ?? '' })
        }
      })
    return () => {
      ignore = true
    }
  }, [habitId, validId])

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

  return (
    <section>
      <title>{`Edit habit | ${APP_NAME}`}</title>
      <h1>Edit habit</h1>
      {state.status === 'loading' && <LoadingScreen label="Loading habit…" />}
      {state.status === 'error' && (
        <>
          <Alert>{state.message}</Alert>
          <Link to="/habits">Back to your habits</Link>
        </>
      )}
      {state.status === 'ready' && (
        <HabitForm
          initialValues={habitToFormValues(state.habit)}
          submitLabel="Save changes"
          submittingText="Saving…"
          cancelTo="/habits"
          onSubmit={async (data) => {
            const habit = await updateHabit(habitId, data)
            navigate('/habits', { state: { notice: `“${habit.name}” was saved.` } })
          }}
        />
      )}
    </section>
  )
}
