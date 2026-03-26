import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { HealthBanner } from './components/HealthBanner'
import { LoginForm } from './components/auth/LoginForm'
import { RegisterForm } from './components/auth/RegisterForm'
import { OrgLoginForm } from './components/auth/OrgLoginForm'
import { AdminLoginForm } from './components/auth/AdminLoginForm'
import { ForgotPasswordForm } from './components/auth/ForgotPasswordForm'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { LandingScreen } from './screens/LandingScreen'
import { DiscoveryFeedScreen } from './screens/DiscoveryFeedScreen'
import { EventDetailScreen } from './screens/EventDetailScreen'
import { VolunteerDashboardScreen } from './screens/VolunteerDashboardScreen'
import { OrganiserEventDashboardScreen } from './screens/OrganiserEventDashboardScreen'
import { OrganiserRegistrationReviewScreen } from './screens/OrganiserRegistrationReviewScreen'

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

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="VOLUNTEER">
                <VolunteerDashboardScreen />
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

          {/* Demo screens */}
          <Route path="/demo" element={<LandingScreen />} />
          <Route path="/demo/events" element={<DiscoveryFeedScreen />} />
          <Route path="/demo/events/:id" element={<EventDetailScreen />} />
          <Route path="/demo/organiser/events/:id" element={<OrganiserEventDashboardScreen />} />
          <Route path="/demo/organiser/events/:id/registrations" element={<OrganiserRegistrationReviewScreen />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
