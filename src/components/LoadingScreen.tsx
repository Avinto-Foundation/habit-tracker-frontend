import { LoaderCircle } from 'lucide-react'
import styles from './LoadingScreen.module.css'

/**
 * Shown while the app checks a saved login, so users don't see the login page
 * flash before being let in. `role="status"` lets screen readers say "Loading".
 */
export default function LoadingScreen({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" className={styles.loading}>
      <LoaderCircle className={styles.spinner} size={32} aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}
