/**
 * OrgEventDetailPage — Org Admin event detail view with lifecycle actions.
 *
 * Route: /organisation/events/:eventId (ORG_ADMIN, APPROVED org)
 *
 * Displays:
 * - Event title, date/time, status badge, venue
 * - Roles list with nested slots (DRAFT only: add/edit/delete controls)
 * - Overall fill bar
 * - Lifecycle action section:
 *   - DRAFT: "Publish event" button (disabled if no role has at least one slot)
 *   - PUBLISHED: "Cancel event" button → opens CancelEventModal
 *   - CANCELLED / COMPLETED: read-only notice
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  getEvent,
  publishEvent,
  deleteRole,
  deleteSlot,
  createRole,
  updateRole,
  createSlot,
  updateSlot,
} from '../lib/events'
import type { EventDetail, EventRole, EventSlot, CreateRolePayload, CreateSlotPayload } from '../lib/events'
import { StatusBadge } from '../components/ui/StatusBadge'
import { FillBar } from '../components/ui/FillBar'
import { CancelEventModal } from '../components/events/CancelEventModal'
import { RoleCard } from '../components/events/RoleCard'
import { AddEditRoleModal } from '../components/events/AddEditRoleModal'
import { AddEditSlotModal } from '../components/events/AddEditSlotModal'

export function OrgEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<EventDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [publishing, setPublishing] = useState(false)

  // Role modal state
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<EventRole | undefined>(undefined)

  // Slot modal state
  const [slotModalOpen, setSlotModalOpen] = useState(false)
  const [slotModalRoleId, setSlotModalRoleId] = useState<string | undefined>(undefined)
  const [editingSlot, setEditingSlot] = useState<EventSlot | undefined>(undefined)

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

  // ---------- Role handlers ----------

  function openAddRoleModal() {
    setEditingRole(undefined)
    setRoleModalOpen(true)
  }

  function openEditRoleModal(role: EventRole) {
    setEditingRole(role)
    setRoleModalOpen(true)
  }

  async function handleSaveRole(payload: CreateRolePayload) {
    if (!eventId) return
    if (editingRole) {
      await updateRole(eventId, editingRole.roleId, payload)
    } else {
      await createRole(eventId, payload)
    }
    setRoleModalOpen(false)
    setEditingRole(undefined)
    await fetchEvent()
  }

  async function handleDeleteRole(roleId: string) {
    if (!eventId) return
    await deleteRole(eventId, roleId)
    await fetchEvent()
  }

  // ---------- Slot handlers ----------

  function openAddSlotModal(roleId: string) {
    setSlotModalRoleId(roleId)
    setEditingSlot(undefined)
    setSlotModalOpen(true)
  }

  function openEditSlotModal(slot: EventSlot) {
    setSlotModalRoleId(slot.roleId)
    setEditingSlot(slot)
    setSlotModalOpen(true)
  }

  async function handleSaveSlot(payload: CreateSlotPayload) {
    if (!eventId || !slotModalRoleId) return
    if (editingSlot) {
      await updateSlot(eventId, slotModalRoleId, editingSlot.slotId, payload)
    } else {
      await createSlot(eventId, slotModalRoleId, payload)
    }
    setSlotModalOpen(false)
    setEditingSlot(undefined)
    setSlotModalRoleId(undefined)
    await fetchEvent()
  }

  async function handleDeleteSlot(slotId: string, roleId: string) {
    if (!eventId) return
    await deleteSlot(eventId, roleId, slotId)
    await fetchEvent()
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

  const isDraft = event.status === 'DRAFT'

  // Compute totals from slot-level data
  const totalHeadcount = event.roles.reduce(
    (sum, r) => sum + r.slots.reduce((s, slot) => s + slot.headcount, 0),
    0
  )
  const totalFilled = event.roles.reduce(
    (sum, r) => sum + r.slots.reduce((s, slot) => s + slot.filledCount, 0),
    0
  )

  // Publish is enabled only when at least one role has at least one slot
  const hasRoleWithSlot = event.roles.some((r) => r.slots.length > 0)

  // Map API status to StatusBadge status (lowercase)
  const badgeStatus = event.status.toLowerCase() as Parameters<typeof StatusBadge>[0]['status']

  // Find role name for slot modal title
  const slotModalRoleName =
    slotModalRoleId
      ? (event.roles.find((r) => r.roleId === slotModalRoleId)?.name ?? 'Role')
      : 'Role'

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

        {/* Roles section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-heading-sm font-bold text-text-primary">Roles</h2>
            {isDraft && (
              <button
                type="button"
                onClick={openAddRoleModal}
                className="text-body-sm text-accent hover:underline font-medium"
              >
                + Add role
              </button>
            )}
          </div>

          {event.roles.length === 0 ? (
            <p className="text-body-sm text-text-secondary">
              No roles added yet. Add at least one role with a slot before publishing.
            </p>
          ) : (
            <ul className="space-y-3">
              {event.roles.map((role) => (
                <li key={role.roleId}>
                  <RoleCard
                    role={role}
                    isDraft={isDraft}
                    onEditRole={openEditRoleModal}
                    onDeleteRole={handleDeleteRole}
                    onAddSlot={openAddSlotModal}
                    onEditSlot={openEditSlotModal}
                    onDeleteSlot={(slotId) => handleDeleteSlot(slotId, role.roleId)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Lifecycle actions */}
        <div className="border-t border-border pt-6">
          {isDraft && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePublish}
                disabled={!hasRoleWithSlot || publishing}
                title={
                  !hasRoleWithSlot
                    ? 'Add at least one role with a slot before publishing.'
                    : undefined
                }
                className="px-5 py-2.5 rounded-md text-body-sm font-medium bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {publishing ? 'Publishing...' : 'Publish event'}
              </button>
              {!hasRoleWithSlot && (
                <p className="text-label-sm text-text-secondary">
                  Add at least one role with a slot before publishing.
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

      {/* Add/Edit role modal */}
      {roleModalOpen && (
        <AddEditRoleModal
          role={editingRole}
          onSave={handleSaveRole}
          onClose={() => {
            setRoleModalOpen(false)
            setEditingRole(undefined)
          }}
        />
      )}

      {/* Add/Edit slot modal */}
      {slotModalOpen && slotModalRoleId && (
        <AddEditSlotModal
          roleName={slotModalRoleName}
          slot={editingSlot}
          onSave={handleSaveSlot}
          onClose={() => {
            setSlotModalOpen(false)
            setEditingSlot(undefined)
            setSlotModalRoleId(undefined)
          }}
        />
      )}
    </div>
  )
}
