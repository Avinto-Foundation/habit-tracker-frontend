/** Shapes of the data the backend sends and receives (see Swagger at /api/docs/). */

/** A user's public details, as returned by the backend. */
export interface User {
  id: number
  full_name: string
  username: string
  email: string
  /** Time zone name, e.g. "Asia/Kathmandu". */
  timezone: string
  /** A short line about the user (max 160 characters). Empty string if none. */
  bio: string
  /** Full URL of the profile photo, or null (then initials are shown). */
  avatar: string | null
  /** When the account was created (ISO date-time). */
  date_joined: string
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
export type UpdateMeData = Partial<Pick<User, 'full_name' | 'username' | 'timezone' | 'bio'>>

/** Body for POST /auth/me/password/. */
export interface ChangePasswordData {
  current_password: string
  new_password: string
  new_password_confirm: string
}

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

/** Who else can see a habit: `friends` (on your profile, the default) or `private` (only you). */
export type Visibility = 'friends' | 'private'

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
  visibility: Visibility
  /** Archived habits are hidden but keep their history. */
  archived: boolean
  created_at: string
  updated_at: string
}

/** Body for creating a habit (POST /habits/). */
export type HabitInput = Pick<
  Habit,
  | 'name'
  | 'target'
  | 'icon'
  | 'color'
  | 'schedule_type'
  | 'weekdays'
  | 'times_per_week'
  | 'visibility'
>

/** Body for editing a habit (PATCH /habits/<id>/): send only what changes. */
export type HabitUpdate = Partial<HabitInput & Pick<Habit, 'archived'>>

/** A check-in: the habit was done on `date` (YYYY-MM-DD, in the user's time zone). */
export interface CheckIn {
  id: number
  habit: number
  date: string
  /** Optional short note (max 280 characters). Empty string if none. */
  note: string
  created_at: string
}

/** This week's check-ins vs the goal, for "times per week" habits. */
export interface WeekProgress {
  done: number
  goal: number
}

/** One habit on the Today page. */
export interface TodayHabit {
  habit: Habit
  done_today: boolean
  /** Today's check-in, or null if not done yet. */
  checkin: CheckIn | null
  current_streak: number
  /** `weeks` for "times per week" habits, `days` for the rest. */
  streak_unit: 'days' | 'weeks'
  /** Only for "times per week" habits. */
  week_progress: WeekProgress | null
}

/** Response of GET /habits/today/. */
export interface Today {
  /** Today in the user's time zone, YYYY-MM-DD. */
  date: string
  /** Habits due today and how many of them are done. */
  summary: { done: number; total: number }
  due: TodayHabit[]
  /** Not due today, but can still be ticked off as a bonus. */
  not_due: TodayHabit[]
}

/**
 * A day in the stats calendar:
 * - `done`: scheduled and done · `bonus`: done on a day off
 * - `missed`: scheduled, not done · `pending`: today, not done yet
 * - `off`: not scheduled · `future`: not here yet · `before_start`: before the habit existed
 */
export type CalendarStatus =
  'done' | 'bonus' | 'missed' | 'pending' | 'off' | 'future' | 'before_start'

export interface CalendarDay {
  /** YYYY-MM-DD */
  date: string
  status: CalendarStatus
}

/** Response of GET /habits/<id>/stats/ (with `?month=` for the calendar). */
export interface HabitStats {
  habit: number
  /** Today in the user's time zone, YYYY-MM-DD. */
  today: string
  current_streak: number
  longest_streak: number
  streak_unit: 'days' | 'weeks'
  /** Percent of the plan done in the last 30 days; null if nothing was due yet. */
  completion_rate: number | null
  total_checkins: number
  done_today: boolean
  /** Only for "times per week" habits. */
  week_progress: WeekProgress | null
  /** Only when `?month=` was sent. */
  calendar: { month: string; days: CalendarDay[] } | null
}

/** What anyone may see about another user. Never their email. */
export interface UserCard {
  username: string
  full_name: string
  bio: string
  /** Full URL of their photo, or null (initials are shown). */
  avatar: string | null
}

/** How the logged-in user relates to someone. */
export type FriendshipStatus = 'none' | 'request_sent' | 'request_received' | 'friends'

/** A search result: the person plus how you relate to them. */
export interface SearchResult extends UserCard {
  friendship_status: FriendshipStatus
  /** Id of the request or friendship (to accept, cancel or unfriend), or null. */
  friendship_id: number | null
}

/** A friend request or friendship, seen by the logged-in user. */
export interface Friendship {
  id: number
  /** Always the other person. */
  user: UserCard
  status: 'pending' | 'accepted'
  /** `incoming`: they asked me. `outgoing`: I asked them. */
  direction: 'incoming' | 'outgoing'
  created_at: string
  accepted_at: string | null
}

/** Response of GET /friends/requests/. */
export interface FriendRequests {
  /** Waiting for my answer. */
  incoming: Friendship[]
  /** Waiting for their answer. */
  outgoing: Friendship[]
}

/** The habit itself, as friends see it on a profile (no notes, nothing private). */
export type SharedHabitInfo = Pick<
  Habit,
  'id' | 'name' | 'target' | 'icon' | 'color' | 'schedule_type' | 'weekdays' | 'times_per_week'
>

/** One habit on someone's profile, with its streak. Days are in the owner's time zone. */
export interface SharedHabit {
  habit: SharedHabitInfo
  current_streak: number
  longest_streak: number
  streak_unit: 'days' | 'weeks'
  done_today: boolean
  /** Only for "times per week" habits. */
  week_progress: WeekProgress | null
}

/** Response of GET /users/<username>/: someone's profile page. */
export interface Profile extends UserCard {
  /** `self` when it's your own profile. */
  friendship_status: FriendshipStatus | 'self'
  /** Id of the request or friendship (to accept, cancel or unfriend), or null. */
  friendship_id: number | null
  date_joined: string
  /** Habits they share with friends; null when you aren't friends. */
  habits: SharedHabit[] | null
}
