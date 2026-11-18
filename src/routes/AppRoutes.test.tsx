import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import AppRoutes from './AppRoutes'

/** Draws the app as if the browser were at `url`. */
function renderAt(url: string) {
  return render(
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

  it('shows the components preview page in development', () => {
    renderAt('/dev/components')

    expect(screen.getByRole('heading', { name: 'Components preview' })).toBeInTheDocument()
  })
})

describe('AppLayout', () => {
  it('puts every page inside one <main> with a header logo link home', () => {
    renderAt('/does-not-exist')

    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('link', { name: 'HabitSquad' })).toHaveAttribute('href', '/')
  })

  it('has a "Skip to main content" link as the first thing to Tab to', async () => {
    renderAt('/')

    await userEvent.tab()

    const skipLink = screen.getByRole('link', { name: 'Skip to main content' })
    expect(skipLink).toHaveFocus()
    expect(skipLink).toHaveAttribute('href', '#main-content')
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  })

  it('has no accessibility problems on the preview page', async () => {
    const { container } = renderAt('/dev/components')

    await expectNoAxeViolations(container)
  })
})
