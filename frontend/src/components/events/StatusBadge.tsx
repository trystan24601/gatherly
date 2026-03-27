/**
 * StatusBadge — reusable pill badge for event status.
 *
 * Props:
 *   status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'
 *
 * Colour scheme:
 *   DRAFT     → grey pill
 *   PUBLISHED → green pill
 *   CANCELLED → red pill
 *   COMPLETED → muted (slate) pill
 */

type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED'

const STATUS_CLASSES: Record<EventStatus, string> = {
  DRAFT: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-gray-100 text-gray-700',
  PUBLISHED: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-green-100 text-green-700',
  CANCELLED: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-red-100 text-red-700',
  COMPLETED: 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-neutral-100 text-neutral-600',
}

interface StatusBadgeProps {
  status: EventStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const classes = STATUS_CLASSES[status] ?? STATUS_CLASSES.DRAFT
  return <span className={classes}>{status}</span>
}
