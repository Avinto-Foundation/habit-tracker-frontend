import { useEffect, type ReactNode } from 'react'

/**
 * A stand-in for `@react-oauth/google` in tests (wired up in setupTests.ts), so
 * tests never load Google's script or open a real popup.
 *
 * `GoogleLogin` becomes a plain "Continue with Google" button. Each test decides
 * what "Google" answers by changing `fakeGoogle` before clicking it.
 */
export const fakeGoogle = {
  /** 'success' → onSuccess with `credential`; 'error' → onError (popup closed/failed). */
  outcome: 'success' as 'success' | 'error',
  credential: 'fake-google-id-token' as string | undefined,
  /** Pretend Google's script couldn't be downloaded. */
  scriptFails: false,
  reset() {
    this.outcome = 'success'
    this.credential = 'fake-google-id-token'
    this.scriptFails = false
  },
}

interface FakeProviderProps {
  clientId: string
  onScriptLoadError?: () => void
  children: ReactNode
}

function GoogleOAuthProvider({ onScriptLoadError, children }: FakeProviderProps) {
  useEffect(() => {
    if (fakeGoogle.scriptFails) onScriptLoadError?.()
  }, [onScriptLoadError])
  return <>{children}</>
}

interface FakeLoginProps {
  onSuccess: (response: { credential?: string }) => void
  onError?: () => void
}

function GoogleLogin({ onSuccess, onError }: FakeLoginProps) {
  return (
    <button
      type="button"
      onClick={() =>
        fakeGoogle.outcome === 'error'
          ? onError?.()
          : onSuccess({ credential: fakeGoogle.credential })
      }
    >
      Continue with Google
    </button>
  )
}

/** The fake module that replaces `@react-oauth/google` in tests. */
export const fakeGoogleModule = { GoogleOAuthProvider, GoogleLogin }
