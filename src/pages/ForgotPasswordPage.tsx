import { zodResolver } from '@hookform/resolvers/zod'
import { isAxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { requestPasswordReset } from '../api/auth'
import { parseApiError } from '../api/errors'
import Alert from '../components/Alert'
import Button from '../components/Button'
import TextField from '../components/TextField'
import AuthPageLayout from '../features/auth/AuthPageLayout'
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from '../features/auth/passwordResetSchemas'
import { RESET_MESSAGES } from '../features/auth/passwordResetMessages'
import { APP_NAME } from '../utils/constants'

/**
 * "Forgot password" page (`/forgot-password`). Sends the email to
 * `POST /api/auth/password-reset/`, which emails a one-time link.
 *
 * The success message never says whether the email has an account (the backend
 * gives the same answer either way), so nobody can use this to check who's
 * registered.
 */
export default function ForgotPasswordPage() {
  const [sentMessage, setSentMessage] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  })

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null)
    try {
      setSentMessage(await requestPasswordReset(email))
    } catch (error) {
      if (isAxiosError(error) && error.response?.status === 429) {
        setFormError(RESET_MESSAGES.tooManyRequests)
        return
      }
      const { fields, message } = parseApiError(error)
      if (fields.email) setError('email', { message: fields.email }, { shouldFocus: true })
      setFormError(message)
    }
  })

  return (
    <AuthPageLayout
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to choose a new one."
      footer={
        <>
          Remembered it? <Link to="/login">Log in</Link>
        </>
      }
    >
      <title>{`Forgot password | ${APP_NAME}`}</title>

      {formError && <Alert>{formError}</Alert>}

      {sentMessage ? (
        <>
          <Alert variant="success">{sentMessage}</Alert>
          <Button variant="secondary" fullWidth onClick={() => setSentMessage(null)}>
            Send another link
          </Button>
        </>
      ) : (
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
          <Button type="submit" fullWidth loading={isSubmitting} loadingText="Sending link…">
            Send reset link
          </Button>
        </form>
      )}
    </AuthPageLayout>
  )
}
