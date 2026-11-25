import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { API_BASE_URL } from '../api/client'
import type { Today, User } from '../api/types'

/** Full URL of a backend endpoint, e.g. `apiUrl('/auth/login/')`. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

/** An empty Today page (no habits yet). */
export const emptyToday: Today = {
  date: '2026-11-20',
  summary: { done: 0, total: 0 },
  due: [],
  not_due: [],
}

/**
 * A fake backend for tests (Mock Service Worker). It catches requests the app
 * makes and answers with whatever each test sets up with `server.use(...)`.
 * Any request a test didn't set up makes the test fail, so nothing slips through.
 *
 * One answer is set up for every test: the home page's GET /habits/today/ (no
 * habits), because many tests end on the home page (e.g. after logging in).
 * Tests about the Today page replace it with `server.use(...)`.
 */
export const server = setupServer(
  http.get(apiUrl('/habits/today/'), () => HttpResponse.json(emptyToday)),
)

/** A sample user, as the backend would send it. */
export const testUser: User = {
  id: 1,
  full_name: 'Sam Adhikari',
  username: 'sam',
  email: 'sam@example.com',
  timezone: 'Asia/Kathmandu',
  bio: '',
  avatar: null,
  date_joined: '2026-11-18T08:00:00Z',
}
