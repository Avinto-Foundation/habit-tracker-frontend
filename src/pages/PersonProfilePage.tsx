import { isAxiosError } from 'axios'
import { ArrowLeft, CalendarDays, Check, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { parseApiError } from '../api/errors'
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  getProfile,
  sendFriendRequest,
  unfriend,
} from '../api/friends'
import type { Profile } from '../api/types'
import Alert from '../components/Alert'
import Avatar from '../components/Avatar'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import LinkButton from '../components/LinkButton'
import LoadingScreen from '../components/LoadingScreen'
import styles from '../features/people/PersonProfile.module.css'
import SharedHabitRow from '../features/people/SharedHabitRow'
import { memberSince } from '../features/profile/profileSchemas'
import { APP_NAME } from '../utils/constants'

type Loaded =
  | { status: 'ready'; profile: Profile }
  | { status: 'not_found' }
  | { status: 'error'; message: string }

const GONE = 'That request or friendship no longer exists. The page has been updated.'

/** "Aarav" from "Aarav Shrestha" (or the username if there's no name). */
function firstName(profile: Profile) {
  return profile.full_name.trim().split(/\s+/)[0] || profile.username
}

/**
 * Someone's profile (`/people/:username`): photo, name, @username, bio and member
 * since, with the right friend buttons (Add friend, Cancel request, Accept / Decline,
 * Unfriend). Friends also see the habits they share, with streaks. Your own
 * username shows your profile the way friends see it.
 *
 * After every action the profile is loaded again, so buttons and habits always
 * match what the server knows (e.g. after "Accept" their habits appear).
 *
 * Accessibility: one `<h1>` (their name); habits are a list with an `<h3>` each;
 * when the pressed button is replaced, focus moves to the buttons' group instead
 * of being lost; results are announced in an alert.
 */
