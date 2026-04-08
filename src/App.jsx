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
  '/landing': 'rgb(245,245,245)',
  '/biography': 'rgb(18,0,120)',
  '/event-calendar': 'rgb(0,0,0)',
  '/team': 'rgb(18,0,120)',
  '/contact': 'rgb(10,30,80)',
}

const VARIANT_MAP = {
  '/': 'dark',
  '/landing': 'light',
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

// Nav behavior per route
function getNavMode(pathname) {
  if (pathname === '/') return 'hover'       // dark home: hover-reveal
  if (pathname === '/landing') return 'fixed' // landing: always visible, absolute
  return 'static'                             // inner pages: always visible, in flow
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
      // Skip exit animation for home↔landing toggle (MainView handles its own)
      const homePages = ['/', '/landing']
      const isHomeSwap = homePages.includes(location.pathname) && homePages.includes(displayLocation.pathname)

      if (isHomeSwap) {
        setDisplayLocation(location)
        return
      }

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

  // During exit: use the DISPLAY location for nav behavior (what's still showing)
  // After enter: use the TARGET location
  const isExiting = transitionStage === 'exiting'
  const navPath = isExiting ? displayLocation.pathname : location.pathname
  const navMode = getNavMode(navPath)

  // Hover state for dark home
  const [hoverNav, setHoverNav] = useState(false)

  // Visibility logic
  let navVisible
  if (navMode === 'hover') {
    navVisible = hoverNav
  } else {
    navVisible = true
  }

  // Position logic
  const navPosition = navMode === 'static' ? 'relative' : 'absolute'

  // Background logic
  let navBg
  if (navMode === 'hover') {
    navBg = 'transparent'
  } else if (navMode === 'fixed') {
    navBg = 'rgb(245,245,245)'
  } else {
    navBg = BG_MAP[navPath] || 'transparent'
  }

  // Variant logic
  const navVariant = VARIANT_MAP[navPath] || 'dark'

  return (
    <div
      onMouseMove={(e) => {
        if (getNavMode(location.pathname) === 'hover') setHoverNav(e.clientY < 80)
      }}
      onMouseLeave={() => {
        if (getNavMode(location.pathname) === 'hover') setHoverNav(false)
      }}
    >
      {/* Single persistent Nav - never unmounts */}
      <div style={{
        position: navPosition,
        top: 0, left: 0, right: 0,
        zIndex: 50,
        background: navBg,
        opacity: navVisible ? 1 : 0,
        transform: navVisible ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease, background 0.3s ease',
        pointerEvents: navVisible ? 'auto' : 'none',
      }}>
        <Nav
          current={CURRENT_MAP[navPath] || 'Home'}
          onNavigate={go}
          variant={navVariant}
        />
      </div>

      {/* Content area with exit animation */}
      <div
        style={{
          opacity: isExiting ? 0 : 1,
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
