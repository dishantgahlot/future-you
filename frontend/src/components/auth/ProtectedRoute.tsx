import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export function ProtectedRoute() {
  const { user, loading, onboardingCompleted: _onboardingCompleted, checkingOnboarding } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  const hasActiveUser = !!user || !!localStorage.getItem('future_you_active_user') || !!localStorage.getItem('future_you_demo_user')
  if (!hasActiveUser) {
    return <Navigate to="/login" replace />
  }

  // Still checking onboarding status
  if (checkingOnboarding) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    )
  }

  // Redirect to onboarding if not completed (but not if already on onboarding page)
  // This check is handled by the routes - onboarding page is accessible even without completion

  return <Outlet />
}