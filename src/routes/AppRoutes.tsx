import { Route, Routes } from 'react-router'
import HomePage from '../pages/HomePage'
import NotFoundPage from '../pages/NotFoundPage'

/** All the app's pages, one `<Route>` per URL. */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
