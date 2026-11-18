import { useAuth } from '../hooks/useAuth'
import { APP_NAME } from '../utils/constants'

/**
 * Home page, shown at `/` to logged-in users. A placeholder until the dashboard
 * (today's habits) is built in Sprint 2.
 */
export default function HomePage() {
  const { user } = useAuth()

  return (
    <section>
      <title>{`Home | ${APP_NAME}`}</title>
      <h1>Hi, {user?.full_name}!</h1>
      <p>Your habits will appear here soon.</p>
    </section>
  )
}
