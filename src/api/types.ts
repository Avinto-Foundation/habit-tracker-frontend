/** Shapes of the data the backend sends and receives (see Swagger at /api/docs/). */

/** A user's public details, as returned by the backend. */
export interface User {
  id: number
  full_name: string
  username: string
  email: string
  /** Time zone name, e.g. "Asia/Kathmandu". */
  timezone: string
}

/** Body for POST /auth/register/. */
export interface RegisterData {
  full_name: string
  username: string
  email: string
  password: string
  password_confirm: string
  timezone?: string
}

/** Body for POST /auth/password-reset/confirm/. `uid` and `token` come from the email link. */
export interface ResetPasswordData {
  uid: string
  token: string
  new_password: string
  new_password_confirm: string
}

/** Body for PATCH /auth/me/: send only what changes. */
export type UpdateMeData = Partial<Pick<User, 'full_name' | 'username' | 'timezone'>>

/** A new access token and refresh token. */
export interface TokenPair {
  access: string
  refresh: string
}

/** Response of POST /auth/login/. */
export interface LoginResponse extends TokenPair {
  user: User
}

/** Response of POST /auth/google/. `created` is true on the first Google sign-in. */
export interface GoogleLoginResponse extends LoginResponse {
  created: boolean
}

/**
 * How often a habit is due:
 * - `daily`: every day
 * - `weekdays`: only on the days in `weekdays`
 * - `times_per_week`: any days, `times_per_week` times a week
 */
export type ScheduleType = 'daily' | 'weekdays' | 'times_per_week'

/** A habit, as returned by the backend (`/api/habits/`). */
export interface Habit {
  id: number
  name: string
  /** Optional goal shown with the habit, e.g. "20 pages". Empty string if none. */
  target: string
  /** A single emoji, e.g. "📚". */
  icon: string
  /** Colour as #RRGGBB (the backend stores it in capitals). */
  color: string
  schedule_type: ScheduleType
  /** For `weekdays`: 0 = Monday … 6 = Sunday, sorted. Empty otherwise. */
  weekdays: number[]
  /** For `times_per_week`: 1 to 7. Null otherwise. */
  times_per_week: number | null
  /** Archived habits are hidden but keep their history. */
  archived: boolean
  created_at: string
  updated_at: string
}

/** Body for creating a habit (POST /habits/). */
export type HabitInput = Pick<
  Habit,
  'name' | 'target' | 'icon' | 'color' | 'schedule_type' | 'weekdays' | 'times_per_week'
>

/** Body for editing a habit (PATCH /habits/<id>/): send only what changes. */
export type HabitUpdate = Partial<HabitInput & Pick<Habit, 'archived'>>
