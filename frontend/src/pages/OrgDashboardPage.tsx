/**
 * OrgDashboardPage — the primary management dashboard for an Org Admin.
 *
 * Displays a paginated table of all events for the organisation with:
 *   - Status badge pills (DRAFT/grey, PUBLISHED/green, CANCELLED/red, COMPLETED/muted)
 *   - Fill rate (filledCount / totalHeadcount) per event
 *   - Empty state when no events exist
 *   - "Create event" CTA linking to /organisation/events/new
 *   - "Load more" button for cursor pagination
 */
import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { listOrgEvents, type EventSummary } from '../lib/events'
import { StatusBadge } from '../components/events/StatusBadge'

function formatDate(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function OrgDashboardPage() {
  const [events, setEvents] = useState<EventSummary[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await listOrgEvents({ limit: 20 })
      setEvents(res.events)
      setCursor(res.cursor)
    } catch {
      setError('Failed to load events. Please refresh the page.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  async function handleLoadMore() {
    if (!cursor) return
    setLoadingMore(true)
    try {
      const res = await listOrgEvents({ limit: 20, cursor })
      setEvents((prev) => [...prev, ...res.events])
      setCursor(res.cursor)
    } catch {
      setError('Failed to load more events.')
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Organisation Dashboard</h1>
        <Link
          to="/organisation/events/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create event
        </Link>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading events…</div>
      ) : events.length === 0 ? (
        // Empty state (AC-10)
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">You haven't created any events yet.</p>
          <Link
            to="/organisation/events/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Create event
          </Link>
        </div>
      ) : (
        <>
          {/* Events table */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Title
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Fill
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {events.map((ev) => (
                  <tr key={ev.eventId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {ev.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(ev.eventDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {ev.filledCount} / {ev.totalHeadcount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {cursor && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
