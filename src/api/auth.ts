import { api } from './client'
import type {
  ChangePasswordData,
  GoogleLoginResponse,
  LoginResponse,
  RegisterData,
  ResetPasswordData,
  TokenPair,
  UpdateMeData,
  User,
} from './types'

/** One function per backend auth endpoint. They return the response data or throw. */

/** POST /auth/register/: create an account. */
export async function register(data: RegisterData): Promise<User> {
  const response = await api.post<User>('/auth/register/', data)
  return response.data
}

/** POST /auth/login/: email + password → tokens and user. */
export async function login(
  email: string,
  password: string,
  rememberMe = false,
): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login/', {
    email,
    password,
    remember_me: rememberMe,
  })
  return response.data
}

/** POST /auth/google/: Google ID token → tokens and user (`created` on first sign-in). */
export async function loginWithGoogle(
  idToken: string,
  rememberMe = false,
  timezone?: string,
): Promise<GoogleLoginResponse> {
  const response = await api.post<GoogleLoginResponse>('/auth/google/', {
    id_token: idToken,
    remember_me: rememberMe,
    ...(timezone ? { timezone } : {}),
  })
  return response.data
}

/** POST /auth/logout/: block the refresh token on the server. */
export async function logout(refresh: string): Promise<void> {
  await api.post('/auth/logout/', { refresh })
}

/** GET /auth/me/: the logged-in user. */
export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me/')
  return response.data
}

/** PATCH /auth/me/: change your own name, username, time zone or bio. */
export async function updateMe(data: UpdateMeData): Promise<User> {
  const response = await api.patch<User>('/auth/me/', data)
  return response.data
}

/**
 * POST /auth/password-reset/: email a reset link. Returns the backend's message,
 * which is the same whether or not the email has an account.
 */
export async function requestPasswordReset(email: string): Promise<string> {
  const response = await api.post<{ detail: string }>('/auth/password-reset/', { email })
  return response.data.detail
}

/** POST /auth/password-reset/confirm/: set a new password with the link's uid + token. */
export async function confirmPasswordReset(data: ResetPasswordData): Promise<string> {
  const response = await api.post<{ detail: string }>('/auth/password-reset/confirm/', data)
  return response.data.detail
}

/**
 * PUT /auth/me/avatar/: upload a profile photo (JPG/PNG/WebP, max 2 MB).
 * Sent as a form upload; returns the updated user with the new photo URL.
 */
export async function uploadAvatar(file: File): Promise<User> {
  const form = new FormData()
  form.append('avatar', file)
  const response = await api.put<User>('/auth/me/avatar/', form, {
    // The browser fills in the real type with its boundary, e.g.
    // "multipart/form-data; boundary=...". Saying "multipart" here stops axios
    // from turning the form into JSON (the client's default type).
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

/** DELETE /auth/me/avatar/: remove the profile photo. Returns the updated user. */
export async function removeAvatar(): Promise<User> {
  const response = await api.delete<User>('/auth/me/avatar/')
  return response.data
}

/**
 * POST /auth/me/password/: change the password (needs the current one).
 * Other devices are logged out; returns new tokens for this one.
 */
export async function changePassword(
  data: ChangePasswordData,
  rememberMe: boolean,
): Promise<TokenPair> {
  const response = await api.post<TokenPair>('/auth/me/password/', {
    ...data,
    remember_me: rememberMe,
  })
  return response.data
}
