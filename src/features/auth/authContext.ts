import { createContext } from 'react'
import type { RegisterData, UpdateMeData, User } from '../../api/types'

/**
 * - `loading`: checking whether a saved login is still valid (on page load)
 * - `authenticated`: logged in, `user` is set
 * - `anonymous`: not logged in
 */
export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

/** Everything `useAuth()` gives a component. */
export interface AuthContextValue {
  /** The logged-in user, or null. */
  user: User | null
  status: AuthStatus
  /** Log in with email + password. Throws on failure (use `parseApiError`). */
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User>
  /** Create an account and log straight in. The browser's time zone is used if none is given. */
  register: (data: RegisterData) => Promise<User>
  /** Log in (or sign up) with a Google ID token. `created` is true for a brand-new account. */
  loginWithGoogle: (
    idToken: string,
    rememberMe?: boolean,
  ) => Promise<{ user: User; created: boolean }>
  /** Log out on the server and in the browser. Never throws. */
  logout: () => Promise<void>
  /** Change your own name, username or time zone. */
  updateUser: (data: UpdateMeData) => Promise<User>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
