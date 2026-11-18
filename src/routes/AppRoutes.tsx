import { Route, Routes } from 'react-router'
import AppLayout from '../components/AppLayout'
import ComponentsPreviewPage from '../pages/ComponentsPreviewPage'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'

/**
 * All the app's pages, one `<Route>` per URL.
 * Routes inside `<AppLayout>` get the shared header and `<main>`.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />
        {import.meta.env.DEV && (
          <Route path="/dev/components" element={<ComponentsPreviewPage />} />
        )}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
