import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import type { CheckIn, Habit, HabitStats } from '../api/types'
import { expectNoAxeViolations } from '../test/axe'
import { fakeHabitList, fakeHabitPage, makeCheckIn, makeHabit, makeStats } from '../test/habits'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { startLoggedIn } from '../test/session'

// Created on 10 Nov, so yesterday (19 Nov) can still be ticked off.
const READ = makeHabit({ id: 1, created_at: '2026-11-10T08:00:00Z' })

/** Open the habit's page as a logged-in user and wait for it to load. */
async function openPage(
  habit: Habit = READ,
  stats: HabitStats = makeStats({ habit: habit.id }),
  recent: CheckIn[] = [],
) {
  startLoggedIn()
  fakeHabitPage(habit, stats, recent)
  const view = renderApp(`/habits/${habit.id}`)
  await screen.findByRole('heading', { level: 1, name: habit.name })
  return view
}

function region(name: string) {
  return within(screen.getByRole('region', { name }))
}

/** The stat card value for a label, e.g. "Current streak" → "10 days". */
function statValue(label: string) {
  return screen.getByText(label, { selector: 'dt' }).nextElementSibling
}

describe('HabitDetailPage', () => {
  // --- What's on the page ----------------------------------------------------

  it('shows the habit with its target, schedule and links', async () => {
    await openPage()

    expect(document.title).toBe('Read | HabitSquad')
    expect(screen.getByText('20 pages · Every day')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit Read' })).toHaveAttribute(
      'href',
      '/habits/1/edit',
    )
    expect(screen.getByRole('link', { name: 'All habits' })).toHaveAttribute('href', '/habits')
  })

  it('shows the stats', async () => {
    await openPage(READ, makeStats({ current_streak: 4, longest_streak: 9, completion_rate: 80 }))

    expect(statValue('Current streak')).toHaveTextContent('4 days')
    expect(statValue('Longest streak')).toHaveTextContent('9 days')
    expect(statValue('Last 30 days')).toHaveTextContent('80%')
    expect(statValue('Total check-ins')).toHaveTextContent('10')
    expect(screen.queryByText('This week')).not.toBeInTheDocument()
  })

  it('shows weeks and this week for a "times per week" habit', async () => {
    const gym = makeHabit({
      id: 2,
      name: 'Gym',
      schedule_type: 'times_per_week',
      times_per_week: 3,
    })
    await openPage(
      gym,
      makeStats({
        habit: 2,
        current_streak: 1,
        streak_unit: 'weeks',
        week_progress: { done: 1, goal: 3 },
      }),
    )

    expect(statValue('Current streak')).toHaveTextContent('1 week')
    expect(statValue('This week')).toHaveTextContent('1 of 3')
  })

  it('says "Nothing due yet" when there is no completion rate', async () => {
    await openPage(READ, makeStats({ completion_rate: null }))

    expect(statValue('Last 30 days')).toHaveTextContent('Nothing due yet')
  })

  it('has no accessibility problems', async () => {
    const { container } = await openPage()

    await expectNoAxeViolations(container)
  })

  // --- Calendar --------------------------------------------------------------

  it('shows the month as a table with each day in words', async () => {
    await openPage()

    const table = screen.getByRole('table', { name: 'November 2026' })
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((th) => th.textContent),
    ).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(within(table).getByText('15 November: Done')).toBeInTheDocument()
    expect(within(table).getByText('25 November: Coming up')).toBeInTheDocument()
    expect(
      within(table).getByText('20 November: Today, not done yet').parentElement,
    ).toHaveAttribute('aria-current', 'date')
  })

  it('starts the month on the right weekday (1 Nov 2026 is a Sunday)', async () => {
    await openPage()

    const firstWeek = within(screen.getByRole('table')).getAllByRole('row')[1]
    const cells = within(firstWeek).getAllByRole('cell')
    expect(cells[6]).toHaveTextContent('1 November')
    expect(cells[0]).toHaveTextContent('')
  })

  it('has a key explaining the colours', async () => {
    await openPage()

    const key = within(screen.getByRole('list', { name: 'Calendar key' }))
    for (const text of ['Done', 'Bonus (done on a day off)', 'Missed', 'Day off']) {
      expect(key.getByText(text)).toBeInTheDocument()
    }
  })

  it("can't go before the habit's first month or after this month", async () => {
    await openPage()

    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
  })

  it('goes to the previous month and back', async () => {
    const months: (string | null)[] = []
    const old = makeHabit({ id: 1, created_at: '2026-09-01T08:00:00Z' })
    fakeHabitPage(old)
    server.use(
      http.get(apiUrl('/habits/1/stats/'), ({ request }) => {
        months.push(new URL(request.url).searchParams.get('month'))
        return HttpResponse.json(makeStats())
      }),
    )
    startLoggedIn()
    renderApp('/habits/1')
    await screen.findByRole('table', { name: 'November 2026' })

    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }))

    expect(await screen.findByRole('table', { name: 'October 2026' })).toBeInTheDocument()
    expect(months.at(-1)).toBe('2026-10')
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled()

    await userEvent.click(screen.getByRole('button', { name: 'Next month' }))

    expect(await screen.findByRole('table', { name: 'November 2026' })).toBeInTheDocument()
  })

  // --- Check in, undo, notes -------------------------------------------------

  it('checks in for today and shows the new stats', async () => {
    let sent: unknown
    await openPage()
    server.use(
      http.post(apiUrl('/habits/1/checkins/'), async ({ request }) => {
        sent = await request.json()
        fakeHabitPage(READ, makeStats({ current_streak: 11 }), [makeCheckIn(1, '2026-11-20')])
        return HttpResponse.json(makeCheckIn(1, '2026-11-20'), { status: 201 })
      }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Mark today as done' }))

    expect(await screen.findByRole('button', { name: 'Undo today' })).toBeInTheDocument()
    expect(sent).toEqual({ date: '2026-11-20' })
    expect(statValue('Current streak')).toHaveTextContent('11 days')
  })

  it('can tick off yesterday late', async () => {
    let sent: unknown
    await openPage()
    server.use(
      http.post(apiUrl('/habits/1/checkins/'), async ({ request }) => {
        sent = await request.json()
        fakeHabitPage(READ, makeStats(), [makeCheckIn(1, '2026-11-19')])
        return HttpResponse.json(makeCheckIn(1, '2026-11-19'), { status: 201 })
      }),
    )

    expect(region('Check in').getByText('· 19 November')).toBeInTheDocument()
    expect(screen.getByText('Forgot yesterday? You can still tick it off.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mark yesterday as done' }))

    expect(await screen.findByRole('button', { name: 'Undo yesterday' })).toBeInTheDocument()
    expect(sent).toEqual({ date: '2026-11-19' })
  })

  it('has no "yesterday" for a habit created today', async () => {
    await openPage(makeHabit({ id: 1, created_at: '2026-11-20T08:00:00Z' }))

    expect(screen.getByRole('button', { name: 'Mark today as done' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark yesterday as done' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Forgot yesterday/)).not.toBeInTheDocument()
  })

  it("undoes today's check-in", async () => {
    let deleted = false
    await openPage(READ, makeStats(), [makeCheckIn(1, '2026-11-20')])
    server.use(
      http.delete(apiUrl('/habits/1/checkins/2026-11-20/'), () => {
        deleted = true
        fakeHabitPage(READ, makeStats(), [])
        return new HttpResponse(null, { status: 204 })
      }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Undo today' }))

    expect(await screen.findByRole('button', { name: 'Mark today as done' })).toBeInTheDocument()
    expect(deleted).toBe(true)
  })

  it('shows a check-in error next to the day', async () => {
    await openPage()
    server.use(
      http.post(apiUrl('/habits/1/checkins/'), () =>
        HttpResponse.json(
          { date: ['You can only check in for today or yesterday.'] },
          { status: 400 },
        ),
      ),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Mark today as done' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'You can only check in for today or yesterday.',
    )
    expect(screen.getByRole('button', { name: 'Mark today as done' })).toBeEnabled()
  })

  it('adds a note to a check-in', async () => {
    let sent: unknown
    await openPage(READ, makeStats(), [makeCheckIn(1, '2026-11-20')])
    server.use(
      http.patch(apiUrl('/habits/1/checkins/2026-11-20/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(makeCheckIn(1, '2026-11-20', 'Read on the bus'))
      }),
    )
    expect(screen.getByText('No note')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add a note for today' }))
    const box = screen.getByLabelText('Note for today')
    expect(box).toHaveFocus()
    expect(box).toHaveAttribute('maxlength', '280')
    await userEvent.type(box, '  Read on the bus ')
    expect(box).toHaveAccessibleDescription('18 / 280 characters')
    await userEvent.click(screen.getByRole('button', { name: 'Save note' }))

    expect(await screen.findByText('“Read on the bus”')).toBeInTheDocument()
    expect(sent).toEqual({ note: 'Read on the bus' })
    expect(screen.getByRole('button', { name: 'Edit note for today' })).toBeInTheDocument()
  })

  it('cancelling a note changes nothing', async () => {
    await openPage(READ, makeStats(), [makeCheckIn(1, '2026-11-20', 'Old note')])

    await userEvent.click(screen.getByRole('button', { name: 'Edit note for today' }))
    expect(screen.getByLabelText('Note for today')).toHaveValue('Old note')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('“Old note”')).toBeInTheDocument()
  })

  it('has no note button for a day that is not done', async () => {
    await openPage()

    expect(screen.queryByRole('button', { name: /note for today/ })).not.toBeInTheDocument()
  })

  // --- Archive ---------------------------------------------------------------

  it('archives the habit and goes back to the list', async () => {
    let sent: unknown
    await openPage()
    server.use(
      http.patch(apiUrl('/habits/1/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...READ, archived: true })
      }),
    )
    fakeHabitList([])

    await userEvent.click(screen.getByRole('button', { name: 'Archive habit' }))

    expect(await screen.findByRole('heading', { name: 'Your habits' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('“Read” was archived.')
    expect(sent).toEqual({ archived: true })
  })

  it('an archived habit says so, hides check-in and can be unarchived', async () => {
    let sent: unknown
    await openPage({ ...READ, archived: true })
    server.use(
      http.patch(apiUrl('/habits/1/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(READ)
      }),
    )
    expect(screen.getByText(/This habit is archived/)).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Check in' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archive habit' })).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Unarchive' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('“Read” is active again.')
    expect(sent).toEqual({ archived: false })
    expect(region('Check in').getByRole('button', { name: 'Mark today as done' })).toBeVisible()
  })

  // --- Delete ----------------------------------------------------------------

  it('asks before deleting, and Cancel keeps the habit', async () => {
    await openPage()

    await userEvent.click(screen.getByRole('button', { name: 'Delete habit' }))

    const dialog = screen.getByRole('alertdialog', { name: 'Delete “Read”?' })
    expect(dialog).toHaveAccessibleDescription(/all 10 of its check-ins/)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete habit' })).toHaveFocus()
  })

  it('deletes after confirming and goes back to the list', async () => {
    let deleted = false
    await openPage()
    server.use(
      http.delete(apiUrl('/habits/1/'), () => {
        deleted = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    fakeHabitList([])

    await userEvent.click(screen.getByRole('button', { name: 'Delete habit' }))
    const dialog = screen.getByRole('alertdialog')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete habit' }))

    expect(await screen.findByRole('heading', { name: 'Your habits' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('“Read” was deleted.')
    expect(deleted).toBe(true)
  })

  it('shows an error if deleting fails', async () => {
    await openPage()
    server.use(http.delete(apiUrl('/habits/1/'), () => HttpResponse.error()))

    await userEvent.click(screen.getByRole('button', { name: 'Delete habit' }))
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete habit' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  it('has no accessibility problems with the dialog open', async () => {
    const { container } = await openPage()

    await userEvent.click(screen.getByRole('button', { name: 'Delete habit' }))

    await expectNoAxeViolations(container)
  })

  // --- Not found and errors --------------------------------------------------

  it('shows "Habit not found" for a habit that is missing or not mine', async () => {
    startLoggedIn()
    server.use(
      http.get(apiUrl('/habits/99/'), () => HttpResponse.json({ detail: 'x' }, { status: 404 })),
      http.get(apiUrl('/habits/99/stats/'), () =>
        HttpResponse.json({ detail: 'x' }, { status: 404 }),
      ),
    )
    renderApp('/habits/99')

    expect(await screen.findByRole('heading', { name: 'Habit not found' })).toBeInTheDocument()
  })

  it('shows "Habit not found" for a URL that is not a habit id', async () => {
    startLoggedIn()
    renderApp('/habits/abc')

    expect(await screen.findByRole('heading', { name: 'Habit not found' })).toBeInTheDocument()
  })

  it('shows an alert if the page cannot be loaded', async () => {
    startLoggedIn()
    server.use(
      http.get(apiUrl('/habits/1/'), () => HttpResponse.error()),
      http.get(apiUrl('/habits/1/stats/'), () => HttpResponse.error()),
    )
    renderApp('/habits/1')

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })
})
