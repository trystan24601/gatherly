import { LoginForm } from './LoginForm'

/**
 * Super Admin login form — same shape as OrgLoginForm, targets /auth/admin/login.
 */
export function AdminLoginForm() {
  return <LoginForm endpoint="/auth/admin/login" redirectTo="/admin/dashboard" />
}
