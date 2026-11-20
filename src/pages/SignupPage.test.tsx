import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { tokenStore } from '../api/tokens'
import { expectNoAxeViolations } from '../test/axe'
import { renderApp } from '../test/renderApp'
import { apiUrl, server, testUser } from '../test/server'
import { HOME_HEADING, WELCOME_HEADING } from '../test/session'

const VALID = {
  fullName: 'Sam Adhikari',
  username: 'sam',
  email: 'sam@example.com',
  password: 'my-Strong-pass-1',
  confirm: 'my-Strong-pass-1',
}

/** Type into the form like a user. Pass '' to leave a field empty. */
async function fillForm(values: Partial<typeof VALID> = {}, { acceptTerms = true } = {}) {
  const v = { ...VALID, ...values }
  const type = async (label: string, text: string) => {
    if (text) await userEvent.type(screen.getByLabelText(label), text)
  }
  await type('Full name', v.fullName)
  await type('Username', v.username)
  await type('Email', v.email)
  await type('Password', v.password)
  await type('Confirm password', v.confirm)
  if (acceptTerms) await userEvent.click(screen.getByRole('checkbox', { name: /I agree/ }))
}

function submit() {
  return userEvent.click(screen.getByRole('button', { name: 'Create account' }))
}

/** Fake a working backend: register + login. Returns what the app sent. */
function fakeSignupBackend() {
  const sent: { register?: Record<string, unknown>; login?: unknown } = {}
  server.use(
    http.post(apiUrl('/auth/register/'), async ({ request }) => {
      sent.register = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(testUser, { status: 201 })
    }),
    http.post(apiUrl('/auth/login/'), async ({ request }) => {
      sent.login = await request.json()
      return HttpResponse.json({ access: 'access-1', refresh: 'refresh-1', user: testUser })
    }),
  )
  return sent
}

function fakeRegisterError(status: number, body: object) {
  server.use(http.post(apiUrl('/auth/register/'), () => HttpResponse.json(body, { status })))
}

