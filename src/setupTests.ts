// This test setup runs in Node, so it may use Node types (the app code may not).
/// <reference types="node" />
import '@testing-library/jest-dom/vitest'
import { File as NodeFile } from 'node:buffer'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'
import { tokenStore } from './api/tokens'
import { fakeGoogle } from './test/fakeGoogle'
import { server } from './test/server'

// Never load the real Google sign-in in tests: use a fake button instead.
vi.mock('@react-oauth/google', async () => (await import('./test/fakeGoogle')).fakeGoogleModule)

// Requests in tests go through Node's fetch, which only understands Node's own
// FormData and File (jsdom brings different ones). Use Node's, so file uploads
// (the profile photo) are sent like a real browser would send them. Node can
// also make "blob:" preview URLs for its own files (URL.createObjectURL).
const nodeFormData = (await new Response(new URLSearchParams('x=1')).formData()).constructor
globalThis.FormData = nodeFormData as typeof FormData
globalThis.File = NodeFile as unknown as typeof File

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
