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

  it('marks private habits with "Only me"', async () => {
    startLoggedIn()
    fakeHabitList([HABITS[0], { ...HABITS[1], visibility: 'private' }])
    renderApp('/habits')

    await screen.findByRole('link', { name: 'Edit Read' })
    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items[0]).not.toHaveTextContent('Only me')
    expect(items[1]).toHaveTextContent('Only me')
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

  it("links each habit's name to its page", async () => {
    startLoggedIn()
    fakeHabitList(HABITS)
    renderApp('/habits')

    expect(await screen.findByRole('link', { name: 'Gym' })).toHaveAttribute('href', '/habits/2')
  })

  it('switches to archived habits and back', async () => {
    const asked: (string | null)[] = []
    startLoggedIn()
    server.use(
      http.get(apiUrl('/habits/'), ({ request }) => {
        const archived = new URL(request.url).searchParams.get('archived')
        asked.push(archived)
        return HttpResponse.json(
          archived === 'true' ? [makeHabit({ id: 9, name: 'Old habit', archived: true })] : HABITS,
        )
      }),
    )
    renderApp('/habits')
    const tabs = within(await screen.findByRole('navigation', { name: 'Habit list' }))
    expect(tabs.getByRole('link', { name: 'Active' })).toHaveAttribute('aria-current', 'page')

    await userEvent.click(tabs.getByRole('link', { name: 'Archived' }))

    expect(await screen.findByRole('link', { name: 'Old habit' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: 'Archived habits' })).toBeInTheDocument()
    expect(tabs.getByRole('link', { name: 'Archived' })).toHaveAttribute('aria-current', 'page')
    expect(screen.queryByRole('link', { name: 'Read' })).not.toBeInTheDocument()
    expect(asked).toEqual([null, 'true'])

    await userEvent.click(tabs.getByRole('link', { name: 'Active' }))

    expect(await screen.findByRole('link', { name: 'Read' })).toBeInTheDocument()
  })

  it('says so when there are no archived habits', async () => {
    startLoggedIn()
    fakeHabitList([])
    renderApp('/habits?archived=true')

    expect(await screen.findByText('No archived habits')).toBeInTheDocument()
    expect(screen.queryByText('No habits yet')).not.toBeInTheDocument()
  })
})
