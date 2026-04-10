import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useCountdown from '../hooks/useCountdown'
import { introPhotos } from '../assets/home-intro'

const BASE = import.meta.env.BASE_URL
const BOAT_SIZE = 200

// Module-level flag: the cinematic intro plays once per JS bundle
// initialization (hard refresh) and is skipped on SPA navigation back
// to /. No storage APIs — this lives for the tab's lifetime only.
let introHasPlayed = false

export default function MainView({ onNavigate }) {
  const location = useLocation()
  const routerNavigate = useNavigate()
  const isLanding = location.pathname.includes('landing')

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

  // Mode: 'home' or 'landing'
  const [mode, setMode] = useState(isLanding ? 'landing' : 'home')
  const [transitioning, setTransitioning] = useState(false)
  const [textVisible, setTextVisible] = useState(true)

  // Sync mode with route on initial load
  useEffect(() => {
    setMode(isLanding ? 'landing' : 'home')
  }, [isLanding])

  // Landing-only: click the boat to toggle between /landing and /. The /
  // route no longer uses this — the home boat is static after the intro.
  const handleToggle = useCallback(() => {
    if (mode !== 'landing') return
    if (transitioning) return
    setTransitioning(true)
    setTextVisible(false)

    setTimeout(() => {
      setMode('home')
      routerNavigate('/', { replace: true })
    }, 500)

    setTimeout(() => {
      setTextVisible(true)
      setTransitioning(false)
    }, 1200)
  }, [mode, transitioning, routerNavigate])

  // Countdown target — used by both the rest-state corner and /landing
  const target = new Date('2028-07-14T00:00:00')
  const { days, hrs, mins, secs } = useCountdown(target)

  // Responsive
  const [portrait, setPortrait] = useState(window.innerHeight > window.innerWidth)
  useEffect(() => {
    const h = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])


  // Colors
  const inHome = mode === 'home'
  const landingDark = sysDark
  const homeBg = 'rgb(0,0,0)' // pure black for the cinematic home rest state
  const landingBg = landingDark ? 'rgb(19,23,31)' : 'rgb(245,245,245)'
  const bg = inHome ? homeBg : landingBg

  useEffect(() => {
    document.body.style.background = bg
    document.body.style.transition = 'background 0.7s ease'
  }, [bg])

  // Landing colors
  const textDim = landingDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
  const divider = landingDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'

  const textFade = {
    opacity: textVisible ? 1 : 0,
    transform: textVisible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  }

  // The boat: both GIFs stacked, cross-fade between them
  const darkGif = `${BASE}[0001-0250].gif`
  const lightGif = `${BASE}[0001-0240].gif`

  // Which GIF is on top depends on mode
  const showDarkGif = inHome || (mode === 'landing' && landingDark)

  const boatEl = (
    <div
      onClick={handleToggle}
      style={{
        width: BOAT_SIZE, height: BOAT_SIZE,
        position: 'relative', cursor: 'pointer', flexShrink: 0,
        marginLeft: BOAT_SIZE * 0.1 - 20,
      }}
    >
      {/* Dark boat: scaled up slightly to match light boat size */}
      <img
        src={darkGif}
        alt="Sailboat dark"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          opacity: showDarkGif ? 1 : 0,
          transition: 'opacity 0.7s ease',
          transform: 'scale(1.0) translate(0%, 0%)',
          transformOrigin: 'center center',
        }}
      />
      {/* Light boat: slight offset to align hull */}
      <img
        src={lightGif}
        alt="Sailboat light"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          opacity: showDarkGif ? 0 : 1,
          transition: 'opacity 0.7s ease',
          transform: 'scale(0.92) translate(4%, 5%)',
          transformOrigin: 'center center',
        }}
      />
    </div>
  )

  const landingScrollStyle = textFade

  // ========== LANDING MODE ==========
  if (!inHome) {
    return (
      <div style={{
        background: bg,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'background 0.7s ease',
      }}>
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}>
          {boatEl}
          <button
            onClick={() => onNavigate('Team')}
            style={{
              ...landingScrollStyle,
              position: 'absolute',
              top: `calc(50% + ${BOAT_SIZE / 2 + 28}px)`,
              background: 'none',
              border: `1px solid ${divider}`,
              color: textDim,
              fontSize: 13, fontWeight: 400, letterSpacing: '-0.2px',
              padding: '10px 28px', cursor: 'pointer',
            }}
          >
            Join the Team
          </button>
        </div>

        <div style={{ padding: '20px 32px', width: '100%', textAlign: 'center', ...landingScrollStyle }}>
          <p style={{ color: textDim, fontSize: 10, transition: 'color 0.5s ease' }}>
            Website designed and made by Robby Meek
          </p>
        </div>
      </div>
    )
  }

  // ========== HOME MODE: cinematic intro → rest state ==========
  return (
    <HomeIntro
      onNavigate={onNavigate}
      boatSrc={darkGif}
      portrait={portrait}
      days={days}
      hrs={hrs}
      mins={mins}
      secs={secs}
    />
  )
}

