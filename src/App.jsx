import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Nav from './components/Nav'
import MainView from './pages/MainView'
import Biography from './pages/Biography'
import EventCalendar from './pages/EventCalendar'
import Team from './pages/Team'
import Contact from './pages/Contact'
import Support from './pages/Support'

const INNER_BG = {
  '/biography': 'rgb(18,0,120)',
  '/event-calendar': 'rgb(0,0,0)',
  '/team': 'rgb(18,0,120)',
  '/contact': 'rgb(10,30,80)',
  '/support': 'rgb(18,0,120)',
}

const VARIANT_MAP = {
  '/': 'dark',
  '/landing': 'light',
  '/biography': 'blue',
  '/event-calendar': 'dark',
  '/team': 'blue',
  '/contact': 'blue',
  '/support': 'red',
}

const CURRENT_MAP = {
  '/': 'Home',
  '/landing': 'Home',
  '/biography': 'Biography',
  '/event-calendar': 'Event Calendar',
  '/team': 'Team',
  '/contact': 'Contact',
  '/support': 'Support',
}

function getNavMode(pathname) {
  if (pathname === '/') return 'hover'
  if (pathname === '/landing') return 'fixed'
  if (pathname === '/support') return 'sticky'
  return 'static'
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  // System dark mode
  const [sysDark, setSysDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = (e) => setSysDark(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // Dynamic backgrounds for home pages based on system dark mode
  const homeDarkBg = 'rgb(19,23,31)'
  const landingBg = sysDark ? 'rgb(19,23,31)' : 'rgb(245,245,245)'

  function getBg(pathname) {
    if (pathname === '/') return homeDarkBg
    if (pathname === '/landing') return landingBg
    return INNER_BG[pathname] || 'rgb(19,23,31)'
  }

  function getVariant(pathname) {
    if (pathname === '/landing') return sysDark ? 'dark' : 'light'
    return VARIANT_MAP[pathname] || 'dark'
  }

  const go = (page) => {
    const routes = {
      'Home': '/landing',
      'Landing': '/landing',
      'Biography': '/biography',
      'Event Calendar': '/event-calendar',
      'Team': '/team',
      'Contact': '/contact',
      'Support': '/support',
    }
    navigate(routes[page] || '/landing')
  }

  // Exit/enter animation state
  const [displayLocation, setDisplayLocation] = useState(location)
  const [transitionStage, setTransitionStage] = useState('entered')

  useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
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
    document.body.style.background = getBg(location.pathname)
    document.body.style.transition = 'background 0.4s ease'
  }, [location.pathname, sysDark])

  const isExiting = transitionStage === 'exiting'
  const navPath = isExiting ? displayLocation.pathname : location.pathname
  const navMode = getNavMode(navPath)

  const [hoverNav, setHoverNav] = useState(false)

  let navVisible
  if (navMode === 'hover') {
    navVisible = hoverNav
  } else {
    navVisible = true
  }

  let navPosition
  if (navMode === 'static') navPosition = 'relative'
  else if (navMode === 'sticky') navPosition = 'sticky'
  else navPosition = 'absolute'

  // Nav background uses TARGET for immediate color change
  const targetMode = getNavMode(location.pathname)
  let navBg
  if (targetMode === 'hover') {
    navBg = 'transparent'
  } else if (targetMode === 'fixed') {
    navBg = landingBg
  } else if (targetMode === 'sticky') {
    navBg = 'rgba(40,5,5,0.92)'
  } else {
    navBg = getBg(location.pathname)
  }

  const navVariant = getVariant(location.pathname)

  return (
    <div
      onMouseMove={(e) => {
        if (getNavMode(location.pathname) === 'hover') setHoverNav(e.clientY < 80)
      }}
      onMouseLeave={() => {
        if (getNavMode(location.pathname) === 'hover') setHoverNav(false)
      }}
    >
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
          current={CURRENT_MAP[location.pathname] || 'Home'}
          onNavigate={go}
          variant={navVariant}
        />
      </div>

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
          <Route path="/support" element={<Support onNavigate={go} />} />
        </Routes>
      </div>
    </div>
  )
}
