import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import type { Profile } from '../api/types'
import { memberSince } from '../features/profile/profileSchemas'
import { expectNoAxeViolations } from '../test/axe'
import {
  AARAV,
  fakeFriendLists,
  fakeProfile,
  makeFriendship,
  makeProfile,
  makeSharedHabit,
} from '../test/friends'
import { renderApp } from '../test/renderApp'
import { apiUrl, server, testUser } from '../test/server'
import { startLoggedIn } from '../test/session'

/** Open /people/<username> logged in and wait for the profile. */
async function openPerson(username = 'aarav', heading = 'Aarav Shrestha') {
  startLoggedIn()
  const view = renderApp(`/people/${username}`)
  await screen.findByRole('heading', { level: 1, name: heading })
  return view
}

function actions() {
  return within(screen.getByRole('group', { name: 'Friendship' }))
}

const FRIEND = makeProfile(AARAV, {
  friendship_status: 'friends',
  friendship_id: 7,
  habits: [
    makeSharedHabit(),
    makeSharedHabit(
      {
        id: 2,
        name: 'Gym',
        target: '',
        icon: '💪',
        schedule_type: 'times_per_week',
        times_per_week: 3,
      },
      {
        current_streak: 1,
        longest_streak: 2,
        streak_unit: 'weeks',
        done_today: false,
        week_progress: { done: 2, goal: 3 },
      },
    ),
  ],
})

