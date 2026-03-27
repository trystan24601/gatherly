import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HealthBanner } from './components/HealthBanner'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { OrgLoginForm } from './components/auth/OrgLoginForm'
import { AdminLoginForm } from './components/auth/AdminLoginForm'
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { OrgRegisterForm } from './components/organisations/OrgRegisterForm'
import { OrgRegisterSubmittedPage } from './pages/OrgRegisterSubmittedPage'
import { OrgPendingPage } from './pages/OrgPendingPage'
import { OrgRejectedPage } from './pages/OrgRejectedPage'
import { AdminOrgListPage } from './pages/AdminOrgListPage'
import { AdminOrgDetailPage } from './pages/AdminOrgDetailPage'

// Placeholder dashboard pages (to be replaced by feature PRDs)
function Dashboard() {
  return <div>Volunteer Dashboard — placeholder</div>
}

function OrgDashboard() {
  return <div>Org Admin Dashboard — placeholder</div>
}

function AdminDashboard() {
  return <div>Super Admin Dashboard — placeholder</div>
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public root */}
          <Route path="/" element={<HealthBanner />} />

          {/* Public auth routes */}
          <Route path="/login" element={<LoginForm />} />
          <Route path="/register" element={<RegisterForm />} />
          <Route path="/org/login" element={<OrgLoginForm />} />
          <Route path="/admin/login" element={<AdminLoginForm />} />
          <Route path="/forgot-password" element={<ForgotPasswordForm />} />

          {/* Organisation registration (public) */}
          <Route path="/register/organisation" element={<OrgRegisterForm />} />
          <Route path="/register/organisation/submitted" element={<OrgRegisterSubmittedPage />} />

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="VOLUNTEER">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/org/dashboard"
            element={
              <ProtectedRoute role="ORG_ADMIN">
                <OrgDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Org Admin status pages (exempt from org-status redirect) */}
          <Route
            path="/organisation/pending"
            element={
              <ProtectedRoute role="ORG_ADMIN">
                <OrgPendingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organisation/rejected"
            element={
              <ProtectedRoute role="ORG_ADMIN">
                <OrgRejectedPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/organisation/dashboard"
            element={
              <ProtectedRoute role="ORG_ADMIN">
                <OrgDashboard />
              </ProtectedRoute>
            }
          />

          {/* Super Admin org management */}
          <Route
            path="/admin/organisations"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <AdminOrgListPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/organisations/:orgId"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <AdminOrgDetailPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
