import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { confirmPasswordReset } from '../api/auth'
import { parseApiError } from '../api/errors'
import Alert from '../components/Alert'
import Button from '../components/Button'
import PasswordField from '../components/PasswordField'
import AuthPageLayout from '../features/auth/AuthPageLayout'
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from '../features/auth/passwordResetSchemas'
import { useAuth } from '../hooks/useAuth'
import type { LoginNoticeState } from '../routes/redirect'
import { RESET_MESSAGES } from '../features/auth/passwordResetMessages'
import { APP_NAME } from '../utils/constants'

/**
 * "Choose a new password" page (`/reset-password?uid=…&token=…`), opened from the
 * link in the reset email. Sends the new password to
 * `POST /api/auth/password-reset/confirm/`, then goes to the login page.
 *
 * The backend logs the user out everywhere after a reset, so if this browser was
 * logged in it logs out here too.
 */
export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const uid = params.get('uid')
  const token = params.get('token')
  const { status, logout } = useAuth()
  const navigate = useNavigate()
  const [linkInvalid, setLinkInvalid] = useState(!uid || !token)
  const [formError, setFormError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { new_password: '', new_password_confirm: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      const notice = await confirmPasswordReset({ uid: uid!, token: token!, ...values })
      if (status === 'authenticated') await logout()
      const state: LoginNoticeState = { notice }
      navigate('/login', { replace: true, state })
    } catch (error) {
      const { fields, message } = parseApiError(error)
      if (fields.token || fields.uid) {
        setLinkInvalid(true)
        return
      }
      if (fields.new_password) {
        setError('new_password', { message: fields.new_password }, { shouldFocus: true })
      }
      if (fields.new_password_confirm) {
        setError('new_password_confirm', { message: fields.new_password_confirm })
      }
      setFormError(message)
    }
  })

  return (
    <AuthPageLayout
      title="Choose a new password"
      subtitle="Pick something you haven't used before."
      footer={
        <>
          Remembered it? <Link to="/login">Log in</Link>
        </>
      }
    >
      <title>{`Reset password | ${APP_NAME}`}</title>

      {linkInvalid ? (
        <Alert>
          {RESET_MESSAGES.invalidLink} <Link to="/forgot-password">Ask for a new link</Link>.
        </Alert>
      ) : (
        <>
          {formError && <Alert>{formError}</Alert>}
          <form onSubmit={onSubmit} noValidate>
            <PasswordField
              label="New password"
              hint="At least 8 characters"
              autoComplete="new-password"
              error={errors.new_password?.message}
              {...register('new_password')}
            />
            <PasswordField
              label="Confirm new password"
              autoComplete="new-password"
              error={errors.new_password_confirm?.message}
              {...register('new_password_confirm')}
            />
            <Button type="submit" fullWidth loading={isSubmitting} loadingText="Saving…">
              Change password
            </Button>
          </form>
        </>
      )}
    </AuthPageLayout>
  )
}
