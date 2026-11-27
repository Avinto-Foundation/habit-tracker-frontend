import { isAxiosError } from 'axios'

/** A backend error turned into something a form can show. */
export interface ApiError {
  /** One message per field, e.g. `{ email: "An account with this email already exists." }`. */
  fields: Record<string, string>
  /** A message for the whole form (shown in an Alert), or null if there are only field errors. */
  message: string | null
}

export const MESSAGES = {
  network: "Can't reach the server. Check your internet connection and try again.",
  server: 'Something went wrong on our side. Please try again in a moment.',
  tooMany: "You've done that too many times. Please wait a while (up to an hour) and try again.",
  unknown: 'Something went wrong. Please try again.',
} as const

function firstMessage(value: unknown): string | null {
  if (typeof value === 'string') return value
  if (Array.isArray(value) && value.length > 0) return firstMessage(value[0])
  return null
}

/**
 * Turn any error from an API call into field messages + a general message.
 *
 * Django REST Framework sends errors like:
 * - `{"email": ["An account with this email already exists."]}`  → field error
 * - `{"detail": "Email or password is incorrect."}`               → general message
 * - `{"non_field_errors": ["..."]}`                               → general message
 */
export function parseApiError(error: unknown): ApiError {
  if (!isAxiosError(error)) return { fields: {}, message: MESSAGES.unknown }
  if (!error.response) return { fields: {}, message: MESSAGES.network }

  const { status, data } = error.response
  // A limit was hit (e.g. 20 friend requests an hour): the backend's own text
  // ("Request was throttled. Expected available in 3599 seconds.") isn't friendly.
  if (status === 429) return { fields: {}, message: MESSAGES.tooMany }
  if (status >= 500) {
    // Use the API's own explanation if it sent one (e.g. 503 "Google sign-in is not
    // available right now..."); a crash page (HTML) gets the general message.
    const detail = (data as { detail?: unknown } | null)?.detail
    return { fields: {}, message: typeof detail === 'string' ? detail : MESSAGES.server }
  }
  if (typeof data !== 'object' || data === null) return { fields: {}, message: MESSAGES.unknown }

  const fields: Record<string, string> = {}
  let message: string | null = null

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const text = firstMessage(value)
    if (!text) continue
    if (key === 'detail' || key === 'non_field_errors') message = text
    else if (key !== 'code' && key !== 'messages') fields[key] = text
  }

  if (!message && Object.keys(fields).length === 0) message = MESSAGES.unknown
  return { fields, message }
}
