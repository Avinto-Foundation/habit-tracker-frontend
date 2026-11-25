import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { apiUrl, server, testUser } from '../test/server'
import * as authApi from './auth'

const WITH_PHOTO = { ...testUser, avatar: 'http://localhost:8000/media/avatars/1/a.webp' }

describe('profile API calls', () => {
  it('updateMe() can change the bio', async () => {
    let sent: unknown
    server.use(
      http.patch(apiUrl('/auth/me/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ ...testUser, bio: 'Reading daily' })
      }),
    )

    const user = await authApi.updateMe({ bio: 'Reading daily' })

    expect(sent).toEqual({ bio: 'Reading daily' })
    expect(user.bio).toBe('Reading daily')
  })

  it('uploadAvatar() sends the photo as a form upload in the "avatar" field', async () => {
    const received: { type?: string | null; name?: string; size?: number } = {}
    server.use(
      http.put(apiUrl('/auth/me/avatar/'), async ({ request }) => {
        received.type = request.headers.get('content-type')
        const file = (await request.formData()).get('avatar') as File
        received.name = file.name
        received.size = file.size
        return HttpResponse.json(WITH_PHOTO)
      }),
    )
    const photo = new File(['fake image bytes'], 'me.png', { type: 'image/png' })

    const user = await authApi.uploadAvatar(photo)

    expect(received.type).toMatch(/^multipart\/form-data; boundary=/)
    expect(received.name).toBe('me.png')
    expect(received.size).toBe(16)
    expect(user.avatar).toBe(WITH_PHOTO.avatar)
  })

  it('removeAvatar() sends DELETE and returns the user without a photo', async () => {
    server.use(http.delete(apiUrl('/auth/me/avatar/'), () => HttpResponse.json(testUser)))

    expect((await authApi.removeAvatar()).avatar).toBeNull()
  })

  it('changePassword() sends the passwords and remember_me, and returns new tokens', async () => {
    let sent: unknown
    server.use(
      http.post(apiUrl('/auth/me/password/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ access: 'new-access', refresh: 'new-refresh' })
      }),
    )
    const data = {
      current_password: 'old-Pass-1',
      new_password: 'new-Pass-22',
      new_password_confirm: 'new-Pass-22',
    }

    const tokens = await authApi.changePassword(data, true)

    expect(sent).toEqual({ ...data, remember_me: true })
    expect(tokens).toEqual({ access: 'new-access', refresh: 'new-refresh' })
  })
})
