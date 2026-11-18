import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import Alert from './Alert'

describe('Alert', () => {
  it('is announced to screen readers as an alert', () => {
    render(<Alert>Something went wrong. Please try again.</Alert>)

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.')
  })

  it('can show a success message', () => {
    render(<Alert variant="success">Saved.</Alert>)

    expect(screen.getByRole('alert')).toHaveTextContent('Saved.')
  })

  it('has no accessibility problems', async () => {
    const { container } = render(<Alert>Something went wrong.</Alert>)

    await expectNoAxeViolations(container)
  })
})