// ---------- Home intro + rest-state component ----------
// Split out so the intro's useEffect/state are fully scoped to the home
// route and don't run for /landing. Kept in the same file per the brief.
function HomeIntro({ onNavigate, boatSrc, portrait, days, hrs, mins, secs }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  useEffect(() => {
    const h = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // If the intro has already played in this JS bundle lifetime, or the user
  // prefers reduced motion, skip straight to the rest state.
  const skipIntro = introHasPlayed || prefersReducedMotion

  // phase drives the blue→black overlay; separate booleans drive boat/UI fades
  // so their timing isn't locked to the overlay transition.
  const [phase, setPhase] = useState(skipIntro ? 'rest' : 'ignition')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoLayerVisible, setPhotoLayerVisible] = useState(!skipIntro && introPhotos.length > 0)
  const [photoAnimDuration, setPhotoAnimDuration] = useState(80)
  const [boatVisible, setBoatVisible] = useState(skipIntro)
  const [uiVisible, setUiVisible] = useState(skipIntro)
  const photoTimerRef = useRef(null)
  const phaseTimersRef = useRef([])

  useEffect(() => {
    if (skipIntro) {
      introHasPlayed = true
      return
    }
    if (introPhotos.length === 0) {
      // Degrade gracefully: skip the flash montage, run the boat/ui reveals only
      // eslint-disable-next-line no-console
      console.warn('[HomeIntro] No photos in src/assets/home-intro/, skipping flash montage')
      setPhotoLayerVisible(false)
      const t1 = setTimeout(() => setPhase('revealing'), 200)
      const t2 = setTimeout(() => setBoatVisible(true), 400)
      const t3 = setTimeout(() => { setPhase('rest'); setUiVisible(true); introHasPlayed = true }, 1400)
      return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
    }

    const startTime = performance.now()

    // Photo cadence: 80ms during flash, ease-out to 350ms during slowing, stop at 3200ms.
    const delayForElapsed = (elapsed) => {
      if (elapsed < 2000) return 80
      if (elapsed < 3200) {
        const t = (elapsed - 2000) / 1200
        const eased = 1 - Math.pow(1 - t, 2)
        return 80 + (350 - 80) * eased
      }
      return Infinity
    }

    const cyclePhoto = () => {
      const elapsed = performance.now() - startTime
      const delay = delayForElapsed(elapsed)
      if (delay === Infinity) return
      photoTimerRef.current = setTimeout(() => {
        setPhotoIndex((i) => i + 1)
        setPhotoAnimDuration(delay)
        cyclePhoto()
      }, delay)
    }

    const schedule = (ms, fn) => {
      phaseTimersRef.current.push(setTimeout(fn, ms))
    }

    // Best-effort pre-decode — hard 400ms ceiling so slow images can't stall the intro.
    const preload = Promise.race([
      Promise.all(
        introPhotos.map(
          (url) =>
            new Promise((resolve) => {
              const img = new Image()
              img.onload = resolve
              img.onerror = resolve
              img.src = url
            })
        )
      ),
      new Promise((resolve) => setTimeout(resolve, 400)),
    ])

    preload.then(() => {
      schedule(200, () => {
        setPhase('flash')
        setPhotoAnimDuration(80)
        cyclePhoto()
      })
      schedule(2000, () => setPhase('slowing'))
      schedule(3200, () => {
        setPhase('revealing')
        setPhotoLayerVisible(false)
      })
      schedule(3400, () => setBoatVisible(true))
      schedule(4200, () => {
        setPhase('rest')
        setUiVisible(true)
        introHasPlayed = true
      })
    })

    return () => {
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current)
      phaseTimersRef.current.forEach((t) => clearTimeout(t))
      phaseTimersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Overlay color per phase. The blue→black transition is a hue shift on a
  // single solid layer — no linear-gradient involved.
  const overlayStyle = (() => {
    let background = 'rgba(30,64,255,0)'
    let transition = 'background 1.8s linear'
    if (phase === 'flash') {
      background = 'rgba(30,64,255,0.35)'
      transition = 'background 1.8s linear'
    } else if (phase === 'slowing') {
      background = 'rgba(30,64,255,0.75)'
      transition = 'background 1.2s linear'
    } else if (phase === 'revealing') {
      background = 'rgba(0,0,0,0.85)'
      transition = 'background 1s linear'
    } else if (phase === 'rest') {
      background = 'rgba(0,0,0,1)'
      transition = 'background 0.6s linear'
    }
    return { background, transition }
  })()

  // Typographic anchor — countdown corner reuses the same label/value/meta treatment
  const anchorLabel = {
    color: 'rgb(117,117,117)', fontSize: 12, fontWeight: 400,
    letterSpacing: '-0.48px', textTransform: 'uppercase', margin: '0 0 6px',
  }
  const anchorValue = {
    color: 'rgb(157,174,194)', fontSize: 20, fontWeight: 400,
    letterSpacing: '-0.8px', margin: '0 0 8px',
  }
  const anchorMeta = {
    color: 'rgb(153,153,153)', fontSize: 16, fontWeight: 500, margin: 0,
  }
  const anchorButton = {
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
  }
  const countdownText = `${days} : ${String(hrs).padStart(2, '0')} : ${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`

  // On very narrow viewports the countdown corner would collide with the nav;
  // drop it there. TODO mobile pass — a future prompt will redesign mobile nav.
  const showCountdown = viewportWidth >= 400

  const currentPhotoUrl = introPhotos.length > 0
    ? introPhotos[photoIndex % introPhotos.length]
    : null

  return (
    <div style={{
      background: 'rgb(0,0,0)',
      height: '100dvh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Full-bleed photo layer — only rendered while the flash montage runs */}
      {currentPhotoUrl && photoLayerVisible && (
        <img
          key={photoIndex}
          src={currentPhotoUrl}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            animation: `photoFlash ${photoAnimDuration}ms linear forwards`,
            transformOrigin: 'center center',
          }}
        />
      )}

      {/* Blue → black overlay (solid color, hue-shifts via CSS transition) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          ...overlayStyle,
        }}
      />

      {/* Spinning boat — centered, fades in during the reveal phase */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        width: BOAT_SIZE, height: BOAT_SIZE,
        transform: 'translate(-50%, -50%)',
        opacity: boatVisible ? 1 : 0,
        transition: 'opacity 0.8s ease',
        pointerEvents: 'none',
      }}>
        <img
          src={boatSrc}
          alt="Spinning sailboat"
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </div>

      {/* Bottom-left persistent nav — always visible after intro */}
      <nav
        aria-label="Primary"
        style={{
          position: 'fixed',
          bottom: 28, left: 32,
          display: 'flex', flexDirection: 'column',
          gap: 10, alignItems: 'flex-start',
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: uiVisible ? 'auto' : 'none',
          zIndex: 20,
        }}
      >
        {[
          ['Bio', 'Biography'],
          ['Team', 'Team'],
          ['Events', 'Event Calendar'],
          ['Support', 'Support'],
        ].map(([label, route]) => (
          <HomeNavLink key={route} label={label} onClick={() => onNavigate(route)} portrait={portrait} />
        ))}
      </nav>

      {/* Top-right countdown corner — clickable, fades in with the nav */}
      {showCountdown && (
        <div style={{
          position: 'fixed',
          top: 32, right: 32,
          textAlign: 'right',
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: uiVisible ? 'auto' : 'none',
          zIndex: 20,
        }}>
          <button
            onClick={() => onNavigate('Event Calendar')}
            style={{ ...anchorButton, textAlign: 'right' }}
          >
            <p style={anchorLabel}>EVENT CALENDAR</p>
            <h1 style={anchorValue}>LA 2028</h1>
          </button>
          <p style={anchorMeta}>{countdownText}</p>
        </div>
      )}
    </div>
  )
}

// Small stateful nav link: color transitions to royal blue on hover.
function HomeNavLink({ label, onClick, portrait }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        background: 'none', border: 'none', padding: 0,
        cursor: 'pointer',
        color: hover ? '#1E40FF' : 'rgba(255,255,255,0.75)',
        fontSize: portrait ? 12 : 13,
        fontWeight: 400,
        letterSpacing: '-0.2px',
        fontFamily: 'inherit',
        transition: 'color 0.25s ease',
      }}
    >
      {label}
    </button>
  )
}
