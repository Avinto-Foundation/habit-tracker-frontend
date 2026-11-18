import { z } from 'zod'

/** "Forgot password" form: just a valid email. */
export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .pipe(z.email('Enter a valid email address, like name@example.com.')),
})

export type ForgotPasswordValues = z.input<typeof forgotPasswordSchema>

/**
 * "Choose a new password" form. Same basic rules as sign-up; the backend checks
 * the rest (too common, too similar to your name/email) and its messages are
 * shown under the field.
 */
export const resetPasswordSchema = z
  .object({
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

export type ResetPasswordValues = z.input<typeof resetPasswordSchema>
