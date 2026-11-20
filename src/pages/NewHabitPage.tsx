import { useNavigate } from 'react-router'
import { createHabit } from '../api/habits'
import HabitForm from '../features/habits/HabitForm'
import { EMPTY_HABIT_FORM } from '../features/habits/habitSchema'
import { APP_NAME } from '../utils/constants'

/**
 * "New habit" (`/habits/new`): the habit form, empty. Saving sends
 * `POST /api/habits/` and goes back to the habits list with a "created" message.
 */
export default function NewHabitPage() {
  const navigate = useNavigate()

  return (
    <section>
      <title>{`New habit | ${APP_NAME}`}</title>
      <h1>New habit</h1>
      <HabitForm
        initialValues={EMPTY_HABIT_FORM}
        submitLabel="Create habit"
        submittingText="Creating…"
        cancelTo="/habits"
        onSubmit={async (data) => {
          const habit = await createHabit(data)
          navigate('/habits', { state: { notice: `“${habit.name}” was created.` } })
        }}
      />
    </section>
  )
}
