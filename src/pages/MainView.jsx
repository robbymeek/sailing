import { useState, useEffect, useRef } from 'react'
import useCountdown from '../hooks/useCountdown'
import { introPhotos } from '../assets/home-intro'
// Rest-state background: hiking shot, shown nearly black under the overlay.
import hikingBg from '../assets/home-intro/img-5957-alt.jpg'

const BASE = import.meta.env.BASE_URL
const BOAT_SIZE = 200

// Module-level flag: the cinematic intro plays once per JS bundle
// initialization (hard refresh) and is skipped on SPA navigation back
// to /. No storage APIs — this lives for the tab's lifetime only.
let introHasPlayed = false

export default function MainView({ onNavigate, hoverNavOpen, skipIntro, embedded }) {
  const target = new Date('2028-07-14T00:00:00')
  const { days, hrs, mins, secs } = useCountdown(target)

  return (
    <HomeIntro
      onNavigate={onNavigate}
      hoverNavOpen={hoverNavOpen}
      skipIntro={skipIntro}
      embedded={embedded}
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
function HomeIntro({ onNavigate, hoverNavOpen, skipIntro: forceSkip, embedded, boatSrc, days, hrs, mins, secs }) {
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

  // Skip check: respect the module-level played flag + reduced-motion.
  const skipIntro = forceSkip || introHasPlayed || prefersReducedMotion

  // phase drives the black overlay; separate booleans drive boat/UI fades
  // so their timing isn't locked to the overlay transition.
  const [phase, setPhase] = useState(skipIntro ? 'rest' : 'ignition')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoLayerVisible, setPhotoLayerVisible] = useState(!skipIntro && introPhotos.length > 0)
  // Only photos that fully loaded + decoded make it into the montage, so a
  // slow or failed image can never produce a blank/broken flash frame.
  const [playablePhotos, setPlayablePhotos] = useState([])
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
    let cancelled = false

    const runWithoutMontage = () => {
      // Degrade gracefully: skip the flash montage, run the boat/ui reveals only
      setPhotoLayerVisible(false)
      const schedule = (ms, fn) => {
        phaseTimersRef.current.push(setTimeout(fn, ms))
      }
      schedule(200, () => setPhase('revealing'))
      schedule(400, () => setBoatVisible(true))
      schedule(1400, () => { setPhase('rest'); setUiVisible(true); introHasPlayed = true })
    }

    if (introPhotos.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[HomeIntro] No photos in src/assets/home-intro/, skipping flash montage')
      runWithoutMontage()
      return () => {
        cancelled = true
        phaseTimersRef.current.forEach((t) => clearTimeout(t))
        phaseTimersRef.current = []
      }
    }

    // Photo cadence: starts very fast (45ms), eases up to ~85ms by ~1.4s,
    // then a slowing phase to ~480ms, then stops cycling — the last image
    // hovers in place while the overlay fades to black on top of it.
    const delayForElapsed = (elapsed) => {
      if (elapsed < 1400) {
        // Snap-fast at the start, gentle ramp 45ms → 85ms over 1.4s
        const t = elapsed / 1400
        return 45 + 40 * t
      }
      if (elapsed < 2600) {
        // Slowing: 85ms → 480ms ease-out over 1.2s
        const t = (elapsed - 1400) / 1200
        const eased = 1 - Math.pow(1 - t, 2)
        return 85 + (480 - 85) * eased
      }
      return Infinity // hold last image
    }

    const schedule = (ms, fn) => {
      phaseTimersRef.current.push(setTimeout(fn, ms))
    }

    // Reliable preload: every photo is fully loaded AND decoded before the
    // montage starts, so no frame can ever flash blank. Photos that fail (or
    // are still in flight at the 4s ceiling) are simply left out of the run.
    const loadOne = (url) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          if (img.decode) img.decode().then(() => resolve(url), () => resolve(url))
          else resolve(url)
        }
        img.onerror = () => resolve(null)
        img.src = url
      })

    const results = []
    const allLoaded = Promise.all(
      introPhotos.map((url) => loadOne(url).then((r) => { results.push(r); return r }))
    )
    const ceiling = new Promise((resolve) => setTimeout(resolve, 4000))

    Promise.race([allLoaded, ceiling]).then(() => {
      if (cancelled) return
      const loaded = results.filter(Boolean)
      if (loaded.length === 0) {
        // Nothing usable arrived in time — degrade to the no-montage reveal.
        runWithoutMontage()
        return
      }
      setPlayablePhotos(loaded)

      const startTime = performance.now()
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

      // Phase timeline (relative to preload completing):
      //   200ms : flash begins (snap-fast cadence)
      //  1400ms : cadence ease-out begins
      //  2600ms : last image latches in place; overlay starts fading to black
      //  3400ms : boat starts fading in over the (still visible) last image
      //  3800ms : photo layer hidden — overlay is fully black by now
      //  4400ms : rest state — overlay eases back to near-black so the hiking
      //           background photo emerges; bottom-left nav + countdown fade in
      schedule(200, () => {
        setPhase('flash')
        setPhotoAnimDuration(45)
        cyclePhoto()
      })
      schedule(1400, () => setPhase('slowing'))
      schedule(2600, () => setPhase('revealing'))
      schedule(3400, () => setBoatVisible(true))
      schedule(3800, () => setPhotoLayerVisible(false))
      schedule(4400, () => {
        setPhase('rest')
        setUiVisible(true)
        introHasPlayed = true
      })
    })

    return () => {
      cancelled = true
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current)
      phaseTimersRef.current.forEach((t) => clearTimeout(t))
      phaseTimersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Overlay per phase — black only. The montage darkens gradually, goes fully
  // black, then eases back to near-black so the hiking photo behind it reads
  // as a barely-there texture rather than flat black.
  const overlayStyle = (() => {
    let background = 'rgba(0,0,0,0)'
    let transition = 'background 1.2s linear'
    if (phase === 'flash') {
      background = 'rgba(0,0,0,0.12)'
    } else if (phase === 'slowing') {
      background = 'rgba(0,0,0,0.3)'
    } else if (phase === 'revealing') {
      // Fade the held last image down to full black over 1.2s (2600→3800ms)
      background = 'rgba(0,0,0,1)'
    } else if (phase === 'rest') {
      background = 'rgba(0,0,0,0.88)'
      transition = 'background 1.4s ease'
    }
    return { background, transition }
  })()

  // Typographic anchor — countdown corner reuses the value/meta treatment
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

  const activePhoto = playablePhotos.length > 0
    ? photoIndex % playablePhotos.length
    : -1

  return (
    <div style={{
      background: 'rgb(0,0,0)',
      height: '100dvh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Rest-state background — hiking shot, sits under everything and only
          shows through the near-black overlay once the intro settles. Toggled
          while hidden behind the fully-black overlay, so no visible pop. */}
      <img
        src={hikingBg}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: phase === 'rest' ? 1 : 0,
        }}
      />

      {/* Full-bleed photo layer — all decoded photos stay mounted, stacked;
          only the active one is visible. No per-frame remounting, so the
          montage can never flash a blank frame. */}
      {photoLayerVisible && playablePhotos.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: i === activePhoto ? 1 : 0,
            animation: i === activePhoto
              ? `photoFlash ${photoAnimDuration}ms linear forwards`
              : 'none',
            transformOrigin: 'center center',
          }}
        />
      ))}

      {/* Darkening overlay (solid black, alpha animates via CSS transition) */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          ...overlayStyle,
        }}
      />

      {/* Spinning boat — centered, fades in during the reveal phase.
          Clickable once the rest state is reached (uiVisible); opens the
          Coming Soon globe page, teased by the italic text below it. */}
      <button
        onClick={() => onNavigate('Coming Soon')}
        aria-label="Coming soon — see the road to LA 2028"
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

      <ComingSoonTeaser visible={uiVisible} onClick={() => onNavigate('Coming Soon')} />

      {/* Bottom-left persistent nav — always visible after intro */}
      <nav
        aria-label="Primary"
        style={{
          position: embedded ? 'absolute' : 'fixed',
          bottom: 32,
          left: 32,
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 20,
          opacity: uiVisible ? 1 : 0,
          transition: 'opacity 0.6s ease',
          pointerEvents: uiVisible ? 'auto' : 'none',
          zIndex: 20,
          maxWidth: 380,
        }}
      >
        {/* Nav row with dot separators */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          flexWrap: 'wrap',
        }}>
          {[
            ['BIOGRAPHY', 'Biography'],
            ['PATH & TEAM', 'Path'],
            ['CONTACT', 'Contact'],
          ].map(([label, route], i, arr) => (
            <span key={route} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <HomeNavLink label={label} onClick={() => onNavigate(route)} />
              {i < arr.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, margin: '0 16px', userSelect: 'none' }}>●</span>
              )}
            </span>
          ))}
        </div>

        {/* SUPPORT → */}
        <HomeNavLink label="SUPPORT →" onClick={() => onNavigate('Support')} isSupport />

        {/* Blurb */}
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11,
          lineHeight: 1.5,
          margin: 0,
          fontWeight: 400,
          letterSpacing: '-0.1px',
          maxWidth: 320,
        }}>
          Robby Meek is a sailor for the US Sailing Team attending Harvard University working to compete and excel at the 2028 Olympic Games.
        </p>
      </nav>

      {/* Top-right countdown corner — clickable, fades in with the nav */}
      {showCountdown && (
        <CountdownCorner
          onNavigate={onNavigate}
          uiVisible={uiVisible}
          hoverNavOpen={hoverNavOpen}
          embedded={embedded}
          anchorButton={anchorButton}
          anchorValue={anchorValue}
          anchorMeta={anchorMeta}
          countdownText={countdownText}
        />
      )}
    </div>
  )
}

