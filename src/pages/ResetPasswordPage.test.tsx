import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { tokenStore } from '../api/tokens'
import { RESET_MESSAGES } from '../features/auth/passwordResetMessages'
import { expectNoAxeViolations } from '../test/axe'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { HOME_HEADING, startLoggedIn } from '../test/session'

const LINK = '/reset-password?uid=MQ&token=abc-123'
const CHANGED = 'Your password has been changed. Please log in with your new password.'
const BACKEND_INVALID = 'This reset link is invalid or has expired. Please ask for a new one.'

function fakeConfirm() {
  const sent: { body?: unknown } = {}
  server.use(
    http.post(apiUrl('/auth/password-reset/confirm/'), async ({ request }) => {
      sent.body = await request.json()
      return HttpResponse.json({ detail: CHANGED })
    }),
  )
  return sent
}

function fakeConfirmError(body: object, status = 400) {
  server.use(
    http.post(apiUrl('/auth/password-reset/confirm/'), () => HttpResponse.json(body, { status })),
  )
}

async function choosePassword(password = 'my-New-pass-2', confirm = password) {
  if (password) await userEvent.type(screen.getByLabelText('New password'), password)
  if (confirm) await userEvent.type(screen.getByLabelText('Confirm new password'), confirm)
  await userEvent.click(screen.getByRole('button', { name: 'Change password' }))
}

describe('ResetPasswordPage', () => {
  it('has a title, one heading and two labelled password fields', () => {
    renderApp(LINK)

    expect(document.title).toBe('Reset password | HabitSquad')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Choose a new password' })).toBeInTheDocument()
    expect(screen.getByLabelText('New password')).toHaveAttribute('autocomplete', 'new-password')
    expect(screen.getByLabelText('Confirm new password')).toHaveAttribute(
      'autocomplete',
      'new-password',
    )
  })

  it('has no accessibility problems, empty or with errors', async () => {
    const { container } = renderApp(LINK)
    await expectNoAxeViolations(container)

    await choosePassword('', '')

    await expectNoAxeViolations(container)
  })

  // --- Checks in the browser -------------------------------------------------

  it.each([
    ['', '', 'Create a new password.'],
    ['short', 'short', 'Use at least 8 characters.'],
    ['123456789', '123456789', "Your password can't be only numbers."],
    ['my-New-pass-2', 'different-Pass-3', "Passwords don't match."],
  ])('rejects "%s" / "%s" with "%s"', async (password, confirm, message) => {
    renderApp(LINK)

    await choosePassword(password, confirm)

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  // --- Success -----------------------------------------------------------------

  it('sends uid, token and the new password, then shows the login page with a message', async () => {
    const sent = fakeConfirm()
    renderApp(LINK)

    await choosePassword()

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(CHANGED)
    expect(sent.body).toEqual({
      uid: 'MQ',
      token: 'abc-123',
      new_password: 'my-New-pass-2',
      new_password_confirm: 'my-New-pass-2',
    })
  })

  it('logs this browser out too if it was logged in', async () => {
    startLoggedIn()
    fakeConfirm()
    server.use(http.post(apiUrl('/auth/logout/'), () => new HttpResponse(null, { status: 401 })))
    renderApp(LINK)
    expect(await screen.findByRole('button', { name: /^Account menu/ })).toBeInTheDocument()

    await choosePassword()

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
    expect(tokenStore.getRefresh()).toBeNull()
    expect(screen.queryByRole('heading', { name: HOME_HEADING })).not.toBeInTheDocument()
  })

  it('shows "Saving…" while waiting', async () => {
    server.use(
      http.post(apiUrl('/auth/password-reset/confirm/'), async () => {
        await delay(100)
        return HttpResponse.json({ detail: CHANGED })
      }),
    )
    renderApp(LINK)

    await choosePassword()

    expect(await screen.findByRole('button', { name: 'Saving…' })).toBeDisabled()
    await screen.findByRole('heading', { name: 'Welcome back' })
  })

  // --- Bad links -----------------------------------------------------------------

  it.each(['/reset-password', '/reset-password?uid=MQ', '/reset-password?token=abc'])(
    'shows "invalid link" (and no form) for %s',
    (url) => {
      renderApp(url)

      expect(screen.getByRole('alert')).toHaveTextContent(RESET_MESSAGES.invalidLink)
      expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    },
  )

  it('offers a new link when the backend says the link expired or was used', async () => {
    fakeConfirmError({ token: [BACKEND_INVALID] })
    renderApp(LINK)

    await choosePassword()

    expect(await screen.findByRole('alert')).toHaveTextContent(RESET_MESSAGES.invalidLink)
    expect(screen.queryByLabelText('New password')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('link', { name: 'Ask for a new link' }))
    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument()
  })

  // --- Other backend errors ------------------------------------------------------

  it('shows a weak-password error from the backend under the field', async () => {
    fakeConfirmError({ new_password: ['This password is too common.'] })
    renderApp(LINK)

    await choosePassword('password123')

    expect(await screen.findByText('This password is too common.')).toBeInTheDocument()
    const field = screen.getByLabelText('New password')
    expect(field).toHaveAttribute('aria-invalid', 'true')
    await waitFor(() => expect(field).toHaveFocus())
  })

  it('shows a network error in an alert and keeps the form', async () => {
    server.use(http.post(apiUrl('/auth/password-reset/confirm/'), () => HttpResponse.error()))
    renderApp(LINK)

    await choosePassword()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
    expect(screen.getByLabelText('New password')).toBeInTheDocument()
  })
})
