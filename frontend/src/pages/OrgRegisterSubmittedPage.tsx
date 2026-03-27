/**
 * Confirmation page shown after a successful organisation registration.
 * The user is NOT authenticated at this point.
 */
export function OrgRegisterSubmittedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md text-center">
        <div className="mb-6 text-5xl">✓</div>
        <h1 className="text-2xl font-bold text-gray-900">Application submitted</h1>
        <p className="mt-4 text-gray-600">
          Your organisation has been submitted for review. We&apos;ll email you when it&apos;s
          been approved.
        </p>
        <p className="mt-2 text-sm text-gray-500">
          You can close this page. You&apos;ll receive an email notification once a decision has
          been made.
        </p>
      </div>
    </div>
  )
}
