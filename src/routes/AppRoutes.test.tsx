import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import AppRoutes from './AppRoutes'

/** Draws the app as if the browser were at `url`. */
function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <AppRoutes />
    </MemoryRouter>,
  )
}

describe('AppRoutes', () => {
  it('shows the home page at /', () => {
    renderAt('/')

    expect(screen.getByRole('heading', { name: 'Social Habit Tracker' })).toBeInTheDocument()
  })

  it('shows the 404 page for an unknown URL', () => {
    renderAt('/does-not-exist')

    expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it('goes back home from the 404 page', async () => {
    renderAt('/does-not-exist')

    await userEvent.click(screen.getByRole('link', { name: 'Go back home' }))

    expect(screen.getByRole('heading', { name: 'Social Habit Tracker' })).toBeInTheDocument()
  })
})
