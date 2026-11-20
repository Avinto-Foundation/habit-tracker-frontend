import { Link, type LinkProps } from 'react-router'
import styles from './Button.module.css'

export interface LinkButtonProps extends LinkProps {
  /** `primary` = teal main action; `secondary` = white with border. */
  variant?: 'primary' | 'secondary'
}

/**
 * A link that looks like a `Button`. Use it when the action opens another page
 * (e.g. "New habit"): links go somewhere, buttons do something. Screen readers
 * announce it as a link, so users know what will happen.
 */
export default function LinkButton({
  variant = 'primary',
  className,
  ...linkProps
}: LinkButtonProps) {
  const classes = [styles.button, styles[variant], styles.link, className].filter(Boolean).join(' ')
  return <Link className={classes} {...linkProps} />
}
