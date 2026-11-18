import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { parseApiError } from '../api/errors'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Checkbox from '../components/Checkbox'
import LoadingScreen from '../components/LoadingScreen'
import PasswordField from '../components/PasswordField'
import TextField from '../components/TextField'
import AuthPageLayout from '../features/auth/AuthPageLayout'
import GoogleSignIn from '../features/auth/GoogleSignIn'
import { loginSchema, type LoginFormValues } from '../features/auth/loginSchema'
import { useAuth } from '../hooks/useAuth'
import { loginNotice, redirectTarget } from '../routes/redirect'
import { APP_NAME } from '../utils/constants'
import styles from './LoginPage.module.css'

/**
 * Login page (`/login`). Sends email + password (+ "Remember me") to
 * `POST /api/auth/login/`, then goes to the page the user was trying to open
 * (or home).
 *
 * A wrong email or password is shown under the password field, as in the design,
 * with focus moved there so the user can try again straight away.
 */
export default function LoginPage() {
  const { login, status } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const goTo = redirectTarget(location.state)
  // e.g. "Your password has been changed…" after a password reset
  const notice = loginNotice(location.state)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    resetField,
    control,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember_me: false },
  })
  // "Remember me" also applies to "Continue with Google".
  const rememberMe = useWatch({ control, name: 'remember_me' })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values.email, values.password, values.remember_me)
      navigate(goTo, { replace: true })
    } catch (error) {
      const { fields, message } = parseApiError(error)
      if (isAxiosError(error) && error.response?.status === 401) {
        // Wrong email or password: clear the password and show the message under it.
        resetField('password')
        setError(
          'password',
          { message: message ?? 'Email or password is incorrect.' },
          { shouldFocus: true },
        )
        return
      }
      if (fields.email) setError('email', { message: fields.email }, { shouldFocus: true })
      if (fields.password) setError('password', { message: fields.password })
      setFormError(message)
    }
  })

  if (status === 'loading') return <LoadingScreen />
  if (status === 'authenticated') return <Navigate to={goTo} replace />

  return (
    <AuthPageLayout
      title="Welcome back"
      subtitle="Your squad is waiting."
      footer={
        <>
          New here? <Link to="/signup">Create an account</Link>
        </>
      }
    >
      <title>{`Log in | ${APP_NAME}`}</title>

      {notice && !formError && <Alert variant="success">{notice}</Alert>}
      {formError && <Alert>{formError}</Alert>}

      <GoogleSignIn
        rememberMe={rememberMe}
        onSignedIn={() => navigate(goTo, { replace: true })}
        onError={setFormError}
      />

      <form onSubmit={onSubmit} noValidate>
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.email?.message}
          {...register('email')}
        />
        <PasswordField
          label="Password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className={styles.options}>
          <Checkbox label="Remember me for 7 days" {...register('remember_me')} />
          <Link to="/forgot-password" className={styles.forgot}>
            Forgot password?
          </Link>
        </div>
        <Button type="submit" fullWidth loading={isSubmitting} loadingText="Logging in…">
          Log in
        </Button>
      </form>
    </AuthPageLayout>
  )
}
