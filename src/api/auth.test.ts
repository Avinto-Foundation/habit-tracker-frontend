import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl, server, testUser } from '../test/server'
import * as authApi from './auth'
import { tokenStore } from './tokens'

/** Fake an endpoint and remember the JSON body the app sent to it. */
function captureBody(method: 'post' | 'patch', path: string, response: object, status = 200) {
  const sent: { body?: unknown } = {}
  server.use(
    http[method](apiUrl(path), async ({ request }) => {
      sent.body = await request.json()
      return HttpResponse.json(response, { status })
    }),
  )
  return sent
}

describe('auth API calls', () => {
  it('register() posts the sign-up data and returns the new user', async () => {
    const sent = captureBody('post', '/auth/register/', testUser, 201)
    const data = {
      full_name: 'Sam Adhikari',
      username: 'sam',
      email: 'sam@example.com',
      password: 'my-Strong-pass-1',
      password_confirm: 'my-Strong-pass-1',
      timezone: 'Asia/Kathmandu',
    }

    const user = await authApi.register(data)

    expect(sent.body).toEqual(data)
    expect(user).toEqual(testUser)
  })

  it('login() sends email, password and remember_me', async () => {
    const sent = captureBody('post', '/auth/login/', { access: 'a', refresh: 'r', user: testUser })

    const result = await authApi.login('sam@example.com', 'secret', true)

    expect(sent.body).toEqual({ email: 'sam@example.com', password: 'secret', remember_me: true })
    expect(result).toEqual({ access: 'a', refresh: 'r', user: testUser })
  })

  it('login() sends remember_me false by default', async () => {
    const sent = captureBody('post', '/auth/login/', { access: 'a', refresh: 'r', user: testUser })

    await authApi.login('sam@example.com', 'secret')

    expect(sent.body).toMatchObject({ remember_me: false })
  })

  it('login() throws on wrong credentials', async () => {
    server.use(
      http.post(apiUrl('/auth/login/'), () =>
        HttpResponse.json({ detail: 'Email or password is incorrect.' }, { status: 401 }),
      ),
    )

    await expect(authApi.login('sam@example.com', 'wrong')).rejects.toMatchObject({
      response: { status: 401 },
    })
  })

  it('loginWithGoogle() sends the id_token, remember_me and timezone', async () => {
    const sent = captureBody('post', '/auth/google/', {
      access: 'a',
      refresh: 'r',
      user: testUser,
      created: true,
    })

    const result = await authApi.loginWithGoogle('google-token', true, 'Asia/Kathmandu')

    expect(sent.body).toEqual({
      id_token: 'google-token',
      remember_me: true,
      timezone: 'Asia/Kathmandu',
    })
    expect(result.created).toBe(true)
  })

  it('loginWithGoogle() leaves timezone out when not given', async () => {
    const sent = captureBody('post', '/auth/google/', {
      access: 'a',
      refresh: 'r',
      user: testUser,
      created: false,
    })

    await authApi.loginWithGoogle('google-token')

    expect(sent.body).toEqual({ id_token: 'google-token', remember_me: false })
  })

  it('logout() posts the refresh token', async () => {
    const sent = captureBody('post', '/auth/logout/', {}, 205)

    await authApi.logout('refresh-token')

    expect(sent.body).toEqual({ refresh: 'refresh-token' })
  })

  it('getMe() sends the access token and returns the user', async () => {
    let authHeader: string | null = null
    server.use(
      http.get(apiUrl('/auth/me/'), ({ request }) => {
        authHeader = request.headers.get('Authorization')
        return HttpResponse.json(testUser)
      }),
    )
    tokenStore.setAccess('my-access-token')

    const user = await authApi.getMe()

    expect(authHeader).toBe('Bearer my-access-token')
    expect(user).toEqual(testUser)
  })

  it('updateMe() patches only the given fields', async () => {
    const sent = captureBody('patch', '/auth/me/', { ...testUser, timezone: 'Europe/London' })

    const user = await authApi.updateMe({ timezone: 'Europe/London' })

    expect(sent.body).toEqual({ timezone: 'Europe/London' })
    expect(user.timezone).toBe('Europe/London')
  })
})

describe('password reset API calls', () => {
  it('requestPasswordReset() posts the email and returns the message', async () => {
    const sent = captureBody('post', '/auth/password-reset/', { detail: 'Check your inbox.' })

    const message = await authApi.requestPasswordReset('sam@example.com')

    expect(sent.body).toEqual({ email: 'sam@example.com' })
    expect(message).toBe('Check your inbox.')
  })

  it('confirmPasswordReset() posts uid, token and the new password', async () => {
    const sent = captureBody('post', '/auth/password-reset/confirm/', {
      detail: 'Your password has been changed.',
    })
    const data = {
      uid: 'MQ',
      token: 'abc-123',
      new_password: 'my-New-pass-2',
      new_password_confirm: 'my-New-pass-2',
    }

    const message = await authApi.confirmPasswordReset(data)

    expect(sent.body).toEqual(data)
    expect(message).toBe('Your password has been changed.')
  })
})
