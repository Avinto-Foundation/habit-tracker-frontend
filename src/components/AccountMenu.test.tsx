import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { expectNoAxeViolations } from '../test/axe'
import { renderApp } from '../test/renderApp'
import { testUser } from '../test/server'
import { HOME_HEADING, startLoggedIn } from '../test/session'

/** Open the app logged in, wait for the home page and return the account button. */
async function openApp(user = testUser) {
  startLoggedIn(user)
  const view = renderApp('/')
  await screen.findByRole('heading', { name: HOME_HEADING })
  return { ...view, button: screen.getByRole('button', { name: /^Account menu for/ }) }
}

describe('AccountMenu (header)', () => {
  it('is closed at first', async () => {
    const { button } = await openApp()

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('link', { name: 'Your profile' })).not.toBeInTheDocument()
  })

  it('opens to show name, email, "Your profile" and "Log out"', async () => {
    const { button } = await openApp()

    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    const panel = within(document.getElementById(button.getAttribute('aria-controls')!)!)
    expect(panel.getByText('Sam Adhikari')).toBeInTheDocument()
    expect(panel.getByText('sam@example.com')).toBeInTheDocument()
    expect(panel.getByRole('link', { name: 'Your profile' })).toHaveAttribute('href', '/profile')
    expect(panel.getByRole('button', { name: 'Log out' })).toBeInTheDocument()
  })

  it('shows the photo when the user has one', async () => {
    const { button } = await openApp({ ...testUser, avatar: 'http://x/me.webp' })

    expect(button.querySelector('img')).toHaveAttribute('src', 'http://x/me.webp')
  })

  it('Esc closes it and puts focus back on the button', async () => {
    const { button } = await openApp()
    await userEvent.click(button)
    await userEvent.tab() // into the panel

    await userEvent.keyboard('{Escape}')

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('a click outside closes it', async () => {
    const { button } = await openApp()
    await userEvent.click(button)

    await userEvent.click(screen.getByRole('heading', { name: HOME_HEADING }))

    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('"Your profile" opens the profile page and closes the menu', async () => {
    const { button } = await openApp()
    await userEvent.click(button)

    await userEvent.click(screen.getByRole('link', { name: 'Your profile' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Sam Adhikari' })).toBeVisible()
    expect(button).toHaveAttribute('aria-expanded', 'false')
  })

  it('has no accessibility problems when open', async () => {
    const { container, button } = await openApp()
    await userEvent.click(button)

    await expectNoAxeViolations(container)
  })
})
