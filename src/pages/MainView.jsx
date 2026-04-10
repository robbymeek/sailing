import { useState, useEffect, useRef } from 'react'
import useCountdown from '../hooks/useCountdown'
import { introPhotos } from '../assets/home-intro'

const BASE = import.meta.env.BASE_URL
const BOAT_SIZE = 200

// Module-level flag: the cinematic intro plays once per JS bundle
// initialization (hard refresh) and is skipped on SPA navigation back
// to /. No storage APIs — this lives for the tab's lifetime only.
let introHasPlayed = false

export default function MainView({ onNavigate }) {
  const target = new Date('2028-07-14T00:00:00')
  const { days, hrs, mins, secs } = useCountdown(target)

  return (
    <HomeIntro
      onNavigate={onNavigate}
      boatSrc={`${BASE}[0001-0250].gif`}
      days={days}
      hrs={hrs}
      mins={mins}
      secs={secs}
    />
  )
}

// ---------- Home intro + rest-state component ----------
// All cinematic state and timers live here so MainView stays a thin
// shell. Kept in the same file per the original brief.
function HomeIntro({ onNavigate, boatSrc, days, hrs, mins, secs }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const [portrait, setPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  )
  useEffect(() => {
    const h = () => {
      setViewportWidth(window.innerWidth)
      setPortrait(window.innerHeight > window.innerWidth)
    }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Initial skip check: on the very first mount, respect the module-level
  // played flag + reduced-motion. On explicit replay (boat click) we bypass
  // this via replayNonce > 0 so the intro runs regardless.
  const skipIntro = introHasPlayed || prefersReducedMotion

  // phase drives the blue→black overlay; separate booleans drive boat/UI fades
  // so their timing isn't locked to the overlay transition.
  const [phase, setPhase] = useState(skipIntro ? 'rest' : 'ignition')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoLayerVisible, setPhotoLayerVisible] = useState(!skipIntro && introPhotos.length > 0)
  const [photoAnimDuration, setPhotoAnimDuration] = useState(80)
  const [boatVisible, setBoatVisible] = useState(skipIntro)
  const [uiVisible, setUiVisible] = useState(skipIntro)
  // replayNonce increments on boat click to force the intro effect to re-run.
  const [replayNonce, setReplayNonce] = useState(0)
  const photoTimerRef = useRef(null)
  const phaseTimersRef = useRef([])

  // Reset state back to intro-start and bump the nonce. The intro useEffect
  // depends on replayNonce, so this triggers a fresh run (cleanup clears
  // any in-flight timers from a previous run first).
  const replayIntro = () => {
    if (introPhotos.length === 0) return
    setPhase('ignition')
    setPhotoIndex(0)
    setPhotoLayerVisible(true)
    setPhotoAnimDuration(80)
    setBoatVisible(false)
    setUiVisible(false)
    setReplayNonce((n) => n + 1)
  }

  useEffect(() => {
    // Only honor the skip check on the initial mount (nonce === 0). An
    // explicit replay always runs the intro.
    const isInitialMount = replayNonce === 0
    if (isInitialMount && skipIntro) {
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
  }, [replayNonce])

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

      {/* Spinning boat — centered, fades in during the reveal phase.
          Clickable once the rest state is reached (uiVisible) to replay the intro. */}
      <button
        onClick={replayIntro}
        aria-label="Replay home intro"
        disabled={!uiVisible}
        style={{
          position: 'absolute',
          top: '50%', left: '50%',
          width: BOAT_SIZE, height: BOAT_SIZE,
          transform: 'translate(-50%, -50%)',
          opacity: boatVisible ? 1 : 0,
          transition: 'opacity 0.8s ease',
          pointerEvents: uiVisible ? 'auto' : 'none',
          cursor: uiVisible ? 'pointer' : 'default',
          background: 'none',
          border: 'none',
          padding: 0,
          zIndex: 10,
        }}
      >
        <img
          src={boatSrc}
          alt="Spinning sailboat"
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
      </button>

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
