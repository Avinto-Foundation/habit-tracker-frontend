import { useEffect, useId, useRef, type ReactNode } from 'react'
import Button from './Button'
import styles from './ConfirmDialog.module.css'

export interface ConfirmDialogProps {
  /** Show or hide the dialog. */
  open: boolean
  /** The question, e.g. "Delete “Read”?". */
  title: string
  /** More detail, e.g. "This deletes all its check-ins. You can't undo this." */
  children: ReactNode
  /** Text on the confirm button, e.g. "Delete habit". */
  confirmLabel: string
  /** Text on the confirm button while working, e.g. "Deleting…". */
  busyLabel?: string
  /** True while the action runs (buttons disabled, spinner shown). */
  busy?: boolean
  /** Red confirm button for actions that can't be undone. */
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

const FOCUSABLE = 'button:not(:disabled), a[href], input:not(:disabled), textarea:not(:disabled)'

/**
 * A modal "Are you sure?" box.
 *
 * Accessibility (WAI-ARIA alertdialog pattern): announced with its title and
 * message; focus starts on "Cancel" (the safe choice), Tab stays inside the box,
 * Esc cancels, and focus goes back to the button that opened it when it closes.
 */
export default function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  busy = false,
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const messageId = useId()
  const boxRef = useRef<HTMLDivElement>(null)
  const cancelRef = useRef<HTMLButtonElement>(null)

  // On open: remember what had focus and focus "Cancel". On close: give focus back.
  useEffect(() => {
    if (!open) return
    const opener = document.activeElement as HTMLElement | null
    cancelRef.current?.focus()
    return () => opener?.focus()
  }, [open])

  if (!open) return null

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape' && !busy) {
      event.preventDefault()
      onCancel()
      return
    }
    if (event.key !== 'Tab' || !boxRef.current) return
    // Keep Tab inside the dialog: wrap from the last button to the first and back.
    const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items.length === 0) return
    const first = items[0]
    const last = items[items.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.backdrop}>
      <div
        ref={boxRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <div id={messageId} className={styles.message}>
          {children}
        </div>
        <div className={styles.actions}>
          <Button ref={cancelRef} variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={busy}
            loadingText={busyLabel}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