// Top-right countdown corner — LA 2028 hovers royal blue and click-throughs
// to Event Calendar. The countdown line below is a non-interactive sibling.
// Italic teaser under the boat — same fade timing as the boat, navigates to
// the Coming Soon page just like clicking the boat itself.
function ComingSoonTeaser({ visible, onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        position: 'absolute',
        top: `calc(50% + ${BOAT_SIZE / 2 + 18}px)`,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'none',
        border: 'none',
        padding: 4,
        cursor: 'pointer',
        fontStyle: 'italic',
        fontSize: 13,
        letterSpacing: '0.2px',
        fontFamily: 'inherit',
        color: hover ? '#1E40FF' : 'rgba(255,255,255,0.45)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.8s ease, color 0.25s ease',
        pointerEvents: visible ? 'auto' : 'none',
        zIndex: 10,
      }}
    >
      coming soon
    </button>
  )
}

function CountdownCorner({ onNavigate, uiVisible, hoverNavOpen, embedded, anchorButton, anchorValue, anchorMeta, countdownText }) {
  const [hover, setHover] = useState(false)
  return (
    <div style={{
      position: embedded ? 'absolute' : 'fixed',
      top: hoverNavOpen ? 72 : 32,
      right: 32,
      textAlign: 'right',
      opacity: uiVisible ? 1 : 0,
      transition: 'opacity 0.6s ease, top 0.3s ease',
      pointerEvents: uiVisible ? 'auto' : 'none',
      zIndex: 20,
    }}>
      <button
        onClick={() => onNavigate('Event Calendar')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{ ...anchorButton, textAlign: 'right' }}
      >
        <h1 style={{
          ...anchorValue,
          marginTop: 0,
          color: hover ? '#1E40FF' : anchorValue.color,
          transition: 'color 0.25s ease',
        }}>LA 2028</h1>
      </button>
      <p style={anchorMeta}>{countdownText}</p>
    </div>
  )
}

// Small stateful nav link: color transitions to royal blue on hover.
function HomeNavLink({ label, onClick, isSupport }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: hover ? '#1E40FF' : 'rgba(255,255,255,0.75)',
        fontSize: isSupport ? 14 : 13,
        fontWeight: isSupport ? 500 : 400,
        letterSpacing: isSupport ? '1px' : '-0.2px',
        fontFamily: 'inherit',
        transition: 'color 0.25s ease',
      }}
    >
      {label}
    </button>
  )
}
