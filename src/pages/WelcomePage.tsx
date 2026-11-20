import { useState } from 'react'
import { useNavigate } from 'react-router'
import FirstHabitStep from '../features/onboarding/FirstHabitStep'
import TimezoneStep from '../features/onboarding/TimezoneStep'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../utils/constants'
import styles from './WelcomePage.module.css'

const STEPS = 2

/**
 * Onboarding (`/welcome`), shown once right after signing up:
 * 1. confirm the time zone, 2. create a first habit (or skip). Then the Today page.
 *
 * Accessibility: "Step 1 of 2" is text, not just dots; when the step changes,
 * focus moves to the new step's heading so screen readers read it out.
 */
export default function WelcomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [moved, setMoved] = useState(false) // focus the heading only after a step change

  function goTo(next: number) {
    setStep(next)
    setMoved(true)
  }

  const firstName = user?.full_name.split(' ')[0] ?? ''

  return (
    <section className={styles.page}>
      <title>{`Welcome | ${APP_NAME}`}</title>
      <div className={styles.card}>
        <p className={styles.welcome}>
          Welcome to {APP_NAME}, {firstName}!
        </p>
        <div className={styles.progress}>
          <p className={styles.stepText}>
            Step {step} of {STEPS}
          </p>
          <div className={styles.dots} aria-hidden="true">
            {Array.from({ length: STEPS }, (_, i) => (
              <span key={i} className={i < step ? `${styles.dot} ${styles.dotDone}` : styles.dot} />
            ))}
          </div>
        </div>

        {step === 1 ? (
          <TimezoneStep focusHeading={moved} onDone={() => goTo(2)} />
        ) : (
          <FirstHabitStep
            focusHeading={moved}
            onBack={() => goTo(1)}
            onDone={() => navigate('/', { replace: true })}
          />
        )}
      </div>
    </section>
  )
}
