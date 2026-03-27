type BadgeStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed' | 'all-filled' | 'published' | 'draft'

interface StatusBadgeProps {
  status: BadgeStatus
  className?: string
}

const BADGE_CONFIG: Record<BadgeStatus, { label: string; classes: string }> = {
  pending: {
    label: 'Awaiting review',
    classes: 'bg-badge-pending-bg border-badge-pending-border text-badge-pending-text',
  },
  confirmed: {
    label: 'Confirmed',
    classes: 'bg-badge-confirmed-bg border-badge-confirmed-border text-badge-confirmed-text',
  },
  declined: {
    label: 'Not accepted',
    classes: 'bg-badge-declined-bg border-badge-declined-border text-badge-declined-text',
  },
  cancelled: {
    label: 'Cancelled',
    classes: 'bg-badge-cancelled-bg border-badge-cancelled-border text-badge-cancelled-text',
  },
  completed: {
    label: 'Attended',
    classes: 'bg-[rgba(139,139,154,0.1)] border-[rgba(139,139,154,0.2)] text-text-secondary',
  },
  'all-filled': {
    label: 'All filled',
    classes: 'bg-badge-filled-bg border-badge-filled-border text-badge-filled-text',
  },
  published: {
    label: 'Published',
    classes: 'bg-badge-published-bg border-badge-published-border text-badge-published-text',
  },
  draft: {
    label: 'Draft',
    classes: 'bg-badge-draft-bg border-badge-draft-border text-badge-draft-text',
  },
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = BADGE_CONFIG[status]
  return (
    <span
      className={`inline-flex items-center border rounded-sm px-2 py-0.5 text-caption uppercase tracking-[0.08em] font-bold ${config.classes} ${className}`}
    >
      {config.label}
    </span>
  )
}
