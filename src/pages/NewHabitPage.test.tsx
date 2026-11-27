import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { expectNoAxeViolations } from '../test/axe'
import { fakeHabitList, makeHabit } from '../test/habits'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { startLoggedIn } from '../test/session'

/** Open the new habit page as a logged-in user and wait for the form. */
async function openForm() {
  startLoggedIn()
  const view = renderApp('/habits/new')
  await screen.findByRole('heading', { name: 'New habit' })
  return view
}

function submit() {
  return userEvent.click(screen.getByRole('button', { name: 'Create habit' }))
}

/** Fake a working POST /habits/ (and the list it goes back to). Returns what was sent. */
function fakeCreateOk() {
  const sent: { body?: Record<string, unknown> } = {}
  server.use(
    http.post(apiUrl('/habits/'), async ({ request }) => {
      sent.body = (await request.json()) as Record<string, unknown>
      return HttpResponse.json(makeHabit({ ...sent.body, id: 5 }), { status: 201 })
    }),
  )
  fakeHabitList([makeHabit({ id: 5 })])
  return sent
}

describe('NewHabitPage', () => {
  // --- What's on the page ----------------------------------------------------

  it('shows the form with sensible defaults', async () => {
    await openForm()

    expect(document.title).toBe('New habit | HabitSquad')
    expect(screen.getByLabelText('Name')).toHaveValue('')
    expect(screen.getByLabelText('Target (optional)')).toHaveValue('')
    expect(screen.getByRole('radio', { name: 'Check mark' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Teal' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Every day' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Every day' })).toHaveAccessibleDescription(
      'Due every day',
    )
  })

  it('groups the choices with a name for each group', async () => {
    await openForm()

    for (const name of ['Icon', 'Colour', 'How often?']) {
      expect(screen.getByRole('group', { name })).toBeInTheDocument()
    }
    expect(within(screen.getByRole('group', { name: 'Icon' })).getAllByRole('radio')).toHaveLength(
      12,
    )
  })

  it('shows the day picker only for "Specific days"', async () => {
    await openForm()
    expect(screen.queryByRole('group', { name: 'Which days?' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Specific days' }))

    const days = screen.getByRole('group', { name: 'Which days?' })
    expect(within(days).getAllByRole('checkbox')).toHaveLength(7)
    expect(within(days).getByRole('checkbox', { name: 'Monday' })).not.toBeChecked()
  })

  it('shows "How many times a week?" only for "Times per week" (3 by default)', async () => {
    await openForm()
    expect(screen.queryByLabelText('How many times a week?')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('radio', { name: 'Times per week' }))

    expect(screen.getByLabelText('How many times a week?')).toHaveValue('3')
  })

  it('has a Cancel link back to the habits list', async () => {
    await openForm()

    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/habits')
  })

  it('has no accessibility problems, empty, with errors or showing the days', async () => {
    const { container } = await openForm()
    await expectNoAxeViolations(container)

    await submit()
    await screen.findByText('Give your habit a name.')
    await expectNoAxeViolations(container)

    await userEvent.click(screen.getByRole('radio', { name: 'Specific days' }))
    await expectNoAxeViolations(container)
  })

  // --- Checks in the browser -------------------------------------------------

  it('needs a name, focuses it and sends nothing', async () => {
    await openForm()

    await submit()

    expect(await screen.findByText('Give your habit a name.')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByLabelText('Name')).toHaveFocus())
    expect(screen.getByLabelText('Name')).toHaveAccessibleDescription('Give your habit a name.')
  })

  it('needs at least one day for "Specific days"', async () => {
    await openForm()
    await userEvent.type(screen.getByLabelText('Name'), 'Gym')
    await userEvent.click(screen.getByRole('radio', { name: 'Specific days' }))

    await submit()

    expect(await screen.findByText('Pick at least one day.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Which days?' })).toHaveAccessibleDescription(
      'Pick at least one day.',
    )
  })

  // --- Sending ---------------------------------------------------------------

  it('creates a daily habit and goes back to the list with a message', async () => {
    const sent = fakeCreateOk()
    await openForm()

    await userEvent.type(screen.getByLabelText('Name'), '  Read  ')
    await userEvent.type(screen.getByLabelText('Target (optional)'), '20 pages')
    await userEvent.click(screen.getByRole('radio', { name: 'Books' }))
    await userEvent.click(screen.getByRole('radio', { name: 'Blue' }))
    await submit()

    expect(await screen.findByRole('heading', { name: 'Your habits' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('“Read” was created.')
    expect(sent.body).toEqual({
      name: 'Read',
      target: '20 pages',
      icon: '📚',
      color: '#1D4ED8',
      schedule_type: 'daily',
      weekdays: [],
      times_per_week: null,
      visibility: 'friends',
    })
  })

  it('sends the chosen days in order for "Specific days"', async () => {
    const sent = fakeCreateOk()
    await openForm()

    await userEvent.type(screen.getByLabelText('Name'), 'Gym')
    await userEvent.click(screen.getByRole('radio', { name: 'Specific days' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Friday' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Monday' }))
    await userEvent.click(screen.getByRole('checkbox', { name: 'Wednesday' }))
    await submit()

    await screen.findByRole('heading', { name: 'Your habits' })
    expect(sent.body).toMatchObject({
      schedule_type: 'weekdays',
      weekdays: [0, 2, 4],
      times_per_week: null,
      visibility: 'friends',
    })
  })

  it('sends the number for "Times per week"', async () => {
    const sent = fakeCreateOk()
    await openForm()

    await userEvent.type(screen.getByLabelText('Name'), 'Swim')
    await userEvent.click(screen.getByRole('radio', { name: 'Times per week' }))
    await userEvent.selectOptions(screen.getByLabelText('How many times a week?'), '2')
    await submit()

    await screen.findByRole('heading', { name: 'Your habits' })
    expect(sent.body).toMatchObject({
      schedule_type: 'times_per_week',
      weekdays: [],
      times_per_week: 2,
    })
  })

  it('shares new habits with friends unless "Only me" is chosen', async () => {
    const sent = fakeCreateOk()
    await openForm()
    expect(screen.getByRole('group', { name: 'Who can see this?' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Friends' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Only me' })).toHaveAccessibleDescription(
      'Hidden from everyone else',
    )

    await userEvent.type(screen.getByLabelText('Name'), 'Journal')
    await userEvent.click(screen.getByRole('radio', { name: 'Only me' }))
    await submit()

    await screen.findByRole('heading', { name: 'Your habits' })
    expect(sent.body).toMatchObject({ name: 'Journal', visibility: 'private' })
  })

  it('shows "Creating…" and blocks a second click while saving', async () => {
    server.use(
      http.post(apiUrl('/habits/'), async () => {
        await delay(50)
        return HttpResponse.json(makeHabit(), { status: 201 })
      }),
    )
    fakeHabitList([makeHabit()])
    await openForm()
    await userEvent.type(screen.getByLabelText('Name'), 'Read')

    await submit()

    expect(screen.getByRole('button', { name: 'Creating…' })).toBeDisabled()
    await screen.findByRole('heading', { name: 'Your habits' })
  })

  it("shows the backend's error under the right field", async () => {
    server.use(
      http.post(apiUrl('/habits/'), () =>
        HttpResponse.json({ icon: ['Choose an emoji as the icon.'] }, { status: 400 }),
      ),
    )
    await openForm()
    await userEvent.type(screen.getByLabelText('Name'), 'Read')

    await submit()

    expect(await screen.findByText('Choose an emoji as the icon.')).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Icon' })).toHaveAccessibleDescription(
      'Choose an emoji as the icon.',
    )
    expect(screen.getByRole('heading', { name: 'New habit' })).toBeInTheDocument()
  })

  it('shows an alert when the server is down', async () => {
    server.use(http.post(apiUrl('/habits/'), () => HttpResponse.error()))
    await openForm()
    await userEvent.type(screen.getByLabelText('Name'), 'Read')

    await submit()

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('needs a login', async () => {
    renderApp('/habits/new')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })
})
