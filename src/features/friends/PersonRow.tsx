import type { ReactNode } from 'react'
import { Link } from 'react-router'
import type { UserCard } from '../../api/types'
import Avatar from '../../components/Avatar'
import styles from './Friends.module.css'

export interface PersonRowProps {
  person: UserCard
  /** Buttons or status text on the right, e.g. "Add friend". */
  children?: ReactNode
  /** Used to put focus back on this row after one of its buttons is replaced. */
  id?: string
}

/**
 * One person in a list: photo or initials, name, @username and bio, with actions
 * on the right. Used for search results, requests and the friends list. The name
 * links to the person's profile.
 *
 * The row can receive focus from code (`tabIndex={-1}`): when a button is
 * replaced (e.g. "Add friend" becomes "Requested"), focus moves to the row
 * instead of being lost at the top of the page.
 */
export default function PersonRow({ person, children, id }: PersonRowProps) {
  return (
    <li id={id} tabIndex={-1} className={styles.row}>
      <Avatar user={person} size={44} />
      <div className={styles.person}>
        <Link to={`/people/${person.username}`} className={styles.name}>
          {person.full_name}
        </Link>
        <span className={styles.username}>@{person.username}</span>
        {person.bio && <span className={styles.bio}>{person.bio}</span>}
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </li>
  )
}
