import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from '../features/auth/authContext'

/**
 * Who is logged in, plus login/logout functions.
 *
 * @example
 * const { user, status, login, logout } = useAuth()
 * if (status === 'authenticated') return <p>Hi, {user?.full_name}</p>
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth() must be used inside <AuthProvider>.')
  return context
}
