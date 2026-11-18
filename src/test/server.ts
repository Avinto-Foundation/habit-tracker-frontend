import { setupServer } from 'msw/node'
import { API_BASE_URL } from '../api/client'
import type { User } from '../api/types'

/**
 * A fake backend for tests (Mock Service Worker). It catches requests the app
 * makes and answers with whatever each test sets up with `server.use(...)`.
 * Any request a test didn't set up makes the test fail, so nothing slips through.
 */
export const server = setupServer()

/** Full URL of a backend endpoint, e.g. `apiUrl('/auth/login/')`. */
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`
}

/** A sample user, as the backend would send it. */
export const testUser: User = {
  id: 1,
  full_name: 'Sam Adhikari',
  username: 'sam',
  email: 'sam@example.com',
  timezone: 'Asia/Kathmandu',
}
