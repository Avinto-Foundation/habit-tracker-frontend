import { CircleAlert } from 'lucide-react'
import { useId, type ComponentPropsWithRef, type ReactNode } from 'react'
import styles from './Field.module.css'

export interface CheckboxProps extends Omit<ComponentPropsWithRef<'input'>, 'type'> {
  /** Text next to the box. Can contain links, e.g. "I agree to the <a>Terms</a>". */
  label: ReactNode
  /** Error message, e.g. "Please accept the terms to continue." */
  error?: string
}

/**
 * A checkbox with a clickable label and optional error message.
 * Extra props (name, checked, onChange, ref…) go straight to the `<input>`.
 */
export default function Checkbox({ label, error, id, ...inputProps }: CheckboxProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`

  return (
    <div className={styles.field}>
      <div className={styles.checkboxRow}>
        <input
          id={inputId}
          type="checkbox"
          className={styles.checkbox}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          {...inputProps}
        />
        <label htmlFor={inputId} className={styles.checkboxLabel}>
          {label}
        </label>
      </div>
      {error && (
        <p id={errorId} className={styles.error}>
          <CircleAlert className={styles.errorIcon} size={16} aria-hidden="true" />
          {error}
        </p>
      )}
    </div>
  )
}
