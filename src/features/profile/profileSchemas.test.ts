import { describe, expect, it } from 'vitest'
import { checkPhoto, memberSince, PHOTO_MAX_BYTES, profileSchema } from './profileSchemas'

function file(type: string, size: number) {
  return new File([new Uint8Array(size)], 'photo', { type })
}

describe('checkPhoto', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'])('accepts %s', (type) => {
    expect(checkPhoto(file(type, 1000))).toBeNull()
  })

  it.each(['image/gif', 'image/svg+xml', 'application/pdf', ''])('refuses "%s"', (type) => {
    expect(checkPhoto(file(type, 1000))).toBe('Use a JPG, PNG or WebP photo.')
  })

  it('accepts exactly 2 MB and refuses anything bigger', () => {
    expect(checkPhoto(file('image/png', PHOTO_MAX_BYTES))).toBeNull()
    expect(checkPhoto(file('image/png', PHOTO_MAX_BYTES + 1))).toBe(
      'The photo is too big. Choose one under 2 MB.',
    )
  })
})

describe('profileSchema', () => {
  const valid = { full_name: 'Sam', username: 'sam', bio: '', timezone: 'UTC' }

  it('accepts a valid profile with an empty bio', () => {
    expect(profileSchema.safeParse(valid).success).toBe(true)
  })

  it('refuses a bio over 160 characters', () => {
    const result = profileSchema.safeParse({ ...valid, bio: 'x'.repeat(161) })

    expect(result.success).toBe(false)
    expect(result.error?.issues[0].message).toBe('Use 160 characters or fewer.')
  })
})

describe('memberSince', () => {
  it('gives the month and year', () => {
    expect(memberSince('2026-11-18T08:00:00Z')).toBe('November 2026')
  })
})
