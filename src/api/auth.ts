import { api } from './client'
import type { GoogleLoginResponse, LoginResponse, RegisterData, UpdateMeData, User } from './types'

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

/** PATCH /auth/me/: change your own name, username or time zone. */
export async function updateMe(data: UpdateMeData): Promise<User> {
  const response = await api.patch<User>('/auth/me/', data)
  return response.data
}