export default function PersonProfilePage() {
  const { username = '' } = useParams()
  const [loaded, setLoaded] = useState<(Loaded & { username: string }) | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmUnfriend, setConfirmUnfriend] = useState(false)

  // Opening another person's profile shows "loading" until theirs arrives.
  const state = loaded?.username === username ? loaded : null

  useEffect(() => {
    let ignore = false
    getProfile(username)
      .then((profile) => !ignore && setLoaded({ status: 'ready', profile, username }))
      .catch((err: unknown) => {
        if (ignore) return
        if (isAxiosError(err) && err.response?.status === 404) {
          setLoaded({ status: 'not_found', username })
        } else {
          setLoaded({ status: 'error', message: parseApiError(err).message ?? '', username })
        }
      })
    return () => {
      ignore = true
    }
  }, [username])

  if (!state) return <LoadingScreen label="Loading profile…" />

  if (state.status === 'not_found') {
    return (
      <section className={styles.page}>
        <title>{`Not found | ${APP_NAME}`}</title>
        <h1>We couldn't find @{username}</h1>
        <p>They may have changed their username, or the link is wrong.</p>
        <Link to="/friends">Find people on the Friends page</Link>
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section className={styles.page}>
        <h1>Profile</h1>
        <Alert>{state.message}</Alert>
      </section>
    )
  }

  const { profile } = state
  const name = firstName(profile)
  const id = profile.friendship_id

  /** Run an action, then load the profile again and say how it went. */
  async function act(action: () => Promise<string>) {
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      setNotice(await action())
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) setError(GONE)
      else {
        const { message, fields } = parseApiError(err)
        setError(message ?? fields.username ?? Object.values(fields)[0] ?? null)
      }
    }
    try {
      const fresh = await getProfile(profile.username)
      setLoaded({ status: 'ready', profile: fresh, username })
    } catch {
      // Keep what's shown; a reload will catch up.
    }
    setBusy(false)
    // The button that was pressed may be gone now: don't leave focus nowhere.
    if (!document.activeElement || document.activeElement === document.body) {
      document.getElementById('profile-actions')?.focus()
    }
  }

  const add = () =>
    act(async () => {
      const result = await sendFriendRequest(profile.username)
      return result.status === 'accepted'
        ? `You and ${profile.full_name} are now friends.`
        : `Friend request sent to ${profile.full_name}.`
    })

  const accept = (requestId: number) =>
    act(async () => {
      await acceptFriendRequest(requestId)
      return `You and ${profile.full_name} are now friends.`
    })

  const decline = (requestId: number) =>
    act(async () => {
      await declineFriendRequest(requestId)
      return `Request from ${profile.full_name} declined.`
    })

  const cancel = (requestId: number) =>
    act(async () => {
      await cancelFriendRequest(requestId)
      return `Request to ${profile.full_name} cancelled.`
    })

  async function doUnfriend() {
    if (!id) return
    await act(async () => {
      await unfriend(id)
      return `${profile.full_name} was removed from your friends.`
    })
    setConfirmUnfriend(false)
    // The dialog gives focus back to "Unfriend", which is gone now.
    setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        document.getElementById('profile-actions')?.focus()
      }
    })
  }

  function actions() {
    switch (profile.friendship_status) {
      case 'self':
        return (
          <>
            <p className={styles.note}>This is how your friends see your profile.</p>
            <LinkButton to="/profile" variant="secondary">
              Edit profile
            </LinkButton>
          </>
        )
      case 'none':
        return (
          <Button onClick={() => void add()} loading={busy} loadingText="Sending…">
            Add friend
          </Button>
        )
      case 'request_sent':
        return (
          <>
            <span className={styles.state}>Requested</span>
            <Button variant="secondary" onClick={() => id && void cancel(id)} loading={busy}>
              Cancel request
            </Button>
          </>
        )
      case 'request_received':
        return (
          <>
            <p className={styles.note}>{name} sent you a friend request.</p>
            <Button onClick={() => id && void accept(id)} loading={busy}>
              Accept
            </Button>
            <Button variant="secondary" onClick={() => id && void decline(id)} disabled={busy}>
              Decline
            </Button>
          </>
        )
      case 'friends':
        return (
          <>
            <span className={styles.state}>
              <Check size={16} aria-hidden="true" /> Friends
            </span>
            <Button variant="secondary" onClick={() => setConfirmUnfriend(true)} disabled={busy}>
              Unfriend
            </Button>
          </>
        )
    }
  }

  function habits() {
    if (profile.habits === null) {
      return (
        <div className={styles.emptyBox}>
          <p className={styles.emptyTitle}>
            <Lock size={18} aria-hidden="true" /> Habits are for friends
          </p>
          <p>Become friends with {name} to see their habits and streaks.</p>
        </div>
      )
    }
    if (profile.habits.length === 0) {
      return (
        <div className={styles.emptyBox}>
          {profile.friendship_status === 'self' ? (
            <>
              <p className={styles.emptyTitle}>You aren't sharing any habits</p>
              <p>
                To share one, edit it and choose <strong>Friends</strong> under “Who can see this?”.
              </p>
            </>
          ) : (
            <p className={styles.emptyTitle}>{name} isn't sharing any habits yet</p>
          )}
        </div>
      )
    }
    return (
      <ul className={styles.list} aria-label={`${profile.full_name}'s habits`}>
        {profile.habits.map((entry) => (
          <SharedHabitRow key={entry.habit.id} entry={entry} />
        ))}
      </ul>
    )
  }

  return (
    <section className={styles.page}>
      <title>{`${profile.full_name} | ${APP_NAME}`}</title>
      <Link to="/friends" className={styles.back}>
        <ArrowLeft size={14} aria-hidden="true" /> Back to Friends
      </Link>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      <div className={styles.card}>
        <Avatar user={profile} size={96} />
        <div className={styles.summary}>
          <h1 className={styles.name}>{profile.full_name}</h1>
          <p className={styles.username}>@{profile.username}</p>
          {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
          <p className={styles.joined}>
            <CalendarDays size={16} aria-hidden="true" />
            Member since {memberSince(profile.date_joined)}
          </p>
          <div
            id="profile-actions"
            className={styles.actions}
            role="group"
            aria-label="Friendship"
            tabIndex={-1}
          >
            {actions()}
          </div>
        </div>
      </div>

      <section aria-labelledby="habits-heading" className={styles.section}>
        <h2 id="habits-heading">Habits</h2>
        {habits()}
      </section>

      <ConfirmDialog
        open={confirmUnfriend}
        title={`Remove ${profile.full_name} from your friends?`}
        confirmLabel="Unfriend"
        busyLabel="Removing…"
        busy={busy}
        danger
        onConfirm={() => void doUnfriend()}
        onCancel={() => setConfirmUnfriend(false)}
      >
        <p>They won't be told. You can send them a friend request again later.</p>
      </ConfirmDialog>
    </section>
  )
}
