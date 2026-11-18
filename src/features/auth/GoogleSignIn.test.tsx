import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it, vi } from 'vitest'
import { MESSAGES } from '../../api/errors'
import { expectNoAxeViolations } from '../../test/axe'
import { fakeGoogle } from '../../test/fakeGoogle'
import { renderApp } from '../../test/renderApp'
import { apiUrl, server, testUser } from '../../test/server'
import { HOME_HEADING } from '../../test/session'
import { GOOGLE_MESSAGES } from './googleMessages'

const REFRESH_KEY = 'habit-tracker.refresh'

/** Fake the backend's POST /auth/google/. Returns the body the app sent. */
function fakeGoogleBackend(created = false) {
  const sent: { body?: Record<string, unknown>; calls: number } = { calls: 0 }
  server.use(
    http.post(apiUrl('/auth/google/'), async ({ request }) => {
      sent.calls += 1
      sent.body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(
        { access: 'g-access', refresh: 'g-refresh', user: testUser, created },
        { status: created ? 201 : 200 },
      )
    }),
  )
  return sent
}

function clickGoogle() {
  return userEvent.click(screen.getByRole('button', { name: 'Continue with Google' }))
}

describe('Continue with Google', () => {
  // --- Where it shows ----------------------------------------------------------

  it.each(['/login', '/signup'])('is shown with an "or" divider on %s', (url) => {
    renderApp(url)

    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
    expect(screen.getByText('or')).toBeInTheDocument()
  })

  it('is hidden when no Google Client ID is set (email/password still work)', () => {
    vi.stubEnv('VITE_GOOGLE_CLIENT_ID', '')
    renderApp('/login')

    expect(screen.queryByRole('button', { name: 'Continue with Google' })).not.toBeInTheDocument()
    expect(screen.queryByText('or')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument()
  })

  it('has no accessibility problems on the login page', async () => {
    const { container } = renderApp('/login')

    await expectNoAxeViolations(container)
  })

  // --- Success -----------------------------------------------------------------

  it('logs in from the login page and goes home', async () => {
    const sent = fakeGoogleBackend()
    renderApp('/login')

    await clickGoogle()

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
    expect(sent.body).toMatchObject({ id_token: 'fake-google-id-token', remember_me: false })
    expect(typeof sent.body?.timezone).toBe('string') // for a brand-new account
    expect(sessionStorage.getItem(REFRESH_KEY)).toBe('g-refresh')
  })

  it('uses the "Remember me" box on the login page', async () => {
    const sent = fakeGoogleBackend()
    renderApp('/login')

    await userEvent.click(screen.getByRole('checkbox', { name: 'Remember me for 7 days' }))
    await clickGoogle()

    await screen.findByRole('heading', { name: HOME_HEADING })
    expect(sent.body).toMatchObject({ remember_me: true })
    expect(localStorage.getItem(REFRESH_KEY)).toBe('g-refresh')
  })

  it('creates an account from the sign-up page and goes home', async () => {
    const sent = fakeGoogleBackend(true)
    renderApp('/signup')

    await clickGoogle()

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
    expect(sent.body).toMatchObject({ id_token: 'fake-google-id-token', remember_me: false })
  })

  it('goes back to the page the user wanted after signing in', async () => {
    fakeGoogleBackend()
    renderApp('/') // protected → sent to login

    await screen.findByRole('heading', { name: 'Welcome back' })
    await clickGoogle()

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('shows "Signing in with Google…" while waiting for the backend', async () => {
    server.use(
      http.post(apiUrl('/auth/google/'), async () => {
        await delay(100)
        return HttpResponse.json({ access: 'a', refresh: 'r', user: testUser, created: false })
      }),
    )
    renderApp('/login')

    await clickGoogle()

    expect(await screen.findByRole('status')).toHaveTextContent('Signing in with Google…')
    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  // --- Problems ----------------------------------------------------------------

  it('shows a message if the Google popup fails or is closed (nothing sent)', async () => {
    fakeGoogle.outcome = 'error'
    renderApp('/login')

    await clickGoogle()

    expect(await screen.findByRole('alert')).toHaveTextContent(GOOGLE_MESSAGES.popupFailed)
  })

  it('shows a message if Google gives no token (nothing sent)', async () => {
    fakeGoogle.credential = undefined
    renderApp('/login')

    await clickGoogle()

    expect(await screen.findByRole('alert')).toHaveTextContent(GOOGLE_MESSAGES.popupFailed)
  })

  it("shows a message if Google's script can't load", async () => {
    fakeGoogle.scriptFails = true
    renderApp('/login')

    expect(await screen.findByRole('alert')).toHaveTextContent(GOOGLE_MESSAGES.scriptFailed)
  })

  it('shows the backend message when it rejects the Google token', async () => {
    server.use(
      http.post(apiUrl('/auth/google/'), () =>
        HttpResponse.json({ detail: 'Google sign-in failed. Please try again.' }, { status: 401 }),
      ),
    )
    renderApp('/login')

    await clickGoogle()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google sign-in failed. Please try again.',
    )
    expect(screen.getByRole('button', { name: 'Continue with Google' })).toBeInTheDocument()
  })

  it('shows the backend message when Google sign-in is switched off on the server', async () => {
    server.use(
      http.post(apiUrl('/auth/google/'), () =>
        HttpResponse.json(
          { detail: 'Google sign-in is not available right now. Please use email and password.' },
          { status: 503 },
        ),
      ),
    )
    renderApp('/signup')

    await clickGoogle()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Google sign-in is not available right now. Please use email and password.',
    )
  })

  it('shows the general message for a server crash', async () => {
    server.use(http.post(apiUrl('/auth/google/'), () => new HttpResponse(null, { status: 500 })))
    renderApp('/login')

    await clickGoogle()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.server)
  })

  it('shows a network message when the backend cannot be reached', async () => {
    server.use(http.post(apiUrl('/auth/google/'), () => HttpResponse.error()))
    renderApp('/login')

    await clickGoogle()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('can try again after a failure', async () => {
    fakeGoogle.outcome = 'error'
    renderApp('/login')
    await clickGoogle()
    await screen.findByRole('alert')

    fakeGoogle.outcome = 'success'
    fakeGoogleBackend()
    await clickGoogle()

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })
})
