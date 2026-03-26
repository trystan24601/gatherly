import { LoginForm } from './LoginForm'

/**
 * Org Admin login form — reuses LoginForm internals, targets /auth/org/login.
 */
export function OrgLoginForm() {
  return <LoginForm endpoint="/auth/org/login" redirectTo="/org/dashboard" />
}
