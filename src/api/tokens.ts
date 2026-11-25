/**
 * Where the login tokens live.
 *
 * - **Access token** (15 min): only in memory (a variable). It disappears when the
 *   page reloads, which is fine: we get a new one with the refresh token.
 * - **Refresh token** (1 or 7 days): in `localStorage` when "Remember me" is ticked
 *   (survives closing the browser), otherwise in `sessionStorage` (gone when the
 *   tab closes).
 *
 * Storage can fail (private mode, blocked site data), so every access is wrapped
 * in try/catch and the app keeps working, just without staying logged in.
 */

const REFRESH_KEY = 'habit-tracker.refresh'

let accessToken: string | null = null

function read(storage: Storage): string | null {
  try {
    return storage.getItem(REFRESH_KEY)
  } catch {
    return null
  }
}

function write(storage: Storage, value: string | null) {
  try {
    if (value === null) storage.removeItem(REFRESH_KEY)
    else storage.setItem(REFRESH_KEY, value)
  } catch {
    // Storage not available: the user just won't stay logged in after a reload.
  }
}

export const tokenStore = {
  /** The current access token, or null if not logged in (or not loaded yet). */
  getAccess(): string | null {
    return accessToken
  },

  setAccess(token: string | null) {
    accessToken = token
  },

  /** The saved refresh token from either storage, or null. */
  getRefresh(): string | null {
    return read(localStorage) ?? read(sessionStorage)
  },

  /** True if the login was saved with "Remember me" (refresh token in localStorage). */
  isRemembered(): boolean {
    return read(localStorage) !== null
  },

  /** Save both tokens after logging in. `rememberMe` decides which storage is used. */
  setTokens(access: string, refresh: string, rememberMe: boolean) {
    accessToken = access
    write(rememberMe ? sessionStorage : localStorage, null)
    write(rememberMe ? localStorage : sessionStorage, refresh)
  },

  /**
   * Save a new refresh token after a refresh (the backend gives a new one each time
   * and blocks the old one). Keeps it in the same storage as before.
   */
  replaceRefresh(refresh: string) {
    const storage = read(localStorage) !== null ? localStorage : sessionStorage
    write(storage, refresh)
  },

  /** Forget everything (log out). */
  clear() {
    accessToken = null
    write(localStorage, null)
    write(sessionStorage, null)
  },
}
