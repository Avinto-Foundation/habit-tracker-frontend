import { isAxiosError } from 'axios'
import { Check, Search } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { parseApiError } from '../api/errors'
import {
  acceptFriendRequest,
  cancelFriendRequest,
  declineFriendRequest,
  listFriendRequests,
  listFriends,
  sendFriendRequest,
  unfriend,
} from '../api/friends'
import type { FriendRequests, Friendship, SearchResult, UserCard } from '../api/types'
import Alert from '../components/Alert'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'
import LoadingScreen from '../components/LoadingScreen'
import TextField from '../components/TextField'
import styles from '../features/friends/Friends.module.css'
import PersonRow from '../features/friends/PersonRow'
import { useUserSearch } from '../features/friends/useUserSearch'
import { APP_NAME } from '../utils/constants'

type Lists =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; requests: FriendRequests; friends: Friendship[] }

const GONE = 'That request or friendship no longer exists. The page has been updated.'

/** Row ids, so focus can go back to the right row after an action. */
const rowId = (section: string, username: string) => `${section}-${username}`

/** "(Aarav Shrestha)" read after a button's visible text, e.g. "Accept (Aarav Shrestha)". */
function Who({ person }: { person: UserCard }) {
  return <span className="sr-only"> ({person.full_name})</span>
}

async function loadLists(): Promise<Lists> {
  const [requests, friends] = await Promise.all([listFriendRequests(), listFriends()])
  return { status: 'ready', requests, friends }
}

/**
 * Friends (`/friends`): find people, answer friend requests and see your friends.
 *
 * After every action the lists and the search results are loaded again, so the
 * page always shows what the server knows (e.g. "Add friend" becomes "Requested").
 *
 * Accessibility: the search box has a visible label; how many people were found
 * is announced (status region); every button names the person it's about, e.g.
 * "Accept (Aarav Shrestha)"; when a button is replaced, focus moves to its row;
 * results of actions are announced in an alert.
 */
