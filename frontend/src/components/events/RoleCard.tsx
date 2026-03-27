/**
 * RoleCard — displays a single role with its nested slots.
 *
 * Props:
 *   role         — the EventRole to display
 *   isDraft      — whether the event is in DRAFT status (shows edit/delete controls)
 *   onEditRole   — called with the role when "Edit role" is clicked
 *   onDeleteRole — called with roleId when "Delete role" is clicked
 *   onAddSlot    — called with roleId when "+ Add slot" is clicked
 *   onEditSlot   — called with the slot when "Edit slot" is clicked
 *   onDeleteSlot — called with slotId when "Delete slot" is clicked
 */
import type { EventRole, EventSlot } from '../../lib/events'

interface RoleCardProps {
  role: EventRole
  isDraft: boolean
  onEditRole: (role: EventRole) => void
  onDeleteRole: (roleId: string) => Promise<void>
  onAddSlot: (roleId: string) => void
  onEditSlot: (slot: EventSlot) => void
  onDeleteSlot: (slotId: string) => Promise<void>
}

export function RoleCard({
  role,
  isDraft,
  onEditRole,
  onDeleteRole,
  onAddSlot,
  onEditSlot,
  onDeleteSlot,
}: RoleCardProps) {
  return (
    <div className="p-4 bg-white rounded-lg border border-border">
      {/* Role header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1">
          <h3 className="text-body-sm font-medium text-text-primary">{role.name}</h3>
          {role.description && (
            <p className="text-label-sm text-text-secondary mt-0.5">{role.description}</p>
          )}
        </div>
        {isDraft && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              aria-label="Edit role"
              onClick={() => onEditRole(role)}
              className="text-label-sm text-accent hover:underline"
            >
              Edit
            </button>
            <button
              type="button"
              aria-label="Delete role"
              onClick={() => void onDeleteRole(role.roleId)}
              className="text-label-sm text-error hover:underline"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Slots list */}
      {role.slots.length > 0 && (
        <ul className="mt-3 space-y-2">
          {role.slots.map((slot) => (
            <li
              key={slot.slotId}
              className="flex items-center justify-between gap-2 py-2 px-3 bg-surface-secondary rounded"
            >
              <div className="text-label-sm text-text-secondary">
                <span className="font-medium text-text-primary">
                  {slot.shiftStart}–{slot.shiftEnd}
                </span>
                {slot.location && <span className="ml-2">{slot.location}</span>}
                <span className="ml-2">
                  {slot.filledCount}/{slot.headcount} filled
                </span>
              </div>
              {isDraft && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    aria-label="Edit slot"
                    onClick={() => onEditSlot(slot)}
                    className="text-label-sm text-accent hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    aria-label="Delete slot"
                    onClick={() => void onDeleteSlot(slot.slotId)}
                    className="text-label-sm text-error hover:underline"
                  >
                    Delete
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add slot button */}
      {isDraft && (
        <button
          type="button"
          onClick={() => onAddSlot(role.roleId)}
          className="mt-3 text-label-sm text-accent hover:underline"
        >
          + Add slot
        </button>
      )}
    </div>
  )
}
