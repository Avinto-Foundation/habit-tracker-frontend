import type { Location } from 'react-router'

/** What a protected page passes to the login page: where the user was going. */
export interface RedirectState {
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>
}

/** A message to show on the login page, e.g. "Your password has been changed…". */
export interface LoginNoticeState {
  notice?: string
}

/** The notice passed to the login page, or null. */
export function loginNotice(state: unknown): string | null {
  const notice = (state as LoginNoticeState | null)?.notice
  return typeof notice === 'string' && notice ? notice : null
}

/**
 * Where to send the user after logging in: the page they were trying to open,
 * or home. Only paths inside this app are allowed (never `//evil.com`), so the
 * login page can't be used to send people to another website.
 */
export function redirectTarget(state: unknown): string {
  const from = (state as RedirectState | null)?.from
  if (!from || typeof from.pathname !== 'string') return '/'
  if (!from.pathname.startsWith('/') || from.pathname.startsWith('//')) return '/'
  if (from.pathname === '/login' || from.pathname === '/signup') return '/'
  return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
}
