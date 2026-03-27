/**
 * CancelEventModal — destructive confirmation modal for event cancellation.
 *
 * Props:
 *   eventTitle       — displayed in the confirmation copy
 *   registeredCount  — number of PENDING registrations (from pendingRegistrationCount)
 *   eventId          — used to call POST /organisation/events/:eventId/cancel
 *   onClose          — called when modal is dismissed without cancelling
 *
 * On success: navigates to /organisation/dashboard.
 * On error: displays the error message inside the modal.
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { cancelEvent } from '../../lib/events'
import { ApiError } from '../../lib/api'

interface CancelEventModalProps {
  eventTitle: string
  registeredCount: number
  eventId: string
  onClose: () => void
}

export function CancelEventModal({
  eventTitle,
  registeredCount,
  eventId,
  onClose,
}: CancelEventModalProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCancel() {
    setLoading(true)
    setError(null)
    try {
      await cancelEvent(eventId)
      onClose()
      navigate('/organisation/dashboard')
    } catch (err) {
      if (err instanceof ApiError) {
        const body = err.body as { error?: string }
        setError(body?.error ?? 'Something went wrong. Please try again.')
      } else {
        setError('Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Dark overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2
          id="cancel-modal-title"
          className="text-heading-sm font-bold text-text-primary mb-3"
        >
          Cancel this event?
        </h2>

        <p className="text-body-sm text-text-secondary mb-2">
          This will cancel{' '}
          <strong className="text-text-primary">{eventTitle}</strong> and notify all{' '}
          {registeredCount} registered volunteer{registeredCount === 1 ? '' : 's'}.
        </p>

        <p className="text-body-sm text-text-secondary mb-6">
          This action cannot be undone.
        </p>

        {error && (
          <p className="text-body-sm text-error mb-4" role="alert">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="btn-secondary px-4 py-2 rounded-md text-body-sm font-medium border border-border text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50"
          >
            Keep event
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="btn-danger px-4 py-2 rounded-md text-body-sm font-medium bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Cancelling...' : 'Cancel event'}
          </button>
        </div>
      </div>
    </div>
  )
}
