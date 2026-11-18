import { Navigate, Outlet, useLocation } from 'react-router'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth } from '../hooks/useAuth'
import type { RedirectState } from './redirect'

/**
 * Wraps pages that need a login (see `AppRoutes`).
 *
 * - still checking a saved login → loading screen (no flash of the login page)
 * - not logged in → go to `/login`, remembering this page so login can come back
 * - logged in → show the page
 *
 * It also reacts later: if the session expires, the user is sent to log in.
 */
export default function ProtectedRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <LoadingScreen />
  if (status === 'anonymous') {
    const state: RedirectState = { from: location }
    return <Navigate to="/login" replace state={state} />
  }
  return <Outlet />
}
