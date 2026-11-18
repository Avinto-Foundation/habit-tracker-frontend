import { z } from 'zod'

/**
 * Rules for the sign-up form, checked in the browser before anything is sent.
 * They match the backend's rules, so most mistakes are caught instantly. The
 * backend still checks everything again (e.g. "email already taken", "password
 * too common") and those errors are shown under the right field too.
 *
 * Field names match the backend's, so its errors map straight onto the form.
 */
export const signupSchema = z
  .object({
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
    email: z
      .string()
      .trim()
      .min(1, 'Enter your email address.')
      .pipe(z.email('Enter a valid email address, like name@example.com.')),
    password: z
      .string()
      .min(1, 'Create a password.')
      .min(8, 'Use at least 8 characters.')
      .refine((value) => !/^\d+$/.test(value), "Your password can't be only numbers."),
    password_confirm: z.string().min(1, 'Type your password again.'),
    terms: z.boolean().refine((accepted) => accepted, 'Please accept the terms to continue.'),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords don't match.",
    path: ['password_confirm'],
  })

/** What the form holds while the user types. */
export type SignupFormValues = z.input<typeof signupSchema>
