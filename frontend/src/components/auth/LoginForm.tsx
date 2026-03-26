import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthFormWrapper } from './AuthFormWrapper'
import { apiClient, ApiError } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

interface LoginFormProps {
  /** Override the API endpoint — used by OrgLoginForm and AdminLoginForm */
  endpoint?: string
  /** Redirect path after successful login */
  redirectTo?: string
}

export function LoginForm({
  endpoint = '/auth/login',
  redirectTo = '/dashboard',
}: LoginFormProps = {}) {
  const { login, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (endpoint === '/auth/login') {
        await login({ email, password })
      } else {
        await apiClient.post(endpoint, { email, password })
        await refreshUser()
      }
      navigate(redirectTo)
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string }
        setError(body?.error ?? 'An error occurred. Please try again.')
      } else {
        setError('An error occurred. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFormWrapper heading="Sign in to Gatherly">
      <form onSubmit={(e) => { void handleSubmit(e) }} noValidate>
        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <div className="mt-4 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="text-indigo-600 hover:underline">
            Forgot your password?
          </Link>
          <Link to="/register" className="text-indigo-600 hover:underline">
            Register
          </Link>
        </div>
      </form>
    </AuthFormWrapper>
  )
}
