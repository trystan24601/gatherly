/**
 * OrgEventEditPage — wrapper page for the event edit form.
 * Route: /organisation/events/:eventId/edit
 *
 * Fetches the event from the API then renders OrgEventEditForm.
 */
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getEvent, type EventDetail } from '../lib/events'
import { OrgEventEditForm } from '../components/events/OrgEventEditForm'

export function OrgEventEditPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    getEvent(eventId)
      .then((ev) => setEvent(ev))
      .catch(() => setError('Event not found.'))
      .finally(() => setLoading(false))
  }, [eventId])

  if (loading) {
    return <div className="text-center py-12 text-gray-500">Loading…</div>
  }

  if (error || !event) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <Link to="/organisation/dashboard" className="text-sm text-indigo-600 hover:text-indigo-800">
          &larr; Back to dashboard
        </Link>
        <p className="mt-4 text-red-600">{error ?? 'Event not found.'}</p>
      </div>
    )
  }

  return <OrgEventEditForm event={event} />
}
