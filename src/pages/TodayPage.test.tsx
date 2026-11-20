import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import type { Today } from '../api/types'
import { expectNoAxeViolations } from '../test/axe'
import { fakeToday, makeToday, makeTodayHabit } from '../test/habits'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { HOME_HEADING, startLoggedIn } from '../test/session'

const READ = makeTodayHabit(
  { id: 1, name: 'Read', target: '20 pages', icon: '📚' },
  { current_streak: 5 },
)
const GYM = makeTodayHabit(
  {
    id: 2,
    name: 'Gym',
    target: '',
    icon: '💪',
    schedule_type: 'times_per_week',
    times_per_week: 3,
  },
  { current_streak: 2, streak_unit: 'weeks', week_progress: { done: 1, goal: 3 } },
)
const STRETCH = makeTodayHabit({ id: 3, name: 'Stretch', target: '', icon: '🧘' })
const TODAY = makeToday([READ, GYM], [STRETCH])

/** Open the Today page as a logged-in user and wait for the habits. */
async function openToday(today: Today = TODAY) {
  startLoggedIn()
  fakeToday(today)
  const view = renderApp('/')
  await screen.findByRole('heading', { name: 'Due today' })
  return view
}

function checkButton(name: string) {
  return screen.getByRole('button', { name: `Mark ${name} as done` })
}

/** Fake a working check-in for `habitId`; afterwards GET /today/ answers `after`. */
function fakeCheckInOk(habitId: number, after: Today) {
  const calls = { posted: 0 }
  server.use(
    http.post(apiUrl(`/habits/${habitId}/checkins/`), () => {
      calls.posted += 1
      fakeToday(after)
      return HttpResponse.json(
        { id: 9, habit: habitId, date: '2026-11-20', note: '', created_at: '' },
        { status: 201 },
      )
    }),
  )
  return calls
}

const READ_DONE = makeTodayHabit(READ.habit, {
  current_streak: 6,
  done_today: true,
  checkin: { id: 9, habit: 1, date: '2026-11-20', note: '', created_at: '' },
})

