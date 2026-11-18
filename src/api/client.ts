import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { tokenStore } from './tokens'
import type { TokenPair } from './types'

/** Where the backend API lives, from `.env` (`VITE_API_BASE_URL`). */
export const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

/**
 * The one axios instance the whole app uses to call the backend.
 *
 * - Adds `Authorization: Bearer <access token>` to every request when logged in.
 * - If a request gets 401 (access token expired), it gets a new access token with
 *   the refresh token and repeats the request once. If that fails too, the user is
 *   logged out (see `onSessionExpired`).
 */
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  // Use the browser's standard fetch() (supported by all modern browsers). It is
  // also what our test fake backend (MSW) listens to.
  adapter: 'fetch',
})

/** A bare client for the refresh call, so it skips the interceptors below. */
const refreshClient = axios.create({ baseURL: API_BASE_URL, adapter: 'fetch' })

// These endpoints answer 401 for "wrong password" or "bad token" - refreshing
// wouldn't help, so their errors go straight back to the caller.
const NO_RETRY_PATHS = [
  '/auth/login/',
  '/auth/register/',
  '/auth/google/',
  '/auth/token/refresh/',
  '/auth/logout/',
]

let refreshPromise: Promise<string> | null = null
let sessionExpiredHandler: (() => void) | null = null

/**
 * Get a new access token using the saved refresh token, and save the new tokens.
 *
 * If several requests fail at the same moment, they all share ONE refresh call.
 * That matters because the backend blocks a refresh token after it's used once.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refresh = tokenStore.getRefresh()
      if (!refresh) throw new Error('No refresh token saved.')
      const { data } = await refreshClient.post<TokenPair>('/auth/token/refresh/', { refresh })
      tokenStore.setAccess(data.access)
      tokenStore.replaceRefresh(data.refresh)
      return data.access
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

/**
 * Register what to do when the session can't be renewed (refresh token expired or
 * revoked). The auth context uses this to show the user as logged out.
 * Returns a function that removes the handler.
 */
export function onSessionExpired(handler: () => void): () => void {
  sessionExpiredHandler = handler
  return () => {
    if (sessionExpiredHandler === handler) sessionExpiredHandler = null
  }
}

api.interceptors.request.use((config) => {
  const access = tokenStore.getAccess()
  if (access) config.headers.Authorization = `Bearer ${access}`
  return config
})

type RetryConfig = InternalAxiosRequestConfig & { _retried?: boolean }

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as RetryConfig | undefined
    const canRetry =
      error.response?.status === 401 &&
      request !== undefined &&
      !request._retried &&
      !NO_RETRY_PATHS.some((path) => request.url?.includes(path)) &&
      tokenStore.getRefresh() !== null

    if (!canRetry) return Promise.reject(error)

    request._retried = true
    try {
      const access = await refreshAccessToken()
      request.headers.Authorization = `Bearer ${access}`
      return api(request)
    } catch {
      tokenStore.clear()
      sessionExpiredHandler?.()
      return Promise.reject(error)
    }
  },
)
