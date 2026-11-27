import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import type { FriendRequests, Friendship, SearchResult } from '../api/types'
import { expectNoAxeViolations } from '../test/axe'
import {
  AARAV,
  fakeFriendLists,
  fakeSearch,
  makeFriendship,
  makeResult,
  MAYA,
  NIRA,
} from '../test/friends'
import { renderApp } from '../test/renderApp'
import { apiUrl, server } from '../test/server'
import { startLoggedIn } from '../test/session'

/** Open /friends logged in and wait for the lists. */
async function openFriends() {
  startLoggedIn()
  const view = renderApp('/friends')
  await screen.findByRole('heading', { name: /^Your friends/ })
  return view
}

function searchBox() {
  return screen.getByRole('searchbox', { name: 'Search by name or username' })
}

async function searchFor(text: string) {
  await userEvent.type(searchBox(), text)
}

function region(name: string | RegExp) {
  return within(screen.getByRole('region', { name }))
}

const NO_REQUESTS: FriendRequests = { incoming: [], outgoing: [] }

describe('FriendsPage', () => {
  // --- The page --------------------------------------------------------------

  it('has a title, a heading and a "Friends" link in the header', async () => {
    fakeFriendLists()
    await openFriends()

    expect(document.title).toBe('Friends | HabitSquad')
    expect(screen.getByRole('heading', { level: 1, name: 'Friends' })).toBeInTheDocument()
    const nav = within(screen.getByRole('navigation', { name: 'Main' }))
    expect(nav.getByRole('link', { name: 'Friends' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows friendly empty states', async () => {
    fakeFriendLists()
    await openFriends()

    expect(screen.getByRole('heading', { name: 'Your friends (0)' })).toBeInTheDocument()
    expect(screen.getByText('No friends yet')).toBeInTheDocument()
    expect(screen.getByText('No one is waiting for your answer.')).toBeInTheDocument()
    expect(screen.getByText('You have no requests waiting.')).toBeInTheDocument()
  })

  it('lists requests and friends with counts', async () => {
    fakeFriendLists(
      {
        incoming: [makeFriendship(1, AARAV, 'incoming')],
        outgoing: [makeFriendship(2, MAYA, 'outgoing')],
      },
      [makeFriendship(3, NIRA, 'outgoing', 'accepted')],
    )
    await openFriends()

    const requests = region('Requests')
    expect(requests.getByRole('heading', { name: 'Waiting for you (1)' })).toBeInTheDocument()
    expect(requests.getByRole('heading', { name: 'Sent by you (1)' })).toBeInTheDocument()
    expect(
      within(screen.getByRole('list', { name: 'Requests waiting for you' })).getByText(
        'Aarav Shrestha',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Requests sent by you' })).toHaveTextContent('@maya')
    expect(screen.getByRole('heading', { name: 'Your friends (1)' })).toBeInTheDocument()
    expect(screen.getByRole('list', { name: 'Your friends' })).toHaveTextContent('Nira Thapa')
  })

  it('shows an error if the lists cannot be loaded', async () => {
    server.use(
      http.get(apiUrl('/friends/requests/'), () => HttpResponse.error()),
      http.get(apiUrl('/friends/'), () => HttpResponse.error()),
    )
    startLoggedIn()
    renderApp('/friends')

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('needs a login', async () => {
    renderApp('/friends')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('has no accessibility problems, with lists and search results', async () => {
    fakeFriendLists({ incoming: [makeFriendship(1, AARAV)], outgoing: [] }, [
      makeFriendship(3, NIRA, 'outgoing', 'accepted'),
    ])
    fakeSearch([makeResult(MAYA)])
    const { container } = await openFriends()

    await searchFor('ma')
    await screen.findByRole('list', { name: 'Search results' })

    await expectNoAxeViolations(container)
  })

  // --- Search ----------------------------------------------------------------

  it('waits for 2 characters before searching', async () => {
    fakeFriendLists()
    const queries = fakeSearch([])
    await openFriends()

    await searchFor('a')

    expect(screen.getByRole('status')).toHaveTextContent('Type at least 2 characters.')
    expect(queries).toEqual([])
  })

  it('searches once after typing stops, without the @, and shows the results', async () => {
    fakeFriendLists()
    const queries = fakeSearch([makeResult(AARAV)])
    await openFriends()

    await searchFor('@aarav')

    const results = await screen.findByRole('list', { name: 'Search results' })
    expect(results).toHaveTextContent('Aarav Shrestha')
    expect(results).toHaveTextContent('@aarav')
    expect(results).toHaveTextContent('Running every morning')
    expect(screen.getByRole('status')).toHaveTextContent('1 person found.')
    expect(queries).toEqual(['aarav']) // not one search per key press
  })

  it('says when no one was found', async () => {
    fakeFriendLists()
    fakeSearch([])
    await openFriends()

    await searchFor('zzz')

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('No one found'))
    expect(screen.queryByRole('list', { name: 'Search results' })).not.toBeInTheDocument()
  })

  it('shows an error if the search fails', async () => {
    fakeFriendLists()
    server.use(http.get(apiUrl('/users/search/'), () => HttpResponse.error()))
    await openFriends()

    await searchFor('aarav')

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  it('shows the right buttons for each person', async () => {
    fakeFriendLists()
    fakeSearch([
      makeResult(AARAV, 'none'),
      makeResult(MAYA, 'request_sent', 2),
      makeResult(NIRA, 'request_received', 3),
      makeResult({ ...AARAV, username: 'old_friend', full_name: 'Old Friend' }, 'friends', 4),
    ])
    await openFriends()

    await searchFor('an')
    const results = within(await screen.findByRole('list', { name: 'Search results' }))

    expect(results.getByRole('button', { name: 'Add friend (Aarav Shrestha)' })).toBeEnabled()
    expect(results.getByText('Requested')).toBeInTheDocument()
    expect(results.getByRole('button', { name: 'Cancel request (Maya Gurung)' })).toBeEnabled()
    expect(results.getByRole('button', { name: 'Accept (Nira Thapa)' })).toBeEnabled()
    expect(results.getByRole('button', { name: 'Decline (Nira Thapa)' })).toBeEnabled()
    const oldFriend = results.getByText('Old Friend').closest('li')!
    expect(oldFriend).toHaveTextContent('Friends')
    expect(within(oldFriend).queryByRole('button')).not.toBeInTheDocument()
  })

  // --- Actions ---------------------------------------------------------------

  it('"Add friend" sends a request and the page updates', async () => {
    let status: SearchResult['friendship_status'] = 'none'
    let outgoing: Friendship[] = []
    fakeFriendLists(() => ({ incoming: [], outgoing }))
    fakeSearch(() => [makeResult(AARAV, status, status === 'none' ? null : 9)])
    let sent: unknown
    server.use(
      http.post(apiUrl('/friends/requests/'), async ({ request }) => {
        sent = await request.json()
        status = 'request_sent'
        outgoing = [makeFriendship(9, AARAV, 'outgoing')]
        return HttpResponse.json(outgoing[0], { status: 201 })
      }),
    )
    await openFriends()
    await searchFor('aarav')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add friend (Aarav Shrestha)' }),
    )

    expect(await screen.findByText('Friend request sent to Aarav Shrestha.')).toBeInTheDocument()
    expect(sent).toEqual({ username: 'aarav' })
    const results = within(screen.getByRole('list', { name: 'Search results' }))
    expect(await results.findByText('Requested')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Sent by you (1)' })).toBeInTheDocument()
  })

  it('keeps focus on the person when their button is replaced', async () => {
    let status: SearchResult['friendship_status'] = 'none'
    fakeFriendLists()
    fakeSearch(() => [makeResult(AARAV, status, status === 'none' ? null : 9)])
    server.use(
      http.post(apiUrl('/friends/requests/'), () => {
        status = 'request_sent'
        return HttpResponse.json(makeFriendship(9, AARAV, 'outgoing'), { status: 201 })
      }),
    )
    await openFriends()
    await searchFor('aarav')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add friend (Aarav Shrestha)' }),
    )
    await screen.findByText('Requested')

    await waitFor(() => expect(screen.getByText('Aarav Shrestha').closest('li')).toHaveFocus())
  })

  it('"Add friend" for someone who already asked you makes you friends', async () => {
    fakeFriendLists()
    fakeSearch([makeResult(AARAV)])
    server.use(
      http.post(apiUrl('/friends/requests/'), () =>
        HttpResponse.json(makeFriendship(9, AARAV, 'incoming', 'accepted')),
      ),
    )
    await openFriends()
    await searchFor('aarav')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add friend (Aarav Shrestha)' }),
    )

    expect(await screen.findByText('You and Aarav Shrestha are now friends.')).toBeInTheDocument()
  })

  it('accepts a request', async () => {
    let incoming = [makeFriendship(1, AARAV)]
    let friends: Friendship[] = []
    fakeFriendLists(
      () => ({ incoming, outgoing: [] }),
      () => friends,
    )
    server.use(
      http.post(apiUrl('/friends/requests/1/accept/'), () => {
        friends = [makeFriendship(1, AARAV, 'incoming', 'accepted')]
        incoming = []
        return HttpResponse.json(friends[0])
      }),
    )
    await openFriends()

    await userEvent.click(screen.getByRole('button', { name: 'Accept (Aarav Shrestha)' }))

    expect(await screen.findByText('You and Aarav Shrestha are now friends.')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Your friends (1)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Waiting for you (0)' })).toBeInTheDocument()
  })

  it('declines a request', async () => {
    let incoming = [makeFriendship(1, AARAV)]
    fakeFriendLists(() => ({ incoming, outgoing: [] }))
    server.use(
      http.post(apiUrl('/friends/requests/1/decline/'), () => {
        incoming = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openFriends()

    await userEvent.click(screen.getByRole('button', { name: 'Decline (Aarav Shrestha)' }))

    expect(await screen.findByText('Request from Aarav Shrestha declined.')).toBeInTheDocument()
    expect(await screen.findByText('No one is waiting for your answer.')).toBeInTheDocument()
  })

  it('cancels a request you sent', async () => {
    let outgoing = [makeFriendship(2, MAYA, 'outgoing')]
    fakeFriendLists(() => ({ incoming: [], outgoing }))
    let cancelled = false
    server.use(
      http.delete(apiUrl('/friends/requests/2/'), () => {
        cancelled = true
        outgoing = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openFriends()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel request (Maya Gurung)' }))

    expect(await screen.findByText('Request to Maya Gurung cancelled.')).toBeInTheDocument()
    expect(cancelled).toBe(true)
  })

  it('unfriends after confirming, and Cancel keeps the friend', async () => {
    let friends = [makeFriendship(3, NIRA, 'outgoing', 'accepted')]
    fakeFriendLists(NO_REQUESTS, () => friends)
    server.use(
      http.delete(apiUrl('/friends/3/'), () => {
        friends = []
        return new HttpResponse(null, { status: 204 })
      }),
    )
    await openFriends()

    await userEvent.click(screen.getByRole('button', { name: 'Unfriend (Nira Thapa)' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('list', { name: 'Your friends' })).toHaveTextContent('Nira Thapa')

    await userEvent.click(screen.getByRole('button', { name: 'Unfriend (Nira Thapa)' }))
    const dialog = screen.getByRole('alertdialog', {
      name: 'Remove Nira Thapa from your friends?',
    })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Unfriend' }))

    expect(await screen.findByText('Nira Thapa was removed from your friends.')).toBeVisible()
    expect(await screen.findByText('No friends yet')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Your friends (0)' })).toHaveFocus(),
    )
  })

  it('explains the hourly limit on requests', async () => {
    fakeFriendLists()
    fakeSearch([makeResult(AARAV)])
    server.use(
      http.post(apiUrl('/friends/requests/'), () =>
        HttpResponse.json({ detail: 'Request was throttled.' }, { status: 429 }),
      ),
    )
    await openFriends()
    await searchFor('aarav')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add friend (Aarav Shrestha)' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(MESSAGES.tooMany)
  })

  it("shows the backend's reason, e.g. already friends", async () => {
    fakeFriendLists()
    fakeSearch([makeResult(AARAV)])
    server.use(
      http.post(apiUrl('/friends/requests/'), () =>
        HttpResponse.json({ username: ["You're already friends."] }, { status: 400 }),
      ),
    )
    await openFriends()
    await searchFor('aarav')

    await userEvent.click(
      await screen.findByRole('button', { name: 'Add friend (Aarav Shrestha)' }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent("You're already friends.")
  })

  it('a request that no longer exists is explained and the page updates', async () => {
    let incoming = [makeFriendship(1, AARAV)]
    fakeFriendLists(() => ({ incoming, outgoing: [] }))
    server.use(
      http.post(apiUrl('/friends/requests/1/accept/'), () => {
        incoming = [] // e.g. Aarav cancelled it meanwhile
        return HttpResponse.json({ detail: 'Not found.' }, { status: 404 })
      }),
    )
    await openFriends()

    await userEvent.click(screen.getByRole('button', { name: 'Accept (Aarav Shrestha)' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That request or friendship no longer exists.',
    )
    expect(await screen.findByText('No one is waiting for your answer.')).toBeInTheDocument()
  })
})
