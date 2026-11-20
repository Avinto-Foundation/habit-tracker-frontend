import { Check, Pencil } from 'lucide-react'
import { useId, useState } from 'react'
import { parseApiError } from '../../api/errors'
import type { CheckIn } from '../../api/types'
import Alert from '../../components/Alert'
import Button from '../../components/Button'
import fieldStyles from '../../components/Field.module.css'
import { formatDayMonth } from './dates'
import styles from './RecentDay.module.css'

/** Longest note the backend accepts. */
const NOTE_MAX = 280

export interface RecentDayProps {
  /** "today" or "yesterday": used in button text, e.g. "Mark today as done". */
  label: 'today' | 'yesterday'
  /** YYYY-MM-DD */
  date: string
  /** The check-in for this day, or null if not done. */
  checkin: CheckIn | null
  /** Check in (`done` true) or undo (`done` false). Throw on failure. */
  onToggle: (date: string, done: boolean) => Promise<void>
  /** Save the note for this day's check-in. Throw on failure. */
  onSaveNote: (date: string, note: string) => Promise<void>
}

/**
 * One recent day (today or yesterday) on the habit page: is it done, a button to
 * check in or undo (so a forgotten day can be ticked off late), and the note.
 *
 * Errors appear right here, next to what the user just did.
 */
export default function RecentDay({ label, date, checkin, onToggle, onSaveNote }: RecentDayProps) {
  const done = checkin !== null
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [note, setNote] = useState('')
  const noteId = useId()
  const title = label === 'today' ? 'Today' : 'Yesterday'

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      return true
    } catch (err) {
      // e.g. "You can only check in for today or yesterday." comes back as a field error.
      const { message, fields } = parseApiError(err)
      setError(message ?? Object.values(fields)[0] ?? null)
      return false
    } finally {
      setBusy(false)
    }
  }

  function startEditing() {
    setNote(checkin?.note ?? '')
    setEditing(true)
  }

  async function saveNote(event: React.FormEvent) {
    event.preventDefault()
    if (await run(() => onSaveNote(date, note.trim()))) setEditing(false)
  }

  return (
    <li className={styles.day}>
      <div className={styles.top}>
        <div>
          <p className={styles.title}>
            {title} <span className={styles.date}>· {formatDayMonth(date)}</span>
          </p>
          <p className={done ? styles.done : styles.notDone}>
            {done ? (
              <>
                <Check size={16} strokeWidth={3} aria-hidden="true" /> Done
              </>
            ) : (
              'Not done'
            )}
          </p>
        </div>
        <Button
          variant={done ? 'secondary' : 'primary'}
          onClick={() => void run(() => onToggle(date, !done))}
          loading={busy && !editing}
          disabled={busy}
        >
          {done ? `Undo ${label}` : `Mark ${label} as done`}
        </Button>
      </div>

      {done && !editing && (
        <div className={styles.note}>
          {checkin.note ? (
            <p className={styles.noteText}>“{checkin.note}”</p>
          ) : (
            <p className={styles.noNote}>No note</p>
          )}
          <button type="button" className={styles.linkButton} onClick={startEditing}>
            <Pencil size={14} aria-hidden="true" />
            {checkin.note ? `Edit note for ${label}` : `Add a note for ${label}`}
          </button>
        </div>
      )}

      {done && editing && (
        <form className={styles.noteForm} onSubmit={saveNote}>
          <label htmlFor={noteId} className={fieldStyles.label}>
            Note for {label}
          </label>
          <textarea
            id={noteId}
            className={styles.textarea}
            value={note}
            maxLength={NOTE_MAX}
            rows={3}
            aria-describedby={`${noteId}-count`}
            onChange={(event) => setNote(event.target.value)}
            autoFocus
          />
          <p id={`${noteId}-count`} className={fieldStyles.hint}>
            {note.length} / {NOTE_MAX} characters
          </p>
          <div className={styles.noteActions}>
            <Button type="submit" loading={busy} loadingText="Saving…">
              Save note
            </Button>
            <Button variant="secondary" onClick={() => setEditing(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      )}

      {error && <Alert>{error}</Alert>}
    </li>
  )
}
