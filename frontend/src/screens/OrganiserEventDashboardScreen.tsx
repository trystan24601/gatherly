import { useNavigate } from 'react-router-dom'
import { FillBar } from '../components/ui/FillBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { HERO_EVENT } from '../data/mockData'

export function OrganiserEventDashboardScreen() {
  const navigate = useNavigate()
  const event = HERO_EVENT

  const totalFilled = event.roles.reduce((sum, r) => sum + r.filled, 0)
  const totalHeadcount = event.roles.reduce((sum, r) => sum + r.headcount, 0)
  const allFilled = event.roles.every(r => r.filled >= r.headcount)

  return (
    <div className="min-h-screen bg-bg pb-10">
      {/* Back header */}
      <header className="sticky top-0 z-nav flex items-center gap-2 px-4 h-[56px] bg-bg border-b border-border">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="w-[44px] h-[44px] flex items-center justify-center -ml-2"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E6EDF3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[15px] font-medium text-text-primary">My events</span>
      </header>

      <main className="px-4 pt-5">
        {/* Event title */}
        <h1 className="font-display font-bold text-[22px] text-text-primary tracking-[-0.02em] mb-1">
          {event.name}
        </h1>
        <p className="text-body-sm text-text-secondary mb-3">
          {event.date} · {event.location}
        </p>
        <StatusBadge status="published" className="mb-5" />

        {/* Hero completion panel */}
        {allFilled ? (
          <div className="rounded-xl border p-4 mb-5 animate-fade-in" style={{
            background: 'rgba(74, 222, 128, 0.06)',
            borderColor: 'rgba(74, 222, 128, 0.20)',
          }}>
            <StatusBadge status="all-filled" className="mb-3" />
            <p className="font-display font-bold text-[18px] text-text-primary mb-0.5">
              All roles filled
            </p>
            <p className="text-body-sm text-text-secondary mb-4">
              {totalFilled} volunteers confirmed across {event.roles.length} roles
            </p>
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-[rgba(74,222,128,0.15)] rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full w-full transition-[width] duration-500 ease-out" />
                </div>
                <span className="text-[13px] font-bold text-success tabular-nums">100%</span>
              </div>
            </div>
            <p className="text-[15px] text-text-primary font-medium mt-4">No further action required.</p>
            <p className="text-body-sm text-text-secondary">Your event is fully staffed.</p>
          </div>
        ) : (
          <div className="bg-surface border border-border rounded-xl p-4 mb-5">
            <p className="text-body-md text-text-primary mb-1">
              {totalFilled} of {totalHeadcount} volunteers confirmed
            </p>
            <FillBar filled={totalFilled} total={totalHeadcount} height="md" showLabel />
          </div>
        )}

        {/* Roles section */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary mb-3">
          Roles
        </p>

        <div className="space-y-2 mb-6">
          {event.roles.map(role => {
            const isFull = role.filled >= role.headcount
            return (
              <div key={role.id} className="bg-surface border border-border rounded-lg px-4 py-3">
                <div className="flex items-start justify-between gap-2 mb-0.5">
                  <h3 className="font-display font-semibold text-[15px] text-text-primary">
                    {role.name}
                  </h3>
                  {isFull && <StatusBadge status="all-filled" />}
                </div>
                <p className="text-label-sm text-text-secondary mb-2">
                  {role.shift} · {role.filled} / {role.headcount} confirmed
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-[3px] bg-[rgba(74,222,128,0.15)] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-success rounded-full transition-[width] duration-500 ease-out"
                      style={{ width: `${Math.round((role.filled / role.headcount) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-bold text-success tabular-nums">
                    {Math.round((role.filled / role.headcount) * 100)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Divider */}
        <div className="border-t border-dashed border-border mb-5" />

        {/* Secondary actions */}
        <div className="space-y-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(`/organiser/events/${event.id}/registrations`)}
            className="w-full h-[48px] rounded-md border border-border-mid text-text-primary text-[15px] font-medium hover:bg-raised transition-colors duration-150"
          >
            View registrations
          </button>
          <button
            type="button"
            className="w-full h-[48px] rounded-md border border-border-mid text-text-primary text-[15px] font-medium hover:bg-raised transition-colors duration-150"
          >
            Share event link
          </button>
        </div>

        <button type="button" className="flex items-center gap-2 text-[14px] text-danger hover:underline py-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          Cancel event
        </button>
      </main>
    </div>
  )
}
