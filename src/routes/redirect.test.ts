import { describe, expect, it } from 'vitest'
import { redirectTarget } from './redirect'

const from = (pathname: string, search = '', hash = '') => ({ from: { pathname, search, hash } })

describe('redirectTarget', () => {
  it('goes home when there is nowhere to go back to', () => {
    expect(redirectTarget(null)).toBe('/')
    expect(redirectTarget(undefined)).toBe('/')
    expect(redirectTarget({})).toBe('/')
  })

  it('goes back to the page the user wanted, with its ?query and #hash', () => {
    expect(redirectTarget(from('/habits/3', '?tab=stats', '#week'))).toBe(
      '/habits/3?tab=stats#week',
    )
  })

  it('never sends the user to another website', () => {
    expect(redirectTarget(from('//evil.example.com'))).toBe('/')
    expect(redirectTarget(from('https://evil.example.com'))).toBe('/')
  })

  it('does not go back to the login or sign-up page', () => {
    expect(redirectTarget(from('/login'))).toBe('/')
    expect(redirectTarget(from('/signup'))).toBe('/')
  })

  it('ignores broken state', () => {
    expect(redirectTarget({ from: { pathname: 42 } })).toBe('/')
    expect(redirectTarget('nonsense')).toBe('/')
  })
})
