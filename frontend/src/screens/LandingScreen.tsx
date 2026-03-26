import { useNavigate } from 'react-router-dom'
import { OccasionWordmark } from '../components/ui/OccasionWordmark'

export function LandingScreen() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg">
      {/* Nav bar */}
      <header className="sticky top-0 z-nav flex items-center justify-between px-4 h-[56px] bg-bg border-b border-border">
        <OccasionWordmark />
        <button type="button" className="text-label-md text-text-secondary hover:text-text-primary transition-colors">
          Sign in
        </button>
      </header>

      {/* Hero */}
      <section className="px-4 pt-10 pb-8 bg-bg">
        <h1 className="font-display font-extrabold text-text-primary tracking-[-0.03em] leading-[1.05] mb-3" style={{ fontSize: 'clamp(2rem, 10vw, 3.5rem)' }}>
          Where it all<br />comes together.
        </h1>
        <p className="text-body-lg text-text-secondary mb-6">
          Occasion HQ connects event organisers with the volunteers who make it happen.
        </p>

        <button
          type="button"
          onClick={() => navigate('/events')}
          className="w-full h-[52px] rounded-md bg-accent text-white font-body text-[14px] font-semibold hover:bg-[#E55A28] active:bg-[#CC4F22] active:scale-[0.98] transition-all duration-150 mb-4"
        >
          Get started — it's free →
        </button>

        <p className="text-center text-body-sm text-text-secondary">
          Already on Occasion HQ?{' '}
          <button type="button" className="text-accent hover:underline">Sign in</button>
        </p>
      </section>

      {/* Divider */}
      <div className="border-t border-border mx-4 my-6" />

      {/* Two sides section */}
      <section className="px-4 pb-8">
        <p className="text-center text-[12px] font-semibold uppercase tracking-[0.08em] text-text-secondary mb-5">
          Two sides of the same occasion
        </p>

        {/* Organiser card */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-3">
          <div className="flex items-center gap-2 mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B35" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            <span className="text-label-sm text-text-secondary font-medium">For organisers</span>
          </div>
          <h2 className="font-display font-bold text-[17px] text-text-primary mb-2">
            Stop coordinating volunteers in spreadsheets.
          </h2>
          <p className="text-body-sm text-text-secondary leading-relaxed mb-4">
            Create your event, define roles, and let Occasion HQ fill them. See who's confirmed in real time.
          </p>
          <button
            type="button"
            onClick={() => navigate('/organiser/events/farnham-10k-2026')}
            className="w-full h-[44px] rounded-md border border-accent text-accent text-label-md font-medium hover:bg-accent-subtle transition-colors duration-150"
          >
            Create your first event
          </button>
        </div>

        {/* Volunteer card */}
        <div className="bg-surface border border-border rounded-xl p-4 mb-8">
          <div className="flex items-center gap-2 mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#848D97" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span className="text-label-sm text-text-secondary font-medium">For volunteers</span>
          </div>
          <h2 className="font-display font-bold text-[17px] text-text-primary mb-2">
            Find events that need you.
          </h2>
          <p className="text-body-sm text-text-secondary leading-relaxed mb-4">
            Browse local events, sign up for a role that fits your schedule, and build a record of your volunteer hours.
          </p>
          <button
            type="button"
            onClick={() => navigate('/events')}
            className="w-full h-[44px] rounded-md border border-border text-text-primary text-label-md font-medium hover:bg-raised transition-colors duration-150"
          >
            Find an occasion
          </button>
        </div>

        {/* Trust statements */}
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-label-md font-semibold text-text-primary mb-1">Built for organisers who care</p>
            <p className="text-body-sm text-text-secondary">From parkruns to half marathons — Occasion HQ handles the roster so you can focus on the day.</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-label-md font-semibold text-text-primary mb-1">Your hours, on record</p>
            <p className="text-body-sm text-text-secondary">Every shift you work is tracked. Download your volunteer hours certificate when you need it.</p>
          </div>
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-label-md font-semibold text-text-primary mb-1">Getting there together</p>
            <p className="text-body-sm text-text-secondary">Lift-share coordination built in — find volunteers heading the same way and reduce empty seats on event day.</p>
          </div>
        </div>
      </section>
    </div>
  )
}
