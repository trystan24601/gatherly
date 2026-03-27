import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '../components/ui/StatusBadge'
import { MOCK_REGISTRATIONS, MOCK_EVENTS, Registration } from '../data/mockData'

type RegistrationStatus = Registration['status']

interface RegistrationState {
  [regId: string]: RegistrationStatus
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

const AVATAR_COLORS = [
  'bg-[#1C2128]',
  'bg-[#21262D]',
  'bg-[#161B22]',
  'bg-raised',
]

function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function OrganiserRegistrationReviewScreen() {
  const navigate = useNavigate()
  const eventId = 'redhill-10k-2026'
  const event = MOCK_EVENTS.find(e => e.id === eventId)

  // Build initial state from mock data
  const initialState: RegistrationState = {}
  Object.values(MOCK_REGISTRATIONS).forEach(regs => {
    regs.forEach(r => { initialState[r.id] = r.status })
  })
  const [regStatuses, setRegStatuses] = useState<RegistrationState>(initialState)

  function handleAction(regId: string, action: 'confirmed' | 'declined') {
    setRegStatuses(prev => ({ ...prev, [regId]: action }))
  }

  // Flatten all registrations with their role context
  const allRegs = Object.entries(MOCK_REGISTRATIONS).flatMap(([roleId, regs]) => {
    const role = event?.roles.find(r => r.id === roleId)
    return regs.map(reg => ({ ...reg, roleId, roleName: role?.name ?? '', shift: role?.shift ?? '' }))
  })

  const pending = allRegs.filter(r => regStatuses[r.id] === 'pending')
  const confirmed = allRegs.filter(r => regStatuses[r.id] === 'confirmed')

  const pendingCount = pending.length
  const confirmedCount = confirmed.length

  return (
    <div className="min-h-screen bg-bg pb-10">
      {/* Back header */}
      <header className="sticky top-0 z-nav flex items-center gap-2 px-4 h-[56px] bg-bg border-b border-border">
        <button
          type="button"
          onClick={() => navigate(`/organiser/events/${eventId}`)}
          className="w-[44px] h-[44px] flex items-center justify-center -ml-2"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E6EDF3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-[15px] font-medium text-text-primary truncate">
          {event?.name ?? 'Registrations'}
        </span>
      </header>

      <main className="px-4 pt-5">
        <h1 className="font-display font-bold text-[20px] text-text-primary mb-1">
          Registration review
        </h1>
        <p className="text-label-sm text-text-secondary mb-5">
          <span className="text-warning">{pendingCount} pending</span>
          {' · '}
          {confirmedCount} confirmed
        </p>

        {/* Pending section */}
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mb-3">
            <span className="text-text-secondary">Pending review </span>
            <span className="text-warning">({pendingCount})</span>
          </p>

          {pending.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-body-sm text-text-secondary">All applications have been reviewed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pending.map(reg => (
                <div key={reg.id} className="bg-surface border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-full ${avatarColor(reg.name)} border border-border flex items-center justify-center flex-shrink-0`}>
                      <span className="text-[13px] font-bold text-text-primary">{getInitials(reg.name)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-semibold text-text-primary leading-tight">{reg.name}</p>
                      <p className="text-label-sm text-text-secondary">{reg.label}</p>
                    </div>
                  </div>

                  <p className="text-label-md font-semibold text-text-primary mb-0.5">{reg.roleName}</p>
                  <p className="text-label-sm text-text-secondary mb-3">{reg.shift}</p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleAction(reg.id, 'confirmed')}
                      className="flex-1 h-[44px] rounded-md border text-[14px] font-semibold transition-all duration-300"
                      style={{
                        background: 'rgba(74,222,128,0.12)',
                        borderColor: 'rgba(74,222,128,0.30)',
                        color: '#4ADE80',
                      }}
                    >
                      ✓ Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAction(reg.id, 'declined')}
                      className="flex-1 h-[44px] rounded-md border text-[14px] font-semibold transition-all duration-300"
                      style={{
                        background: 'rgba(239,68,68,0.09)',
                        borderColor: 'rgba(239,68,68,0.25)',
                        color: '#EF4444',
                      }}
                    >
                      ✗ Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Confirmed section */}
        <section className="mb-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary mb-3">
            Confirmed ({confirmedCount})
          </p>

          {confirmed.length === 0 ? (
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-body-sm text-text-secondary">No confirmed volunteers yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {confirmed.map(reg => (
                <div key={reg.id} className="bg-surface border border-border rounded-lg p-4 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${avatarColor(reg.name)} border border-border flex items-center justify-center flex-shrink-0`}>
                        <span className="text-[13px] font-bold text-text-primary">{getInitials(reg.name)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-text-primary leading-tight">{reg.name}</p>
                        <p className="text-label-sm text-text-secondary">{reg.roleName} · {reg.shift}</p>
                      </div>
                    </div>
                    <StatusBadge status="confirmed" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Declined section */}
        {allRegs.some(r => regStatuses[r.id] === 'declined') && (
          <section className="mb-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary mb-3">
              Declined
            </p>
            <div className="space-y-2">
              {allRegs.filter(r => regStatuses[r.id] === 'declined').map(reg => (
                <div key={reg.id} className="bg-surface border border-border rounded-lg p-4 opacity-60 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full ${avatarColor(reg.name)} border border-border flex items-center justify-center flex-shrink-0`}>
                        <span className="text-[13px] font-bold text-text-primary">{getInitials(reg.name)}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-[14px] font-semibold text-text-primary leading-tight">{reg.name}</p>
                        <p className="text-label-sm text-text-secondary">{reg.roleName}</p>
                      </div>
                    </div>
                    <StatusBadge status="declined" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}
