import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import styles from './Alert.module.css'

export interface AlertProps {
  /** `error` for problems (e.g. "Something went wrong"), `success` for good news. */
  variant?: 'error' | 'success'
  children: ReactNode
}

/**
 * A message box for the whole form or page, e.g. a server error.
 *
 * Uses `role="alert"` so screen readers read it out as soon as it appears, and an
 * icon plus text so the meaning doesn't rely on colour alone.
 */
export default function Alert({ variant = 'error', children }: AlertProps) {
  const Icon = variant === 'error' ? CircleAlert : CircleCheck

  return (
    <div role="alert" className={`${styles.alert} ${styles[variant]}`}>
      <Icon className={styles.icon} size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
