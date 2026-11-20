import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { expectNoAxeViolations } from '../test/axe'
import { fakeHabitList, makeHabit } from '../test/habits'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { HOME_HEADING, startLoggedIn } from '../test/session'

const HABITS = [
  makeHabit({ id: 1, name: 'Read', target: '20 pages', schedule_type: 'daily' }),
  makeHabit({
    id: 2,
    name: 'Gym',
    icon: '💪',
    target: '',
    schedule_type: 'weekdays',
    weekdays: [0, 2, 4],
  }),
]

describe('HabitsPage', () => {
  it('lists my habits with their target and schedule', async () => {
    startLoggedIn()
    fakeHabitList(HABITS)
    renderApp('/habits')

    expect(await screen.findByRole('link', { name: 'Edit Read' })).toBeInTheDocument()
    expect(document.title).toBe('Your habits | HabitSquad')
    expect(screen.getByRole('heading', { level: 1, name: 'Your habits' })).toBeInTheDocument()
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toHaveTextContent('20 pages · Every day')
    expect(items[1]).toHaveTextContent('Gym')
    expect(items[1]).toHaveTextContent('Mon, Wed, Fri')
  })

  it('has an Edit link for each habit that names the habit', async () => {
    startLoggedIn()
    fakeHabitList(HABITS)
    renderApp('/habits')

    expect(await screen.findByRole('link', { name: 'Edit Gym' })).toHaveAttribute(
      'href',
      '/habits/2/edit',
    )
    expect(screen.getByRole('link', { name: 'Edit Read' })).toHaveAttribute(
      'href',
      '/habits/1/edit',
    )
  })

  it('links to the new habit form', async () => {
    startLoggedIn()
    fakeHabitList(HABITS)
    renderApp('/habits')

    expect(await screen.findByRole('link', { name: 'New habit' })).toHaveAttribute(
      'href',
      '/habits/new',
    )
  })

  it('shows a friendly empty state when there are no habits', async () => {
    startLoggedIn()
    fakeHabitList([])
    renderApp('/habits')

    expect(await screen.findByText('No habits yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first habit' })).toHaveAttribute(
      'href',
      '/habits/new',
    )
  })

  it('shows an error if the habits cannot be loaded', async () => {
    startLoggedIn()
    server.use(http.get(apiUrl('/habits/'), () => HttpResponse.error()))
    renderApp('/habits')

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('has no accessibility problems', async () => {
    startLoggedIn()
    fakeHabitList(HABITS)
    const { container } = renderApp('/habits')
    await screen.findByRole('link', { name: 'Edit Read' })

    await expectNoAxeViolations(container)
  })

  it('needs a login', async () => {
    renderApp('/habits')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('is linked from the header when logged in', async () => {
    startLoggedIn()
    fakeHabitList(HABITS)
    renderApp('/')
    await screen.findByRole('heading', { name: HOME_HEADING })

    const mainNav = screen.getByRole('navigation', { name: 'Main' })
    await userEvent.click(within(mainNav).getByRole('link', { name: 'Habits' }))

    expect(await screen.findByRole('heading', { name: 'Your habits' })).toBeInTheDocument()
    expect(within(mainNav).getByRole('link', { name: 'Habits' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('has no Habits link when logged out', () => {
    renderApp('/login')

    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument()
  })
})
