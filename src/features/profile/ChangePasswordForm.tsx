import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { parseApiError } from '../../api/errors'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import PasswordField from '../../components/PasswordField'
import { useAuth } from '../../hooks/useAuth'
import { passwordSchema, type PasswordFormValues } from './profileSchemas'

const FORM_FIELDS = ['current_password', 'new_password', 'new_password_confirm'] as const
type FormField = (typeof FORM_FIELDS)[number]

const EMPTY: PasswordFormValues = {
  current_password: '',
  new_password: '',
  new_password_confirm: '',
}

/**
 * "Change password": current password + new password twice. After a change, other
 * devices are logged out and this one keeps going with new tokens.
 */
export default function ChangePasswordForm() {
  const { changePassword } = useAuth()
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: EMPTY,
  })

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setDone(false)
    try {
      await changePassword(values)
      reset(EMPTY) // never leave passwords sitting in the form
      setDone(true)
    } catch (error) {
      const { fields, message } = parseApiError(error)
      const known = Object.entries(fields).filter(([name]) =>
        FORM_FIELDS.includes(name as FormField),
      )
      known.forEach(([name, text], index) =>
        setError(name as FormField, { message: text }, { shouldFocus: index === 0 }),
      )
      setFormError(known.length ? null : (message ?? Object.values(fields)[0] ?? null))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && <Alert>{formError}</Alert>}
      {done && (
        <Alert variant="success">
          Password changed. You've been logged out on your other devices.
        </Alert>
      )}

      <PasswordField
        label="Current password"
        autoComplete="current-password"
        error={errors.current_password?.message}
        {...register('current_password')}
      />
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

      <Button type="submit" loading={isSubmitting} loadingText="Changing…">
        Change password
      </Button>
    </form>
  )
}
