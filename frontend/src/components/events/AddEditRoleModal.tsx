/**
 * AddEditRoleModal — controlled modal for creating or editing a Role.
 *
 * Props:
 *   role     — if provided, modal is in edit mode and pre-fills existing values
 *   onSave   — called with the validated payload on submit
 *   onClose  — called when the modal is dismissed
 */
import { useState } from 'react'
import type { EventRole, CreateRolePayload } from '../../lib/events'

interface AddEditRoleModalProps {
  role?: EventRole
  onSave: (payload: CreateRolePayload) => Promise<void>
  onClose: () => void
}

export function AddEditRoleModal({ role, onSave, onClose }: AddEditRoleModalProps) {
  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function validate(): string | null {
    if (!name.trim()) return 'Role name is required.'
    if (name.trim().length < 2) return 'Role name must be at least 2 characters.'
    if (name.trim().length > 100) return 'Role name must be 100 characters or fewer.'
    if (description.length > 500) return 'Description must be 500 characters or fewer.'
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
      const payload: CreateRolePayload = { name: name.trim() }
      if (description.trim()) payload.description = description.trim()
      await onSave(payload)
    } catch {
      setError('Failed to save role. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const isEditMode = Boolean(role)
  const title = isEditMode ? 'Edit role' : 'Add role'

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="role-modal-title"
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
          id="role-modal-title"
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
              htmlFor="role-name"
              className="block text-label-sm font-medium text-text-primary mb-1"
            >
              Name <span aria-hidden="true">*</span>
            </label>
            <input
              id="role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="w-full border border-border rounded-md px-3 py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Marshal"
            />
          </div>

          <div>
            <label
              htmlFor="role-description"
              className="block text-label-sm font-medium text-text-primary mb-1"
            >
              Description
            </label>
            <textarea
              id="role-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full border border-border rounded-md px-3 py-2 text-body-sm focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Optional: describe the role responsibilities"
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
