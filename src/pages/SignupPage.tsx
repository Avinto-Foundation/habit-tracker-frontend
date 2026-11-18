import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router'
import { parseApiError } from '../api/errors'
import Alert from '../components/Alert'
import Button from '../components/Button'
import Checkbox from '../components/Checkbox'
import PasswordField from '../components/PasswordField'
import TextField from '../components/TextField'
import AuthPageLayout from '../features/auth/AuthPageLayout'
import { signupSchema, type SignupFormValues } from '../features/auth/signupSchema'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../utils/constants'

/** Backend fields we can show an error under. Anything else goes in the alert. */
const FORM_FIELDS = ['full_name', 'username', 'email', 'password', 'password_confirm'] as const
type FormField = (typeof FORM_FIELDS)[number]

const EMPTY_FORM: SignupFormValues = {
  full_name: '',
  username: '',
  email: '',
  password: '',
  password_confirm: '',
  terms: false,
}

/**
 * Sign-up page (`/signup`). Checks the form in the browser first, then sends it to
 * `POST /api/auth/register/`. On success the user is logged in and sent home.
 *
 * Accessibility: every field has a visible label and the right `autoComplete`;
 * errors appear under their field and focus jumps to the first one; problems for
 * the whole form are announced in an alert.
 */
export default function SignupPage() {
  const { register: createAccount, status } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: EMPTY_FORM,
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await createAccount({
        full_name: values.full_name,
        username: values.username,
        email: values.email,
        password: values.password,
        password_confirm: values.password_confirm,
      })
      navigate('/', { replace: true })
    } catch (error) {
      const { fields, message } = parseApiError(error)
      const fieldErrors = Object.entries(fields).filter(([name]) =>
        FORM_FIELDS.includes(name as FormField),
      )
      fieldErrors.forEach(([name, text], index) =>
        setError(name as FormField, { message: text }, { shouldFocus: index === 0 }),
      )
      const otherErrors = Object.entries(fields)
        .filter(([name]) => !FORM_FIELDS.includes(name as FormField))
        .map(([, text]) => text)
      setFormError(message ?? otherErrors[0] ?? null)
    }
  })

  // Already logged in? Nothing to do here.
  if (status === 'authenticated') return <Navigate to="/" replace />

  return (
    <AuthPageLayout
      title="Create your account"
      subtitle="Start your streak today."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <title>{`Sign up | ${APP_NAME}`}</title>

      {formError && <Alert>{formError}</Alert>}

      <form onSubmit={onSubmit} noValidate>
        <TextField
          label="Full name"
          autoComplete="name"
          error={errors.full_name?.message}
          {...register('full_name')}
        />
        <TextField
          label="Username"
          prefix="@"
          hint="3-30 characters: letters, numbers and _"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          error={errors.username?.message}
          {...register('username')}
        />
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
          hint="At least 8 characters"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <PasswordField
          label="Confirm password"
          autoComplete="new-password"
          error={errors.password_confirm?.message}
          {...register('password_confirm')}
        />
        <Checkbox
          label="I agree to the Terms and Privacy Policy"
          error={errors.terms?.message}
          {...register('terms')}
        />
        <Button type="submit" fullWidth loading={isSubmitting} loadingText="Creating account…">
          Create account
        </Button>
      </form>
    </AuthPageLayout>
  )
}
