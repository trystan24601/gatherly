interface FillBarProps {
  filled: number
  total: number
  height?: 'sm' | 'md'
  showLabel?: boolean
}

export function FillBar({ filled, total, height = 'sm', showLabel = false }: FillBarProps) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const isFull = filled >= total
  const remaining = total - filled
  const isUrgent = remaining <= 2 && remaining > 0

  const heightClass = height === 'md' ? 'h-2' : 'h-1'
  const fillColor = isFull ? 'bg-success' : 'bg-accent'
  const trackColor = isFull ? 'bg-[rgba(74,222,128,0.15)]' : 'bg-border'

  return (
    <div>
      <div className={`w-full ${heightClass} ${trackColor} rounded-full overflow-hidden`}>
        <div
          className={`h-full ${fillColor} rounded-full transition-[width] duration-500 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center justify-between mt-1">
          <span
            className={`text-label-sm ${isUrgent ? 'text-warning' : 'text-text-secondary'}`}
          >
            {isFull
              ? 'Role full'
              : `${remaining} spot${remaining === 1 ? '' : 's'} remaining`}
          </span>
          <span className={`text-label-sm font-bold tabular-nums ${isFull ? 'text-success' : 'text-accent'}`}>
            {pct}%
          </span>
        </div>
      )}
    </div>
  )
}
