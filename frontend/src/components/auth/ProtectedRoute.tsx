import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
  /** When provided, the user must have this exact role (SUPER_ADMIN bypasses all). */
  role?: string
}

/** Paths where ORG_ADMIN users with non-APPROVED orgs can still land without redirect. */
const ORG_STATUS_EXEMPT_PATHS = ['/organisation/pending', '/organisation/rejected']

export function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user, loading } = useAuth()
  const location = useLocation()

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

  // ORG_ADMIN users with non-APPROVED orgs are redirected to status pages
  // unless they are already on an exempt path (prevents redirect loops).
  if (user.role === 'ORG_ADMIN' && !ORG_STATUS_EXEMPT_PATHS.includes(location.pathname)) {
    if (user.orgStatus === 'PENDING') {
      return <Navigate to="/organisation/pending" replace />
    }
    if (user.orgStatus === 'REJECTED') {
      return <Navigate to="/organisation/rejected" replace />
    }
  }

  return <>{children}</>
}
