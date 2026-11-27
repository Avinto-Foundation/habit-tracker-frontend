import { useEffect, useState } from 'react'
import { parseApiError } from '../../api/errors'
import { searchUsers } from '../../api/friends'
import type { SearchResult } from '../../api/types'

/** Wait this long after the last key press before searching. */
export const SEARCH_DELAY_MS = 300
export const MIN_QUERY_LENGTH = 2

export type SearchState =
  | { phase: 'idle' } // nothing typed
  | { phase: 'too_short' } // 1 character
  | { phase: 'loading'; results: SearchResult[] | null } // previous results kept while loading
  | { phase: 'done'; results: SearchResult[] }
  | { phase: 'error'; message: string }

/** What the search box holds, as the backend wants it: trimmed, without a leading "@". */
export function cleanQuery(query: string): string {
  return query.trim().replace(/^@/, '').trim()
}

interface Answer {
  query: string
  version: number
  results?: SearchResult[]
  error?: string
}

/**
 * Search people as the user types.
 *
 * - Waits for a short pause in typing (SEARCH_DELAY_MS) instead of searching on
 *   every key press.
 * - Cancels a search that's no longer needed, so an old, slow answer can never
 *   replace a newer one.
 * - Bump `version` to search again (e.g. after "Add friend" changed someone's
 *   status). The old results stay on screen meanwhile, so nothing jumps around.
 */
export function useUserSearch(query: string, version = 0): SearchState {
  const cleaned = cleanQuery(query)
  const [answer, setAnswer] = useState<Answer | null>(null)

  useEffect(() => {
    if (cleaned.length < MIN_QUERY_LENGTH) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      searchUsers(cleaned, controller.signal)
        .then((results) => setAnswer({ query: cleaned, version, results }))
        .catch((error: unknown) => {
          if (controller.signal.aborted) return // replaced by a newer search
          setAnswer({ query: cleaned, version, error: parseApiError(error).message ?? '' })
        })
    }, SEARCH_DELAY_MS)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [cleaned, version])

  if (!cleaned) return { phase: 'idle' }
  if (cleaned.length < MIN_QUERY_LENGTH) return { phase: 'too_short' }
  if (answer?.query === cleaned && answer.version === version) {
    return answer.error !== undefined
      ? { phase: 'error', message: answer.error }
      : { phase: 'done', results: answer.results ?? [] }
  }
  // Still waiting. Same words, older version → keep showing those results.
  const previous = answer?.query === cleaned ? (answer.results ?? null) : null
  return { phase: 'loading', results: previous }
}
