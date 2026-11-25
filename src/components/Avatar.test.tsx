import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AVATAR_COLORS, avatarColor, initials } from '../utils/avatar'
import Avatar from './Avatar'

const SAM = { full_name: 'Sam Adhikari', username: 'sam', avatar: null }

describe('initials', () => {
  it.each([
    ['Sam Adhikari', 'SA'],
    ['sam', 'S'],
    ['Mary Jane Watson', 'MW'],
    ['  sam   adhikari ', 'SA'],
    ['', '?'],
  ])('%j → %s', (name, expected) => {
    expect(initials(name)).toBe(expected)
  })
})

describe('avatarColor', () => {
  it('always gives the same colour for the same username, from the palette', () => {
    expect(avatarColor('sam')).toBe(avatarColor('sam'))
    expect(AVATAR_COLORS).toContain(avatarColor('sam'))
    expect(AVATAR_COLORS).toContain(avatarColor('another_user'))
  })
})

describe('Avatar', () => {
  it('shows initials on a coloured circle when there is no photo', () => {
    render(<Avatar user={SAM} label="Your profile photo" />)

    const avatar = screen.getByRole('img', { name: 'Your profile photo' })
    expect(avatar).toHaveTextContent('SA')
    expect(avatar).toHaveStyle({ backgroundColor: avatarColor('sam') })
  })

  it('shows the photo with its label as alt text', () => {
    render(<Avatar user={{ ...SAM, avatar: 'http://x/me.webp' }} label="Your profile photo" />)

    expect(screen.getByRole('img', { name: 'Your profile photo' })).toHaveAttribute(
      'src',
      'http://x/me.webp',
    )
  })

  it('is hidden from screen readers without a label (decoration next to the name)', () => {
    const { container } = render(<Avatar user={SAM} />)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('a photo without a label gets empty alt text', () => {
    const { container } = render(<Avatar user={{ ...SAM, avatar: 'http://x/me.webp' }} />)

    expect(container.querySelector('img')).toHaveAttribute('alt', '')
  })

  it('can show a preview instead of the saved photo', () => {
    render(<Avatar user={SAM} src="blob:preview" label="Preview" />)

    expect(screen.getByRole('img', { name: 'Preview' })).toHaveAttribute('src', 'blob:preview')
  })

  it('uses the size given', () => {
    render(<Avatar user={SAM} size={96} label="Me" />)

    expect(screen.getByRole('img', { name: 'Me' })).toHaveStyle({ width: '96px', height: '96px' })
  })
})
