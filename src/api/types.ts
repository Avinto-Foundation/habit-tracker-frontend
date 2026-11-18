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
