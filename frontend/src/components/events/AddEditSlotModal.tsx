/**
 * AddEditSlotModal — controlled modal for creating or editing a Slot.
 *
 * Props:
 *   roleName — displayed in the modal title
 *   slot     — if provided, modal is in edit mode and pre-fills existing values
 *   onSave   — called with the validated payload on submit
 *   onClose  — called when the modal is dismissed
 */
import { useState } from 'react'
import type { EventSlot, CreateSlotPayload } from '../../lib/events'

interface AddEditSlotModalProps {
  roleName: string
  slot?: EventSlot
  onSave: (payload: CreateSlotPayload) => Promise<void>
  onClose: () => void
}

export function AddEditSlotModal({ roleName, slot, onSave, onClose }: AddEditSlotModalProps) {
  const [location, setLocation] = useState(slot?.location ?? '')
  const [shiftStart, setShiftStart] = useState(slot?.shiftStart ?? '')
  const [shiftEnd, setShiftEnd] = useState(slot?.shiftEnd ?? '')
  const [headcount, setHeadcount] = useState(slot?.headcount !== undefined ? String(slot.headcount) : '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function validate(): string | null {
    if (!shiftStart) return 'Shift start time is required.'
    if (!shiftEnd) return 'Shift end time is required.'
    if (shiftEnd <= shiftStart) return 'Shift end must be after shift start.'

    const hc = Number(headcount)
    if (!headcount || isNaN(hc) || hc < 1 || hc > 500) {
      return 'Headcount must be between 1 and 500.'
    }

    if (location.length > 200) return 'Location must be 200 characters or fewer.'

    return null
  }

  async function handleSave() {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const payload: CreateSlotPayload = {
        shiftStart,
        shiftEnd,
        headcount: Number(headcount),
      }
      if (location.trim()) payload.location = location.trim()
      await onSave(payload)
    } catch {
      setError('Failed to save slot. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isEditMode = Boolean(slot)
  const title = isEditMode ? `Edit slot — ${roleName}` : `Add slot — ${roleName}`

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="slot-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal card */}
      <div className="relative z-10 bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h2
          id="slot-modal-title"
          className="text-heading-sm font-bold text-text-primary mb-4"
        >
          {title}
        </h2>

        {error && (
          <p className="text-body-sm text-error mb-3" role="alert">
            {error}
          </p>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="slot-location"
              className="block text-label-sm font-medium text-text-primary mb-1"
            >
              Location
            </label>
            <input
              id="slot-location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              maxLength={200}
              className="w-full border border-border rounded-md px-3 py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Start line (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="slot-shift-start"
                className="block text-label-sm font-medium text-text-primary mb-1"
              >
                Shift start <span aria-hidden="true">*</span>
              </label>
              <input
                id="slot-shift-start"
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label
                htmlFor="slot-shift-end"
                className="block text-label-sm font-medium text-text-primary mb-1"
              >
                Shift end <span aria-hidden="true">*</span>
              </label>
              <input
                id="slot-shift-end"
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="slot-headcount"
              className="block text-label-sm font-medium text-text-primary mb-1"
            >
              Headcount <span aria-hidden="true">*</span>
            </label>
            <input
              id="slot-headcount"
              type="number"
              value={headcount}
              onChange={(e) => setHeadcount(e.target.value)}
              min={1}
              max={500}
              className="w-full border border-border rounded-md px-3 py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. 10"
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-md text-body-sm font-medium border border-border text-text-primary hover:bg-surface-secondary transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="px-4 py-2 rounded-md text-body-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
