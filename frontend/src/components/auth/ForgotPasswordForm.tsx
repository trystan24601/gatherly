import { useState, type FormEvent } from 'react'
import { AuthFormWrapper } from './AuthFormWrapper'
import { apiClient } from '../../lib/api'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)

    try {
      await apiClient.post('/auth/password-reset/request', { email })
    } catch {
      // Always show success — no enumeration
    } finally {
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  if (submitted) {
    return (
      <AuthFormWrapper heading="Check your email">
        <p className="text-sm text-gray-600">
          If an account with that email exists, we have sent a reset link. Please check your
          email inbox (and spam folder).
        </p>
      </AuthFormWrapper>
    )
  }

  return (
    <AuthFormWrapper heading="Forgot your password?">
      <form onSubmit={(e) => { void handleSubmit(e) }} noValidate>
        <div className="mb-6">
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

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
        >
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>
    </AuthFormWrapper>
  )
}
