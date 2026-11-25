import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { delay, http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { MESSAGES } from '../api/errors'
import { tokenStore } from '../api/tokens'
import type { User } from '../api/types'
import { memberSince } from '../features/profile/profileSchemas'
import { expectNoAxeViolations } from '../test/axe'
import { renderApp } from '../test/renderApp'
import { apiUrl, server, testUser } from '../test/server'
import { startLoggedIn } from '../test/session'

const PHOTO_URL = 'http://localhost:8000/media/avatars/1/new.webp'

/** Open /profile as a logged-in user ("Remember me") and wait for it. */
async function openProfile(user: User = testUser) {
  startLoggedIn(user)
  const view = renderApp('/profile')
  await screen.findByRole('heading', { level: 1, name: user.full_name })
  return view
}

function section(name: string) {
  return within(screen.getByRole('region', { name }))
}

function photo(name = 'me.png', type = 'image/png', bytes = 1000) {
  return new File([new Uint8Array(bytes)], name, { type })
}

/** The hidden file input inside "Upload photo" / "Change photo". */
function fileInput() {
  return screen.getByLabelText(/^(Upload|Change) photo$/)
}

describe('ProfilePage', () => {
  // --- What's on the page ----------------------------------------------------

  it('shows the photo (or initials), name, username, bio, time zone and join date', async () => {
    await openProfile({ ...testUser, bio: 'Reading 20 pages a day.' })

    expect(document.title).toBe('Your profile | HabitSquad')
    expect(screen.getByRole('img', { name: 'Your profile photo' })).toHaveTextContent('SA')
    expect(screen.getByText('@sam')).toBeInTheDocument()
    expect(screen.getByText('Reading 20 pages a day.')).toBeInTheDocument()
    expect(screen.getByText('Asia / Kathmandu', { selector: 'li' })).toBeInTheDocument()
    expect(screen.getByText(`Member since ${memberSince(testUser.date_joined)}`)).toBeVisible()
  })

  it('is linked from the account menu and needs a login', async () => {
    renderApp('/profile')

    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument()
  })

  it('has no accessibility problems', async () => {
    const { container } = await openProfile()

    await expectNoAxeViolations(container)
  })

  // --- Edit profile ----------------------------------------------------------

  it('fills the form with the current profile', async () => {
    await openProfile({ ...testUser, bio: 'Hi there' })
    const form = section('Edit profile')

    expect(form.getByLabelText('Full name')).toHaveValue('Sam Adhikari')
    expect(form.getByLabelText('Username')).toHaveValue('sam')
    expect(form.getByLabelText('Bio (optional)')).toHaveValue('Hi there')
    expect(form.getByLabelText('Time zone')).toHaveValue('Asia/Kathmandu')
  })

  it('saves changes, shows a message and updates the page and header', async () => {
    let sent: unknown
    server.use(
      http.patch(apiUrl('/auth/me/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({
          ...testUser,
          full_name: 'Samikshya A',
          bio: 'Small steps.',
          timezone: 'Europe/London',
        })
      }),
    )
    await openProfile()
    const form = section('Edit profile')

    await userEvent.clear(form.getByLabelText('Full name'))
    await userEvent.type(form.getByLabelText('Full name'), 'Samikshya A')
    await userEvent.type(form.getByLabelText('Bio (optional)'), '  Small steps. ')
    await userEvent.selectOptions(form.getByLabelText('Time zone'), 'Europe/London')
    await userEvent.click(form.getByRole('button', { name: 'Save changes' }))

    expect(await form.findByRole('alert')).toHaveTextContent('Profile saved.')
    expect(sent).toEqual({
      full_name: 'Samikshya A',
      username: 'sam',
      bio: 'Small steps.',
      timezone: 'Europe/London',
    })
    expect(screen.getByRole('heading', { level: 1, name: 'Samikshya A' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Account menu for Samikshya A' })).toBeVisible()
  })

  it('counts bio characters as the user types', async () => {
    await openProfile()
    const bio = section('Edit profile').getByLabelText('Bio (optional)')

    expect(bio).toHaveAccessibleDescription('0 / 160 characters')
    await userEvent.type(bio, 'Hello')
    expect(bio).toHaveAccessibleDescription('5 / 160 characters')
    expect(bio).toHaveAttribute('maxlength', '160')
  })

  it('checks the fields before sending', async () => {
    await openProfile()
    const form = section('Edit profile')

    await userEvent.clear(form.getByLabelText('Full name'))
    await userEvent.clear(form.getByLabelText('Username'))
    await userEvent.type(form.getByLabelText('Username'), 'a b')
    await userEvent.click(form.getByRole('button', { name: 'Save changes' }))

    expect(await form.findByText('Enter your full name.')).toBeInTheDocument()
    expect(
      form.getByText('Use 3-30 characters: letters, numbers and underscores only.'),
    ).toBeInTheDocument()
    await waitFor(() => expect(form.getByLabelText('Full name')).toHaveFocus())
  })

  it("shows the backend's error under the right field", async () => {
    server.use(
      http.patch(apiUrl('/auth/me/'), () =>
        HttpResponse.json({ username: ['This username is already taken.'] }, { status: 400 }),
      ),
    )
    await openProfile()
    const form = section('Edit profile')

    await userEvent.clear(form.getByLabelText('Username'))
    await userEvent.type(form.getByLabelText('Username'), 'taken_name')
    await userEvent.click(form.getByRole('button', { name: 'Save changes' }))

    expect(await form.findByText('This username is already taken.')).toBeInTheDocument()
    expect(form.getByLabelText('Username')).toHaveAttribute('aria-invalid', 'true')
  })

  it('shows an alert when the server is down', async () => {
    server.use(http.patch(apiUrl('/auth/me/'), () => HttpResponse.error()))
    await openProfile()
    const form = section('Edit profile')

    await userEvent.click(form.getByRole('button', { name: 'Save changes' }))

    expect(await form.findByRole('alert')).toHaveTextContent(MESSAGES.network)
  })

  // --- Photo -----------------------------------------------------------------

  it('previews a chosen photo before uploading, and Cancel drops it', async () => {
    await openProfile()

    await userEvent.upload(fileInput(), photo())

    const preview = screen.getByRole('img', { name: 'Preview of your new photo' })
    expect(preview.getAttribute('src')).toMatch(/^blob:/)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('img', { name: 'Your profile photo' })).toBeInTheDocument()
  })

  it('uploads the photo and shows it on the page and in the header', async () => {
    let uploaded: File | null = null
    server.use(
      http.put(apiUrl('/auth/me/avatar/'), async ({ request }) => {
        uploaded = (await request.formData()).get('avatar') as File
        return HttpResponse.json({ ...testUser, avatar: PHOTO_URL })
      }),
    )
    await openProfile()

    await userEvent.upload(fileInput(), photo('me.png'))
    await userEvent.click(screen.getByRole('button', { name: 'Save photo' }))

    expect(await screen.findByText('Photo updated.')).toBeInTheDocument()
    expect(uploaded!.name).toBe('me.png')
    expect(screen.getByRole('img', { name: 'Your profile photo' })).toHaveAttribute(
      'src',
      PHOTO_URL,
    )
    const header = screen.getByRole('button', { name: /^Account menu/ })
    expect(header.querySelector('img')).toHaveAttribute('src', PHOTO_URL)
    expect(screen.getByLabelText('Change photo')).toBeInTheDocument()
  })

  it('shows "Uploading…" while the photo is sent', async () => {
    server.use(
      http.put(apiUrl('/auth/me/avatar/'), async () => {
        await delay(50)
        return HttpResponse.json({ ...testUser, avatar: PHOTO_URL })
      }),
    )
    await openProfile()
    await userEvent.upload(fileInput(), photo())

    await userEvent.click(screen.getByRole('button', { name: 'Save photo' }))

    expect(screen.getByRole('button', { name: 'Uploading…' })).toBeDisabled()
    expect(await screen.findByText('Photo updated.')).toBeInTheDocument()
  })

  it('refuses a file that is not a JPG, PNG or WebP (nothing is sent)', async () => {
    await openProfile()

    // fireEvent: userEvent.upload would already filter by the input's `accept`.
    fireEvent.change(fileInput(), { target: { files: [photo('me.gif', 'image/gif')] } })

    expect(await screen.findByRole('alert')).toHaveTextContent('Use a JPG, PNG or WebP photo.')
    expect(screen.queryByRole('button', { name: 'Save photo' })).not.toBeInTheDocument()
  })

  it('refuses a photo over 2 MB (nothing is sent)', async () => {
    await openProfile()

    await userEvent.upload(fileInput(), photo('big.jpg', 'image/jpeg', 2 * 1024 * 1024 + 1))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The photo is too big. Choose one under 2 MB.',
    )
  })

  it("shows the backend's reason if the upload is refused", async () => {
    server.use(
      http.put(apiUrl('/auth/me/avatar/'), () =>
        HttpResponse.json(
          { avatar: ["This file isn't a photo. Choose a JPG, PNG or WebP image."] },
          { status: 400 },
        ),
      ),
    )
    await openProfile()
    await userEvent.upload(fileInput(), photo())

    await userEvent.click(screen.getByRole('button', { name: 'Save photo' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("This file isn't a photo.")
  })

  it('removes the photo after confirming', async () => {
    let deleted = false
    server.use(
      http.delete(apiUrl('/auth/me/avatar/'), () => {
        deleted = true
        return HttpResponse.json(testUser)
      }),
    )
    await openProfile({ ...testUser, avatar: PHOTO_URL })

    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    const dialog = screen.getByRole('alertdialog', { name: 'Remove your photo?' })
    await userEvent.click(within(dialog).getByRole('button', { name: 'Remove photo' }))

    expect(await screen.findByText('Photo removed.')).toBeInTheDocument()
    expect(deleted).toBe(true)
    expect(screen.getByRole('img', { name: 'Your profile photo' })).toHaveTextContent('SA')
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('has no Remove button without a photo', async () => {
    await openProfile()

    expect(screen.getByLabelText('Upload photo')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument()
  })

  // --- Change password -------------------------------------------------------

  it('changes the password and keeps this device logged in with the new tokens', async () => {
    let sent: unknown
    server.use(
      http.post(apiUrl('/auth/me/password/'), async ({ request }) => {
        sent = await request.json()
        return HttpResponse.json({ access: 'new-access', refresh: 'new-refresh' })
      }),
    )
    await openProfile()
    const form = section('Change password')

    await userEvent.type(form.getByLabelText('Current password'), 'old-Pass-11')
    await userEvent.type(form.getByLabelText('New password'), 'new-Pass-22')
    await userEvent.type(form.getByLabelText('Confirm new password'), 'new-Pass-22')
    await userEvent.click(form.getByRole('button', { name: 'Change password' }))

    expect(await form.findByRole('alert')).toHaveTextContent(
      "Password changed. You've been logged out on your other devices.",
    )
    expect(sent).toEqual({
      current_password: 'old-Pass-11',
      new_password: 'new-Pass-22',
      new_password_confirm: 'new-Pass-22',
      remember_me: true, // startLoggedIn() logs in with "Remember me"
    })
    expect(tokenStore.getAccess()).toBe('new-access')
    expect(localStorage.getItem('habit-tracker.refresh')).toBe('new-refresh')
    expect(form.getByLabelText('Current password')).toHaveValue('') // cleared
  })

  it('checks the new password in the browser first', async () => {
    await openProfile()
    const form = section('Change password')

    await userEvent.type(form.getByLabelText('Current password'), 'same-Pass-1')
    await userEvent.type(form.getByLabelText('New password'), 'same-Pass-1')
    await userEvent.type(form.getByLabelText('Confirm new password'), 'other-Pass-2')
    await userEvent.click(form.getByRole('button', { name: 'Change password' }))

    expect(
      await form.findByText('Choose a password different from your current one.'),
    ).toBeInTheDocument()
    expect(form.getByText("Passwords don't match.")).toBeInTheDocument()
  })

  it('needs every field', async () => {
    await openProfile()
    const form = section('Change password')

    await userEvent.click(form.getByRole('button', { name: 'Change password' }))

    expect(await form.findByText('Enter your current password.')).toBeInTheDocument()
    expect(form.getByText('Create a new password.')).toBeInTheDocument()
    expect(form.getByText('Type your new password again.')).toBeInTheDocument()
  })

  it('shows "current password is incorrect" under that field', async () => {
    server.use(
      http.post(apiUrl('/auth/me/password/'), () =>
        HttpResponse.json(
          { current_password: ['Your current password is incorrect.'] },
          { status: 400 },
        ),
      ),
    )
    await openProfile()
    const form = section('Change password')

    await userEvent.type(form.getByLabelText('Current password'), 'wrong-Pass-1')
    await userEvent.type(form.getByLabelText('New password'), 'new-Pass-22')
    await userEvent.type(form.getByLabelText('Confirm new password'), 'new-Pass-22')
    await userEvent.click(form.getByRole('button', { name: 'Change password' }))

    expect(await form.findByText('Your current password is incorrect.')).toBeInTheDocument()
    await waitFor(() => expect(form.getByLabelText('Current password')).toHaveFocus())
    expect(tokenStore.getAccess()).not.toBe('new-access')
  })

  it('explains when there were too many tries', async () => {
    server.use(
      http.post(apiUrl('/auth/me/password/'), () =>
        HttpResponse.json(
          { detail: 'Request was throttled. Expected available in 3599 seconds.' },
          { status: 429 },
        ),
      ),
    )
    await openProfile()
    const form = section('Change password')

    await userEvent.type(form.getByLabelText('Current password'), 'old-Pass-11')
    await userEvent.type(form.getByLabelText('New password'), 'new-Pass-22')
    await userEvent.type(form.getByLabelText('Confirm new password'), 'new-Pass-22')
    await userEvent.click(form.getByRole('button', { name: 'Change password' }))

    expect(await form.findByRole('alert')).toHaveTextContent('Request was throttled.')
  })
})
