import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'
import styles from './Field.module.css'
import TextField, { type TextFieldProps } from './TextField'

export type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'trailing' | 'prefix'>

/**
 * A password input with a show/hide button.
 *
 * The button keeps the same name ("Show password") and uses `aria-pressed` to say
 * whether the password is currently visible, which is how screen readers expect a
 * toggle button to work.
 */
export default function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          className={styles.toggle}
          aria-label="Show password"
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      }
    />
  )
}
