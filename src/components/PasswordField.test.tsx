import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import PasswordField from './PasswordField'

describe('PasswordField', () => {
  it('hides the password by default', () => {
    render(<PasswordField label="Password" />)

    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows and hides the password when the button is clicked', async () => {
    render(<PasswordField label="Password" />)
    const toggle = screen.getByRole('button', { name: 'Show password' })

    await userEvent.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(toggle)
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('keeps what was typed when toggling', async () => {
    render(<PasswordField label="Password" />)

    await userEvent.type(screen.getByLabelText('Password'), 'secret-123')
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))

    expect(screen.getByLabelText('Password')).toHaveValue('secret-123')
  })

  it('can be used with the keyboard only', async () => {
    render(<PasswordField label="Password" />)

    await userEvent.tab()
    expect(screen.getByLabelText('Password')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByRole('button', { name: 'Show password' })).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'text')
  })

  it('does not submit a form when toggled', async () => {
    let submitted = false
    render(
      <form
        onSubmit={(event) => {
          event.preventDefault()
          submitted = true
        }}
      >
        <PasswordField label="Password" />
      </form>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))

    expect(submitted).toBe(false)
  })

  it('shows errors like a normal field', () => {
    render(<PasswordField label="Password" error="Too short." />)

    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('Too short.')
  })

  it('has no accessibility problems', async () => {
    const { container } = render(<PasswordField label="Password" hint="At least 8 characters" />)

    await expectNoAxeViolations(container)
  })
})
