import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { tokenStore } from '../../api/tokens'
import { useAuth } from '../../hooks/useAuth'
import { apiUrl, server, testUser } from '../../test/server'
import AuthProvider from './AuthProvider'

/** Use `useAuth()` inside a real AuthProvider, like a component would. */
function renderAuth() {
  return renderHook(() => useAuth(), { wrapper: AuthProvider })
}

/** Fake the endpoints a session restore needs: refresh + me. */
function fakeRestore({ refreshWorks = true } = {}) {
  server.use(
    http.post(apiUrl('/auth/token/refresh/'), () =>
      refreshWorks
        ? HttpResponse.json({ access: 'new-access', refresh: 'new-refresh' })
        : HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 401 }),
    ),
    http.get(apiUrl('/auth/me/'), () => HttpResponse.json(testUser)),
  )
}

function fakeLogin() {
  const sent: { body?: unknown } = {}
  server.use(
    http.post(apiUrl('/auth/login/'), async ({ request }) => {
      sent.body = await request.json()
      return HttpResponse.json({ access: 'access-1', refresh: 'refresh-1', user: testUser })
    }),
  )
  return sent
}

describe('AuthProvider / useAuth', () => {
  it('throws a helpful error when used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}) // React logs the thrown error
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth() must be used inside <AuthProvider>.',
    )
  })

  // --- Opening the app -------------------------------------------------------

  it('is logged out right away when no login was saved', () => {
    const { result } = renderAuth()

    expect(result.current.status).toBe('anonymous')
    expect(result.current.user).toBeNull()
  })

  it('restores a saved login when the app opens', async () => {
    fakeRestore()
    tokenStore.setTokens('old-access', 'saved-refresh', true)
    tokenStore.setAccess(null) // like after a page reload: only the refresh token survives

    const { result } = renderAuth()

    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('authenticated'))
    expect(result.current.user).toEqual(testUser)
    expect(tokenStore.getAccess()).toBe('new-access')
  })

  it('is logged out if the saved login has expired', async () => {
    fakeRestore({ refreshWorks: false })
    tokenStore.setTokens('old', 'expired-refresh', true)

    const { result } = renderAuth()

    await waitFor(() => expect(result.current.status).toBe('anonymous'))
    expect(result.current.user).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })

  // --- Log in ------------------------------------------------------------------

  it('login() saves tokens and sets the user', async () => {
    const sent = fakeLogin()
    const { result } = renderAuth()

    await act(() => result.current.login('sam@example.com', 'secret', true))

    expect(sent.body).toEqual({ email: 'sam@example.com', password: 'secret', remember_me: true })
    expect(result.current.status).toBe('authenticated')
    expect(result.current.user).toEqual(testUser)
    expect(tokenStore.getAccess()).toBe('access-1')
    expect(localStorage.getItem('habit-tracker.refresh')).toBe('refresh-1')
  })

  it('login() without "Remember me" keeps the refresh token for this tab only', async () => {
    fakeLogin()
    const { result } = renderAuth()

    await act(() => result.current.login('sam@example.com', 'secret'))

    expect(sessionStorage.getItem('habit-tracker.refresh')).toBe('refresh-1')
    expect(localStorage.getItem('habit-tracker.refresh')).toBeNull()
  })

  it('login() throws on wrong password and stays logged out', async () => {
    server.use(
      http.post(apiUrl('/auth/login/'), () =>
        HttpResponse.json({ detail: 'Email or password is incorrect.' }, { status: 401 }),
      ),
    )
    const { result } = renderAuth()

    await act(async () => {
      await expect(result.current.login('sam@example.com', 'wrong')).rejects.toBeTruthy()
    })

    expect(result.current.status).toBe('anonymous')
    expect(tokenStore.getRefresh()).toBeNull()
  })

  // --- Sign up -----------------------------------------------------------------

  it('register() creates the account with the browser time zone and logs in', async () => {
    const registerBody: { body?: Record<string, unknown> } = {}
    server.use(
      http.post(apiUrl('/auth/register/'), async ({ request }) => {
        registerBody.body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(testUser, { status: 201 })
      }),
    )
    const loginBody = fakeLogin()
    vi.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      timeZone: 'Asia/Kathmandu',
    } as Intl.ResolvedDateTimeFormatOptions)
    const { result } = renderAuth()

    await act(() =>
      result.current.register({
        full_name: 'Sam Adhikari',
        username: 'sam',
        email: 'sam@example.com',
        password: 'my-Strong-pass-1',
        password_confirm: 'my-Strong-pass-1',
      }),
    )

    expect(registerBody.body?.timezone).toBe('Asia/Kathmandu')
    expect(loginBody.body).toEqual({
      email: 'sam@example.com',
      password: 'my-Strong-pass-1',
      remember_me: false,
    })
    expect(result.current.status).toBe('authenticated')
  })

  it('register() throws the backend errors and stays logged out', async () => {
    server.use(
      http.post(apiUrl('/auth/register/'), () =>
        HttpResponse.json(
          { email: ['An account with this email already exists.'] },
          { status: 400 },
        ),
      ),
    )
    const { result } = renderAuth()

    await act(async () => {
      await expect(
        result.current.register({
          full_name: 'Sam',
          username: 'sam',
          email: 'sam@example.com',
          password: 'x',
          password_confirm: 'x',
        }),
      ).rejects.toMatchObject({ response: { status: 400 } })
    })

    expect(result.current.status).toBe('anonymous')
  })

  // --- Google ------------------------------------------------------------------

  it('loginWithGoogle() logs in and says whether the account is new', async () => {
    server.use(
      http.post(apiUrl('/auth/google/'), () =>
        HttpResponse.json({
          access: 'g-access',
          refresh: 'g-refresh',
          user: testUser,
          created: true,
        }),
      ),
    )
    const { result } = renderAuth()

    let outcome: { created: boolean } | undefined
    await act(async () => {
      outcome = await result.current.loginWithGoogle('google-id-token', true)
    })

    expect(outcome?.created).toBe(true)
    expect(result.current.user).toEqual(testUser)
    expect(localStorage.getItem('habit-tracker.refresh')).toBe('g-refresh')
  })

  // --- Log out -----------------------------------------------------------------

  it('logout() blocks the token on the server and clears everything', async () => {
    fakeLogin()
    const logoutBody: { body?: unknown } = {}
    server.use(
      http.post(apiUrl('/auth/logout/'), async ({ request }) => {
        logoutBody.body = await request.json()
        return new HttpResponse(null, { status: 205 })
      }),
    )
    const { result } = renderAuth()
    await act(() => result.current.login('sam@example.com', 'secret'))

    await act(() => result.current.logout())

    expect(logoutBody.body).toEqual({ refresh: 'refresh-1' })
    expect(result.current.status).toBe('anonymous')
    expect(result.current.user).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })

  it('logout() still logs out locally if the server call fails', async () => {
    fakeLogin()
    server.use(http.post(apiUrl('/auth/logout/'), () => HttpResponse.error()))
    const { result } = renderAuth()
    await act(() => result.current.login('sam@example.com', 'secret'))

    await act(() => result.current.logout())

    expect(result.current.status).toBe('anonymous')
  })

  // --- Profile / expiry --------------------------------------------------------

  it('updateUser() saves the change and updates the user', async () => {
    fakeLogin()
    server.use(
      http.patch(apiUrl('/auth/me/'), () =>
        HttpResponse.json({ ...testUser, timezone: 'Europe/London' }),
      ),
    )
    const { result } = renderAuth()
    await act(() => result.current.login('sam@example.com', 'secret'))

    await act(() => result.current.updateUser({ timezone: 'Europe/London' }))

    expect(result.current.user?.timezone).toBe('Europe/London')
  })

  it('logs out when the session can no longer be renewed', async () => {
    fakeLogin()
    server.use(
      http.patch(apiUrl('/auth/me/'), () =>
        HttpResponse.json({ detail: 'expired' }, { status: 401 }),
      ),
      http.post(apiUrl('/auth/token/refresh/'), () =>
        HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 401 }),
      ),
    )
    const { result } = renderAuth()
    await act(() => result.current.login('sam@example.com', 'secret'))

    await act(async () => {
      await expect(result.current.updateUser({})).rejects.toBeTruthy()
    })

    expect(result.current.status).toBe('anonymous')
    expect(result.current.user).toBeNull()
  })
})
