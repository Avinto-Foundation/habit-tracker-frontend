import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { tokenStore } from './api/tokens'
import { fakeGoogle } from './test/fakeGoogle'
import { server } from './test/server'

// Never load the real Google sign-in in tests: use a fake button instead.
vi.mock('@react-oauth/google', async () => (await import('./test/fakeGoogle')).fakeGoogleModule)

// Start the fake backend. A request no test set up is an error, not a silent pass.
beforeAll(() => {
  server.listen({ onUnhandledFrame: 'error' })
})

afterEach(() => {
  cleanup() // remove whatever a test rendered
  server.resetHandlers() // forget the fake responses this test added
  tokenStore.clear() // log out, so the next test starts fresh
  localStorage.clear()
  sessionStorage.clear()
  fakeGoogle.reset()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

afterAll(() => {
  server.close()
})
