import { z } from 'zod'

/** Longest bio the backend accepts. */
export const BIO_MAX = 160

/**
 * Rules for the "Edit profile" form. Same as the backend's (and sign-up's), so
 * most mistakes are caught instantly; field names match the API's.
 */
export const profileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, 'Enter your full name.')
    .max(150, 'Use 150 characters or fewer.'),
  username: z
    .string()
    .trim()
    .min(1, 'Choose a username.')
    .regex(/^[A-Za-z0-9_]{3,30}$/, 'Use 3-30 characters: letters, numbers and underscores only.'),
  bio: z.string().max(BIO_MAX, `Use ${BIO_MAX} characters or fewer.`),
  timezone: z.string().min(1, 'Choose your time zone.'),
})

export type ProfileFormValues = z.input<typeof profileSchema>

/** Rules for the "Change password" form (the backend checks common passwords too). */
export const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Enter your current password.'),
    new_password: z
      .string()
      .min(1, 'Create a new password.')
      .min(8, 'Use at least 8 characters.')
      .refine((value) => !/^\d+$/.test(value), "Your password can't be only numbers."),
    new_password_confirm: z.string().min(1, 'Type your new password again.'),
  })
  .refine((data) => data.new_password === data.new_password_confirm, {
    message: "Passwords don't match.",
    path: ['new_password_confirm'],
  })
  .refine((data) => !data.new_password || data.new_password !== data.current_password, {
    message: 'Choose a password different from your current one.',
    path: ['new_password'],
  })

export type PasswordFormValues = z.input<typeof passwordSchema>

/** Photo types the backend accepts. */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PHOTO_MAX_BYTES = 2 * 1024 * 1024 // 2 MB

/**
 * Check a chosen photo before uploading, so people find out at once instead of
 * after a slow upload. Returns an error message, or null if it looks fine.
 */
export function checkPhoto(file: File): string | null {
  if (!PHOTO_TYPES.includes(file.type)) return 'Use a JPG, PNG or WebP photo.'
  if (file.size > PHOTO_MAX_BYTES) return 'The photo is too big. Choose one under 2 MB.'
  return null
}

/** "2026-11-18T08:00:00Z" → "November 2026". */
export function memberSince(dateJoined: string): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(
    new Date(dateJoined),
  )
}
