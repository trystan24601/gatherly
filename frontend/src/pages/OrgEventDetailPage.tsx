/**
 * OrgEventDetailPage — Org Admin event detail view with lifecycle actions.
 *
 * Route: /organisation/events/:eventId (ORG_ADMIN, APPROVED org)
 *
 * Displays:
 * - Event title, date/time, status badge, venue
 * - Roles list with fill bars
 * - Overall fill bar
 * - Lifecycle action section:
 *   - DRAFT: "Publish event" button (disabled if no roles)
 *   - PUBLISHED: "Cancel event" button → opens CancelEventModal
 *   - CANCELLED / COMPLETED: read-only notice
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEvent, publishEvent } from '../lib/events'
import type { EventDetail } from '../lib/events'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FillBar } from '../components/ui/FillBar'
import { CancelEventModal } from '../components/events/CancelEventModal'

export function OrgEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [publishing, setPublishing] = useState(false)

  const fetchEvent = useCallback(async () => {
    if (!eventId) return
    try {
      const data = await getEvent(eventId)
      setEvent(data)
    } catch {
      setError('Failed to load event.')
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    fetchEvent()
  }, [fetchEvent])

  async function handlePublish() {
    if (!eventId) return
    setPublishing(true)
    try {
      await publishEvent(eventId)
      await fetchEvent()
    } catch {
      // Error is silent — user can retry
    } finally {
      setPublishing(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <p className="text-body-sm text-text-secondary">Loading event...</p>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-surface-secondary flex items-center justify-center">
        <p className="text-body-sm text-error">{error ?? 'Event not found.'}</p>
      </div>
    )
  }

  const totalHeadcount = event.roles.reduce((sum, r) => sum + r.capacity, 0)
  const totalFilled = event.roles.reduce((sum, r) => sum + r.filledCount, 0)
  const hasRoles = event.roles.length > 0

  // Map API status to StatusBadge status (lowercase)
  const badgeStatus = event.status.toLowerCase() as Parameters<typeof StatusBadge>[0]['status']

  return (
    <div className="min-h-screen bg-surface-secondary">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back link */}
        <Link
          to="/organisation/dashboard"
          className="inline-flex items-center gap-1 text-body-sm text-text-secondary hover:text-text-primary mb-6"
        >
          &larr; Back to dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="flex-1">
            <h1 className="text-heading-lg font-bold text-text-primary mb-2">
              {event.title}
            </h1>
            <div className="flex items-center gap-2 flex-wrap text-body-sm text-text-secondary">
              <StatusBadge status={badgeStatus} />
              <span>
                {event.eventDate} &bull; {event.startTime}–{event.endTime}
              </span>
              <span>{event.venueName}, {event.city}</span>
            </div>
          </div>
        </div>

        {/* Overall fill bar */}
        {totalHeadcount > 0 && (
          <div className="mb-6 p-4 bg-white rounded-lg border border-border">
            <p className="text-label-sm text-text-secondary mb-2">
              Overall: {totalFilled} / {totalHeadcount} volunteers
            </p>
            <FillBar filled={totalFilled} total={totalHeadcount} height="md" showLabel />
          </div>
        )}

        {/* Roles list */}
        <div className="mb-8">
          <h2 className="text-heading-sm font-bold text-text-primary mb-3">Roles</h2>
          {event.roles.length === 0 ? (
            <p className="text-body-sm text-text-secondary">
              No roles added yet. Publish requires at least one role.
            </p>
          ) : (
            <ul className="space-y-3">
              {event.roles.map((role) => (
                <li
                  key={role.roleId}
                  className="p-4 bg-white rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body-sm font-medium text-text-primary">
                      {role.name}
                    </span>
                    <span className="text-label-sm text-text-secondary">
                      {role.filledCount} / {role.capacity}
                    </span>
                  </div>
                  <FillBar filled={role.filledCount} total={role.capacity} />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lifecycle actions */}
        <div className="border-t border-border pt-6">
          {event.status === 'DRAFT' && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!hasRoles || publishing}
                title={!hasRoles ? 'Add at least one role before publishing.' : undefined}
                className="px-5 py-2.5 rounded-md text-body-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? 'Publishing...' : 'Publish event'}
              </button>
              {!hasRoles && (
                <p className="text-label-sm text-text-secondary">
                  Add at least one role before publishing.
                </p>
              )}
            </div>
          )}

          {event.status === 'PUBLISHED' && (
            <div>
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="px-5 py-2.5 rounded-md text-body-sm font-medium bg-white border border-error text-error hover:bg-error/5 transition-colors"
              >
                Cancel event
              </button>
            </div>
          )}

          {(event.status === 'CANCELLED' || event.status === 'COMPLETED') && (
            <p className="text-body-sm text-text-secondary italic">
              This event has been {event.status.toLowerCase()} and can no longer be edited.
            </p>
          )}
        </div>
      </div>

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <CancelEventModal
          eventTitle={event.title}
          registeredCount={event.pendingRegistrationCount ?? 0}
          eventId={event.eventId}
          onClose={() => setShowCancelModal(false)}
        />
      )}
    </div>
  )
}
