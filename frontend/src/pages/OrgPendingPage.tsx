/**
 * Shown to ORG_ADMIN users whose organisation is in PENDING status.
 * Sources org data (submittedAt) from the AuthContext user object,
 * which is populated by GET /auth/me including orgSubmittedAt.
 */
import { useAuth } from '../context/AuthContext'

function formatDate(iso: string): string {
  const date = new Date(iso)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function OrgPendingPage() {
  const { user, logout } = useAuth()

  const submittedDate = user?.orgSubmittedAt ? formatDate(user.orgSubmittedAt) : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200">
          <div className="mb-4 text-4xl">⏳</div>
          <h1 className="text-2xl font-bold text-gray-900">Application under review</h1>
          <p className="mt-4 text-gray-600">
            Your organisation has been submitted and is awaiting approval. We&apos;ll email you
            once a decision has been made.
          </p>
          {submittedDate && (
            <p className="mt-3 text-sm text-gray-500">
              Submitted: <span className="font-medium text-gray-700">{submittedDate}</span>
            </p>
          )}
          <button
            type="button"
            onClick={logout}
            className="mt-8 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
