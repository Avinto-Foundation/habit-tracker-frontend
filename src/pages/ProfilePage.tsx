import { CalendarDays, Clock } from 'lucide-react'
import { Link } from 'react-router'
import ChangePasswordForm from '../features/profile/ChangePasswordForm'
import EditProfileForm from '../features/profile/EditProfileForm'
import PhotoEditor from '../features/profile/PhotoEditor'
import styles from '../features/profile/Profile.module.css'
import { memberSince } from '../features/profile/profileSchemas'
import { zoneLabel } from '../features/onboarding/timezones'
import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../utils/constants'

/**
 * "Your profile" (`/profile`): photo, name, @username, bio, time zone and member
 * since, then "Edit profile" and "Change password".
 *
 * Accessibility: one `<h1>` (the user's name), each part is a section with its own
 * `<h2>`, so screen reader users can jump between them.
 */
export default function ProfilePage() {
  const { user } = useAuth()
  if (!user) return null // ProtectedRoute makes sure this doesn't happen

  return (
    <section className={styles.page}>
      <title>{`Your profile | ${APP_NAME}`}</title>

      <div className={styles.card}>
        <PhotoEditor />
        <div className={styles.summary}>
          <h1 className={styles.name}>{user.full_name}</h1>
          <p className={styles.username}>@{user.username}</p>
          {user.bio && <p className={styles.bio}>{user.bio}</p>}
          <ul className={styles.facts}>
            <li>
              <Clock size={16} aria-hidden="true" />
              <span className="sr-only">Time zone: </span>
              {zoneLabel(user.timezone)}
            </li>
            <li>
              <CalendarDays size={16} aria-hidden="true" />
              Member since {memberSince(user.date_joined)}
            </li>
          </ul>
          <Link to={`/people/${user.username}`} className={styles.preview}>
            See how friends see your profile
          </Link>
        </div>
      </div>

      <section aria-labelledby="edit-profile-heading" className={styles.section}>
        <h2 id="edit-profile-heading">Edit profile</h2>
        {/* `key` starts the form again with fresh values if the user changes elsewhere. */}
        <EditProfileForm key={user.id} user={user} />
      </section>

      <section aria-labelledby="password-heading" className={styles.section}>
        <h2 id="password-heading">Change password</h2>
        <p className={styles.sectionHint}>
          For your safety, changing it logs you out on your other devices.
        </p>
        <ChangePasswordForm />
      </section>
    </section>
  )
}
