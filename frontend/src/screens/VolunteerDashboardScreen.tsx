import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/ui/BottomNav'
import { StatusBadge } from '../components/ui/StatusBadge'
import { MY_REGISTRATIONS } from '../data/mockData'

type TabType = 'upcoming' | 'past'

export function VolunteerDashboardScreen() {
  const [activeTab, setActiveTab] = useState<TabType>('upcoming')
  const navigate = useNavigate()

  const confirmed = MY_REGISTRATIONS.filter(r => r.status === 'confirmed')
  const pending = MY_REGISTRATIONS.filter(r => r.status === 'pending')
  const completed = MY_REGISTRATIONS.filter(r => r.status === 'completed')

  const upcomingRegs = [...confirmed, ...pending]
  const pastRegs = completed

  const isEmpty = activeTab === 'upcoming' ? upcomingRegs.length === 0 : pastRegs.length === 0

  return (
    <div className="min-h-screen bg-bg pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="sticky top-0 z-nav flex items-center h-[56px] px-4 bg-bg border-b border-border">
        <h1 className="font-display font-bold text-[20px] text-text-primary">My events</h1>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border px-4 bg-bg">
        {(['upcoming', 'past'] as TabType[]).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`h-[44px] px-4 text-label-md font-medium border-b-2 transition-colors duration-150 capitalize ${
              activeTab === tab
                ? 'border-accent text-accent'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <main className="px-4 pt-5">
        {isEmpty ? (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#30363D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <h2 className="font-display font-semibold text-[18px] text-text-primary mb-2">
              You haven't signed up for anything yet
            </h2>
            <p className="text-[15px] text-text-secondary max-w-[260px] mx-auto mb-6">
              Find an event near you and apply for a volunteer role to get started.
            </p>
            <button
              type="button"
              onClick={() => navigate('/events')}
              className="w-full h-[52px] rounded-md bg-accent text-white text-[14px] font-semibold hover:bg-[#E55A28] transition-colors duration-150"
            >
              Browse events near you
            </button>
          </div>
        ) : (
          <div>
            {activeTab === 'upcoming' && (
              <>
                {confirmed.length > 0 && (
                  <section className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary mb-3">
                      Confirmed
                    </p>
                    <div className="space-y-3">
                      {confirmed.map(reg => (
                        <div key={reg.id} className="bg-surface border border-border rounded-lg p-4">
                          <StatusBadge status="confirmed" className="mb-3" />
                          <h3 className="font-display font-semibold text-[16px] text-text-primary mb-0.5">
                            {reg.eventName}
                          </h3>
                          <p className="text-label-sm text-text-secondary mb-2">{reg.role}</p>
                          <p className="text-label-sm text-text-secondary">{reg.date} · {reg.shift}</p>
                          {'location' in reg && reg.location && (
                            <p className="text-label-sm text-text-secondary mb-3">{reg.location as string}</p>
                          )}
                          <p className="text-body-sm text-text-primary mt-3 mb-3">
                            You're confirmed for this role. See you on the day.
                          </p>
                          <div className="flex items-center gap-4">
                            <button type="button" className="text-label-sm text-accent hover:underline">
                              Add to calendar
                            </button>
                            <button type="button" className="text-label-sm text-danger hover:underline">
                              Cancel place
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {pending.length > 0 && (
                  <section className="mb-5">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary mb-3">
                      Pending
                    </p>
                    <div className="space-y-3">
                      {pending.map(reg => (
                        <div key={reg.id} className="bg-surface border border-border rounded-lg p-4">
                          <StatusBadge status="pending" className="mb-3" />
                          <h3 className="font-display font-semibold text-[16px] text-text-primary mb-0.5">
                            {reg.eventName}
                          </h3>
                          <p className="text-label-sm text-text-secondary mb-2">{reg.role}</p>
                          <p className="text-label-sm text-text-secondary">{reg.date} · {reg.shift}</p>
                          <p className="text-body-sm text-text-primary mt-3 mb-3">
                            Your application is with {reg.org} for review. They typically respond within 24 hours.
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] text-text-tertiary">Applied recently</span>
                            <button type="button" className="text-label-sm text-danger hover:underline">
                              Cancel
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}

            {activeTab === 'past' && completed.length > 0 && (
              <section className="mb-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary mb-3">
                  Completed
                </p>
                <div className="space-y-3">
                  {completed.map(reg => (
                    <div key={reg.id} className="bg-surface border border-border rounded-lg p-4 opacity-80">
                      <StatusBadge status="completed" className="mb-3" />
                      <h3 className="font-display font-semibold text-[16px] text-text-primary mb-0.5">
                        {reg.eventName}
                      </h3>
                      <p className="text-label-sm text-text-secondary mb-2">{reg.role}</p>
                      <p className="text-label-sm text-text-secondary">{reg.date} · {reg.shift}</p>
                      <p className="text-body-sm text-text-secondary mt-3 mb-3 leading-relaxed">
                        Thanks for volunteering. You gave your time to make this event happen.
                      </p>
                      <button type="button" className="text-label-sm text-accent hover:underline">
                        Download hours certificate
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
