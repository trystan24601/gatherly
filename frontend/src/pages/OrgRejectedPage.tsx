/**
 * Shown to ORG_ADMIN users whose organisation is in REJECTED status.
 * Displays the verbatim rejection reason from the AuthContext user object,
 * populated from GET /auth/me (orgRejectionReason field).
 */
import { useAuth } from '../context/AuthContext'

export function OrgRejectedPage() {
  const { user, logout } = useAuth()

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="rounded-lg bg-white p-8 shadow-sm border border-gray-200">
          <div className="mb-4 text-4xl">✗</div>
          <h1 className="text-2xl font-bold text-gray-900">Application rejected</h1>
          <p className="mt-4 text-gray-600">
            Unfortunately, your organisation application was not approved.
          </p>
          {user?.orgRejectionReason && (
            <div className="mt-4 rounded-md bg-red-50 p-4 text-left">
              <p className="text-sm font-medium text-red-800">Reason:</p>
              <p className="mt-1 text-sm text-red-700">{user.orgRejectionReason}</p>
            </div>
          )}
          <p className="mt-4 text-sm text-gray-500">
            If you believe this is an error, please contact support.
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-6 w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
