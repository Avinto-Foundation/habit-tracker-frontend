import { ArrowLeft } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { parseApiError } from '../../api/errors'
import { createHabit } from '../../api/habits'
import type { HabitInput } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import HabitForm from '../habits/HabitForm'
import { EMPTY_HABIT_FORM } from '../habits/habitSchema'
import styles from './Onboarding.module.css'
import { SUGGESTIONS } from './suggestions'

export interface FirstHabitStepProps {
  /** Move focus to the heading (when the user arrives at this step). */
  focusHeading: boolean
  /** Go back to step 1. */
  onBack: () => void
  /** Called after the first habit is created. */
  onDone: () => void
}

/**
 * Onboarding step 2: create a first habit. One tap on a suggestion creates it
 * (Hick's Law: a few good choices instead of a blank form); "Make your own" opens
 * the full habit form; "Skip for now" goes straight to the Today page.
 */
export default function FirstHabitStep({ focusHeading, onBack, onDone }: FirstHabitStepProps) {
  const [busyName, setBusyName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [custom, setCustom] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (focusHeading) headingRef.current?.focus()
  }, [focusHeading])

  async function create(habit: HabitInput) {
    await createHabit(habit)
    onDone()
  }

  async function pickSuggestion(habit: HabitInput) {
    setBusyName(habit.name)
    setError(null)
    try {
      await create(habit)
    } catch (err) {
      setError(parseApiError(err).message ?? 'Something went wrong. Please try again.')
      setBusyName(null)
    }
  }

  return (
    <div>
      <h1 ref={headingRef} tabIndex={-1} className={styles.heading}>
        Create your first habit
      </h1>
      <p className={styles.intro}>
        Start small: one habit you can do every day. You can change it any time.
      </p>

      {error && <Alert>{error}</Alert>}

      {!custom && (
        <>
          <ul className={styles.suggestions} aria-label="Suggestions">
            {SUGGESTIONS.map((habit) => (
              <li key={habit.name}>
                <button
                  type="button"
                  className={styles.suggestion}
                  style={{ borderColor: habit.color }}
                  disabled={busyName !== null}
                  aria-busy={busyName === habit.name || undefined}
                  onClick={() => void pickSuggestion(habit)}
                >
                  <span className={styles.suggestionIcon} aria-hidden="true">
                    {habit.icon}
                  </span>
                  <span className={styles.suggestionText}>
                    <span className={styles.suggestionName}>{habit.name}</span>
                    {habit.target && (
                      <span className={styles.suggestionTarget}>{habit.target}, every day</span>
                    )}
                    {!habit.target && <span className={styles.suggestionTarget}>Every day</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <Button variant="secondary" fullWidth onClick={() => setCustom(true)}>
            Make your own
          </Button>
        </>
      )}

      {custom && (
        <HabitForm
          initialValues={EMPTY_HABIT_FORM}
          submitLabel="Create habit"
          submittingText="Creating…"
          onSubmit={create}
        />
      )}

      <div className={styles.footer}>
        <button
          type="button"
          className={styles.back}
          onClick={custom ? () => setCustom(false) : onBack}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          {custom ? 'Back to suggestions' : 'Back'}
        </button>
        <Link to="/" replace className={styles.skip}>
          Skip for now
        </Link>
      </div>
    </div>
  )
}
