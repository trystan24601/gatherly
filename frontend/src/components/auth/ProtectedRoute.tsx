import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  /** When provided, the user must have this exact role (SUPER_ADMIN bypasses all). */
  role?: string
}

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-500">Loading…</span>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
