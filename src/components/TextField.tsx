import { CircleAlert } from 'lucide-react'
import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import styles from './Field.module.css'

export interface TextFieldProps extends Omit<ComponentPropsWithRef<'input'>, 'prefix'> {
  /** Visible label above the input. Always required: placeholders are not labels. */
  label: string
  /** Helper text under the input, e.g. "At least 8 characters". */
  hint?: string
  /** Error message. When set, the field is marked invalid and the message is read out. */
  error?: string
  /** Text shown at the start of the box, e.g. "@" for a username. */
  prefix?: string
  /** Content shown at the end of the box, e.g. a show/hide password button. */
  trailing?: ReactNode
}

/**
 * A labelled text input with optional hint and error message.
 *
 * Accessibility: the label is linked with `htmlFor`; the hint and error are linked
 * with `aria-describedby`; an error sets `aria-invalid` and is shown with an icon
 * and text, not colour alone. Extra props (name, type, value, onChange, ref,
 * autoComplete…) go straight to the `<input>`.
 */
export default function TextField({
  label,
  hint,
  error,
  prefix,
  trailing,
  id,
  ...inputProps
}: TextFieldProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const hintId = `${inputId}-hint`
  const errorId = `${inputId}-error`
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={error ? `${styles.control} ${styles.invalid}` : styles.control}>
        {prefix && (
          <span className={styles.prefix} aria-hidden="true">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          className={styles.input}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy || undefined}
          {...inputProps}
        />
        {trailing}
      </div>
      {hint && (
        <p id={hintId} className={styles.hint}>
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className={styles.error}>
          <CircleAlert className={styles.errorIcon} size={16} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
