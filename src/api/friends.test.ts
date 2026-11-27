import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { AARAV, makeFriendship, makeResult } from '../test/friends'
import { apiUrl, server } from '../test/server'
import * as friendsApi from './friends'

describe('friends API calls', () => {
  it('searchUsers() sends the query as q', async () => {
    let query: string | null = null
    server.use(
      http.get(apiUrl('/users/search/'), ({ request }) => {
        query = new URL(request.url).searchParams.get('q')
        return HttpResponse.json([makeResult(AARAV)])
      }),
    )

    expect(await friendsApi.searchUsers('aar')).toEqual([makeResult(AARAV)])
    expect(query).toBe('aar')
  })

  it('searchUsers() can be cancelled', async () => {
    server.use(http.get(apiUrl('/users/search/'), () => HttpResponse.json([])))
    const controller = new AbortController()
    controller.abort()

    await expect(friendsApi.searchUsers('aar', controller.signal)).rejects.toMatchObject({
      code: 'ERR_CANCELED',
    })
  })

  it('listFriendRequests() gets incoming and outgoing', async () => {
    const body = { incoming: [makeFriendship(1, AARAV)], outgoing: [] }
    server.use(http.get(apiUrl('/friends/requests/'), () => HttpResponse.json(body)))

    expect(await friendsApi.listFriendRequests()).toEqual(body)
  })

  it('sendFriendRequest() posts the username', async () => {
    let sent: unknown
    server.use(
      http.post(apiUrl('/friends/requests/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json(makeFriendship(4, AARAV, 'outgoing'), { status: 201 })
      }),
    )

    const result = await friendsApi.sendFriendRequest('aarav')

    expect(sent).toEqual({ username: 'aarav' })
    expect(result.direction).toBe('outgoing')
  })

  it.each([
    ['acceptFriendRequest', 'post', '/friends/requests/4/accept/'],
    ['declineFriendRequest', 'post', '/friends/requests/4/decline/'],
    ['cancelFriendRequest', 'delete', '/friends/requests/4/'],
    ['unfriend', 'delete', '/friends/4/'],
  ] as const)('%s() calls %s %s', async (name, method, path) => {
    let called = false
    server.use(
      http[method](apiUrl(path), () => {
        called = true
        return name === 'acceptFriendRequest'
          ? HttpResponse.json(makeFriendship(4, AARAV, 'incoming', 'accepted'))
          : new HttpResponse(null, { status: 204 })
      }),
    )

    await friendsApi[name](4)

    expect(called).toBe(true)
  })

  it('listFriends() gets the friends list', async () => {
    const friends = [makeFriendship(2, AARAV, 'outgoing', 'accepted')]
    server.use(http.get(apiUrl('/friends/'), () => HttpResponse.json(friends)))

    expect(await friendsApi.listFriends()).toEqual(friends)
  })
})
