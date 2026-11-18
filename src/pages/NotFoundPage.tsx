import { Link } from 'react-router'

/** Shown for any URL that doesn't match a route. */
export default function NotFoundPage() {
  return (
    <main>
      <h1>Page not found</h1>
      <p>Sorry, we couldn't find that page.</p>
      <Link to="/">Go back home</Link>
    </main>
  )
}
