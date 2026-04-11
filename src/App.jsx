import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Nav from './components/Nav'

// Pages shown in the compact (narrow-viewport) overlay nav.
const COMPACT_PAGES = ['Home', 'Biography', 'Event Calendar', 'Team', 'Contact', 'Support']
import MainView from './pages/MainView'
import Biography from './pages/Biography'
import EventCalendar from './pages/EventCalendar'
import Team from './pages/Team'
import Contact from './pages/Contact'
import Support from './pages/Support'

const INNER_BG = {
  '/biography': 'rgb(230,235,240)',
  '/event-calendar': 'rgb(0,0,0)',
  '/team': 'rgb(22,24,28)',
  '/contact': 'rgb(10,30,80)',
  '/support': 'rgb(20,110,240)',
}

const VARIANT_MAP = {
  '/': 'dark',
  '/biography': 'light',
  '/event-calendar': 'dark',
  '/team': 'blue',
  '/contact': 'blue',
  '/support': 'blue',
}

const CURRENT_MAP = {
  '/': 'Home',
  '/biography': 'Biography',
  '/event-calendar': 'Event Calendar',
  '/team': 'Team',
  '/contact': 'Contact',
  '/support': 'Support',
}

function getNavMode(pathname) {
  // Home uses hover-revealed top nav at large widths in addition to its
  // baked-in bottom-left nav. Compact-mode fallbacks (hamburger + pinned
  // Support) are suppressed on / because the bottom-left nav already covers
  // narrow screens — see the isHomeRoute gates below.
  if (pathname === '/') return 'hover'
  if (pathname === '/support') return 'sticky'
  return 'static'
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  function getBg(pathname) {
    if (pathname === '/') return 'rgb(0,0,0)' // pure black for the cinematic home
    return INNER_BG[pathname] || 'rgb(19,23,31)'
  }

  function getVariant(pathname) {
    return VARIANT_MAP[pathname] || 'dark'
  }

  const go = (page) => {
    const routes = {
      'Home': '/',
      'Biography': '/biography',
      'Event Calendar': '/event-calendar',
      'Team': '/team',
      'Contact': '/contact',
      'Support': '/support',
    }
    navigate(routes[page] || '/')
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
    document.body.style.background = getBg(location.pathname)
    document.body.style.transition = 'background 0.4s ease'
  }, [location.pathname])

  const isExiting = transitionStage === 'exiting'
  const navPath = isExiting ? displayLocation.pathname : location.pathname
  const navMode = getNavMode(navPath)

  // Preload Biography + Event Calendar on mobile for instant transitions
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 900)
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const [hoverNav, setHoverNav] = useState(false)

  // Compact-mode nav state: when the full horizontal nav doesn't fit (narrow
  // desktop window or mobile), switch to a hamburger + overlay. Detection uses
  // a hidden measurement Nav so we compare real content width to viewport,
  // no hardcoded breakpoints.
  const navMeasureRef = useRef(null)
  const [navOverflowing, setNavOverflowing] = useState(false)
  const [navMenuOpen, setNavMenuOpen] = useState(false)

  useLayoutEffect(() => {
    const el = navMeasureRef.current
    if (!el) return
    const check = () => {
      const measured = el.getBoundingClientRect().width
      // 140px slack accounts for the pinned top-left hamburger + top-right Support
      // CTA that sit outside the centered nav in compact mode, plus safe margin.
      setNavOverflowing(measured + 140 > window.innerWidth)
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(document.body)
    return () => ro.disconnect()
  }, [])

  // Close the overlay on route change and on Escape.
  useEffect(() => {
    setNavMenuOpen(false)
  }, [location.pathname])
  useEffect(() => {
    if (!navMenuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setNavMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navMenuOpen])

  // The home route uses hover nav, but it has its own cinematic intro and a
  // bottom-left nav that already telegraphs navigability — we don't need the
  // discovery hint there. Other hover routes (currently none) would still get it.
  const isHomeRoute = location.pathname === '/'

  // Discovery affordance: on hover-mode routes, briefly fade the nav in at low opacity
  // after the boat entrance completes so first-time visitors notice nav exists.
  // Runs once per mount of a hover route, does not use any storage APIs.
  const [navHint, setNavHint] = useState(false)
  useEffect(() => {
    if (navMode !== 'hover' || isHomeRoute) {
      setNavHint(false)
      return
    }
    const showT = setTimeout(() => setNavHint(true), 1300)
    const hideT = setTimeout(() => setNavHint(false), 3500)
    return () => {
      clearTimeout(showT)
      clearTimeout(hideT)
    }
  }, [navMode, location.pathname, isHomeRoute])

  let navVisible
  let navOpacity
  if (navMode === 'hover') {
    navVisible = hoverNav || navHint
    navOpacity = hoverNav ? 1 : (navHint ? 0.15 : 0)
  } else {
    navVisible = true
    navOpacity = 1
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
  } else if (targetMode === 'sticky') {
    navBg = 'rgba(20,110,240,0.92)'
  } else {
    navBg = getBg(location.pathname)
  }

  const navVariant = getVariant(location.pathname)

  // Variant-aware color for the fixed hamburger trigger that lives outside
  // the regular Nav wrapper (so it needs its own color logic).
  let triggerColor
  if (navVariant === 'light') {
    triggerColor = 'rgba(0,0,0,0.6)'
  } else if (navVariant === 'red') {
    triggerColor = 'rgba(40,5,5,0.7)'
  } else {
    triggerColor = 'rgba(255,255,255,0.7)'
  }

  return (
    <div
      onMouseMove={(e) => {
        if (getNavMode(location.pathname) === 'hover') setHoverNav(e.clientY < 80)
      }}
      onMouseLeave={() => {
        if (getNavMode(location.pathname) === 'hover') setHoverNav(false)
      }}
    >
      {/* Hidden measurement nav: renders the full horizontal nav off-screen so
          ResizeObserver can compare its natural content width to the viewport
          and decide when to collapse into compact mode. */}
      <div ref={navMeasureRef} aria-hidden="true" style={{
        position: 'fixed', top: -9999, left: -9999,
        visibility: 'hidden', pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        <Nav current="Home" onNavigate={() => {}} variant="dark" />
      </div>

      {/* Regular centered Nav — hidden when compact mode is active. */}
      {!navOverflowing && (
        <div style={{
          position: navPosition,
          top: 0, left: 0, right: 0,
          zIndex: 50,
          background: navBg,
          opacity: navOpacity,
          transform: navVisible ? 'translateY(0)' : 'translateY(-10px)',
          transition: 'opacity 0.6s ease, transform 0.3s ease, background 0.3s ease',
          pointerEvents: (navMode === 'hover' ? hoverNav : navVisible) ? 'auto' : 'none',
        }}>
          <Nav
            current={CURRENT_MAP[location.pathname] || 'Home'}
            onNavigate={go}
            variant={navVariant}
            plainSupport={isHomeRoute}
          />
        </div>
      )}

      {/* Compact-mode hamburger trigger: fixed top-left, two horizontal lines,
          animates to an X when the overlay is open. Lives outside any transform
          or opacity wrapper so it stays put on scroll. Skipped on home —
          the bottom-left nav baked into MainView covers narrow screens. */}
      {!isHomeRoute && navOverflowing && (
        <button
          onClick={() => setNavMenuOpen((o) => !o)}
          aria-label={navMenuOpen ? 'Close menu' : 'Open menu'}
          style={{
            position: 'fixed',
            top: 20, left: 24,
            zIndex: 80,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: 6,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            width: 34, height: 28,
          }}
        >
          <span style={{
            display: 'block', width: 22, height: 1,
            background: triggerColor,
            transition: 'transform 0.3s ease, background 0.3s ease',
            transform: navMenuOpen ? 'translateY(3px) rotate(45deg)' : 'translateY(-3px)',
            transformOrigin: 'center',
          }} />
          <span style={{
            display: 'block', width: 22, height: 1,
            background: triggerColor,
            transition: 'transform 0.3s ease, background 0.3s ease',
            transform: navMenuOpen ? 'translateY(-4px) rotate(-45deg)' : 'translateY(3px)',
            transformOrigin: 'center',
          }} />
        </button>
      )}

      {/* Compact-mode overlay: full-viewport backdrop + vertical stack. */}
      {!isHomeRoute && navOverflowing && (
        <div
          onClick={() => setNavMenuOpen(false)}
          role="dialog"
          aria-hidden={!navMenuOpen}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(12,14,20,0.94)',
            zIndex: 70,
            opacity: navMenuOpen ? 1 : 0,
            pointerEvents: navMenuOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 28, alignItems: 'center',
          }}>
            {COMPACT_PAGES.map((item) => {
              const isSupport = item === 'Support'
              return (
                <button
                  key={item}
                  onClick={(e) => {
                    e.stopPropagation()
                    go(item)
                    setNavMenuOpen(false)
                  }}
                  className={isSupport ? 'chrome-text' : undefined}
                  style={{
                    background: isSupport ? undefined : 'none',
                    border: 'none', cursor: 'pointer',
                    color: isSupport ? undefined : 'rgba(255,255,255,0.75)',
                    fontSize: 24, fontWeight: isSupport ? 500 : 400,
                    letterSpacing: '-0.6px', padding: '8px 14px',
                  }}
                >
                  {item}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div
        style={{
          opacity: isExiting ? 0 : 1,
          transition: 'opacity 0.3s ease',
        }}
        onTransitionEnd={handleExitComplete}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<MainView onNavigate={go} />} />
          <Route path="/biography" element={<Biography onNavigate={go} />} />
          <Route path="/event-calendar" element={<EventCalendar onNavigate={go} />} />
          <Route path="/team" element={<Team onNavigate={go} />} />
          <Route path="/contact" element={<Contact onNavigate={go} />} />
          <Route path="/support" element={<Support onNavigate={go} />} />
        </Routes>
      </div>

      {/* Preload Biography + Event Calendar off-screen for snappier page transitions */}
      <div aria-hidden="true" style={{
        position: 'fixed', top: '-200vh', left: '-200vw',
        width: '100vw', height: '100vh',
        visibility: 'hidden', pointerEvents: 'none', overflow: 'hidden',
        zIndex: -1,
      }}>
        {displayLocation.pathname !== '/biography' && <Biography onNavigate={() => {}} />}
        {displayLocation.pathname !== '/event-calendar' && <EventCalendar onNavigate={() => {}} />}
      </div>
    </div>
  )
}
