import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { TodayPage } from './pages/TodayPage'
import { Habits } from './pages/Habits'
import { Predictions } from './pages/Predictions'
import { Simulator } from './pages/Simulator'
import { Profile } from './pages/Profile'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Onboarding } from './pages/Onboarding'
import { InsightsPage } from './pages/Insights'
import { AICoach } from './pages/AICoach'
import { FutureLetters } from './pages/FutureLetters'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { useAuth } from './contexts/AuthContext'

import { Twin } from './pages/Twin'
import { Journal } from './pages/Journal'
import { Badges } from './pages/Badges'
import { Landing } from './pages/Landing'
import { Terms } from './pages/Terms'
import { Privacy } from './pages/Privacy'

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const isRecoveryMode =
    typeof window !== 'undefined' &&
    (window.location.pathname.startsWith('/reset-password') ||
      window.location.hash.includes('type=recovery') ||
      window.location.search.includes('type=recovery'))

  return (
    <Routes>
      <Route path="/" element={user && !isRecoveryMode ? <Navigate to="/dashboard" replace /> : <Landing />} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/login" element={user && !isRecoveryMode ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/register" element={user && !isRecoveryMode ? <Navigate to="/dashboard" replace /> : <Register />} />
      <Route path="/forgot-password" element={user && !isRecoveryMode ? <Navigate to="/dashboard" replace /> : <ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<TodayPage />} />
          <Route path="/habits" element={<Habits />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/twin" element={<Twin />} />
          <Route path="/scenarios" element={<Simulator />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/badges" element={<Badges />} />
          <Route path="/predictions" element={<Predictions />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/future-letters" element={<FutureLetters />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return <AppRoutes />
}