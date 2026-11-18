import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { RESET_MESSAGES } from '../features/auth/passwordResetMessages'
import { expectNoAxeViolations } from '../test/axe'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'

const SENT =
  "If an account with that email exists, we've sent a link to reset the password. Check your inbox (and spam folder)."

function fakeResetRequest() {
  const sent: { body?: unknown; calls: number } = { calls: 0 }
  server.use(
    http.post(apiUrl('/auth/password-reset/'), async ({ request }) => {
      sent.calls += 1
      sent.body = await request.json()
      return HttpResponse.json({ detail: SENT })
    }),
  )
  return sent
}

async function requestLink(email = 'sam@example.com') {
  if (email) await userEvent.type(screen.getByLabelText('Email'), email)
  await userEvent.click(screen.getByRole('button', { name: 'Send reset link' }))
}

describe('ForgotPasswordPage', () => {
  it('has a title, one centred heading, an email field and a link back to log in', () => {
    renderApp('/forgot-password')

    expect(document.title).toBe('Forgot password | HabitSquad')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('autocomplete', 'email')
    const main = screen.getByRole('main')
    expect([...main.querySelectorAll('a')].some((a) => a.getAttribute('href') === '/login')).toBe(
      true,
    )
  })

  it('is reached from the "Forgot password?" link on the login page', async () => {
    renderApp('/login')

    await userEvent.click(screen.getByRole('link', { name: 'Forgot password?' }))

    expect(screen.getByRole('heading', { name: 'Forgot your password?' })).toBeInTheDocument()
  })

  it('has no accessibility problems, empty or with errors', async () => {
    const { container } = renderApp('/forgot-password')
    await expectNoAxeViolations(container)

    await requestLink('')

    await expectNoAxeViolations(container)
  })

  it('checks the email before sending', async () => {
    renderApp('/forgot-password')

    await requestLink('')
    expect(await screen.findByText('Enter your email address.')).toBeInTheDocument()

    await requestLink('not-an-email')
    expect(
      await screen.findByText('Enter a valid email address, like name@example.com.'),
    ).toBeInTheDocument()
  })

  it('sends the email and shows the same message whatever the answer', async () => {
    const sent = fakeResetRequest()
    renderApp('/forgot-password')

    await requestLink(' sam@example.com ')

    expect(await screen.findByRole('alert')).toHaveTextContent(SENT)
    expect(sent.body).toEqual({ email: 'sam@example.com' })
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument() // form replaced
  })

  it('shows "Sending link…" while waiting', async () => {
    server.use(
      http.post(apiUrl('/auth/password-reset/'), async () => {
        await delay(100)
        return HttpResponse.json({ detail: SENT })
      }),
    )
    renderApp('/forgot-password')

    await requestLink()

    expect(await screen.findByRole('button', { name: 'Sending link…' })).toBeDisabled()
    await screen.findByText(SENT)
  })

  it('can send another link (the email is remembered, and can be changed)', async () => {
    const sent = fakeResetRequest()
    renderApp('/forgot-password')
    await requestLink()
    await screen.findByText(SENT)

    await userEvent.click(screen.getByRole('button', { name: 'Send another link' }))
    expect(screen.getByLabelText('Email')).toHaveValue('sam@example.com')
    await userEvent.clear(screen.getByLabelText('Email'))
    await requestLink('other@example.com')

    await waitFor(() => expect(sent.calls).toBe(2))
    expect(sent.body).toEqual({ email: 'other@example.com' })
  })

  it('explains when too many links were requested (429)', async () => {
    server.use(
      http.post(apiUrl('/auth/password-reset/'), () =>
        HttpResponse.json({ detail: 'Request was throttled.' }, { status: 429 }),
      ),
    )
    renderApp('/forgot-password')

    await requestLink()

    expect(await screen.findByRole('alert')).toHaveTextContent(RESET_MESSAGES.tooManyRequests)
  })

  it('shows a network error', async () => {
    server.use(http.post(apiUrl('/auth/password-reset/'), () => HttpResponse.error()))
    renderApp('/forgot-password')

    await requestLink()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('shows a backend email error under the field', async () => {
    server.use(
      http.post(apiUrl('/auth/password-reset/'), () =>
        HttpResponse.json({ email: ['Enter a valid email address.'] }, { status: 400 }),
      ),
    )
    renderApp('/forgot-password')

    await requestLink()

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})
