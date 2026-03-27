/**
 * OrgEventEditForm — form for editing an existing DRAFT event.
 *
 * Accepts the event object as a prop and pre-populates all fields.
 * Calls updateEvent() on submit. Navigates to /organisation/dashboard on success.
 * Displays a 409 error banner when the event is not in DRAFT status.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { updateEvent, type CreateEventPayload, type EventDetail } from '../../lib/events'
import { ApiError } from '../../lib/api'

// Event type options — hard-coded until the Event Types PRD ships (OQ-03)
const EVENT_TYPES = [
  { value: 'running', label: 'Running' },
  { value: 'cycling', label: 'Cycling' },
  { value: 'community', label: 'Community' },
  { value: 'sports', label: 'Sports' },
  { value: 'charity', label: 'Charity' },
  { value: 'other', label: 'Other' },
]

interface OrgEventEditFormProps {
  event: EventDetail
}

export function OrgEventEditForm({ event }: OrgEventEditFormProps) {
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    title: event.title,
    eventTypeId: event.eventTypeId,
    eventDate: event.eventDate,
    startTime: event.startTime,
    endTime: event.endTime,
    venueName: event.venueName,
    venueAddress: event.venueAddress,
    city: event.city,
    postcode: event.postcode,
    description: event.description ?? '',
    maxVolunteers: event.maxVolunteers != null ? String(event.maxVolunteers) : '',
  })

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const patch: Partial<CreateEventPayload> = {
        title: formData.title,
        eventTypeId: formData.eventTypeId,
        eventDate: formData.eventDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venueName: formData.venueName,
        venueAddress: formData.venueAddress,
        city: formData.city,
        postcode: formData.postcode,
        ...(formData.description ? { description: formData.description } : {}),
        ...(formData.maxVolunteers
          ? { maxVolunteers: parseInt(formData.maxVolunteers, 10) }
          : {}),
      }

      await updateEvent(event.eventId, patch)
      navigate('/organisation/dashboard')
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string }
        setError(body?.error ?? 'An error occurred. Please try again.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="mb-6">
        <Link
          to="/organisation/dashboard"
          className="text-sm text-indigo-600 hover:text-indigo-800"
        >
          &larr; Back to dashboard
        </Link>
      </div>

      <h1 className="text-2xl font-bold mb-6">Edit event</h1>

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md bg-red-50 p-4 text-sm text-red-700 border border-red-200"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Event title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Event title <span aria-hidden="true">*</span>
          </label>
          <input
            id="title"
            name="title"
            type="text"
            value={formData.title}
            onChange={handleChange}
            maxLength={150}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Event type */}
        <div>
          <label htmlFor="eventTypeId" className="block text-sm font-medium text-gray-700 mb-1">
            Event type <span aria-hidden="true">*</span>
          </label>
          <select
            id="eventTypeId"
            name="eventTypeId"
            value={formData.eventTypeId}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select event type</option>
            {EVENT_TYPES.map((et) => (
              <option key={et.value} value={et.value}>
                {et.label}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div>
          <label htmlFor="eventDate" className="block text-sm font-medium text-gray-700 mb-1">
            Date <span aria-hidden="true">*</span>
          </label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            value={formData.eventDate}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Start time / End time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              Start time <span aria-hidden="true">*</span>
            </label>
            <input
              id="startTime"
              name="startTime"
              type="time"
              value={formData.startTime}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
              End time <span aria-hidden="true">*</span>
            </label>
            <input
              id="endTime"
              name="endTime"
              type="time"
              value={formData.endTime}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Venue name */}
        <div>
          <label htmlFor="venueName" className="block text-sm font-medium text-gray-700 mb-1">
            Venue name <span aria-hidden="true">*</span>
          </label>
          <input
            id="venueName"
            name="venueName"
            type="text"
            value={formData.venueName}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Address */}
        <div>
          <label htmlFor="venueAddress" className="block text-sm font-medium text-gray-700 mb-1">
            Address <span aria-hidden="true">*</span>
          </label>
          <input
            id="venueAddress"
            name="venueAddress"
            type="text"
            value={formData.venueAddress}
            onChange={handleChange}
            required
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* City / Postcode */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City <span aria-hidden="true">*</span>
            </label>
            <input
              id="city"
              name="city"
              type="text"
              value={formData.city}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
              Postcode <span aria-hidden="true">*</span>
            </label>
            <input
              id="postcode"
              name="postcode"
              type="text"
              value={formData.postcode}
              onChange={handleChange}
              required
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
        </div>

        {/* Description (optional) */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            value={formData.description}
            onChange={handleChange}
            maxLength={2000}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        {/* Max volunteers (optional) */}
        <div>
          <label
            htmlFor="maxVolunteers"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Max volunteers
          </label>
          <input
            id="maxVolunteers"
            name="maxVolunteers"
            type="number"
            min={1}
            max={10000}
            value={formData.maxVolunteers}
            onChange={handleChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
