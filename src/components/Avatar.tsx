import type { User } from '../api/types'
import { avatarColor, initials } from '../utils/avatar'
import styles from './Avatar.module.css'

export interface AvatarProps {
  user: Pick<User, 'full_name' | 'username' | 'avatar'>
  /** Width and height in pixels. */
  size?: number
  /**
   * What a screen reader should say, e.g. "Your profile photo". Leave out when
   * the person's name is already shown next to it (then the avatar is decoration
   * and is skipped, so the name isn't read twice).
   */
  label?: string
  /** Show this picture instead (e.g. a preview of a photo not uploaded yet). */
  src?: string
}

/**
 * A person's profile photo, or their initials on a coloured circle when they have
 * no photo. The colour depends on the username, so it never changes.
 */
export default function Avatar({ user, size = 40, label, src }: AvatarProps) {
  const picture = src ?? user.avatar
  const box = { width: size, height: size, fontSize: Math.round(size * 0.4) }

  if (picture) {
    return <img src={picture} alt={label ?? ''} className={styles.avatar} style={box} />
  }

  return (
    <span
      className={`${styles.avatar} ${styles.initials}`}
      style={{ ...box, backgroundColor: avatarColor(user.username) }}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {initials(user.full_name)}
    </span>
  )
}
