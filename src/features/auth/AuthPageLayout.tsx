import { CircleCheck, Flame } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './AuthPageLayout.module.css'

export interface AuthPageLayoutProps {
  /** The page's one `<h1>`, e.g. "Create your account". */
  title: string
  subtitle?: string
  /** The form. */
  children: ReactNode
  /** Small text under the card, e.g. "Already have an account? Log in". */
  footer?: ReactNode
}

const BENEFITS = ['Track daily habits', 'Keep streaks with friends', 'Challenges & pledges']

/**
 * Shared layout for the sign-up and login pages: a motivating panel on the left
 * (wide screens only) and the form card on the right.
 */
export default function AuthPageLayout({ title, subtitle, children, footer }: AuthPageLayoutProps) {
  return (
    <div className={styles.layout}>
      {/* Decorative extra on big screens; the card has everything needed. */}
      <aside className={styles.intro} aria-label="Why join">
        <Flame className={styles.flame} size={48} aria-hidden="true" />
        <p className={styles.headline}>
          Build habits together.
          <br />
          Your friends will notice when you stop.
        </p>
        <ul className={styles.benefits}>
          {BENEFITS.map((benefit) => (
            <li key={benefit}>
              <CircleCheck className={styles.check} size={22} aria-hidden="true" />
              {benefit}
            </li>
          ))}
        </ul>
      </aside>

      <section className={styles.card} aria-labelledby="auth-title">
        <h1 id="auth-title" className={styles.title}>
          {title}
        </h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
        {footer && <p className={styles.footer}>{footer}</p>}
      </section>
    </div>
  )
}
