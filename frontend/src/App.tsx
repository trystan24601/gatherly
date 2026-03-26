import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LandingScreen } from './screens/LandingScreen'
import { DiscoveryFeedScreen } from './screens/DiscoveryFeedScreen'
import { EventDetailScreen } from './screens/EventDetailScreen'
import { VolunteerDashboardScreen } from './screens/VolunteerDashboardScreen'
import { OrganiserEventDashboardScreen } from './screens/OrganiserEventDashboardScreen'
import { OrganiserRegistrationReviewScreen } from './screens/OrganiserRegistrationReviewScreen'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingScreen />} />
        <Route path="/events" element={<DiscoveryFeedScreen />} />
        <Route path="/events/:id" element={<EventDetailScreen />} />
        <Route path="/dashboard" element={<VolunteerDashboardScreen />} />
        <Route path="/organiser/events/:id" element={<OrganiserEventDashboardScreen />} />
        <Route path="/organiser/events/:id/registrations" element={<OrganiserRegistrationReviewScreen />} />
      </Routes>
    </BrowserRouter>
  )
}