describe('TodayPage', () => {
  // --- What's on the page ----------------------------------------------------

  it('greets the user with the date and shows the page title', async () => {
    await openToday()

    expect(document.title).toBe('Today | HabitSquad')
    expect(screen.getByRole('heading', { level: 1, name: HOME_HEADING })).toBeInTheDocument()
    expect(screen.getByText('Friday, 20 November')).toBeInTheDocument()
  })

  it('shows a loading message first', async () => {
    startLoggedIn()
    fakeToday(TODAY)
    renderApp('/')

    expect(await screen.findByText("Loading today's habits…")).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Due today' })).toBeInTheDocument()
  })

  it('shows progress as text and as a progress bar', async () => {
    await openToday(makeToday([READ_DONE, GYM]))

    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 done')
    const bar = screen.getByRole('progressbar', { name: '1 of 2 done' })
    expect(bar).toHaveAttribute('aria-valuenow', '1')
    expect(bar).toHaveAttribute('aria-valuemax', '2')
  })

  it('lists due habits with target, streak and weekly progress', async () => {
    await openToday()

    const due = within(screen.getByRole('region', { name: 'Due today' }))
    const [read, gym] = due.getAllByRole('listitem')
    expect(read).toHaveTextContent('Read')
    expect(read).toHaveTextContent('20 pages')
    expect(read).toHaveTextContent('5 days streak')
    expect(gym).toHaveTextContent('2 weeks streak')
    expect(gym).toHaveTextContent('1 of 3 this week')
  })

  it('shows no streak for a habit that has none yet', async () => {
    await openToday()

    const notDue = within(screen.getByRole('region', { name: 'Not due today' }))
    expect(notDue.getByRole('listitem')).not.toHaveTextContent('streak')
  })

  it('lists habits not due today as a bonus', async () => {
    await openToday()

    const notDue = within(screen.getByRole('region', { name: 'Not due today' }))
    expect(notDue.getByText('Stretch')).toBeInTheDocument()
    expect(notDue.getByText(/as a bonus/)).toBeInTheDocument()
  })

  it('has check buttons that say what they do and whether the habit is done', async () => {
    await openToday(makeToday([READ_DONE, GYM]))

    expect(checkButton('Read')).toHaveAttribute('aria-pressed', 'true')
    expect(checkButton('Gym')).toHaveAttribute('aria-pressed', 'false')
  })

  it('links to the habits list', async () => {
    await openToday()

    expect(screen.getByRole('link', { name: 'Manage habits' })).toHaveAttribute('href', '/habits')
  })

  it('has no accessibility problems', async () => {
    const { container } = await openToday()

    await expectNoAxeViolations(container)
  })

  // --- Empty states ----------------------------------------------------------

  it('shows a friendly empty state for a new user', async () => {
    startLoggedIn()
    renderApp('/') // the default fake answer: no habits

    expect(await screen.findByText('No habits yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Create your first habit' })).toHaveAttribute(
      'href',
      '/habits/new',
    )
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })

  it('says "day off" when nothing is due but there are other habits', async () => {
    startLoggedIn()
    fakeToday(makeToday([], [STRETCH]))
    renderApp('/')

    expect(await screen.findByText('Nothing due today. Enjoy your day off!')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Not due today' })).toBeInTheDocument()
  })

  it('shows an error if today cannot be loaded', async () => {
    startLoggedIn()
    server.use(http.get(apiUrl('/habits/today/'), () => HttpResponse.error()))
    renderApp('/')

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  // --- Checking in -----------------------------------------------------------

  it('one tap checks a habit in and shows the new streak from the server', async () => {
    const calls = fakeCheckInOk(1, makeToday([READ_DONE, GYM], [STRETCH]))
    await openToday()

    await userEvent.click(checkButton('Read'))

    expect(checkButton('Read')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 done')
    expect(await screen.findByText('6 days')).toBeInTheDocument()
    expect(calls.posted).toBe(1)
  })

  it('updates the screen before the server answers', async () => {
    server.use(
      http.post(apiUrl('/habits/1/checkins/'), async () => {
        await delay('infinite')
        return HttpResponse.json({})
      }),
    )
    await openToday()

    await userEvent.click(checkButton('Read'))

    expect(checkButton('Read')).toHaveAttribute('aria-pressed', 'true')
    expect(checkButton('Read')).toBeDisabled() // no double taps while saving
    expect(screen.getByRole('status')).toHaveTextContent('1 of 2 done')
  })

  it('tapping a done habit undoes it', async () => {
    let deletedUrl = ''
    server.use(
      http.delete(apiUrl('/habits/1/checkins/:date/'), ({ request }) => {
        deletedUrl = request.url
        fakeToday(TODAY)
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openToday(makeToday([READ_DONE, GYM]))

    await userEvent.click(checkButton('Read'))

    expect(checkButton('Read')).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(deletedUrl).toMatch(/\/habits\/1\/checkins\/2026-11-20\/$/))
    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 done')
  })

  it('puts the habit back and explains if saving fails', async () => {
    server.use(http.post(apiUrl('/habits/1/checkins/'), () => HttpResponse.error()))
    await openToday()

    await userEvent.click(checkButton('Read'))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      `Couldn't save “Read”. ${MESSAGES.network}`,
    )
    expect(checkButton('Read')).toHaveAttribute('aria-pressed', 'false')
    expect(checkButton('Read')).toBeEnabled()
    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 done')
  })

  it("shows the backend's reason, e.g. an archived habit", async () => {
    server.use(
      http.post(apiUrl('/habits/1/checkins/'), () =>
        HttpResponse.json(
          { habit: ['This habit is archived. Unarchive it to check in.'] },
          { status: 400 },
        ),
      ),
    )
    await openToday()

    await userEvent.click(checkButton('Read'))

    expect(await screen.findByRole('alert')).toHaveTextContent(`Couldn't save “Read”.`)
  })

  it('a bonus habit can be ticked off without changing the count', async () => {
    fakeCheckInOk(3, makeToday([READ, GYM], [makeTodayHabit(STRETCH.habit, { done_today: true })]))
    await openToday()

    await userEvent.click(checkButton('Stretch'))

    expect(checkButton('Stretch')).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('0 of 2 done')
  })

  // --- Celebration -----------------------------------------------------------

  it('celebrates when everything due today is done', async () => {
    const almost = makeToday([READ_DONE, GYM])
    const gymDone = makeTodayHabit(GYM.habit, { ...GYM, done_today: true })
    fakeCheckInOk(2, makeToday([READ_DONE, gymDone]))
    await openToday(almost)
    expect(screen.queryByText(/All done for today/)).not.toBeInTheDocument()

    await userEvent.click(checkButton('Gym'))

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('2 of 2 done')
    expect(status).toHaveTextContent('All done for today. Great work!')
  })

  it('has no accessibility problems when everything is done', async () => {
    const gymDone = makeTodayHabit(GYM.habit, { ...GYM, done_today: true })
    const { container } = await openToday(makeToday([READ_DONE, gymDone]))

    expect(screen.getByText(/All done for today/)).toBeInTheDocument()
    await expectNoAxeViolations(container)
  })

  // --- Navigation ------------------------------------------------------------

  it('is the "Today" link in the header', async () => {
    await openToday()

    const nav = screen.getByRole('navigation', { name: 'Main' })
    expect(within(nav).getByRole('link', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
  })
})
