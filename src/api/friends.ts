import { api } from './client'
import type { FriendRequests, Friendship, Profile, SearchResult } from './types'

/** One function per backend friends endpoint. They return the response data or throw. */

/**
 * GET /users/search/?q=: find people by username or name (at least 2 characters).
 * Pass an AbortSignal to cancel a search that's no longer needed (the user typed more).
 */
export async function searchUsers(query: string, signal?: AbortSignal): Promise<SearchResult[]> {
  const response = await api.get<SearchResult[]>('/users/search/', { params: { q: query }, signal })
  return response.data
}

/** GET /friends/requests/: pending requests, incoming and outgoing. */
export async function listFriendRequests(): Promise<FriendRequests> {
  const response = await api.get<FriendRequests>('/friends/requests/')
  return response.data
}

/**
 * POST /friends/requests/: ask someone to be friends. If they had already asked
 * you, you become friends at once (the result then has `status: 'accepted'`).
 */
export async function sendFriendRequest(username: string): Promise<Friendship> {
  const response = await api.post<Friendship>('/friends/requests/', { username })
  return response.data
}

/** POST /friends/requests/<id>/accept/: say yes to a request sent to you. */
export async function acceptFriendRequest(id: number): Promise<Friendship> {
  const response = await api.post<Friendship>(`/friends/requests/${id}/accept/`)
  return response.data
}

/** POST /friends/requests/<id>/decline/: say no (the sender isn't told). */
export async function declineFriendRequest(id: number): Promise<void> {
  await api.post(`/friends/requests/${id}/decline/`)
}

/** DELETE /friends/requests/<id>/: take back a request you sent. */
export async function cancelFriendRequest(id: number): Promise<void> {
  await api.delete(`/friends/requests/${id}/`)
}

/** GET /friends/: my friends, sorted by name. */
export async function listFriends(): Promise<Friendship[]> {
  const response = await api.get<Friendship[]>('/friends/')
  return response.data
}

/** DELETE /friends/<id>/: unfriend (the other person isn't told). */
export async function unfriend(id: number): Promise<void> {
  await api.delete(`/friends/${id}/`)
}

/**
 * GET /users/<username>/: someone's profile. Friends (and you, for your own) also
 * get the habits shared with friends; for everyone else `habits` is null.
 */
export async function getProfile(username: string): Promise<Profile> {
  const response = await api.get<Profile>(`/users/${encodeURIComponent(username)}/`)
  return response.data
}
