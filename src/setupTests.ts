import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Remove whatever a test rendered, so the next test starts clean.
afterEach(() => {
  cleanup()
})