export default function FriendsPage() {
  const searchId = useId()
  const [query, setQuery] = useState('')
  const [version, setVersion] = useState(0)
  const search = useUserSearch(query, version)
  const [lists, setLists] = useState<Lists>({ status: 'loading' })
  const [busy, setBusy] = useState<string | null>(null) // username being acted on
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toUnfriend, setToUnfriend] = useState<Friendship | null>(null)

  useEffect(() => {
    let ignore = false
    loadLists()
      .then((loaded) => !ignore && setLists(loaded))
      .catch((err: unknown) => {
        if (!ignore) setLists({ status: 'error', message: parseApiError(err).message ?? '' })
      })
    return () => {
      ignore = true
    }
  }, [])

  /** Load the lists and the search again, keeping what's shown if that fails. */
  async function refresh() {
    setVersion((current) => current + 1)
    try {
      setLists(await loadLists())
    } catch {
      // Keep the old lists; the next action or a reload will catch up.
    }
  }

  /** Run an action for `person`, then refresh and report how it went. */
  async function act(
    person: UserCard,
    focusRow: string,
    action: () => Promise<string>,
  ): Promise<boolean> {
    setBusy(person.username)
    setError(null)
    setNotice(null)
    let ok = false
    try {
      setNotice(await action())
      ok = true
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 404) setError(GONE)
      else {
        const { message, fields } = parseApiError(err)
        setError(message ?? fields.username ?? Object.values(fields)[0] ?? null)
      }
    }
    await refresh()
    setBusy(null)
    // The button that was pressed may be gone now: don't leave focus nowhere.
    if (!document.activeElement || document.activeElement === document.body) {
      document.getElementById(focusRow)?.focus()
    }
    return ok
  }

  const add = (person: SearchResult) =>
    act(person, rowId('search', person.username), async () => {
      const result = await sendFriendRequest(person.username)
      return result.status === 'accepted'
        ? `You and ${person.full_name} are now friends.`
        : `Friend request sent to ${person.full_name}.`
    })

  const accept = (id: number, person: UserCard, row: string) =>
    act(person, row, async () => {
      await acceptFriendRequest(id)
      return `You and ${person.full_name} are now friends.`
    })

  const decline = (id: number, person: UserCard, row: string) =>
    act(person, row, async () => {
      await declineFriendRequest(id)
      return `Request from ${person.full_name} declined.`
    })

  const cancel = (id: number, person: UserCard, row: string) =>
    act(person, row, async () => {
      await cancelFriendRequest(id)
      return `Request to ${person.full_name} cancelled.`
    })

  async function confirmUnfriend() {
    if (!toUnfriend) return
    const { id, user } = toUnfriend
    await act(user, 'friends-heading', async () => {
      await unfriend(id)
      return `${user.full_name} was removed from your friends.`
    })
    setToUnfriend(null)
    // The dialog tries to give focus back to the "Unfriend" button, which is gone
    // now; once it has closed, move focus to the friends heading instead.
    setTimeout(() => {
      if (!document.activeElement || document.activeElement === document.body) {
        document.getElementById('friends-heading')?.focus()
      }
    })
  }

  /** The buttons for a search result, depending on how you relate to them. */
  function searchActions(person: SearchResult) {
    const isBusy = busy === person.username
    const id = person.friendship_id
    const row = rowId('search', person.username)
    switch (person.friendship_status) {
      case 'none':
        return (
          <Button onClick={() => void add(person)} loading={isBusy} loadingText="Sending…">
            Add friend
            <Who person={person} />
          </Button>
        )
      case 'request_sent':
        return (
          <>
            <span className={styles.state}>Requested</span>
            <Button
              variant="secondary"
              onClick={() => id && void cancel(id, person, row)}
              loading={isBusy}
            >
              Cancel request
              <Who person={person} />
            </Button>
          </>
        )
      case 'request_received':
        return (
          <>
            <Button onClick={() => id && void accept(id, person, row)} loading={isBusy}>
              Accept
              <Who person={person} />
            </Button>
            <Button
              variant="secondary"
              onClick={() => id && void decline(id, person, row)}
              disabled={isBusy}
            >
              Decline
              <Who person={person} />
            </Button>
          </>
        )
      case 'friends':
        return (
          <span className={styles.state}>
            <Check size={16} aria-hidden="true" /> Friends
          </span>
        )
    }
  }

  const results = search.phase === 'done' || search.phase === 'loading' ? search.results : null
  let searchStatus = ''
  if (search.phase === 'too_short') searchStatus = 'Type at least 2 characters.'
  else if (search.phase === 'loading' && !results) searchStatus = 'Searching…'
  else if (search.phase === 'done') {
    searchStatus =
      search.results.length === 0
        ? `No one found for “${query.trim()}”.`
        : `${search.results.length} ${search.results.length === 1 ? 'person' : 'people'} found.`
  }

  return (
    <section className={styles.page}>
      <title>{`Friends | ${APP_NAME}`}</title>
      <h1>Friends</h1>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="success">{notice}</Alert>}

      {/* --- Find people --- */}
      <section aria-labelledby={`${searchId}-heading`} className={styles.section}>
        <h2 id={`${searchId}-heading`}>Find people</h2>
        <TextField
          id={searchId}
          type="search"
          label="Search by name or username"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          trailing={<Search className={styles.searchIcon} size={18} aria-hidden="true" />}
        />
        <p role="status" className={styles.status}>
          {searchStatus}
        </p>
        {search.phase === 'error' && <Alert>{search.message}</Alert>}
        {results && results.length > 0 && (
          <ul
            className={styles.list}
            aria-label="Search results"
            aria-busy={search.phase === 'loading'}
          >
            {results.map((person) => (
              <PersonRow
                key={person.username}
                id={rowId('search', person.username)}
                person={person}
              >
                {searchActions(person)}
              </PersonRow>
            ))}
          </ul>
        )}
      </section>

      {lists.status === 'loading' && <LoadingScreen label="Loading your friends…" />}
      {lists.status === 'error' && <Alert>{lists.message}</Alert>}
      {lists.status === 'ready' && (
        <>
          {/* --- Requests --- */}
          <section aria-labelledby="requests-heading" className={styles.section}>
            <h2 id="requests-heading">Requests</h2>
            <h3 className={styles.subheading}>
              Waiting for you ({lists.requests.incoming.length})
            </h3>
            {lists.requests.incoming.length === 0 ? (
              <p className={styles.empty}>No one is waiting for your answer.</p>
            ) : (
              <ul className={styles.list} aria-label="Requests waiting for you">
                {lists.requests.incoming.map(({ id, user }) => {
                  const row = rowId('incoming', user.username)
                  return (
                    <PersonRow key={id} id={row} person={user}>
                      <Button
                        onClick={() => void accept(id, user, row)}
                        loading={busy === user.username}
                      >
                        Accept
                        <Who person={user} />
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void decline(id, user, row)}
                        disabled={busy === user.username}
                      >
                        Decline
                        <Who person={user} />
                      </Button>
                    </PersonRow>
                  )
                })}
              </ul>
            )}

            <h3 className={styles.subheading}>Sent by you ({lists.requests.outgoing.length})</h3>
            {lists.requests.outgoing.length === 0 ? (
              <p className={styles.empty}>You have no requests waiting.</p>
            ) : (
              <ul className={styles.list} aria-label="Requests sent by you">
                {lists.requests.outgoing.map(({ id, user }) => {
                  const row = rowId('outgoing', user.username)
                  return (
                    <PersonRow key={id} id={row} person={user}>
                      <Button
                        variant="secondary"
                        onClick={() => void cancel(id, user, row)}
                        loading={busy === user.username}
                      >
                        Cancel request
                        <Who person={user} />
                      </Button>
                    </PersonRow>
                  )
                })}
              </ul>
            )}
          </section>

          {/* --- Friends --- */}
          <section aria-labelledby="friends-heading" className={styles.section}>
            <h2 id="friends-heading" tabIndex={-1} className={styles.focusTarget}>
              Your friends ({lists.friends.length})
            </h2>
            {lists.friends.length === 0 ? (
              <div className={styles.emptyBox}>
                <p className={styles.emptyTitle}>No friends yet</p>
                <p>Search above for people you know, and send them a friend request.</p>
              </div>
            ) : (
              <ul className={styles.list} aria-label="Your friends">
                {lists.friends.map((friendship) => (
                  <PersonRow
                    key={friendship.id}
                    id={rowId('friend', friendship.user.username)}
                    person={friendship.user}
                  >
                    <Button
                      variant="secondary"
                      onClick={() => setToUnfriend(friendship)}
                      disabled={busy === friendship.user.username}
                    >
                      Unfriend
                      <Who person={friendship.user} />
                    </Button>
                  </PersonRow>
                ))}
              </ul>
            )}
          </section>
        </>
      )}

      <ConfirmDialog
        open={toUnfriend !== null}
        title={`Remove ${toUnfriend?.user.full_name ?? ''} from your friends?`}
        confirmLabel="Unfriend"
        busyLabel="Removing…"
        busy={toUnfriend !== null && busy === toUnfriend.user.username}
        danger
        onConfirm={() => void confirmUnfriend()}
        onCancel={() => setToUnfriend(null)}
      >
        <p>They won't be told. You can send them a friend request again later.</p>
      </ConfirmDialog>
    </section>
  )
}
