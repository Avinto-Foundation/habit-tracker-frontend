import { http, HttpResponse } from 'msw'
import type { FriendRequests, Friendship, SearchResult, UserCard } from '../api/types'
import { apiUrl, server } from './server'

/** Another user's public card. */
export function makeCard(username: string, fullName: string, bio = ''): UserCard {
  return { username, full_name: fullName, bio, avatar: null }
}

export const AARAV = makeCard('aarav', 'Aarav Shrestha', 'Running every morning')
export const MAYA = makeCard('maya', 'Maya Gurung')
export const NIRA = makeCard('nira', 'Nira Thapa')

/** A request or friendship as GET /friends/... returns it. */
export function makeFriendship(
  id: number,
  user: UserCard,
  direction: Friendship['direction'] = 'incoming',
  status: Friendship['status'] = 'pending',
): Friendship {
  return {
    id,
    user,
    status,
    direction,
    created_at: '2026-11-27T08:00:00Z',
    accepted_at: status === 'accepted' ? '2026-11-27T09:00:00Z' : null,
  }
}

/** A search result for `user`. */
export function makeResult(
  user: UserCard,
  status: SearchResult['friendship_status'] = 'none',
  friendshipId: number | null = null,
): SearchResult {
  return { ...user, friendship_status: status, friendship_id: friendshipId }
}

/**
 * Fake the two lists the Friends page loads. Pass functions to make the answer
 * change after an action (they're called on every request).
 */
export function fakeFriendLists(
  requests: FriendRequests | (() => FriendRequests) = { incoming: [], outgoing: [] },
  friends: Friendship[] | (() => Friendship[]) = [],
) {
  server.use(
    http.get(apiUrl('/friends/requests/'), () =>
      HttpResponse.json(typeof requests === 'function' ? requests() : requests),
    ),
    http.get(apiUrl('/friends/'), () =>
      HttpResponse.json(typeof friends === 'function' ? friends() : friends),
    ),
  )
}

/** Fake the search. Returns the list of queries the app sent. */
export function fakeSearch(results: SearchResult[] | ((query: string) => SearchResult[])) {
  const queries: string[] = []
  server.use(
    http.get(apiUrl('/users/search/'), ({ request }) => {
      const query = new URL(request.url).searchParams.get('q') ?? ''
      queries.push(query)
      return HttpResponse.json(typeof results === 'function' ? results(query) : results)
    }),
  )
  return queries
}
