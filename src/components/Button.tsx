import { LoaderCircle } from 'lucide-react'
import type { ComponentPropsWithRef } from 'react'
import styles from './Button.module.css'

export interface ButtonProps extends ComponentPropsWithRef<'button'> {
  /**
   * `primary` = teal main action; `secondary` = white with border;
   * `danger` = red, for actions that can't be undone (e.g. "Delete habit").
   */
  variant?: 'primary' | 'secondary' | 'danger'
  /** Shows a spinner and disables the button (e.g. while a form is sending). */
  loading?: boolean
  /** Text shown while loading, e.g. "Creating account…". Defaults to the normal text. */
  loadingText?: string
  /** Stretch to the full width of its container. */
  fullWidth?: boolean
}

/**
 * A button with primary/secondary styles and a loading state.
 *
 * Defaults to `type="button"`, so it never submits a form by accident: pass
 * `type="submit"` for form buttons. While loading it is disabled (no double
 * submits) and marked `aria-busy`.
 */
export default function Button({
  variant = 'primary',
  loading = false,
  loadingText,
  fullWidth = false,
  disabled,
  type = 'button',
  className,
  children,
  ...buttonProps
}: ButtonProps) {
  const classes = [styles.button, styles[variant], fullWidth ? styles.fullWidth : '', className]
    .filter(Boolean)
    .join(' ')

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...buttonProps}
    >
      {loading && <LoaderCircle className={styles.spinner} size={18} aria-hidden="true" />}
      {loading && loadingText ? loadingText : children}
    </button>
  )
}
