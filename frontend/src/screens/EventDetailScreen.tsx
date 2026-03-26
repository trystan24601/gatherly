import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { BottomNav } from '../components/ui/BottomNav'
import { FillBar } from '../components/ui/FillBar'
import { StatusBadge } from '../components/ui/StatusBadge'
import { MOCK_EVENTS } from '../data/mockData'

interface AppliedRoles {
  [roleId: string]: boolean
}

interface BottomSheetState {
  open: boolean
  roleId: string | null
  roleName: string
  submitted: boolean
}

export function EventDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const event = MOCK_EVENTS.find(e => e.id === id)
  const [appliedRoles, setAppliedRoles] = useState<AppliedRoles>({})
  const [sheet, setSheet] = useState<BottomSheetState>({
    open: false,
    roleId: null,
    roleName: '',
    submitted: false,
  })

  if (!event) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-body-lg text-text-secondary mb-4">Event not found.</p>
          <button type="button" onClick={() => navigate('/events')} className="text-accent hover:underline">
            Back to events
          </button>
        </div>
      </div>
    )
  }

  function openSheet(roleId: string, roleName: string) {
    setSheet({ open: true, roleId, roleName, submitted: false })
  }

  function submitApplication() {
    if (sheet.roleId) {
      setAppliedRoles(prev => ({ ...prev, [sheet.roleId!]: true }))
      setSheet(prev => ({ ...prev, submitted: true }))
    }
  }

  function closeSheet() {
    setSheet({ open: false, roleId: null, roleName: '', submitted: false })
  }

  return (
    <div className="min-h-screen bg-bg pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* Back header */}
      <header className="sticky top-0 z-nav flex items-center gap-2 px-4 h-[56px] bg-bg border-b border-border">
        <button
          type="button"
          onClick={() => navigate('/events')}
          className="w-[44px] h-[44px] flex items-center justify-center -ml-2"
          aria-label="Back"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E6EDF3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button type="button" onClick={() => navigate('/events')} className="text-[15px] font-medium text-text-primary hover:text-text-secondary transition-colors">
          Events
        </button>
      </header>

      <main className="px-4 pt-5">
        {/* Event type badge */}
        <span className="inline-flex items-center border border-accent-mid bg-accent-subtle rounded-full px-2 py-0.5 text-caption uppercase tracking-[0.08em] font-bold text-accent mb-3">
          {event.type}
        </span>

        {/* Event name & org */}
        <h1 className="font-display font-bold text-[22px] text-text-primary tracking-[-0.02em] leading-snug mb-1">
          {event.name}
        </h1>
        <p className="text-body-sm text-text-secondary mb-4">{event.org}</p>

        {/* Meta panel */}
        <div className="bg-surface border border-border rounded-lg p-4 mb-5 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-[16px]">📅</span>
            <span className="text-body-sm text-text-primary">{event.date}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[16px]">⏱</span>
            <span className="text-body-sm text-text-primary">{event.time}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[16px]">📍</span>
            <span className="text-body-sm text-text-primary">{event.location}</span>
          </div>
        </div>

        {/* About */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary mb-2">
          About this event
        </p>
        <p className="text-[15px] text-text-primary leading-relaxed mb-6">
          Annual charity event supporting the local community. Marshals help keep participants safe and on course. All welcome — training provided on the day.
        </p>

        {/* Divider */}
        <div className="border-t border-border mb-5" />

        {/* Roles section */}
        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary mb-3">
          Volunteer roles ({event.roles.length})
        </p>

        <div className="space-y-3 mb-6">
          {event.roles.map(role => {
            const isFull = role.filled >= role.headcount
            const isApplied = appliedRoles[role.id]
            const remaining = role.headcount - role.filled

            return (
              <div
                key={role.id}
                className={`bg-surface border border-border rounded-lg p-4 ${isFull ? 'opacity-70' : ''}`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-display font-semibold text-[16px] text-text-primary leading-snug">
                    {role.name}
                  </h3>
                  {isFull && <StatusBadge status="all-filled" />}
                </div>

                <p className="text-label-sm text-text-secondary mb-2">
                  {role.shift} · {isFull ? '0 spots' : `${remaining} spot${remaining === 1 ? '' : 's'}`} remaining
                </p>

                {role.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {role.skills.map(skill => (
                      <span key={skill} className="bg-border text-text-secondary text-[11px] rounded-full px-2 py-0.5">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                <FillBar filled={role.filled} total={role.headcount} height="sm" />

                <div className="mt-3">
                  {isFull ? (
                    <p className="text-label-sm text-accent cursor-pointer hover:underline">
                      All spots filled — see other roles ↑
                    </p>
                  ) : isApplied ? (
                    <div className="flex items-center gap-2">
                      <StatusBadge status="pending" />
                      <span className="text-label-sm text-text-secondary">Application submitted</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openSheet(role.id, role.name)}
                      className="w-full h-[48px] rounded-md bg-accent text-white text-[15px] font-semibold hover:bg-[#E55A28] active:bg-[#CC4F22] active:scale-[0.98] transition-all duration-150"
                    >
                      Apply for this role →
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </main>

      {/* Bottom sheet backdrop */}
      {sheet.open && (
        <div
          className="fixed inset-0 bg-black/60 z-[500]"
          onClick={closeSheet}
        />
      )}

      {/* Bottom sheet */}
      {sheet.open && (
        <div
          className="fixed bottom-0 left-0 right-0 z-[500] bg-surface rounded-t-xl animate-sheet-in"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-8 h-1 rounded-full bg-border-mid" />
          </div>

          <div className="px-4 pb-6">
            {sheet.submitted ? (
              /* Success state */
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[rgba(74,222,128,0.12)] flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="font-display font-bold text-[20px] text-text-primary mb-3">
                  Application submitted
                </h2>
                <p className="text-body-sm text-text-secondary mb-1">You&apos;re in the queue for:</p>
                <p className="text-[15px] font-semibold text-text-primary mb-4">{sheet.roleName}</p>
                <p className="text-body-sm text-text-secondary leading-relaxed mb-6">
                  Your application is with {event.org} for review. They typically respond within 24 hours.
                </p>
                <button
                  type="button"
                  onClick={() => { closeSheet(); navigate('/dashboard') }}
                  className="w-full h-[48px] rounded-md bg-accent text-white text-[15px] font-semibold hover:bg-[#E55A28] transition-colors duration-150 mb-3"
                >
                  View my applications →
                </button>
                <button type="button" onClick={closeSheet} className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">
                  Close
                </button>
              </div>
            ) : (
              /* Confirmation state */
              <>
                <h2 className="font-display font-bold text-[18px] text-text-primary mb-1">
                  Confirm your application
                </h2>
                <p className="font-display font-semibold text-[16px] text-text-primary mb-0.5">{sheet.roleName}</p>
                <p className="text-body-sm text-text-secondary mb-0.5">{event.name}</p>
                <p className="text-body-sm text-text-secondary mb-4">
                  {event.date} · {event.roles.find(r => r.id === sheet.roleId)?.shift}
                </p>
                <p className="text-body-sm text-text-secondary leading-relaxed mb-6">
                  By applying you confirm you&apos;re available for this shift. The organiser will review and confirm your place.
                </p>
                <button
                  type="button"
                  onClick={submitApplication}
                  className="w-full h-[48px] rounded-md bg-accent text-white text-[15px] font-semibold hover:bg-[#E55A28] active:bg-[#CC4F22] transition-colors duration-150 mb-3"
                >
                  Yes, apply for this role
                </button>
                <button
                  type="button"
                  onClick={closeSheet}
                  className="w-full h-[44px] rounded-md border border-border text-text-secondary text-[15px] font-medium hover:bg-raised transition-colors duration-150"
                >
                  Not right now
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  )
}
