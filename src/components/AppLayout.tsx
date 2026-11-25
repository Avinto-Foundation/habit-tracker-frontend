import { Flame } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../utils/constants'
import AccountMenu from './AccountMenu'
import styles from './AppLayout.module.css'

/**
 * The frame around every page: a "Skip to main content" link, the header (logo +
 * account links) and a `<main>` where the current page (`<Outlet />`) is shown.
 *
 * Header: logged in → "Today" and "Habits" links and the account menu (photo or
 * initials, with "Your profile" and "Log out");
 * logged out → Log in / Sign up links; while checking a saved login → nothing.
 */
export default function AppLayout() {
  const { user, status, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

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

          {status === 'authenticated' && (
            <nav aria-label="Main" className={`${styles.nav} ${styles.mainNav}`}>
              <NavLink to="/" end className={styles.navLink}>
                Today
              </NavLink>
              <NavLink to="/habits" className={styles.navLink}>
                Habits
              </NavLink>
            </nav>
          )}

          <nav aria-label="Account" className={styles.nav}>
            {status === 'authenticated' && user && (
              <AccountMenu user={user} onLogout={() => void handleLogout()} />
            )}
            {status === 'anonymous' && (
              <>
                <NavLink to="/login" className={styles.navLink}>
                  Log in
                </NavLink>
                <NavLink to="/signup" className={styles.navLink}>
                  Sign up
                </NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
    </>
  )
}
