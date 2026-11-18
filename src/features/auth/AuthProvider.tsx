import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../../api/auth'
import { onSessionExpired, refreshAccessToken } from '../../api/client'
import { tokenStore } from '../../api/tokens'
import type { RegisterData, UpdateMeData, User } from '../../api/types'
import { getBrowserTimezone } from '../../utils/timezone'
import { AuthContext, type AuthContextValue, type AuthStatus } from './authContext'

/**
 * Keeps track of who is logged in and shares it with the whole app through
 * `useAuth()`. Wrap the app in it once (see `main.tsx`).
 *
 * On page load, if a refresh token was saved ("Remember me" or same tab), it gets a
 * new access token and loads the user, so people stay logged in after a reload.
 */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    tokenStore.getRefresh() ? 'loading' : 'anonymous',
  )

  const signIn = useCallback(
    (access: string, refresh: string, signedInUser: User, rememberMe: boolean) => {
      tokenStore.setTokens(access, refresh, rememberMe)
      setUser(signedInUser)
      setStatus('authenticated')
    },
    [],
  )

  const signOutLocally = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
  }, [])

  // Restore a saved session when the app opens.
  useEffect(() => {
    if (status !== 'loading') return
    let active = true
    ;(async () => {
      try {
        await refreshAccessToken()
        const me = await authApi.getMe()
        if (active) {
          setUser(me)
          setStatus('authenticated')
        }
      } catch {
        if (active) signOutLocally()
      }
    })()
    return () => {
      active = false
    }
    // Only on first load: later status changes come from login/logout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // If the API client can't renew the session (e.g. refresh token expired), log out.
  useEffect(() => onSessionExpired(signOutLocally), [signOutLocally])

  const login = useCallback<AuthContextValue['login']>(
    async (email, password, rememberMe = false) => {
      const data = await authApi.login(email, password, rememberMe)
      signIn(data.access, data.refresh, data.user, rememberMe)
      return data.user
    },
    [signIn],
  )

  const register = useCallback<AuthContextValue['register']>(
    async (data: RegisterData) => {
      await authApi.register({ ...data, timezone: data.timezone ?? getBrowserTimezone() })
      return login(data.email, data.password)
    },
    [login],
  )

  const loginWithGoogle = useCallback<AuthContextValue['loginWithGoogle']>(
    async (idToken, rememberMe = false) => {
      const data = await authApi.loginWithGoogle(idToken, rememberMe, getBrowserTimezone())
      signIn(data.access, data.refresh, data.user, rememberMe)
      return { user: data.user, created: data.created }
    },
    [signIn],
  )

  const logout = useCallback(async () => {
    const refresh = tokenStore.getRefresh()
    try {
      if (refresh) await authApi.logout(refresh)
    } catch {
      // Already invalid or server unreachable: logging out locally is enough.
    }
    signOutLocally()
  }, [signOutLocally])

  const updateUser = useCallback(async (data: UpdateMeData) => {
    const updated = await authApi.updateMe(data)
    setUser(updated)
    return updated
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, status, login, register, loginWithGoogle, logout, updateUser }),
    [user, status, login, register, loginWithGoogle, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
