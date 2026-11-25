import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert } from 'lucide-react'
import { useId, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { parseApiError } from '../../api/errors'
import type { User } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import fieldStyles from '../../components/Field.module.css'
import TextField from '../../components/TextField'
import TimezoneSelect from '../../components/TimezoneSelect'
import { useAuth } from '../../hooks/useAuth'
import { BIO_MAX, profileSchema, type ProfileFormValues } from './profileSchemas'

const FORM_FIELDS = ['full_name', 'username', 'bio', 'timezone'] as const
type FormField = (typeof FORM_FIELDS)[number]

function valuesFrom(user: User): ProfileFormValues {
  return {
    full_name: user.full_name,
    username: user.username,
    bio: user.bio,
    timezone: user.timezone,
  }
}

/**
 * "Edit profile": full name, username, bio and time zone, saved with
 * PATCH /api/auth/me/. Backend errors (e.g. "This username is already taken.")
 * appear under the right field.
 */
export default function EditProfileForm({ user }: { user: User }) {
  const { updateUser } = useAuth()
  const bioId = useId()
  const [formError, setFormError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    reset,
    control,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: valuesFrom(user),
  })
  const bio = useWatch({ control, name: 'bio' }) ?? ''

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    setSaved(false)
    try {
      const updated = await updateUser({
        full_name: values.full_name.trim(),
        username: values.username.trim(),
        bio: values.bio.trim(),
        timezone: values.timezone,
      })
      reset(valuesFrom(updated)) // the form now matches what's saved
      setSaved(true)
    } catch (error) {
      const { fields, message } = parseApiError(error)
      const known = Object.entries(fields).filter(([name]) =>
        FORM_FIELDS.includes(name as FormField),
      )
      known.forEach(([name, text], index) =>
        setError(name as FormField, { message: text }, { shouldFocus: index === 0 }),
      )
      const other = Object.entries(fields).find(
        ([name]) => !FORM_FIELDS.includes(name as FormField),
      )
      setFormError(message ?? other?.[1] ?? null)
    }
  })

  const bioDescribedBy = [`${bioId}-count`, errors.bio ? `${bioId}-error` : null]
    .filter(Boolean)
    .join(' ')

  return (
    <form onSubmit={onSubmit} noValidate>
      {formError && <Alert>{formError}</Alert>}
      {saved && !isDirty && <Alert variant="success">Profile saved.</Alert>}

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

      <div className={fieldStyles.field}>
        <label htmlFor={bioId} className={fieldStyles.label}>
          Bio (optional)
        </label>
        <textarea
          id={bioId}
          rows={3}
          maxLength={BIO_MAX}
          placeholder="e.g. Reading 20 pages a day, one day at a time."
          className={
            errors.bio
              ? `${fieldStyles.textarea} ${fieldStyles.selectInvalid}`
              : fieldStyles.textarea
          }
          aria-invalid={errors.bio ? true : undefined}
          aria-describedby={bioDescribedBy}
          {...register('bio')}
        />
        <p id={`${bioId}-count`} className={fieldStyles.hint}>
          {bio.length} / {BIO_MAX} characters
        </p>
        {errors.bio && (
          <p id={`${bioId}-error`} className={fieldStyles.error}>
            <CircleAlert className={fieldStyles.errorIcon} size={16} aria-hidden="true" />
            {errors.bio.message}
          </p>
        )}
      </div>

      <Controller
        control={control}
        name="timezone"
        render={({ field }) => (
          <TimezoneSelect
            name={field.name}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            hint="Your day starts at midnight here, for streaks."
            error={errors.timezone?.message}
          />
        )}
      />

      <Button type="submit" loading={isSubmitting} loadingText="Saving…">
        Save changes
      </Button>
    </form>
  )
}
