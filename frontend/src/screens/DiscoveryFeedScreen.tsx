import { useState } from 'react'
import { OccasionWordmark } from '../components/ui/OccasionWordmark'
import { EventCard } from '../components/ui/EventCard'
import { BottomNav } from '../components/ui/BottomNav'
import { MOCK_EVENTS } from '../data/mockData'

const FILTER_CHIPS = ['All', 'Running', 'Charity', 'Cycling', 'Community']

export function DiscoveryFeedScreen() {
  const [activeFilter, setActiveFilter] = useState('Running')

  const filteredEvents = activeFilter === 'All'
    ? MOCK_EVENTS
    : MOCK_EVENTS.filter(e => e.type === activeFilter)

  return (
    <div className="min-h-screen bg-bg pb-[calc(60px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <header className="sticky top-0 z-nav flex items-center justify-between px-4 h-[56px] bg-bg border-b border-border">
        <OccasionWordmark />
        <div className="flex items-center gap-3">
          <button type="button" className="w-[44px] h-[44px] flex items-center justify-center" aria-label="Notifications">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#848D97" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </button>
          <div className="w-[32px] h-[32px] rounded-full bg-raised border border-border-mid flex items-center justify-center">
            <span className="text-[11px] font-bold text-text-primary">JB</span>
          </div>
        </div>
      </header>

      {/* Filter chips */}
      <div className="sticky top-[56px] z-nav bg-bg border-b border-border">
        <div
          className="flex gap-2 px-4 py-3 overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {FILTER_CHIPS.map(chip => {
            const isActive = chip === activeFilter
            return (
              <button
                key={chip}
                type="button"
                onClick={() => setActiveFilter(chip)}
                className={`flex-shrink-0 h-[32px] px-3 rounded-full border text-label-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-accent-subtle border-accent-dim text-accent'
                    : 'bg-transparent border-border text-text-secondary hover:border-border-mid'
                }`}
              >
                {chip}
              </button>
            )
          })}
        </div>
      </div>

      {/* Feed */}
      <main className="px-4 pt-4">
        <div className="mb-3">
          <p className="text-label-sm text-text-secondary">Events near you</p>
          <p className="text-label-sm text-text-tertiary">{filteredEvents.length} upcoming · sorted by date</p>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-body-md text-text-secondary">No {activeFilter.toLowerCase()} events found.</p>
            <button
              type="button"
              onClick={() => setActiveFilter('All')}
              className="mt-3 text-accent text-label-md hover:underline"
            >
              Show all events
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map(event => (
              <EventCard key={event.id} {...event} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
