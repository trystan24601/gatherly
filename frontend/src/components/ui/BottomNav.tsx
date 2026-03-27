import { useLocation, useNavigate } from 'react-router-dom'

interface NavTab {
  label: string
  route: string
  icon: React.ReactNode
  activeRoutes: string[]
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#FF6B35' : '#484F58'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#FF6B35' : '#484F58'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ClipboardIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#FF6B35' : '#484F58'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <line x1="9" y1="12" x2="15" y2="12" />
      <line x1="9" y1="16" x2="13" y2="16" />
    </svg>
  )
}

function PersonIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={active ? '#FF6B35' : '#484F58'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

export function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const tabs: NavTab[] = [
    {
      label: 'Home',
      route: '/',
      icon: null,
      activeRoutes: ['/'],
    },
    {
      label: 'Events',
      route: '/events',
      icon: null,
      activeRoutes: ['/events'],
    },
    {
      label: 'My Events',
      route: '/dashboard',
      icon: null,
      activeRoutes: ['/dashboard'],
    },
    {
      label: 'Profile',
      route: '/profile',
      icon: null,
      activeRoutes: ['/profile'],
    },
  ]

  function isActive(tab: NavTab) {
    if (tab.route === '/') return location.pathname === '/'
    return location.pathname.startsWith(tab.route)
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-[200]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="grid grid-cols-4 h-[60px]">
        {tabs.map((tab, i) => {
          const active = isActive(tab)
          return (
            <button
              key={tab.route}
              type="button"
              onClick={() => navigate(tab.route)}
              className="flex flex-col items-center justify-center gap-0.5 min-h-[44px]"
            >
              {i === 0 && <HomeIcon active={active} />}
              {i === 1 && <CalendarIcon active={active} />}
              {i === 2 && <ClipboardIcon active={active} />}
              {i === 3 && <PersonIcon active={active} />}
              <span
                className="text-[10px] font-medium leading-tight"
                style={{ color: active ? '#FF6B35' : '#484F58' }}
              >
                {tab.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
