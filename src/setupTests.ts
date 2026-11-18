import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll } from 'vitest'
import { tokenStore } from './api/tokens'
import { server } from './test/server'

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
})

afterAll(() => {
  server.close()
})
