import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import MainView from './pages/MainView'
import Biography from './pages/Biography'
import EventCalendar from './pages/EventCalendar'
import Team from './pages/Team'
import Contact from './pages/Contact'

const BG_MAP = {
  '/': 'rgb(19,23,31)',
  '/landing': 'rgb(19,23,31)',
  '/biography': 'rgb(18,0,120)',
  '/event-calendar': 'rgb(0,0,0)',
  '/team': 'rgb(18,0,120)',
  '/contact': 'rgb(10,30,80)',
}

const VARIANT_MAP = {
  '/biography': 'blue',
  '/event-calendar': 'dark',
  '/team': 'blue',
  '/contact': 'blue',
}

const CURRENT_MAP = {
  '/': 'Home',
  '/landing': 'Home',
  '/biography': 'Biography',
  '/event-calendar': 'Event Calendar',
  '/team': 'Team',
  '/contact': 'Contact',
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

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
  }

  // Exit/enter animation state
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('entered')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exiting')
    }
  }, [location])

  function handleExitComplete(e) {
    if (e.target !== e.currentTarget) return
    if (transitionStage === 'exiting') {
      setDisplayLocation(location)
      setTransitionStage('entered')
      window.scrollTo(0, 0)
    }
  }

  // Background color management
  useEffect(() => {
    document.body.style.background = BG_MAP[location.pathname] || 'rgb(19,23,31)'
    document.body.style.transition = 'background 0.4s ease'
  }, [location.pathname])

  const isHomePage = location.pathname === '/' || location.pathname === '/landing'
  const [showNav, setShowNav] = useState(false)

  return (
    <div
      onMouseMove={isHomePage ? (e) => setShowNav(e.clientY < 80) : undefined}
      onMouseLeave={isHomePage ? () => setShowNav(false) : undefined}
    >
      {/* Persistent Nav - hidden on home/landing, always visible on inner pages */}
      {!isHomePage && (
        <div style={{ position: 'relative', zIndex: 50 }}>
          <Nav
            current={CURRENT_MAP[location.pathname] || 'Home'}
            onNavigate={go}
            variant={VARIANT_MAP[location.pathname] || 'dark'}
          />
        </div>
      )}

      {/* Content area with exit animation */}
      <div
        style={{
          opacity: transitionStage === 'exiting' ? 0 : 1,
          transition: 'opacity 0.25s ease',
        }}
        onTransitionEnd={handleExitComplete}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<MainView onNavigate={go} />} />
          <Route path="/landing" element={<MainView onNavigate={go} />} />
          <Route path="/biography" element={<Biography onNavigate={go} />} />
          <Route path="/event-calendar" element={<EventCalendar onNavigate={go} />} />
          <Route path="/team" element={<Team onNavigate={go} />} />
          <Route path="/contact" element={<Contact onNavigate={go} />} />
        </Routes>
      </div>
    </div>
  )
}
