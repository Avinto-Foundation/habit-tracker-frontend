import { useState } from 'react'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Checkbox from '../components/Checkbox'
import PasswordField from '../components/PasswordField'
import TextField from '../components/TextField'

/**
 * Developer-only page (`/dev/components`) that shows every form component in all
 * its states, so we can check the design and keyboard behaviour by eye.
 * It is only added to the routes in development (`npm run dev`).
 */
export default function ComponentsPreviewPage() {
  const [loading, setLoading] = useState(false)

  return (
    <section style={{ maxWidth: 420 }}>
      <h1>Components preview</h1>
      <p>Try them with the keyboard: Tab, Shift+Tab, Space and Enter.</p>

      <h2>Text fields</h2>
      <TextField label="Full name" name="full_name" autoComplete="name" />
      <TextField label="Username" name="username" prefix="@" hint="Letters, numbers and _ only" />
      <TextField
        label="Email"
        name="email"
        type="email"
        defaultValue="not-an-email"
        error="Enter a valid email address."
      />

      <h2>Password field</h2>
      <PasswordField label="Password" name="password" hint="At least 8 characters" />
      <PasswordField
        label="Confirm password"
        name="password_confirm"
        error="Passwords don't match."
      />

      <h2>Checkbox</h2>
      <Checkbox label="Remember me" name="remember_me" />
      <Checkbox
        label={
          <>
            I agree to the <a href="#terms">Terms &amp; Privacy</a>
          </>
        }
        name="terms"
        error="Please accept the terms to continue."
      />

      <h2>Buttons</h2>
      <Button
        type="button"
        fullWidth
        loading={loading}
        loadingText="Creating account…"
        onClick={() => {
          setLoading(true)
          setTimeout(() => setLoading(false), 2000)
        }}
      >
        Create account (click me)
      </Button>
      <p />
      <Button variant="secondary" fullWidth>
        Continue with Google
      </Button>

      <h2>Alerts</h2>
      <Alert>Something went wrong. Please try again.</Alert>
      <Alert variant="success">Your account was created.</Alert>
    </section>
  )
}
