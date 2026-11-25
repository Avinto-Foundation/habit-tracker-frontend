import { ChevronDown, LogOut, UserRound } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import type { User } from '../api/types'
import styles from './AccountMenu.module.css'
import Avatar from './Avatar'

export interface AccountMenuProps {
  user: User
  onLogout: () => void
}

/**
 * The account button in the header (photo or initials + first name) that opens a
 * small panel with the user's name and email, "Your profile" and "Log out".
 *
 * Accessibility (disclosure pattern): the button says whether the panel is open
 * (`aria-expanded`); Esc closes it and puts focus back on the button; clicking
 * outside or opening a page closes it. The panel holds a normal link and button,
 * so Tab, Enter and screen readers work as usual.
 */
export default function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const location = useLocation()
  const firstName = user.full_name.split(' ')[0]

  // Close when another page opens (e.g. after clicking "Your profile").
  const [lastPath, setLastPath] = useState(location.pathname)
  if (location.pathname !== lastPath) {
    setLastPath(location.pathname)
    setOpen(false)
  }

  // Close on a click outside the menu.
  useEffect(() => {
    if (!open) return
    function handleClick(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      setOpen(false)
      buttonRef.current?.focus()
    }
  }

  return (
    <div ref={wrapperRef} className={styles.wrapper} onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={`Account menu for ${user.full_name}`}
        onClick={() => setOpen((current) => !current)}
      >
        <Avatar user={user} size={32} />
        <span className={styles.name} aria-hidden="true">
          {firstName}
        </span>
        <ChevronDown size={16} aria-hidden="true" className={styles.chevron} />
      </button>

      <div id={panelId} className={styles.panel} hidden={!open}>
        <div className={styles.who}>
          <p className={styles.fullName}>{user.full_name}</p>
          <p className={styles.email}>{user.email}</p>
        </div>
        <Link to="/profile" className={styles.item}>
          <UserRound size={18} aria-hidden="true" />
          Your profile
        </Link>
        <button type="button" className={styles.item} onClick={onLogout}>
          <LogOut size={18} aria-hidden="true" />
          Log out
        </button>
      </div>
    </div>
  )
}
