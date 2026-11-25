import { Camera, Trash2 } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { parseApiError } from '../../api/errors'
import Alert from '../../components/Alert'
import Avatar from '../../components/Avatar'
import Button from '../../components/Button'
import ConfirmDialog from '../../components/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import styles from './Profile.module.css'
import { checkPhoto, PHOTO_TYPES } from './profileSchemas'

/**
 * The profile photo with "Upload / Change photo" and "Remove".
 *
 * Choosing a file first shows a preview with "Save photo" and "Cancel", so nothing
 * is uploaded by mistake. The file is checked in the browser first (type, 2 MB).
 *
 * Accessibility: the real file input is kept (visually hidden) inside a label that
 * looks like a button, so it works with the keyboard and screen readers; results
 * are announced in an alert.
 */
export default function PhotoEditor() {
  const { user, setAvatar } = useAuth()
  const inputId = useId()
  const [preview, setPreview] = useState<{ file: File; url: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmRemove, setConfirmRemove] = useState(false)

  // Free the preview's memory when it's replaced or the page closes.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url)
    }
  }, [preview])

  if (!user) return null

  function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // so choosing the same file again still works
    if (!file) return
    setMessage(null)
    const problem = checkPhoto(file)
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setPreview({ file, url: URL.createObjectURL(file) })
  }

  async function run(action: () => Promise<unknown>, done: string) {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      await action()
      setPreview(null)
      setMessage(done)
    } catch (err) {
      const { message: text, fields } = parseApiError(err)
      setError(fields.avatar ?? text)
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    await run(() => setAvatar(null), 'Photo removed.')
    setConfirmRemove(false)
  }

  return (
    <div className={styles.photo}>
      <Avatar
        user={user}
        size={112}
        src={preview?.url}
        label={preview ? 'Preview of your new photo' : 'Your profile photo'}
      />

      <div className={styles.photoActions}>
        {preview ? (
          <>
            <Button
              onClick={() => void run(() => setAvatar(preview.file), 'Photo updated.')}
              loading={busy}
              loadingText="Uploading…"
            >
              Save photo
            </Button>
            <Button variant="secondary" onClick={() => setPreview(null)} disabled={busy}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <label htmlFor={inputId} className={styles.fileButton}>
              <Camera size={18} aria-hidden="true" />
              {user.avatar ? 'Change photo' : 'Upload photo'}
              <input
                id={inputId}
                type="file"
                accept={PHOTO_TYPES.join(',')}
                className="sr-only"
                onChange={choose}
                aria-describedby={`${inputId}-hint`}
              />
            </label>
            {user.avatar && (
              <Button variant="secondary" onClick={() => setConfirmRemove(true)}>
                <Trash2 size={18} aria-hidden="true" />
                Remove
              </Button>
            )}
          </>
        )}
      </div>
      <p id={`${inputId}-hint`} className={styles.hint}>
        JPG, PNG or WebP, up to 2 MB.
      </p>

      {error && <Alert>{error}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}

      <ConfirmDialog
        open={confirmRemove}
        title="Remove your photo?"
        confirmLabel="Remove photo"
        busyLabel="Removing…"
        busy={busy}
        danger
        onConfirm={() => void remove()}
        onCancel={() => setConfirmRemove(false)}
      >
        <p>Your initials will be shown instead. You can upload a new photo any time.</p>
      </ConfirmDialog>
    </div>
  )
}
