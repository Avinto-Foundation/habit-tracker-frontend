import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { expectNoAxeViolations } from '../test/axe'
import { makeHabit } from '../test/habits'
import { renderApp } from '../test/renderApp'
import { apiUrl, server, testUser } from '../test/server'
import { HOME_HEADING, startLoggedIn, WELCOME_HEADING } from '../test/session'

const STEP_2 = 'Create your first habit'

/** Open /welcome as a logged-in user (time zone Asia/Kathmandu) and wait for step 1. */
async function openWelcome() {
  startLoggedIn()
  const view = renderApp('/welcome')
  await screen.findByRole('heading', { name: WELCOME_HEADING })
  return view
}

/** From step 1, continue without changing the time zone. */
async function goToStep2() {
  await openWelcome()
  await userEvent.click(screen.getByRole('button', { name: 'Continue' }))
  await screen.findByRole('heading', { name: STEP_2 })
}

/** Fake a working POST /habits/. Returns what the app sent. */
function fakeCreateHabit() {
  const sent: { body?: Record<string, unknown> } = {}
  server.use(
    http.post(apiUrl('/habits/'), async ({ request }) => {
      sent.body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(makeHabit(sent.body), { status: 201 })
    }),
  )
  return sent
}

describe('WelcomePage', () => {
  // --- Step 1: time zone -----------------------------------------------------

  it('welcomes the user and shows step 1 of 2', async () => {
    await openWelcome()

    expect(document.title).toBe('Welcome | HabitSquad')
    expect(screen.getByText('Welcome to HabitSquad, Sam!')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it("pre-selects the user's saved time zone and shows the time there", async () => {
    await openWelcome()

    const select = screen.getByLabelText('Time zone')
    expect(select).toHaveValue(testUser.timezone)
    expect(screen.getByRole('option', { name: 'Asia / Kathmandu' })).toBeInTheDocument()
    expect(select).toHaveAccessibleDescription(/^It's \d{1,2}:\d{2} (am|pm) there now\./)
  })

  it('continues without saving when the time zone is already right', async () => {
    await openWelcome()

    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    // (No PATCH handler is set up: if the app had sent one, the test would fail.)
    const heading = await screen.findByRole('heading', { name: STEP_2 })
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    expect(heading).toHaveFocus()
  })

  it('saves a changed time zone, then goes to step 2', async () => {
    let sent: unknown
    server.use(
      http.patch(apiUrl('/auth/me/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...testUser, timezone: 'Europe/London' })
      }),
    )
    await openWelcome()

    await userEvent.selectOptions(screen.getByLabelText('Time zone'), 'Europe/London')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('heading', { name: STEP_2 })).toBeInTheDocument()
    expect(sent).toEqual({ timezone: 'Europe/London' })
  })

  it("shows the backend's time zone error under the field", async () => {
    server.use(
      http.patch(apiUrl('/auth/me/'), () =>
        HttpResponse.json({ timezone: ['Unknown time zone.'] }, { status: 400 }),
      ),
    )
    await openWelcome()

    await userEvent.selectOptions(screen.getByLabelText('Time zone'), 'Europe/London')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    const select = screen.getByLabelText('Time zone')
    await waitFor(() => expect(select).toHaveAttribute('aria-invalid', 'true'))
    expect(select).toHaveAccessibleDescription(/Unknown time zone\./)
    expect(screen.getByRole('heading', { name: WELCOME_HEADING })).toBeInTheDocument()
  })

  it('shows an alert if the server is down', async () => {
    server.use(http.patch(apiUrl('/auth/me/'), () => HttpResponse.error()))
    await openWelcome()

    await userEvent.selectOptions(screen.getByLabelText('Time zone'), 'Europe/London')
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('has no accessibility problems on step 1', async () => {
    const { container } = await openWelcome()

    await expectNoAxeViolations(container)
  })

  // --- Step 2: first habit ---------------------------------------------------

  it('offers one-tap suggestions', async () => {
    await goToStep2()

    const list = within(screen.getByRole('list', { name: 'Suggestions' }))
    expect(list.getAllByRole('button')).toHaveLength(6)
    expect(list.getByRole('button', { name: /^Read/ })).toHaveTextContent('Read10 pages, every day')
  })

  it('one tap on a suggestion creates it and opens the Today page', async () => {
    const sent = fakeCreateHabit()
    await goToStep2()

    await userEvent.click(screen.getByRole('button', { name: /^Drink water/ }))

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
    expect(sent.body).toEqual({
      name: 'Drink water',
      target: '8 glasses',
      icon: '💧',
      color: '#0F766E',
      schedule_type: 'daily',
      weekdays: [],
      times_per_week: null,
      visibility: 'friends',
    })
  })

  it('shows an error if the suggestion cannot be saved, and lets the user try again', async () => {
    server.use(http.post(apiUrl('/habits/'), () => HttpResponse.error()))
    await goToStep2()

    await userEvent.click(screen.getByRole('button', { name: /^Read/ }))

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
    expect(screen.getByRole('button', { name: /^Read/ })).toBeEnabled()
  })

  it('"Make your own" opens the habit form and creates the habit', async () => {
    const sent = fakeCreateHabit()
    await goToStep2()

    await userEvent.click(screen.getByRole('button', { name: 'Make your own' }))
    expect(screen.queryByRole('list', { name: 'Suggestions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Cancel' })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Name'), 'Practise guitar')
    await userEvent.click(screen.getByRole('button', { name: 'Create habit' }))

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
    expect(sent.body).toMatchObject({ name: 'Practise guitar', schedule_type: 'daily' })
  })

  it('"Back to suggestions" closes the form', async () => {
    await goToStep2()
    await userEvent.click(screen.getByRole('button', { name: 'Make your own' }))

    await userEvent.click(screen.getByRole('button', { name: 'Back to suggestions' }))

    expect(screen.getByRole('list', { name: 'Suggestions' })).toBeInTheDocument()
  })

  it('"Back" returns to step 1 and focuses its heading', async () => {
    await goToStep2()

    await userEvent.click(screen.getByRole('button', { name: 'Back' }))

    const heading = screen.getByRole('heading', { name: WELCOME_HEADING })
    await waitFor(() => expect(heading).toHaveFocus())
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
  })

  it('"Skip for now" goes to the Today page without creating anything', async () => {
    await goToStep2()

    await userEvent.click(screen.getByRole('link', { name: 'Skip for now' }))

    expect(await screen.findByRole('heading', { name: HOME_HEADING })).toBeInTheDocument()
  })

  it('has no accessibility problems on step 2', async () => {
    await goToStep2()

    await expectNoAxeViolations(document.body)
  })

  // --- Access ----------------------------------------------------------------

  it('needs a login', async () => {
    renderApp('/welcome')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
})
