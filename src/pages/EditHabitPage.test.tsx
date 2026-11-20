import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import type { Habit } from '../api/types'
import { expectNoAxeViolations } from '../test/axe'
import { fakeHabitList, makeHabit } from '../test/habits'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { startLoggedIn } from '../test/session'

const GYM = makeHabit({
  id: 4,
  name: 'Gym',
  target: '45 minutes',
  icon: '💪',
  color: '#BE185D',
  schedule_type: 'weekdays',
  weekdays: [0, 3],
})

/** Open the edit page for `habit` as a logged-in user and wait for the form. */
async function openEdit(habit: Habit = GYM) {
  startLoggedIn()
  server.use(http.get(apiUrl(`/habits/${habit.id}/`), () => HttpResponse.json(habit)))
  const view = renderApp(`/habits/${habit.id}/edit`)
  await screen.findByLabelText('Name')
  return view
}

describe('EditHabitPage', () => {
  it('fills the form with the saved habit', async () => {
    await openEdit()

    expect(document.title).toBe('Edit habit | HabitSquad')
    expect(screen.getByRole('heading', { name: 'Edit habit' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name')).toHaveValue('Gym')
    expect(screen.getByLabelText('Target (optional)')).toHaveValue('45 minutes')
    expect(screen.getByRole('radio', { name: 'Strength' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Pink' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Specific days' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Monday' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Thursday' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Tuesday' })).not.toBeChecked()
  })

  it('shows a loading message first', async () => {
    startLoggedIn()
    server.use(http.get(apiUrl('/habits/4/'), () => HttpResponse.json(GYM)))
    renderApp('/habits/4/edit')

    expect(await screen.findByText('Loading habit…')).toBeInTheDocument()
    expect(await screen.findByLabelText('Name')).toHaveValue('Gym')
  })

  it('keeps an icon that is not in the picker', async () => {
    await openEdit(makeHabit({ id: 8, icon: '🦄' }))

    expect(screen.getByRole('radio', { name: 'Current (🦄)' })).toBeChecked()
  })

  it('saves the changes and goes back to the list with a message', async () => {
    let sent: unknown
    server.use(
      http.patch(apiUrl('/habits/4/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...GYM, name: 'Gym session' })
      }),
    )
    fakeHabitList([GYM])
    await openEdit()

    await userEvent.clear(screen.getByLabelText('Name'))
    await userEvent.type(screen.getByLabelText('Name'), 'Gym session')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Friday' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByRole('heading', { name: 'Your habits' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('“Gym session” was saved.')
    expect(sent).toEqual({
      name: 'Gym session',
      target: '45 minutes',
      icon: '💪',
      color: '#BE185D',
      schedule_type: 'weekdays',
      weekdays: [0, 3, 4],
      times_per_week: null,
    })
  })

  it('switching to "Every day" drops the days', async () => {
    let sent: unknown
    server.use(
      http.patch(apiUrl('/habits/4/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(GYM)
      }),
    )
    fakeHabitList([GYM])
    await openEdit()

    await userEvent.click(screen.getByRole('radio', { name: 'Every day' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await screen.findByRole('heading', { name: 'Your habits' })
    expect(sent).toMatchObject({ schedule_type: 'daily', weekdays: [], times_per_week: null })
  })

  it('shows "Habit not found" for a habit that is missing or not mine', async () => {
    startLoggedIn()
    server.use(
      http.get(apiUrl('/habits/99/'), () =>
        HttpResponse.json({ detail: 'No Habit matches the given query.' }, { status: 404 }),
      ),
    )
    renderApp('/habits/99/edit')

    expect(await screen.findByRole('heading', { name: 'Habit not found' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to your habits' })).toHaveAttribute(
      'href',
      '/habits',
    )
  })

  it('shows "Habit not found" for a URL that is not a habit id (asks nothing)', async () => {
    startLoggedIn()
    renderApp('/habits/abc/edit')

    expect(await screen.findByRole('heading', { name: 'Habit not found' })).toBeInTheDocument()
  })

  it('shows an alert if the habit cannot be loaded', async () => {
    startLoggedIn()
    server.use(http.get(apiUrl('/habits/4/'), () => HttpResponse.error()))
    renderApp('/habits/4/edit')

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('has no accessibility problems', async () => {
    const { container } = await openEdit()

    await expectNoAxeViolations(container)
  })
})
