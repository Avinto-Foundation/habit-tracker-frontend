import { Route, Routes } from 'react-router'
import AppLayout from '../components/AppLayout'
import ComponentsPreviewPage from '../pages/ComponentsPreviewPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import SignupPage from '../pages/SignupPage'
import ProtectedRoute from './ProtectedRoute'

/**
 * All the app's pages, one `<Route>` per URL.
 * - Routes inside `<AppLayout>` get the shared header and `<main>`.
 * - Routes inside `<ProtectedRoute>` need a login.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public pages */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        {import.meta.env.DEV && (
          <Route path="/dev/components" element={<ComponentsPreviewPage />} />
        )}

        {/* Pages that need a login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
