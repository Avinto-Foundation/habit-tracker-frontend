import { Flame } from 'lucide-react'
import { Link, Outlet } from 'react-router'
import { APP_NAME } from '../utils/constants'
import styles from './AppLayout.module.css'

/**
 * The frame around every page: a "Skip to main content" link, the header with the
 * logo, and a `<main>` where the current page (`<Outlet />`) is shown.
 */
export default function AppLayout() {
  return (
    <>
      <a href="#main-content" className={styles.skipLink}>
        Skip to main content
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <Flame className={styles.flame} size={24} aria-hidden="true" />
            {APP_NAME}
          </Link>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
