import { http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { apiUrl, server } from '../test/server'
import { api, onSessionExpired, refreshAccessToken } from './client'
import { tokenStore } from './tokens'

/**
 * A fake protected endpoint that only accepts `Bearer <validToken>`, and a fake
 * refresh endpoint. Returns counters so tests can check what happened.
 */
function fakeBackend({ validToken = 'new-access', refreshWorks = true } = {}) {
  const calls = { protected: 0, refresh: 0, refreshBodies: [] as unknown[] }
  server.use(
    http.get(apiUrl('/habits/'), ({ request }) => {
      calls.protected += 1
      if (request.headers.get('Authorization') !== `Bearer ${validToken}`) {
        return HttpResponse.json({ detail: 'Token expired' }, { status: 401 })
      }
      return HttpResponse.json({ ok: true })
    }),
    http.post(apiUrl('/auth/token/refresh/'), async ({ request }) => {
      calls.refresh += 1
      calls.refreshBodies.push(await request.json())
      if (!refreshWorks) {
        return HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 401 })
      }
      return HttpResponse.json({ access: 'new-access', refresh: 'new-refresh' })
    }),
  )
  return calls
}

describe('api client', () => {
  it('uses the backend URL from .env', () => {
    expect(api.defaults.baseURL).toBe(apiUrl(''))
  })

  it('sends no Authorization header when logged out', async () => {
    let header: string | null = 'not checked'
    server.use(
      http.get(apiUrl('/health/'), ({ request }) => {
        header = request.headers.get('Authorization')
        return HttpResponse.json({ status: 'ok' })
      }),
    )

    await api.get('/health/')

    expect(header).toBeNull()
  })

  it('attaches the access token when logged in', async () => {
    const calls = fakeBackend({ validToken: 'good-access' })
    tokenStore.setTokens('good-access', 'refresh-1', false)

    const response = await api.get('/habits/')

    expect(response.data).toEqual({ ok: true })
    expect(calls.refresh).toBe(0)
  })

  it('on 401, refreshes the token once and repeats the request', async () => {
    const calls = fakeBackend()
    tokenStore.setTokens('expired-access', 'refresh-1', false)

    const response = await api.get('/habits/')

    expect(response.data).toEqual({ ok: true })
    expect(calls.refresh).toBe(1)
    expect(calls.refreshBodies[0]).toEqual({ refresh: 'refresh-1' })
    expect(calls.protected).toBe(2) // first try + retry
    expect(tokenStore.getAccess()).toBe('new-access')
    expect(tokenStore.getRefresh()).toBe('new-refresh') // rotated token saved
  })

  it('shares ONE refresh between requests that fail at the same time', async () => {
    const calls = fakeBackend()
    tokenStore.setTokens('expired-access', 'refresh-1', false)

    const results = await Promise.all([
      api.get('/habits/'),
      api.get('/habits/'),
      api.get('/habits/'),
    ])

    expect(results.every((r) => r.data.ok)).toBe(true)
    expect(calls.refresh).toBe(1) // the backend blocks a refresh token after one use
  })

  it('logs out and tells the app when the refresh fails', async () => {
    fakeBackend({ refreshWorks: false })
    tokenStore.setTokens('expired-access', 'dead-refresh', true)
    const expired = vi.fn()
    const stopListening = onSessionExpired(expired)

    await expect(api.get('/habits/')).rejects.toMatchObject({ response: { status: 401 } })

    expect(expired).toHaveBeenCalledOnce()
    expect(tokenStore.getAccess()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
    stopListening()
  })

  it('does not try to refresh when there is no refresh token', async () => {
    const calls = fakeBackend()

    await expect(api.get('/habits/')).rejects.toMatchObject({ response: { status: 401 } })

    expect(calls.refresh).toBe(0)
  })

  it('does not refresh on a wrong-password 401 from the login endpoint', async () => {
    const calls = fakeBackend()
    server.use(
      http.post(apiUrl('/auth/login/'), () =>
        HttpResponse.json({ detail: 'Email or password is incorrect.' }, { status: 401 }),
      ),
    )
    tokenStore.setTokens('a', 'refresh-1', false)

    await expect(api.post('/auth/login/', {})).rejects.toMatchObject({
      response: { status: 401 },
    })

    expect(calls.refresh).toBe(0)
  })

  it('does not retry other errors such as 400 or 500', async () => {
    const calls = fakeBackend()
    server.use(http.get(apiUrl('/broken/'), () => HttpResponse.json({}, { status: 500 })))
    tokenStore.setTokens('a', 'refresh-1', false)

    await expect(api.get('/broken/')).rejects.toMatchObject({ response: { status: 500 } })

    expect(calls.refresh).toBe(0)
  })

  it('refreshAccessToken() fails clearly without a saved refresh token', async () => {
    await expect(refreshAccessToken()).rejects.toThrow('No refresh token saved.')
  })

  it('onSessionExpired() handler can be removed', async () => {
    fakeBackend({ refreshWorks: false })
    tokenStore.setTokens('expired', 'dead', false)
    const expired = vi.fn()
    onSessionExpired(expired)()

    await expect(api.get('/habits/')).rejects.toBeTruthy()

    expect(expired).not.toHaveBeenCalled()
  })
})
