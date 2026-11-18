import { z } from 'zod'

/** Rules for the login form. Only "is it filled in / does it look like an email". */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Enter your email address.')
    .pipe(z.email('Enter a valid email address, like name@example.com.')),
  password: z.string().min(1, 'Enter your password.'),
  remember_me: z.boolean(),
})

/** What the form holds while the user types. */
export type LoginFormValues = z.input<typeof loginSchema>
