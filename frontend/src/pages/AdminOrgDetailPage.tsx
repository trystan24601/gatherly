/**
 * Super Admin org detail page — approve or reject a pending organisation.
 */
import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { getAdminOrgDetail, approveOrg, rejectOrg, type OrgDetail } from '../lib/organisations'

const ORG_TYPE_LABELS: Record<string, string> = {
  SPORTS_CLUB: 'Sports Club',
  CHARITY: 'Charity',
  COMMUNITY: 'Community Group',
  OTHER: 'Other',
}

export function AdminOrgDetailPage() {
  const { orgId } = useParams<{ orgId: string }>()

  const [org, setOrg] = useState<OrgDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Reject UI state
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectError, setRejectError] = useState<string | null>(null)
  const [isActionInFlight, setIsActionInFlight] = useState(false)

  useEffect(() => {
    if (!orgId) return
    setLoading(true)
    getAdminOrgDetail(orgId)
      .then(setOrg)
      .catch(() => setError('Failed to load organisation details.'))
      .finally(() => setLoading(false))
  }, [orgId])

  async function handleApprove() {
    if (!orgId) return
    setIsActionInFlight(true)
    setError(null)
    try {
      const updated = await approveOrg(orgId)
      setOrg(updated)
    } catch {
      setError('Failed to approve organisation. Please try again.')
    } finally {
      setIsActionInFlight(false)
    }
  }

  async function handleRejectSubmit() {
    if (!orgId) return
    if (rejectReason.trim().length < 10) {
      setRejectError('Reason must be at least 10 characters.')
      return
    }
    setIsActionInFlight(true)
    setRejectError(null)
    try {
      const updated = await rejectOrg(orgId, rejectReason.trim())
      setOrg(updated)
      setShowRejectForm(false)
    } catch {
      setRejectError('Failed to reject organisation. Please try again.')
    } finally {
      setIsActionInFlight(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-gray-500">Loading…</span>
      </div>
    )
  }

  if (!org || error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-600">{error ?? 'Organisation not found.'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
          <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            org.status === 'APPROVED'
              ? 'bg-green-100 text-green-800'
              : org.status === 'REJECTED'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
          }`}>
            {org.status}
          </span>
        </div>

        <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{ORG_TYPE_LABELS[org.orgType] ?? org.orgType}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-sm text-gray-900">{org.description}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contact email</dt>
              <dd className="mt-1 text-sm text-gray-900">{org.contactEmail}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Contact phone</dt>
              <dd className="mt-1 text-sm text-gray-900">{org.contactPhone}</dd>
            </div>
            {org.website && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline">
                    {org.website}
                  </a>
                </dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Submitted</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(org.submittedAt).toLocaleDateString('en-GB', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </dd>
            </div>
            {org.rejectionReason && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Rejection reason</dt>
                <dd className="mt-1 text-sm text-red-700">{org.rejectionReason}</dd>
              </div>
            )}
          </dl>
        </div>

        {org.status === 'PENDING' && (
          <div className="mt-6 space-y-4">
            {error && (
              <div role="alert" className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleApprove}
                disabled={isActionInFlight}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => setShowRejectForm(!showRejectForm)}
                disabled={isActionInFlight}
                className="rounded-md border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50"
              >
                Reject
              </button>
            </div>

            {showRejectForm && (
              <div className="rounded-lg bg-white p-4 shadow-sm border border-gray-200 space-y-3">
                <div>
                  <label htmlFor="reject-reason" className="block text-sm font-medium text-gray-700">
                    Reason for rejection
                  </label>
                  <textarea
                    id="reject-reason"
                    rows={4}
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    aria-describedby={rejectError ? 'reject-reason-error' : undefined}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="Please provide a detailed reason (at least 10 characters)"
                  />
                  {rejectError && (
                    <p id="reject-reason-error" role="alert" className="mt-1 text-sm text-red-600">
                      {rejectError}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  disabled={isActionInFlight || rejectReason.trim().length < 10}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Submit rejection
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
