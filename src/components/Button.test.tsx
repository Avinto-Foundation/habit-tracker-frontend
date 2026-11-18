import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import Button from './Button'

describe('Button', () => {
  it('calls onClick when clicked', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Save</Button>)

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(onClick).toHaveBeenCalledOnce()
  })

  it('is type="button" by default so it never submits a form by accident', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('can be a submit button', () => {
    render(<Button type="submit">Log in</Button>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('shows loading text, is busy and cannot be clicked while loading', async () => {
    const onClick = vi.fn()
    render(
      <Button loading loadingText="Creating account..." onClick={onClick}>
        Create account
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Creating account...' })

    await userEvent.click(button)

    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(onClick).not.toHaveBeenCalled()
  })

  it('keeps its normal text while loading if no loadingText is given', () => {
    render(<Button loading>Save</Button>)

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('is not busy when not loading', () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-busy')
    expect(screen.getByRole('button')).toBeEnabled()
  })

  it('has no accessibility problems', async () => {
    const { container } = render(
      <>
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button loading loadingText="Saving...">
          Save
        </Button>
      </>,
    )

    await expectNoAxeViolations(container)
  })
})
