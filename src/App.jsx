import { Routes, Route, useNavigate } from 'react-router-dom'
import MainView from './pages/MainView'
import Biography from './pages/Biography'
import EventCalendar from './pages/EventCalendar'
import Team from './pages/Team'
import Contact from './pages/Contact'

export default function App() {
  const navigate = useNavigate()

  const go = (page) => {
    const routes = {
      'Home': '/',
      'Landing': '/landing',
      'Biography': '/biography',
      'Event Calendar': '/event-calendar',
      'Team': '/team',
      'Contact': '/contact',
    }
    navigate(routes[page] || '/')
    window.scrollTo(0, 0)
  }

  return (
    <Routes>
      <Route path="/" element={<MainView onNavigate={go} />} />
      <Route path="/landing" element={<MainView onNavigate={go} />} />
      <Route path="/biography" element={<Biography onNavigate={go} />} />
      <Route path="/event-calendar" element={<EventCalendar onNavigate={go} />} />
      <Route path="/team" element={<Team onNavigate={go} />} />
      <Route path="/contact" element={<Contact onNavigate={go} />} />
    </Routes>
  )
}
