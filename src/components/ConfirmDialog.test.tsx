import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import ConfirmDialog from './ConfirmDialog'

/** A page with a button that opens the dialog, like the habit page. */
function Example({ onConfirm = vi.fn(), busy = false }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Delete
      </button>
      <ConfirmDialog
        open={open}
        title="Delete “Read”?"
        confirmLabel="Delete habit"
        busyLabel="Deleting…"
        busy={busy}
        danger
        onConfirm={onConfirm}
        onCancel={() => setOpen(false)}
      >
        <p>You can't undo this.</p>
      </ConfirmDialog>
    </>
  )
}

async function open() {
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
  return screen.getByRole('alertdialog', { name: 'Delete “Read”?' })
}

describe('ConfirmDialog', () => {
  it('is hidden until opened', () => {
    render(<Example />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('opens with its title and message, focusing "Cancel"', async () => {
    render(<Example />)

    const dialog = await open()

    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription("You can't undo this.")
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus()
  })

  it('calls onConfirm', async () => {
    const onConfirm = vi.fn()
    render(<Example onConfirm={onConfirm} />)
    await open()

    await userEvent.click(screen.getByRole('button', { name: 'Delete habit' }))

    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('closes with Cancel and gives focus back to the opener', async () => {
    render(<Example />)
    await open()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
  })

  it('closes with Esc', async () => {
    render(<Example />)
    await open()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
  })

  it('keeps Tab inside the dialog', async () => {
    render(<Example />)
    await open()
    const cancel = screen.getByRole('button', { name: 'Cancel' })
    const confirm = screen.getByRole('button', { name: 'Delete habit' })

    await userEvent.tab()
    expect(confirm).toHaveFocus()
    await userEvent.tab()
    expect(cancel).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(confirm).toHaveFocus()
  })

  it('while busy: shows the busy text and Esc does nothing', async () => {
    render(<Example busy />)
    await open()

    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    await userEvent.keyboard('{Escape}')
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
  })

  it('has no accessibility problems', async () => {
    const { container } = render(<Example />)
    await open()

    await expectNoAxeViolations(container)
  })
})
