/**
 * Super Admin page showing the pending organisation approval queue.
 * Fetches GET /admin/organisations?status=PENDING with cursor-based pagination.
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { getAdminOrgs, type OrgSummary } from '../lib/organisations'

function formatRelativeDate(iso: string): string {
  const date = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'today'
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 30) return `${diffDays} days ago`
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months !== 1 ? 's' : ''} ago`
  }
  const years = Math.floor(diffDays / 365)
  return `${years} year${years !== 1 ? 's' : ''} ago`
}

const ORG_TYPE_LABELS: Record<string, string> = {
  SPORTS_CLUB: 'Sports Club',
  CHARITY: 'Charity',
  COMMUNITY: 'Community Group',
  OTHER: 'Other',
}

export function AdminOrgListPage() {
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchFirstPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getAdminOrgs('PENDING', 20)
      setOrgs(result.items)
      setCursor(result.cursor)
    } catch {
      setError('Failed to load organisations. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchFirstPage()
  }, [fetchFirstPage])

  async function handleLoadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const result = await getAdminOrgs('PENDING', 20, cursor)
      setOrgs((prev) => [...prev, ...result.items])
      setCursor(result.cursor)
    } catch {
      setError('Failed to load more organisations.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Organisation approvals</h1>
          <p className="mt-1 text-sm text-gray-600">Pending applications awaiting review</p>
        </div>

        {error && (
          <div role="alert" className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <span className="text-gray-500">Loading…</span>
          </div>
        ) : orgs.length === 0 ? (
          <div className="rounded-lg bg-white p-8 text-center shadow-sm border border-gray-200">
            <p className="text-gray-500">No pending organisations.</p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Submitted
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="relative px-6 py-3">
                      <span className="sr-only">View</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {orgs.map((org) => (
                    <tr key={org.orgId} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        <Link
                          to={`/admin/organisations/${org.orgId}`}
                          className="text-brand-600 hover:text-brand-700 hover:underline"
                        >
                          {org.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {ORG_TYPE_LABELS[org.orgType] ?? org.orgType}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatRelativeDate(org.submittedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                          {org.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm">
                        <Link
                          to={`/admin/organisations/${org.orgId}`}
                          className="font-medium text-brand-600 hover:text-brand-700"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {cursor && (
              <div className="mt-4 flex justify-center">
                <button
                  type="button"
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {loadingMore ? 'Loading…' : 'Load more'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
