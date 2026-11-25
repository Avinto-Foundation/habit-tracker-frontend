import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { api } from '../api/client'
import { tokenStore } from '../api/tokens'
import { expectNoAxeViolations } from '../test/axe'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { fakeLoginOk, HOME_HEADING, startLoggedIn } from '../test/session'

describe('AppRoutes', () => {
  it('shows the home page at / when logged in', async () => {
    startLoggedIn()
    renderApp('/')

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('shows the 404 page for an unknown URL (no login needed)', () => {
    renderApp('/does-not-exist')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('shows the components preview page in development', () => {
    renderApp('/dev/components')

    expect(screen.getByRole('heading', { name: 'Components preview' })).toBeInTheDocument()
  })
})

describe('Protected pages', () => {
  it('send a logged-out user to the login page', async () => {
    renderApp('/')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('show a loading screen while a saved login is checked (no login page flash)', async () => {
    startLoggedIn()
    renderApp('/')

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByRole('heading', { name: 'Welcome back' })).not.toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('come back to the page the user wanted after logging in', async () => {
    fakeLoginOk()
    renderApp('/?tab=today')
    await screen.findByRole('heading', { name: 'Welcome back' })

    await userEvent.type(screen.getByLabelText('Email'), 'sam@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'secret-pass')
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }))

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('send the user to log in when their session expires', async () => {
    startLoggedIn()
    renderApp('/')
    await screen.findByRole('heading', { name: HOME_HEADING })
    // The access token is rejected and the refresh token no longer works either
    // (e.g. it expired after 7 days)...
    server.use(
      http.get(apiUrl('/habits/'), () => HttpResponse.json({ detail: 'expired' }, { status: 401 })),
      http.post(apiUrl('/auth/token/refresh/'), () =>
        HttpResponse.json({ detail: 'Token is blacklisted' }, { status: 401 }),
      ),
    )

    // ...so when the page asks the API for something, the app gives up and logs out.
    await act(() => api.get('/habits/').catch(() => undefined))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(tokenStore.getRefresh()).toBeNull()
  })
})

describe('AppLayout header', () => {
  it('puts every page inside one <main> with a logo link home', () => {
    renderApp('/does-not-exist')

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'HabitSquad' })).toHaveAttribute('href', '/')
  })

  it('has a "Skip to main content" link as the first thing to Tab to', async () => {
    renderApp('/does-not-exist')

    await userEvent.tab()

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveFocus()
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })

  it('shows Log in and Sign up links when logged out', () => {
    renderApp('/does-not-exist')
    const nav = screen.getByRole('navigation', { name: 'Account' })

    expect(nav).toHaveTextContent('Log in')
    expect(screen.getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('marks the link to the current page', () => {
    renderApp('/signup')
    const nav = within(screen.getByRole('navigation', { name: 'Account' }))

    expect(nav.getByRole('link', { name: 'Sign up' })).toHaveAttribute('aria-current', 'page')
    expect(nav.getByRole('link', { name: 'Log in' })).not.toHaveAttribute('aria-current')
  })

  it('shows the account menu (initials + first name) when logged in', async () => {
    startLoggedIn()
    renderApp('/')

    const button = await screen.findByRole('button', { name: 'Account menu for Sam Adhikari' })
    expect(button).toHaveTextContent('SASam')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Log in' })).not.toBeInTheDocument()
  })

  it('Log out blocks the token, clears the login and goes to the login page', async () => {
    startLoggedIn()
    const logoutBody: { body?: unknown } = {}
    server.use(
      http.post(apiUrl('/auth/logout/'), async ({ request }) => {
        logoutBody.body = await request.json()
        return new HttpResponse(null, { status: 205 })
      }),
    )
    renderApp('/')
    await screen.findByRole('heading', { name: HOME_HEADING })

    await userEvent.click(screen.getByRole('button', { name: /^Account menu/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Log out' }))

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(logoutBody.body).toEqual({ refresh: 'refresh-2' })
    await waitFor(() => expect(tokenStore.getRefresh()).toBeNull())
    expect(screen.getByRole('link', { name: 'Log in' })).toBeInTheDocument()
  })

  it('has no accessibility problems (logged out, preview page)', async () => {
    const { container } = renderApp('/dev/components')

    await expectNoAxeViolations(container)
  })

  it('has no accessibility problems (logged in, home page)', async () => {
    startLoggedIn()
    const { container } = renderApp('/')
    await screen.findByRole('heading', { name: HOME_HEADING })

    await expectNoAxeViolations(container)
  })
})