describe('SignupPage', () => {
  // --- What's on the page ----------------------------------------------------

  it('has a page title, one heading and all the fields with labels', () => {
    renderApp('/signup')

    expect(document.title).toBe('Sign up | HabitSquad')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument()
    expect(screen.getByLabelText('Full name')).toHaveAttribute('autocomplete', 'name')
    expect(screen.getByLabelText('Username')).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
    expect(screen.getByRole('checkbox', { name: /I agree/ })).not.toBeChecked()
  })

  it('links to the login page under the form', () => {
    renderApp('/signup')
    const main = screen.getByRole('main')

    expect(within(main).getByRole('link', { name: 'Log in' })).toHaveAttribute('href', '/login')
  })

  it('has no accessibility problems, empty or with errors', async () => {
    const { container } = renderApp('/signup')
    await expectNoAxeViolations(container)

    await submit()

    await expectNoAxeViolations(container)
  })

  // --- Checks in the browser -------------------------------------------------

  it('shows an error under every empty field and sends nothing', async () => {
    renderApp('/signup')

    await submit()

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument()
    expect(screen.getByText('Choose a username.')).toBeInTheDocument()
    expect(screen.getByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Create a password.')).toBeInTheDocument()
    expect(screen.getByText('Type your password again.')).toBeInTheDocument()
    expect(screen.getByText('Please accept the terms to continue.')).toBeInTheDocument()
    // (No request handler is set up: if the form had sent anything, the test would fail.)
  })

  it('moves focus to the first field with an error', async () => {
    renderApp('/signup')

    await submit()

    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveFocus())
  })

  it('links each error to its field for screen readers', async () => {
    renderApp('/signup')

    await submit()

    const email = screen.getByLabelText('Email')
    await waitFor(() => expect(email).toHaveAttribute('aria-invalid', 'true'))
    expect(email).toHaveAccessibleDescription('Enter your email address.')
  })

  it.each([
    [{ username: 'a b' }, 'Use 3-30 characters: letters, numbers and underscores only.'],
    [{ username: 'ab' }, 'Use 3-30 characters: letters, numbers and underscores only.'],
    [{ email: 'not-an-email' }, 'Enter a valid email address, like name@example.com.'],
    [{ password: 'short', confirm: 'short' }, 'Use at least 8 characters.'],
    [{ password: '123456789', confirm: '123456789' }, "Your password can't be only numbers."],
    [{ confirm: 'something-different' }, "Passwords don't match."],
  ])('rejects %o with "%s"', async (values, message) => {
    renderApp('/signup')

    await fillForm(values)
    await submit()

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('requires the terms checkbox', async () => {
    renderApp('/signup')

    await fillForm({}, { acceptTerms: false })
    await submit()

    expect(await screen.findByText('Please accept the terms to continue.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /I agree/ })).toHaveAttribute(
      'aria-invalid',
      'true',
    )
  })

  // --- Sending ---------------------------------------------------------------

  it('creates the account, logs in and goes to onboarding', async () => {
    const sent = fakeSignupBackend()
    renderApp('/signup')

    await fillForm({ fullName: '  Sam Adhikari  ', email: ' sam@example.com ' })
    await submit()

    expect(await screen.findByRole('heading', { name: WELCOME_HEADING })).toBeInTheDocument()
    expect(sent.register).toMatchObject({
      full_name: 'Sam Adhikari', // spaces trimmed
      username: 'sam',
      email: 'sam@example.com',
      password: 'my-Strong-pass-1',
      password_confirm: 'my-Strong-pass-1',
    })
    expect(typeof sent.register?.timezone).toBe('string') // browser time zone sent
    expect(sent.register).not.toHaveProperty('terms') // only the backend's fields
    expect(sent.login).toMatchObject({ email: 'sam@example.com' })
    expect(tokenStore.getAccess()).toBe('access-1')
  })

  it('pressing Enter in a field submits the form', async () => {
    fakeSignupBackend()
    renderApp('/signup')

    await fillForm()
    await userEvent.type(screen.getByLabelText('Confirm password'), '{Enter}')

    expect(await screen.findByRole('heading', { name: WELCOME_HEADING })).toBeInTheDocument()
  })

  it('shows "Creating account…" and blocks double clicks while sending', async () => {
    let registerCalls = 0
    server.use(
      http.post(apiUrl('/auth/register/'), async () => {
        registerCalls += 1
        await delay(100)
        return HttpResponse.json(testUser, { status: 201 })
      }),
      http.post(apiUrl('/auth/login/'), () =>
        HttpResponse.json({ access: 'a', refresh: 'r', user: testUser }),
      ),
    )
    renderApp('/signup')
    await fillForm()

    await submit()

    const busyButton = await screen.findByRole('button', { name: 'Creating account…' })
    expect(busyButton).toBeDisabled()
    await userEvent.click(busyButton)
    await screen.findByRole('heading', { name: WELCOME_HEADING })
    expect(registerCalls).toBe(1)
  })

  // --- Errors from the backend -----------------------------------------------

  it('shows "email already taken" under the email field and focuses it', async () => {
    fakeRegisterError(400, { email: ['An account with this email already exists.'] })
    renderApp('/signup')

    await fillForm()
    await submit()

    expect(
      await screen.findByText('An account with this email already exists.'),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(tokenStore.getAccess()).toBeNull()
  })

  it('shows several backend errors at once', async () => {
    fakeRegisterError(400, {
      username: ['This username is already taken.'],
      password: ['This password is too common.'],
    })
    renderApp('/signup')

    await fillForm()
    await submit()

    expect(await screen.findByText('This username is already taken.')).toBeInTheDocument()
    expect(screen.getByText('This password is too common.')).toBeInTheDocument()
  })

  it('shows a server error in an alert', async () => {
    server.use(
      http.post(apiUrl('/auth/register/'), () => new HttpResponse('Server Error', { status: 500 })),
    )
    renderApp('/signup')

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.server)
  })

  it('shows a network error in an alert', async () => {
    server.use(http.post(apiUrl('/auth/register/'), () => HttpResponse.error()))
    renderApp('/signup')

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('shows unexpected backend field errors in the alert', async () => {
    fakeRegisterError(400, { timezone: ["'Mars/Base' is not a valid time zone."] })
    renderApp('/signup')

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      "'Mars/Base' is not a valid time zone.",
    )
  })

  it('removes the alert when the user tries again', async () => {
    let attempt = 0
    server.use(
      http.post(apiUrl('/auth/register/'), () => {
        attempt += 1
        return attempt === 1
          ? new HttpResponse(null, { status: 500 })
          : HttpResponse.json(testUser, { status: 201 })
      }),
      http.post(apiUrl('/auth/login/'), () =>
        HttpResponse.json({ access: 'a', refresh: 'r', user: testUser }),
      ),
    )
    renderApp('/signup')
    await fillForm()

    await submit()
    await screen.findByRole('alert')
    await submit()

    await screen.findByRole('heading', { name: WELCOME_HEADING })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  // --- Already logged in -----------------------------------------------------

  it('sends a logged-in user to the home page', async () => {
    server.use(
      http.post(apiUrl('/auth/token/refresh/'), () =>
        HttpResponse.json({ access: 'a', refresh: 'r' }),
      ),
      http.get(apiUrl('/auth/me/'), () => HttpResponse.json(testUser)),
    )
    tokenStore.setTokens('a', 'saved-refresh', true)

    renderApp('/signup')

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })
})
