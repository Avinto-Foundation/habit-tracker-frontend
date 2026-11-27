import { AxiosError, AxiosHeaders } from 'axios'
import { describe, expect, it } from 'vitest'
import { MESSAGES, parseApiError } from './errors'

/** Build an axios error as if the backend answered with `status` and `data`. */
function httpError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() }
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, {
    status,
    statusText: '',
    data,
    headers: {},
    config,
  })
}

describe('parseApiError', () => {
  it('turns field errors into one message per field', () => {
    const error = httpError(400, {
      email: ['An account with this email already exists.'],
      password_confirm: ["Passwords don't match."],
    })

    expect(parseApiError(error)).toEqual({
      fields: {
        email: 'An account with this email already exists.',
        password_confirm: "Passwords don't match.",
      },
      message: null,
    })
  })

  it('turns a "too many requests" limit (429) into a friendly message', () => {
    const error = httpError(429, {
      detail: 'Request was throttled. Expected available in 3599 seconds.',
    })

    expect(parseApiError(error)).toEqual({ fields: {}, message: MESSAGES.tooMany })
  })

  it('uses only the first message when a field has several', () => {
    const error = httpError(400, { password: ['Too short.', 'Too common.'] })

    expect(parseApiError(error).fields.password).toBe('Too short.')
  })

  it('turns "detail" into a general message', () => {
    const error = httpError(401, { detail: 'Email or password is incorrect.' })

    expect(parseApiError(error)).toEqual({
      fields: {},
      message: 'Email or password is incorrect.',
    })
  })

  it('turns "non_field_errors" into a general message', () => {
    const error = httpError(400, { non_field_errors: ['Something about the whole form.'] })

    expect(parseApiError(error).message).toBe('Something about the whole form.')
  })

  it('ignores token error extras like "code"', () => {
    const error = httpError(401, { detail: 'Token is blacklisted', code: 'token_not_valid' })

    expect(parseApiError(error)).toEqual({ fields: {}, message: 'Token is blacklisted' })
  })

  it('gives a friendly message for server errors (5xx)', () => {
    expect(parseApiError(httpError(500, '<html>Server Error</html>')).message).toBe(MESSAGES.server)
  })

  it("keeps the API's own explanation for a 5xx error when it sends one", () => {
    const error = httpError(503, { detail: 'Google sign-in is not available right now.' })

    expect(parseApiError(error).message).toBe('Google sign-in is not available right now.')
  })

  it('gives a friendly message when the server cannot be reached', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK')

    expect(parseApiError(error)).toEqual({ fields: {}, message: MESSAGES.network })
  })

  it('gives a general message for an empty or strange error body', () => {
    expect(parseApiError(httpError(400, {})).message).toBe(MESSAGES.unknown)
    expect(parseApiError(httpError(400, 'oops')).message).toBe(MESSAGES.unknown)
  })

  it('handles errors that are not from the API at all', () => {
    expect(parseApiError(new Error('boom'))).toEqual({ fields: {}, message: MESSAGES.unknown })
  })
})
