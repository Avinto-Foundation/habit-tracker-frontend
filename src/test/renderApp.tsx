import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import AuthProvider from '../features/auth/AuthProvider'
import AppRoutes from '../routes/AppRoutes'

/**
 * Render the whole app (router + auth + all routes) as if the browser were at
 * `url`. Use this to test pages the way a user meets them.
 */
export function renderApp(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  )
}
