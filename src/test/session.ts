import { http, HttpResponse } from 'msw'
import { tokenStore } from '../api/tokens'
import type { User } from '../api/types'
import { apiUrl, server, testUser } from './server'

/**
 * Start a test as a logged-in user: saves a refresh token (like "Remember me") and
 * fakes the refresh + /me calls the app makes when it opens.
 */
export function startLoggedIn(user: User = testUser) {
  tokenStore.setTokens('old-access', 'saved-refresh', true)
  tokenStore.setAccess(null) // like after a page reload
  server.use(
    http.post(apiUrl('/auth/token/refresh/'), () =>
      HttpResponse.json({ access: 'access-1', refresh: 'refresh-2' }),
    ),
    http.get(apiUrl('/auth/me/'), () => HttpResponse.json(user)),
  )
}

/** Fake a successful POST /auth/login/. Returns the body the app sent. */
export function fakeLoginOk(user: User = testUser) {
  const sent: { body?: unknown } = {}
  server.use(
    http.post(apiUrl('/auth/login/'), async ({ request }) => {
      sent.body = await request.json()
      return HttpResponse.json({ access: 'access-1', refresh: 'refresh-1', user })
    }),
  )
  return sent
}

/**
 * The home (Today) page heading for the test user, e.g. "Good morning, Sam".
 * A pattern, because the greeting depends on the time the test runs.
 */
export const HOME_HEADING = new RegExp(
  `^Good (morning|afternoon|evening), ${testUser.full_name.split(' ')[0]}$`,
)
