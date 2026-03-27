import { useNavigate } from 'react-router-dom'
import { FillBar } from './FillBar'

interface EventCardProps {
  id: string
  name: string
  org: string
  type: string
  date: string
  time: string
  location: string
  totalSpots: number
  filledSpots: number
}

export function EventCard({ id, name, org, type, date, time, location, totalSpots, filledSpots }: EventCardProps) {
  const navigate = useNavigate()
  const remaining = totalSpots - filledSpots
  const isUrgent = remaining <= 2 && remaining > 0

  return (
    <button
      type="button"
      onClick={() => navigate(`/events/${id}`)}
      className="w-full text-left bg-surface border border-border rounded-lg px-4 pt-3 pb-4 transition-colors duration-150 hover:bg-raised hover:border-border-mid active:bg-raised cursor-pointer"
    >
      <span className="inline-flex items-center border border-accent-mid bg-accent-subtle rounded-full px-2 py-0.5 text-caption uppercase tracking-[0.08em] font-bold text-accent mb-2">
        {type}
      </span>

      <h3 className="font-display font-bold text-[17px] text-text-primary leading-snug tracking-[-0.01em] line-clamp-2 mb-1">
        {name}
      </h3>
      <p className="text-label-md text-text-secondary mb-0.5">{org}</p>
      <p className="text-label-sm text-text-secondary mb-0.5">{date} · {time}</p>
      <p className="text-label-sm text-text-secondary mb-3">{location}</p>

      <FillBar filled={filledSpots} total={totalSpots} height="sm" />
      <p className={`text-label-sm mt-1 ${isUrgent ? 'text-warning' : 'text-text-secondary'}`}>
        {remaining} spot{remaining === 1 ? '' : 's'} remaining
      </p>
    </button>
  )
}
