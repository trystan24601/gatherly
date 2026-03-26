import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { HealthBanner } from './components/HealthBanner'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HealthBanner />} />
      </Routes>
    </BrowserRouter>
  )
}
