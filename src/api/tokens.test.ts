import { describe, expect, it } from 'vitest'
import { tokenStore } from './tokens'

const KEY = 'habit-tracker.refresh'

describe('tokenStore', () => {
  it('starts empty', () => {
    expect(tokenStore.getAccess()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })

  it('keeps the access token in memory only', () => {
    tokenStore.setTokens('access-1', 'refresh-1', true)

    expect(tokenStore.getAccess()).toBe('access-1')
    expect(JSON.stringify({ ...localStorage })).not.toContain('access-1')
    expect(JSON.stringify({ ...sessionStorage })).not.toContain('access-1')
  })

  it('"Remember me" saves the refresh token in localStorage', () => {
    tokenStore.setTokens('access-1', 'refresh-1', true)

    expect(localStorage.getItem(KEY)).toBe('refresh-1')
    expect(sessionStorage.getItem(KEY)).toBeNull()
    expect(tokenStore.getRefresh()).toBe('refresh-1')
  })

  it('without "Remember me" saves the refresh token in sessionStorage', () => {
    tokenStore.setTokens('access-1', 'refresh-1', false)

    expect(sessionStorage.getItem(KEY)).toBe('refresh-1')
    expect(localStorage.getItem(KEY)).toBeNull()
    expect(tokenStore.getRefresh()).toBe('refresh-1')
  })

  it('logging in again without "Remember me" removes the old remembered token', () => {
    tokenStore.setTokens('a', 'remembered', true)
    tokenStore.setTokens('b', 'session-only', false)

    expect(localStorage.getItem(KEY)).toBeNull()
    expect(tokenStore.getRefresh()).toBe('session-only')
  })

  it('replaceRefresh keeps a remembered token in localStorage', () => {
    tokenStore.setTokens('a', 'old', true)

    tokenStore.replaceRefresh('new')

    expect(localStorage.getItem(KEY)).toBe('new')
    expect(sessionStorage.getItem(KEY)).toBeNull()
  })

  it('replaceRefresh keeps a session token in sessionStorage', () => {
    tokenStore.setTokens('a', 'old', false)

    tokenStore.replaceRefresh('new')

    expect(sessionStorage.getItem(KEY)).toBe('new')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('clear() forgets everything', () => {
    tokenStore.setTokens('a', 'r', true)

    tokenStore.clear()

    expect(tokenStore.getAccess()).toBeNull()
    expect(tokenStore.getRefresh()).toBeNull()
  })
})
