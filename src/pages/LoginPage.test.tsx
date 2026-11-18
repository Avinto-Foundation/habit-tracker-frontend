import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { tokenStore } from '../api/tokens'
import { expectNoAxeViolations } from '../test/axe'
import { renderApp } from '../test/renderApp'
import { apiUrl, server, testUser } from '../test/server'
import { fakeLoginOk, HOME_HEADING, startLoggedIn } from '../test/session'

const REFRESH_KEY = 'habit-tracker.refresh'

async function fillForm(email = 'sam@example.com', password = 'my-Strong-pass-1') {
  if (email) await userEvent.type(screen.getByLabelText('Email'), email)
  if (password) await userEvent.type(screen.getByLabelText('Password'), password)
}

function submit() {
  return userEvent.click(screen.getByRole('button', { name: 'Log in' }))
}

function fakeWrongPassword() {
  server.use(
    http.post(apiUrl('/auth/login/'), () =>
      HttpResponse.json({ detail: 'Email or password is incorrect.' }, { status: 401 }),
    ),
  )
}

describe('LoginPage', () => {
  // --- What's on the page ----------------------------------------------------

  it('has a title, one heading, labelled fields and a link to sign up', () => {
    renderApp('/login')

    expect(document.title).toBe('Log in | HabitSquad')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.getByRole('checkbox', { name: 'Remember me for 7 days' })).not.toBeChecked()
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/signup',
    )
  })

  it('has no accessibility problems, empty or with errors', async () => {
    const { container } = renderApp('/login')
    await expectNoAxeViolations(container)

    await submit()

    await expectNoAxeViolations(container)
  })

  // --- Checks in the browser -------------------------------------------------

  it('asks for email and password, focuses the first, and sends nothing', async () => {
    renderApp('/login')

    await submit()

    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()
    expect(screen.getByText('Enter your password.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Email')).toHaveFocus())
  })

  it('checks the email looks like an email', async () => {
    renderApp('/login')

    await fillForm('not-an-email')
    await submit()

    expect(
      await screen.findByText('Enter a valid email address, like name@example.com.'),
    ).toBeInTheDocument()
  })

  // --- Logging in ------------------------------------------------------------

  it('logs in and goes to the home page', async () => {
    const sent = fakeLoginOk()
    renderApp('/login')

    await fillForm(' sam@example.com ')
    await submit()

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
    expect(sent.body).toEqual({
      email: 'sam@example.com',
      password: 'my-Strong-pass-1',
      remember_me: false,
    })
    expect(sessionStorage.getItem(REFRESH_KEY)).toBe('refresh-1') // this tab only
    expect(localStorage.getItem(REFRESH_KEY)).toBeNull()
  })

  it('"Remember me" keeps the login after the browser closes', async () => {
    const sent = fakeLoginOk()
    renderApp('/login')

    await fillForm()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Remember me for 7 days' }))
    await submit()

    await screen.findByRole('heading', { name: HOME_HEADING })
    expect(sent.body).toMatchObject({ remember_me: true })
    expect(localStorage.getItem(REFRESH_KEY)).toBe('refresh-1')
  })

  it('pressing Enter in the password field logs in', async () => {
    fakeLoginOk()
    renderApp('/login')

    await fillForm()
    await userEvent.type(screen.getByLabelText('Password'), '{Enter}')

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('shows "Logging in…" and blocks double clicks while sending', async () => {
    let calls = 0
    server.use(
      http.post(apiUrl('/auth/login/'), async () => {
        calls += 1
        await delay(100)
        return HttpResponse.json({ access: 'a', refresh: 'r', user: testUser })
      }),
    )
    renderApp('/login')
    await fillForm()

    await submit()

    const busy = await screen.findByRole('button', { name: 'Logging in…' })
    expect(busy).toBeDisabled()
    await userEvent.click(busy)
    await screen.findByRole('heading', { name: HOME_HEADING })
    expect(calls).toBe(1)
  })

  // --- Errors ----------------------------------------------------------------

  it('wrong email or password: message under the password, cleared and focused', async () => {
    fakeWrongPassword()
    renderApp('/login')

    await fillForm('sam@example.com', 'wrong-password')
    await submit()

    expect(await screen.findByText('Email or password is incorrect.')).toBeInTheDocument()
    const password = screen.getByLabelText('Password')
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(password).toHaveAccessibleDescription('Email or password is incorrect.')
    expect(password).toHaveValue('')
    await waitFor(() => expect(password).toHaveFocus())
    expect(screen.getByLabelText('Email')).toHaveValue('sam@example.com') // kept
    expect(tokenStore.getAccess()).toBeNull()
  })

  it('can log in after a wrong password', async () => {
    fakeWrongPassword()
    renderApp('/login')
    await fillForm('sam@example.com', 'wrong-password')
    await submit()
    await screen.findByText('Email or password is incorrect.')

    fakeLoginOk()
    await userEvent.type(screen.getByLabelText('Password'), 'my-Strong-pass-1')
    await submit()

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('shows a server error in an alert', async () => {
    server.use(http.post(apiUrl('/auth/login/'), () => new HttpResponse(null, { status: 500 })))
    renderApp('/login')

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.server)
  })

  it('shows a network error in an alert', async () => {
    server.use(http.post(apiUrl('/auth/login/'), () => HttpResponse.error()))
    renderApp('/login')

    await fillForm()
    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('shows backend field errors under the field', async () => {
    server.use(
      http.post(apiUrl('/auth/login/'), () =>
        HttpResponse.json({ email: ['Enter a valid email address.'] }, { status: 400 }),
      ),
    )
    renderApp('/login')

    await fillForm()
    await submit()

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })

  // --- Already logged in -----------------------------------------------------

  it('sends a logged-in user straight to the home page', async () => {
    startLoggedIn()
    renderApp('/login')

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('shows a loading screen (not the form) while a saved login is checked', () => {
    startLoggedIn()
    renderApp('/login')

    expect(screen.getByRole('status')).toHaveTextContent('Loading…')
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })
})
