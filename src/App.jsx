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
      'Home': '/landing',
      'Landing': '/landing',
      'Biography': '/biography',
      'Event Calendar': '/event-calendar',
      'Team': '/team',
      'Contact': '/contact',
    }
    navigate(routes[page] || '/landing')
  }

  // Exit/enter animation state
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('entered')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionStage('exiting')
      const t = setTimeout(() => {
        setDisplayLocation(location)
        setTransitionStage('entered')
        window.scrollTo(0, 0)
      }, 350)
      return () => clearTimeout(t)
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

  // Hover-reveal state for home pages
  const [hoverNav, setHoverNav] = useState(false)

  // On inner pages: always visible. On home/landing: hover-reveal.
  const navVisible = isHomePage ? hoverNav : true

  return (
    <div
      onMouseMove={(e) => { if (isHomePage) setHoverNav(e.clientY < 80) }}
      onMouseLeave={() => { if (isHomePage) setHoverNav(false) }}
    >
      {/* Single persistent Nav - never unmounts */}
      <div style={{
        position: isHomePage ? 'absolute' : 'relative',
        top: 0, left: 0, right: 0,
        zIndex: 50,
        background: isHomePage ? 'transparent' : (BG_MAP[location.pathname] || 'transparent'),
        opacity: navVisible ? 1 : 0,
        transform: navVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease, background 0.4s ease',
        pointerEvents: navVisible ? 'auto' : 'none',
      }}>
        <Nav
          current={CURRENT_MAP[location.pathname] || 'Home'}
          onNavigate={go}
          variant={isHomePage ? 'dark' : (VARIANT_MAP[location.pathname] || 'dark')}
        />
      </div>

      {/* Content area with exit animation */}
      <div
        style={{
          opacity: transitionStage === 'exiting' ? 0 : 1,
          transition: 'opacity 0.3s ease',
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
