import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google'
import { useState } from 'react'
import { parseApiError } from '../../api/errors'
import LoadingScreen from '../../components/LoadingScreen'
import { useAuth } from '../../hooks/useAuth'
import { GOOGLE_MESSAGES } from './googleMessages'
import styles from './GoogleSignIn.module.css'

export interface GoogleSignInProps {
  /** Keep the login for 7 days (the "Remember me" box on the login page). */
  rememberMe?: boolean
  /** Called when Google hands over the token, just before signing in with it. */
  onStart?: () => void
  /** Called after a successful sign-in. `created` is true for a brand-new account. */
  onSignedIn: (created: boolean) => void
  /** Called with a message to show in the page's alert when something goes wrong. */
  onError: (message: string) => void
}

/** The Google OAuth Client ID from `.env`. Empty → Google sign-in is switched off. */
function googleClientId(): string {
  return import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''
}

/**
 * Google's official "Continue with Google" button plus an "or" divider, for the top
 * of the sign-up and login cards.
 *
 * Google gives us an ID token, which `loginWithGoogle()` sends to the backend
 * (`POST /api/auth/google/`). The first time, the backend creates the account.
 * If no Client ID is set in `.env`, nothing is shown and email/password still work.
 */
export default function GoogleSignIn(props: GoogleSignInProps) {
  const clientId = googleClientId()
  if (!clientId) return null

  return (
    <GoogleOAuthProvider
      clientId={clientId}
      locale="en"
      onScriptLoadError={() => props.onError(GOOGLE_MESSAGES.scriptFailed)}
    >
      <GoogleButton {...props} />
    </GoogleOAuthProvider>
  )
}

function GoogleButton({ rememberMe = false, onStart, onSignedIn, onError }: GoogleSignInProps) {
  const { loginWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)

  async function handleCredential(idToken: string | undefined) {
    if (!idToken) {
      onError(GOOGLE_MESSAGES.popupFailed)
      return
    }
    setBusy(true)
    onStart?.()
    try {
      const { created } = await loginWithGoogle(idToken, rememberMe)
      onSignedIn(created)
    } catch (error) {
      onError(parseApiError(error).message ?? GOOGLE_MESSAGES.popupFailed)
      setBusy(false)
    }
  }

  return (
    <div className={styles.google}>
      {busy ? (
        <LoadingScreen label="Signing in with Google…" />
      ) : (
        <div className={styles.button}>
          <GoogleLogin
            text="continue_with"
            shape="rectangular"
            theme="outline"
            size="large"
            width={300}
            logo_alignment="center"
            onSuccess={(response) => handleCredential(response.credential)}
            onError={() => onError(GOOGLE_MESSAGES.popupFailed)}
          />
        </div>
      )}
      <p className={styles.divider}>
        <span>or</span>
      </p>
    </div>
  )
}
