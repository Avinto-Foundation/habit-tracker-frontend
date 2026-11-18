import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import TextField from './TextField'

describe('TextField', () => {
  it('links the visible label to the input', () => {
    render(<TextField label="Email" name="email" />)

    expect(screen.getByLabelText('Email')).toHaveAttribute('name', 'email')
  })

  it('lets the user type and calls onChange', async () => {
    const onChange = vi.fn()
    render(<TextField label="Full name" onChange={onChange} />)

    await userEvent.type(screen.getByLabelText('Full name'), 'Sam')

    expect(screen.getByLabelText('Full name')).toHaveValue('Sam')
    expect(onChange).toHaveBeenCalledTimes(3)
  })

  it('connects the hint so screen readers read it', () => {
    render(<TextField label="Password" hint="At least 8 characters" />)

    expect(screen.getByLabelText('Password')).toHaveAccessibleDescription('At least 8 characters')
  })

  it('shows an error, marks the input invalid and reads the error out', () => {
    render(<TextField label="Email" hint="We never share it" error="Enter a valid email." />)
    const input = screen.getByLabelText('Email')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('We never share it Enter a valid email.')
    expect(screen.getByText('Enter a valid email.')).toBeVisible()
  })

  it('is not marked invalid without an error', () => {
    render(<TextField label="Email" />)

    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-describedby')
  })

  it('shows a prefix without making it part of the label', () => {
    render(<TextField label="Username" prefix="@" />)

    expect(screen.getByText('@')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeInTheDocument()
  })

  it('passes extra props to the input', () => {
    render(<TextField label="Email" type="email" autoComplete="email" required />)
    const input = screen.getByLabelText(/Email/)

    expect(input).toHaveAttribute('type', 'email')
    expect(input).toHaveAttribute('autocomplete', 'email')
    expect(input).toBeRequired()
  })

  it('gives each field its own id', () => {
    render(
      <>
        <TextField label="First" />
        <TextField label="Second" />
      </>,
    )

    expect(screen.getByLabelText('First').id).not.toBe(screen.getByLabelText('Second').id)
  })

  it('has no accessibility problems, with or without an error', async () => {
    const { container } = render(
      <>
        <TextField label="Email" hint="We never share it" />
        <TextField label="Username" prefix="@" error="This username is already taken." />
      </>,
    )

    await expectNoAxeViolations(container)
  })
})
