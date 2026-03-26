import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthFormWrapper } from './AuthFormWrapper'
import { apiClient, ApiError } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

function isStrongPassword(password: string): boolean {
  return password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)
}

export function RegisterForm() {
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side password strength validation
    if (!isStrongPassword(password)) {
      setError('Password must be at least 8 characters and include an uppercase letter and a number.')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post('/auth/register', { firstName, lastName, email, password })
      // Refresh AuthContext so ProtectedRoute sees the new session
      await refreshUser()
      navigate('/dashboard')
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string }
        setError(body?.error ?? 'Registration failed. Please try again.')
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthFormWrapper heading="Create your Gatherly account">
      <form onSubmit={(e) => { void handleSubmit(e) }} noValidate>
        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
              First name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
              Last name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

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
            autoComplete="new-password"
            required
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <p className="mt-1 text-xs text-gray-500">Min 8 chars, 1 uppercase, 1 number</p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? 'Creating account…' : 'Create account'}
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </AuthFormWrapper>
  )
}
