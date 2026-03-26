export const MOCK_EVENTS = [
  {
    id: 'redhill-10k-2026',
    name: 'Redhill 10K Fun Run',
    org: 'Redhill Harriers',
    type: 'Running',
    date: 'Sun 12 Apr 2026',
    time: '09:00–17:00',
    location: 'Redhill Park, Surrey',
    totalSpots: 20,
    filledSpots: 9,
    roles: [
      { id: 'r1', name: 'Start/Finish Marshal', shift: '08:00–10:30', headcount: 8, filled: 3, skills: ['Marshalling'] },
      { id: 'r2', name: 'Water Station (Mile 3)', shift: '09:30–13:00', headcount: 4, filled: 4, skills: ['Physical fitness'] },
      { id: 'r3', name: 'Finish Line Photographer', shift: '10:00–17:00', headcount: 8, filled: 2, skills: ['Photography'] },
    ],
  },
  {
    id: 'dorking-cleanup-2026',
    name: 'Dorking Park Clean-Up',
    org: 'Mole Valley Volunteers',
    type: 'Charity',
    date: 'Sat 19 Apr 2026',
    time: '09:00–13:00',
    location: 'Vincent Lane, Dorking',
    totalSpots: 12,
    filledSpots: 8,
    roles: [
      { id: 'r4', name: 'Litter Pick Team', shift: '09:00–12:00', headcount: 8, filled: 6, skills: [] },
      { id: 'r5', name: 'Team Leader', shift: '08:30–13:00', headcount: 4, filled: 2, skills: ['Leadership'] },
    ],
  },
]

export const HERO_EVENT = {
  id: 'farnham-10k-2026',
  name: 'Farnham 10K Summer Run',
  org: 'Farnham Runners',
  type: 'Running',
  date: 'Sun 14 Jun 2026',
  time: '09:00–13:00',
  location: 'Farnham Park, Surrey',
  roles: [
    { id: 'h1', name: 'Start/Finish Marshal', shift: '08:00–10:30', headcount: 8, filled: 8 },
    { id: 'h2', name: 'Water Station (Mile 3)', shift: '09:30–13:00', headcount: 4, filled: 4 },
    { id: 'h3', name: 'Finish Line Photographer', shift: '10:00–13:00', headcount: 8, filled: 8 },
  ],
}

export interface Registration {
  id: string
  name: string
  label: string
  status: 'pending' | 'confirmed' | 'declined'
}

export const MOCK_REGISTRATIONS: Record<string, Registration[]> = {
  r1: [
    { id: 'reg1', name: 'Sarah K.', label: 'Joined 2 yr ago', status: 'pending' },
    { id: 'reg2', name: 'Tom M.', label: 'New volunteer', status: 'pending' },
    { id: 'reg3', name: 'Priya L.', label: '3 events done', status: 'confirmed' },
  ],
  r2: [
    { id: 'reg4', name: 'Marcus D.', label: 'New volunteer', status: 'confirmed' },
    { id: 'reg5', name: 'Jess W.', label: 'Joined 1 yr ago', status: 'confirmed' },
  ],
}

export const MY_REGISTRATIONS = [
  {
    id: 'myreg1',
    eventName: 'Redhill 10K Fun Run',
    org: 'Redhill Harriers',
    role: 'Start/Finish Marshal',
    date: 'Sun 12 Apr 2026',
    shift: '08:00–10:30',
    status: 'pending' as const,
  },
  {
    id: 'myreg2',
    eventName: 'Dorking Park Clean-Up',
    org: 'Mole Valley Volunteers',
    role: 'Litter Pick Team',
    date: 'Sat 19 Apr 2026',
    shift: '09:00–12:00',
    location: 'Vincent Lane, Dorking',
    status: 'confirmed' as const,
  },
  {
    id: 'myreg3',
    eventName: 'Surrey Half Marathon 2025',
    org: 'Surrey Road Runners',
    role: 'Water Station Marshal',
    date: 'Sun 9 Nov 2025',
    shift: '07:30–13:00',
    status: 'completed' as const,
  },
]
