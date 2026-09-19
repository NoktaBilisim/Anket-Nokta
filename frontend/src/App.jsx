import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import { useBrandingStore } from './store/brandingStore'
import AppLayout from './components/layout/AppLayout'
import Notifications from './components/shared/Notifications'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import SurveysPage from './pages/SurveysPage'
import CreateSurveyPage from './pages/CreateSurveyPage'
import EditSurveyPage from './pages/EditSurveyPage'
import ReportPage from './pages/ReportPage'
import MySurveysPage from './pages/MySurveysPage'
import TakeSurveyPage from './pages/TakeSurveyPage'
import UsersPage from './pages/UsersPage'
import LogsPage from './pages/LogsPage'
import ProfilePage from './pages/ProfilePage'
import SettingsPage from './pages/SettingsPage'

function Protected({ children }) {
  const { user } = useAuthStore()
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  const fetchBranding = useBrandingStore((state) => state.fetchBranding)

  useEffect(() => {
    fetchBranding()
  }, [fetchBranding])

  return (
    <BrowserRouter>
      <Notifications />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/survey/:token" element={<TakeSurveyPage />} />
        <Route path="/" element={<Protected><AppLayout /></Protected>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"         element={<DashboardPage />} />
          <Route path="surveys"           element={<SurveysPage />} />
          <Route path="surveys/create"    element={<CreateSurveyPage />} />
          <Route path="surveys/:id/edit"  element={<EditSurveyPage />} />
          <Route path="surveys/:id/report" element={<ReportPage />} />
          <Route path="my-surveys"        element={<MySurveysPage />} />
          <Route path="users"             element={<UsersPage />} />
          <Route path="logs"              element={<LogsPage />} />
          <Route path="settings"          element={<SettingsPage />} />
          <Route path="profile"           element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