describe('PersonProfilePage', () => {
  // --- The card -----------------------------------------------------------------

  it('shows the name, username, bio and join date', async () => {
    fakeProfile(makeProfile())
    await openPerson()

    expect(document.title).toBe('Aarav Shrestha | HabitSquad')
    expect(screen.getByText('@aarav')).toBeInTheDocument()
    expect(screen.getByText('Running every morning')).toBeInTheDocument()
    expect(
      screen.getByText(`Member since ${memberSince('2026-11-10T08:00:00Z')}`),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to Friends' })).toHaveAttribute(
      'href',
      '/friends',
    )
  })

  it('asks for the username in the URL', async () => {
    let asked = ''
    server.use(
      http.get(apiUrl('/users/:username/'), ({ params }) => {
        asked = String(params.username)
        return HttpResponse.json(makeProfile())
      }),
    )
    await openPerson()

    expect(asked).toBe('aarav')
  })

  it('says so when there is no such person', async () => {
    server.use(
      http.get(apiUrl('/users/:username/'), () =>
        HttpResponse.json({ detail: 'Not found.' }, { status: 404 }),
      ),
    )
    startLoggedIn()
    renderApp('/people/nobody')

    expect(
      await screen.findByRole('heading', { level: 1, name: "We couldn't find @nobody" }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Find people on the Friends page' })).toBeVisible()
  })

  it('shows an error if the profile cannot be loaded', async () => {
    server.use(http.get(apiUrl('/users/:username/'), () => HttpResponse.error()))
    startLoggedIn()
    renderApp('/people/aarav')

    expect(await screen.findByRole('alert')).toBeInTheDocument()
  })

  // --- Strangers ----------------------------------------------------------------

  it('hides habits from people who are not friends', async () => {
    fakeProfile(makeProfile())
    await openPerson()

    expect(screen.getByText('Habits are for friends')).toBeInTheDocument()
    expect(
      screen.getByText('Become friends with Aarav to see their habits and streaks.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: /habits/ })).not.toBeInTheDocument()
  })

  it('"Add friend" sends a request and the button becomes "Requested"', async () => {
    let profile: Profile = makeProfile()
    fakeProfile(() => profile)
    let sent: unknown
    server.use(
      http.post(apiUrl('/friends/requests/'), async ({ request }) => {
        sent = await request.json()
        profile = makeProfile(AARAV, { friendship_status: 'request_sent', friendship_id: 3 })
        return HttpResponse.json(makeFriendship(3, AARAV, 'outgoing'), { status: 201 })
      }),
    )
    await openPerson()

    await userEvent.click(actions().getByRole('button', { name: 'Add friend' }))

    expect(await screen.findByText('Friend request sent to Aarav Shrestha.')).toBeInTheDocument()
    expect(sent).toEqual({ username: 'aarav' })
    expect(actions().getByText('Requested')).toBeInTheDocument()
    expect(actions().getByRole('button', { name: 'Cancel request' })).toBeInTheDocument()
    // The pressed button is gone, so focus goes to the buttons' group.
    expect(screen.getByRole('group', { name: 'Friendship' })).toHaveFocus()
  })

  it('"Cancel request" takes the request back', async () => {
    let profile = makeProfile(AARAV, { friendship_status: 'request_sent', friendship_id: 3 })
    fakeProfile(() => profile)
    let cancelled = false
    server.use(
      http.delete(apiUrl('/friends/requests/3/'), () => {
        cancelled = true
        profile = makeProfile()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openPerson()

    await userEvent.click(actions().getByRole('button', { name: 'Cancel request' }))

    expect(await screen.findByText('Request to Aarav Shrestha cancelled.')).toBeInTheDocument()
    expect(cancelled).toBe(true)
    expect(actions().getByRole('button', { name: 'Add friend' })).toBeInTheDocument()
  })

  it('"Accept" makes you friends and shows their habits', async () => {
    let profile = makeProfile(AARAV, { friendship_status: 'request_received', friendship_id: 5 })
    fakeProfile(() => profile)
    server.use(
      http.post(apiUrl('/friends/requests/5/accept/'), () => {
        profile = FRIEND
        return HttpResponse.json(makeFriendship(5, AARAV, 'incoming', 'accepted'))
      }),
    )
    await openPerson()
    expect(actions().getByText('Aarav sent you a friend request.')).toBeInTheDocument()

    await userEvent.click(actions().getByRole('button', { name: 'Accept' }))

    expect(await screen.findByText('You and Aarav Shrestha are now friends.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Run' })).toBeInTheDocument()
  })

  it('"Decline" says no quietly', async () => {
    let profile = makeProfile(AARAV, { friendship_status: 'request_received', friendship_id: 5 })
    fakeProfile(() => profile)
    server.use(
      http.post(apiUrl('/friends/requests/5/decline/'), () => {
        profile = makeProfile()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openPerson()

    await userEvent.click(actions().getByRole('button', { name: 'Decline' }))

    expect(await screen.findByText('Request from Aarav Shrestha declined.')).toBeInTheDocument()
    expect(actions().getByRole('button', { name: 'Add friend' })).toBeInTheDocument()
  })

  it('explains when the request is already gone', async () => {
    let profile = makeProfile(AARAV, { friendship_status: 'request_received', friendship_id: 5 })
    fakeProfile(() => profile)
    server.use(
      http.post(apiUrl('/friends/requests/5/accept/'), () => {
        profile = makeProfile() // they cancelled it meanwhile
        return HttpResponse.json({ detail: 'Not found.' }, { status: 404 })
      }),
    )
    await openPerson()

    await userEvent.click(actions().getByRole('button', { name: 'Accept' }))

    expect(
      await screen.findByText(
        'That request or friendship no longer exists. The page has been updated.',
      ),
    ).toBeInTheDocument()
    expect(actions().getByRole('button', { name: 'Add friend' })).toBeInTheDocument()
  })

  // --- Friends ------------------------------------------------------------------

  it('shows a friend’s shared habits with streaks', async () => {
    fakeProfile(FRIEND)
    await openPerson()

    expect(actions().getByText('Friends')).toBeInTheDocument()
    const list = within(screen.getByRole('list', { name: "Aarav Shrestha's habits" }))
    const [run, gym] = list.getAllByRole('listitem')

    expect(within(run).getByRole('heading', { name: 'Run' })).toBeInTheDocument()
    expect(run).toHaveTextContent('5 km · Every day')
    expect(run).toHaveTextContent('4 days streak')
    expect(run).toHaveTextContent('Best 9 days')
    expect(run).toHaveTextContent('Done today')

    expect(gym).toHaveTextContent('3 times a week')
    expect(gym).toHaveTextContent('1 week streak')
    expect(gym).toHaveTextContent('Best 2 weeks')
    expect(gym).toHaveTextContent('2 of 3 this week')
    expect(gym).not.toHaveTextContent('Done today')
  })

  it('says when a friend shares no habits', async () => {
    fakeProfile({ ...FRIEND, habits: [] })
    await openPerson()

    expect(screen.getByText("Aarav isn't sharing any habits yet")).toBeInTheDocument()
  })

  it('"Unfriend" asks first, then removes them and hides their habits', async () => {
    let profile: Profile = FRIEND
    fakeProfile(() => profile)
    let removed = false
    server.use(
      http.delete(apiUrl('/friends/7/'), () => {
        removed = true
        profile = makeProfile()
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openPerson()

    await userEvent.click(actions().getByRole('button', { name: 'Unfriend' }))
    const dialog = within(
      screen.getByRole('alertdialog', { name: 'Remove Aarav Shrestha from your friends?' }),
    )
    await userEvent.click(dialog.getByRole('button', { name: 'Unfriend' }))

    expect(
      await screen.findByText('Aarav Shrestha was removed from your friends.'),
    ).toBeInTheDocument()
    expect(removed).toBe(true)
    expect(screen.getByText('Habits are for friends')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('group', { name: 'Friendship' })).toHaveFocus())
  })

  it('"Unfriend" can be cancelled', async () => {
    fakeProfile(FRIEND)
    let removed = false
    server.use(
      http.delete(apiUrl('/friends/7/'), () => {
        removed = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openPerson()

    await userEvent.click(actions().getByRole('button', { name: 'Unfriend' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(removed).toBe(false)
    expect(screen.getByRole('heading', { level: 3, name: 'Run' })).toBeInTheDocument()
  })

  // --- Your own profile ------------------------------------------------------

  it('your own profile shows what friends see, with a link to edit it', async () => {
    fakeProfile(
      makeProfile(
        { username: 'sam', full_name: testUser.full_name, bio: '', avatar: null },
        { friendship_status: 'self', habits: [] },
      ),
    )
    await openPerson('sam', testUser.full_name)

    expect(actions().getByText('This is how your friends see your profile.')).toBeInTheDocument()
    expect(actions().getByRole('link', { name: 'Edit profile' })).toHaveAttribute(
      'href',
      '/profile',
    )
    expect(actions().queryByRole('button')).not.toBeInTheDocument()
    expect(screen.getByText("You aren't sharing any habits")).toBeInTheDocument()
  })

  // --- Getting here ----------------------------------------------------------

  it('names on the Friends page open the person’s profile', async () => {
    fakeFriendLists({ incoming: [], outgoing: [] }, [
      makeFriendship(7, AARAV, 'outgoing', 'accepted'),
    ])
    fakeProfile(FRIEND)
    startLoggedIn()
    renderApp('/friends')

    await userEvent.click(await screen.findByRole('link', { name: 'Aarav Shrestha' }))

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Aarav Shrestha' }),
    ).toBeInTheDocument()
  })

  it('has no accessibility problems', async () => {
    fakeProfile(FRIEND)
    const { container } = await openPerson()

    await expectNoAxeViolations(container)
  })
})
