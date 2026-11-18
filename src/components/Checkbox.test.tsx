import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  it('can be ticked by clicking the label', async () => {
    render(<Checkbox label="Remember me" />)

    await userEvent.click(screen.getByText('Remember me'))

    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeChecked()
  })

  it('can be ticked with the Space key', async () => {
    render(<Checkbox label="Remember me" />)

    await userEvent.tab()
    await userEvent.keyboard(' ')

    expect(screen.getByRole('checkbox', { name: 'Remember me' })).toBeChecked()
  })

  it('accepts a label with a link inside', () => {
    render(
      <Checkbox
        label={
          <>
            I agree to the <a href="/terms">Terms</a>
          </>
        }
      />,
    )

    expect(screen.getByRole('checkbox', { name: 'I agree to the Terms' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
  })

  it('shows an error and marks the checkbox invalid', () => {
    render(<Checkbox label="I agree" error="Please accept the terms." />)
    const checkbox = screen.getByRole('checkbox', { name: 'I agree' })

    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    expect(checkbox).toHaveAccessibleDescription('Please accept the terms.')
  })

  it('has no accessibility problems', async () => {
    const { container } = render(
      <>
        <Checkbox label="Remember me" />
        <Checkbox label="I agree" error="Please accept the terms." />
      </>,
    )

    await expectNoAxeViolations(container)
  })
})
