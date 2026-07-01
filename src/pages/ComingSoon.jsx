import { useState, useEffect, useRef } from 'react'
import STOPS from '../data/campaignStops'
import createGlobeScene from '../lib/globeScene'
import { hasWebGL2 } from '../lib/webglSupport'
import Footer from '../components/Footer'
import SailboatIcon from '../components/SailboatIcon'
import ExitNav from '../components/ExitNav'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'
// Exit-banner card imagery (bundled assets → always ship, unlike public/ files).
import cardHome from '../assets/home-intro/img-8856.jpg'
import cardBio from '../assets/home-intro/img-5957.jpg'
import cardPath from '../assets/home-intro/img-5959.jpg'
import cardSupport from '../assets/home-intro/p1233486-2.jpg'

// Scroll choreography in viewport-height units. A "stop" is a card; a stop can
// span several waypoints (e.g. Australia hopping Adelaide → Perth → Sydney),
// each of which is a "frame" the globe rotates to. The first frame of a stop
// gets a full segment (the card reads); extra waypoints are quick hops.
const HERO = 1.0
// Between-stop pacing is PROPORTIONAL to how far the dot flies across the globe: a
// short hop scrolls briefly, a long haul (e.g. Annapolis → Adelaide) scrolls longer,
// so the scroll always matches the visible travel. Leg length = LEG_MIN + central
// angle (radians, 0..π) × LEG_PER_RAD.
const LEG_MIN = 0.5 // shortest between-stop leg
const LEG_PER_RAD = 0.5 // vh-units of scroll added per radian of dot travel
// Extra waypoints WITHIN one multi-city stop are quick fly-throughs regardless of
// distance — the card already shows all the cities at once, so the globe just zips
// between them with no stuck-feeling dwell. Entry into the first city and exit to the
// next stop still use the proportional leg length above.
const WAYPOINT_HOP = 0.12
const FINALE_EXTRA = 1.0 // runway for the LA 2028 zoom

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const easeInOut = (t) => t * t * (3 - 2 * t)
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Flatten stops → frames (one per waypoint), tagging position within the stop.
function buildFrames(stops) {
  const frames = []
  stops.forEach((stop, si) => {
    const pts =
      stop.points && stop.points.length
        ? stop.points
        : [{ lat: stop.lat, lng: stop.lng, label: stop.region }]
    pts.forEach((pt, pi) => {
      frames.push({
        lat: pt.lat,
        lng: pt.lng,
        label: pt.label || stop.region,
        stopIndex: si,
        isFirstOfStop: pi === 0,
        isLastOfStop: pi === pts.length - 1,
        isFinale: stop.status === 'finale',
        multi: pts.length > 1,
        fullLeg: !!pt.fullLeg, // force a proportional (normal-speed) leg into this waypoint
      })
    })
  })
  return frames
}

const FRAMES = buildFrames(STOPS)
const F = FRAMES.length

// Great-circle central angle (radians, 0..π) between two {lat,lng} frames — drives
// the proportional between-stop leg length so scroll ≈ how far the dot travels.
const DEG = Math.PI / 180
function centralAngle(a, b) {
  const la1 = a.lat * DEG
  const la2 = b.lat * DEG
  const dLa = (b.lat - a.lat) * DEG
  const dLn = (b.lng - a.lng) * DEG
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLn / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

function segLen(i) {
  if (i === F - 1) return FINALE_EXTRA
  const dst = FRAMES[i + 1]
  // Within a multi-city stop (arriving at an extra waypoint): quick fixed hop —
  // unless that waypoint is flagged fullLeg (a long crossing that should scroll normally).
  if (!dst.isFirstOfStop && !dst.fullLeg) return WAYPOINT_HOP
  // Between stops (or a flagged full leg): proportional to dot travel.
  return LEG_MIN + centralAngle(FRAMES[i], dst) * LEG_PER_RAD
}

// Cumulative vh offset where each frame's segment begins.
const OFFSETS = (() => {
  const o = new Array(F)
  o[0] = HERO
  for (let i = 1; i < F; i++) o[i] = o[i - 1] + segLen(i - 1)
  return o
})()
const TOTAL_VH = (OFFSETS[F - 1] + FINALE_EXTRA + 0.8) * 100 // +0.8 screen of finale linger before the end block

// First frame index of each stop → the scroll offset the clickable rail flies to.
const STOP_FRAME = (() => {
  const m = []
  FRAMES.forEach((f, i) => { if (f.isFirstOfStop) m[f.stopIndex] = i })
  return m
})()

const REEL_SPACING = 152 // px between reel cards (vertical slot-machine pitch)
const PLAY_MS_PER_FRAME = 1200 // auto-play tour pace per globe hop — calm, not jarring

// Left progress rail: bigger, easier-to-click dots at a fixed vertical pitch, with a
// sailboat that rides from dot to dot (holding at each stop as you scroll).
const RAIL_PITCH = 26 // px between dot centres
const RAIL_DOT_X = 30 // dot-column x within the rail container
const RAIL_BOAT_X = 11 // sailboat x (just left of the dots)

// 1 → "1st", 2 → "2nd", 3 → "3rd", … for the "Nth of 18 stops" counter.
function ordinal(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

// dotT past which the globe is "arriving" at the next waypoint: the card/label
// for the destination pops up here — just before the dot reaches the pin.
const ARRIVE = 0.74

// Single source of truth for scroll progress — the three.js loop reads this
// every frame (heroT/fi/moveT/finaleT to drive the dot + rotation); the React
// listener uses the rest for the card body + waypoint label.
function computeScroll() {
  const vh = window.innerHeight || 1
  const y = window.scrollY / vh
  const heroT = clamp(y / HERO, 0, 1)

  // active frame = last frame whose segment has started
  let fi = 0
  for (let i = 0; i < F; i++) {
    if (OFFSETS[i] <= y) fi = i
    else break
  }
  const isFinaleFrame = fi >= F - 1

  let t = 0
  let moveT = 0
  let finaleT = 0
  if (isFinaleFrame) {
    finaleT = clamp((y - OFFSETS[F - 1]) / FINALE_EXTRA, 0, 1)
  } else {
    t = clamp((y - OFFSETS[fi]) / segLen(fi), 0, 1)
    moveT = easeInOut(t)
  }

  const src = FRAMES[fi]
  const dst = FRAMES[Math.min(fi + 1, F - 1)]
  const dotT = moveT
  const arriving = dotT >= ARRIVE

  // Card body (keyed by stop): for a cross-stop hop it fades out as the dot
  // departs and pops back in just before the dot lands at the next stop. For a
  // hop within one stop (multi-waypoint), the body just stays up.
  let bodyStopIndex
  let bodyOpacity
  if (heroT < 1 || isFinaleFrame) {
    bodyStopIndex = src.stopIndex
    bodyOpacity = 0
  } else if (src.stopIndex === dst.stopIndex) {
    bodyStopIndex = src.stopIndex
    bodyOpacity = 1
  } else if (arriving) {
    bodyStopIndex = dst.stopIndex
    bodyOpacity = smoothstep(ARRIVE, 0.9, dotT)
  } else {
    bodyStopIndex = src.stopIndex
    bodyOpacity = 1 - smoothstep(0.16, 0.46, dotT)
  }
  if (STOPS[bodyStopIndex] && STOPS[bodyStopIndex].status === 'finale') bodyOpacity = 0

  // Waypoint label (keyed by waypoint): switches to the destination as the dot
  // lands, so the city name pops just before arrival. labelKey changing drives
  // the pop animation on the page.
  const labelFrameIdx = arriving ? Math.min(fi + 1, F - 1) : fi
  // Per-waypoint city labels are OFF: multi-city stops now show all their cities at
  // once (the card's `location` line), and the globe zips through the waypoints fast,
  // so a city-by-city pop would just re-introduce the stuck-on-each-spot feeling.
  const showLabel = false

  // stopProgress drives the desktop "slot-machine" reel: it holds on a stop
  // through its waypoints and scrolls to the neighbour only on a cross-stop
  // hop (in transit with the dot), so the reel scrolls one card at a time.
  let stopProgress
  if (heroT < 1) stopProgress = 0
  else if (isFinaleFrame) stopProgress = STOPS.length - 1
  else if (src.stopIndex === dst.stopIndex) stopProgress = src.stopIndex
  else stopProgress = src.stopIndex + smoothstep(0.18, 0.82, dotT)

  return {
    heroT,
    fi,
    moveT,
    finaleT,
    isFinaleFrame,
    stopProgress,
    bodyStopIndex,
    bodyOpacity,
    showLabel,
    label: FRAMES[labelFrameIdx].label,
    labelKey: labelFrameIdx,
  }
}

// seamless: arrived via the home orb→globe morph. The body-level orb overlay is
// already showing the finished globe, so this page's globe must paint opaque from
// the first frame (no 1.2s black-in) and relay onReady up so the overlay dissolves.
export default function ComingSoon({ onNavigate, seamless = false, onGlobeReady, fromBiography = false }) {
  // Fallback gate: reduced motion, no WebGL, or the renderer failing to boot
  // (some environments pass the context probe but refuse a real context).
  const [useFallback, setUseFallback] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || !hasWebGL2()
  )
  // The static fallback has no globe to boot — signal ready at once so the mobile
  // black-bridge curtain (faded in by the home morph) lifts promptly instead of
  // waiting on a globe onReady that will never come.
  useEffect(() => {
    if (useFallback && onGlobeReady) onGlobeReady()
  }, [useFallback, onGlobeReady])
  return useFallback ? (
    <StaticTimeline onNavigate={onNavigate} />
  ) : (
    <GlobeTour
      onNavigate={onNavigate}
      seamless={seamless}
      onGlobeReady={onGlobeReady}
      fromBiography={fromBiography}
      onSceneFail={() => setUseFallback(true)}
    />
  )
}

// ---------- scroll-driven globe tour ----------

function GlobeTour({ onNavigate, seamless, onGlobeReady, onSceneFail, fromBiography }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [card, setCard] = useState({ stopIndex: 0, opacity: 0, prog: 0, showLabel: false, label: '', labelKey: 0 })
  const [finaleT, setFinaleT] = useState(0)
  const [heroDone, setHeroDone] = useState(false)
  const [isMobile] = useState(() => window.innerWidth < 700)
  const [playing, setPlaying] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [docked, setDocked] = useState(false) // "Back to Biography" docks to the top once scrolled past the nav
  const draggingRef = useRef(false)

  // Drag the rail sailboat → scrub the tour. Map the pointer's Y within the rail to a
  // fractional stop, then scroll to the interpolated stop offset; the boat (driven by
  // card.prog) follows. The last stop maps to the finale (climax) like its dot does.
  const dragBoatTo = (clientY) => {
    const N = STOPS.length
    const railTop = window.innerHeight / 2 - (N * RAIL_PITCH) / 2
    const prog = Math.max(0, Math.min(N - 1, (clientY - railTop) / RAIL_PITCH - 0.5))
    const lo = Math.floor(prog)
    const hi = Math.min(lo + 1, N - 1)
    const stopVh = (i) => (i >= N - 1 ? TOTAL_VH / 100 : OFFSETS[STOP_FRAME[i]])
    const vh = stopVh(lo) + (stopVh(hi) - stopVh(lo)) * (prog - lo)
    window.scrollTo(0, vh * window.innerHeight)
  }

  // Tour controls (additive — the page stays scroll-driven). A shared rAF tween of
  // window.scrollY powers "to the start / play / to the end"; any real user input
  // (wheel / touch / scroll-keys) cancels it, so manual scrolling always wins. The
  // scene + computeScroll read window.scrollY, so this needs no globe API.
  const tourRef = useRef(null)
  if (tourRef.current === null) {
    const S = { raf: 0, onUser: null, onKey: null, playing: false }
    const easeIO = (t) => t * t * (3 - 2 * t)
    const climaxY = () => (TOTAL_VH / 100) * window.innerHeight // top of the end block = LA 2028 centered
    const detach = () => {
      if (S.onUser) {
        window.removeEventListener('wheel', S.onUser)
        window.removeEventListener('touchstart', S.onUser)
        S.onUser = null
      }
      if (S.onKey) { window.removeEventListener('keydown', S.onKey); S.onKey = null }
    }
    const halt = () => {
      if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0 }
      detach()
      if (S.playing) { S.playing = false; setPlaying(false) }
    }
    const tween = (targetY, ms, onDone) => {
      halt()
      const startY = window.scrollY
      const dist = targetY - startY
      if (Math.abs(dist) < 2 || ms <= 0) { window.scrollTo(0, targetY); if (onDone) onDone(); return }
      S.onUser = () => halt()
      S.onKey = (e) => { if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) halt() }
      window.addEventListener('wheel', S.onUser, { passive: true })
      window.addEventListener('touchstart', S.onUser, { passive: true })
      window.addEventListener('keydown', S.onKey)
      const t0 = performance.now()
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms)
        window.scrollTo(0, startY + dist * easeIO(p))
        if (p < 1) S.raf = requestAnimationFrame(step)
        else { S.raf = 0; detach(); if (onDone) onDone() }
      }
      S.raf = requestAnimationFrame(step)
    }
    tourRef.current = {
      toStart: () => tween(0, 850),
      toEnd: () => tween(climaxY(), 1100),
      toY: (y, ms = 900) => tween(y, ms), // fly to an arbitrary scroll offset (clickable rail)
      stop: () => halt(), // cancel any in-flight tween (e.g. when the user grabs the boat)
      toggle: () => {
        if (S.playing) { halt(); return }
        const target = climaxY()
        const remaining = target - window.scrollY
        if (remaining < 8) { tween(0, 850); return } // at the climax → rewind to the start
        S.playing = true
        setPlaying(true)
        tween(target, PLAY_MS_PER_FRAME * F * (remaining / target), () => { S.playing = false; setPlaying(false) })
      },
      dispose: () => { if (S.raf) cancelAnimationFrame(S.raf); detach() },
    }
  }

  useEffect(() => {
    let scene
    try {
      scene = createGlobeScene(canvasRef.current, FRAMES, {
        isMobile: window.innerWidth < 700,
        baseUrl: import.meta.env.BASE_URL,
        onReady: () => { setReady(true); if (onGlobeReady) onGlobeReady() },
        getProgress: computeScroll,
        seamless, // fade the pins in after the orb→globe handoff
      })
    } catch (err) {
      console.warn('Globe scene failed to initialize, using static timeline', err)
      onSceneFail()
      return undefined
    }
    const onResize = () => scene.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      scene.dispose()
      if (tourRef.current) tourRef.current.dispose()
    }
  }, [])

  // Seamless arrival: lock scrolling through the staged reveal (globe → pins →
  // text) so the tour can't be scrubbed mid-animation, then release it.
  useEffect(() => {
    if (!seamless) return undefined
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    const t = setTimeout(() => { html.style.overflow = prev }, 1900)
    return () => { clearTimeout(t); html.style.overflow = prev }
  }, [seamless])

  // Coarse React state; the heavy per-frame work runs in the scene's rAF loop.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const p = computeScroll()
        setCard((prev) =>
          prev.stopIndex === p.bodyStopIndex &&
          prev.opacity === p.bodyOpacity &&
          prev.prog === p.stopProgress &&
          prev.showLabel === p.showLabel &&
          prev.label === p.label &&
          prev.labelKey === p.labelKey
            ? prev
            : {
                stopIndex: p.bodyStopIndex,
                opacity: p.bodyOpacity,
                prog: p.stopProgress,
                showLabel: p.showLabel,
                label: p.label,
                labelKey: p.labelKey,
              }
        )
        setHeroDone(p.heroT > 0.6)
        setFinaleT(p.finaleT)
        setDocked(window.scrollY > 48)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // Mobile shows a single card keyed off the popping bodyStopIndex/opacity.
  const mStop = STOPS[Math.min(card.stopIndex, STOPS.length - 1)]

  // Desktop reel: a window of stop entries around the current progress.
  const currentStop = isMobile ? card.stopIndex : Math.round(card.prog)
  const labelInfo = { show: card.showLabel, text: card.label, key: card.labelKey }
  const reelLo = Math.max(0, Math.round(card.prog) - 2)
  const reelHi = Math.min(STOPS.length - 1, Math.round(card.prog) + 2)
  const reelIndices = []
  for (let k = reelLo; k <= reelHi; k++) reelIndices.push(k)
  const reelVisible = heroDone && finaleT < 0.05

  return (
    <div style={{ background: 'rgb(0,0,0)' }}>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          // seamless handoff: paint opaque immediately (the orb overlay is showing
          // the identical globe over us and will dissolve once we're ready).
          opacity: seamless ? 1 : ready ? 1 : 0,
          transition: seamless ? 'none' : 'opacity 1.2s ease',
        }}
      />

      {/* scroll runway — all visible content is fixed-position above it */}
      <div style={{ height: `${TOTAL_VH}vh` }} />

      <Hero visible={!heroDone} seamless={seamless} />

      {/* "Back to Biography" — only when arriving from the Biography page. Sits below
          the nav at the top, docks up with a little padding once scrolled, and fades
          out at the finale so the sticky LA 2028 header takes the top spot. */}
      {fromBiography && <BackButton onNavigate={onNavigate} docked={docked} finaleT={finaleT} />}

      {/* progress rail (desktop) — one clickable dot per stop; click flies the globe
          there (last dot = jump to the LA 2028 end). Hover reveals the stop label. */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            left: 18,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 52,
            height: STOPS.length * RAIL_PITCH,
            zIndex: 4,
            opacity: heroDone && finaleT === 0 ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: heroDone && finaleT === 0 ? 'auto' : 'none',
          }}
        >
          {STOPS.map((s, i) => (
            <RailDot
              key={s.id}
              top={i * RAIL_PITCH + RAIL_PITCH / 2}
              name={s.region}
              dates={s.dates}
              active={i === currentStop}
              done={i < currentStop}
              onClick={() => {
                const y =
                  i >= STOPS.length - 1
                    ? (TOTAL_VH / 100) * window.innerHeight
                    : OFFSETS[STOP_FRAME[i]] * window.innerHeight
                if (tourRef.current) tourRef.current.toY(y)
              }}
            />
          ))}
          {/* sailboat rides the rail — holds at each stop's dot, sails between them.
              Grab + drag it up/down to scrub the whole tour. */}
          <div
            role="slider"
            aria-label="Drag to move through the stops"
            onPointerDown={(e) => {
              e.preventDefault()
              try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
              draggingRef.current = true
              setDragging(true)
              if (tourRef.current) tourRef.current.stop()
              dragBoatTo(e.clientY)
            }}
            onPointerMove={(e) => { if (draggingRef.current) dragBoatTo(e.clientY) }}
            onPointerUp={(e) => {
              draggingRef.current = false
              setDragging(false)
              try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
            }}
            onPointerCancel={() => { draggingRef.current = false; setDragging(false) }}
            style={{
              position: 'absolute',
              left: RAIL_BOAT_X,
              top: (Math.max(0, Math.min(card.prog, STOPS.length - 1)) + 0.5) * RAIL_PITCH,
              transform: `translate(-50%, -50%) scale(${dragging ? 1.18 : 1})`,
              transition: dragging ? 'none' : 'top 0.1s linear, transform 0.15s ease',
              cursor: dragging ? 'grabbing' : 'grab',
              touchAction: 'none',
              zIndex: 5,
            }}
          >
            <SailboatIcon variant="glow" size={22} />
          </div>
        </div>
      )}

      {/* desktop: slot-machine reel — current stop centered, prev/next faded
          above/below, scrolling with the dot on each cross-stop hop */}
      {!isMobile && (
        <div
          data-testid="reel"
          style={{
            position: 'fixed',
            right: '7vw',
            top: '50%',
            width: 340,
            height: 0,
            zIndex: 1,
            opacity: reelVisible ? 1 : 0,
            transition: 'opacity 0.45s ease',
            pointerEvents: 'none',
          }}
        >
          {reelIndices.map((k) => (
            <ReelEntry key={k} stopIndex={k} diff={k - card.prog} spacing={REEL_SPACING} labelInfo={labelInfo} />
          ))}
        </div>
      )}

      {/* desktop: tour controls sit at the bottom-right, below the reel (the stop
          "slider"), left-aligned to the reel column */}
      {!isMobile && (
        <div style={{
          position: 'fixed', right: '7vw', bottom: 40, width: 340, zIndex: 4,
          opacity: reelVisible ? 1 : 0, transition: 'opacity 0.45s ease',
          pointerEvents: reelVisible ? 'auto' : 'none',
        }}>
          <TourControls tour={tourRef.current} playing={playing} />
        </div>
      )}

      {/* mobile: the single stop card, with the tour controls directly BELOW it */}
      {isMobile && (
        <div style={{
          position: 'fixed', left: 20, right: 20, bottom: 24, zIndex: 3,
        }}>
          <div data-testid="stop-card" style={{ opacity: card.opacity, pointerEvents: 'none' }}>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '1.6px', margin: '0 0 14px' }}>
              {ordinal(card.stopIndex + 1)} of {STOPS.length} Stops
            </p>
            {/* PRIMARY: where + why */}
            <h2 style={{ color: '#fff', fontSize: 25, fontWeight: 800, letterSpacing: '-0.6px', lineHeight: 1.05, margin: '0 0 6px' }}>
              {mStop.region}
            </h2>
            <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, lineHeight: 1.3, margin: '0 0 18px' }}>{mStop.event}</p>
            {/* SECONDARY: when + exactly where */}
            <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>{mStop.dates}</p>
            <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 400, lineHeight: 1.45, margin: 0 }}>{mStop.venues}</p>
          </div>
          {/* controls sit just below the displayed stop */}
          <div style={{
            marginTop: 16, display: 'flex', justifyContent: 'center',
            opacity: reelVisible ? 1 : 0, transition: 'opacity 0.45s ease',
            pointerEvents: reelVisible ? 'auto' : 'none',
          }}>
            <TourControls tour={tourRef.current} playing={playing} />
          </div>
        </div>
      )}

      {/* end block scrolls up over the fixed globe. The LA 2028 climax sits over the
          zoomed globe (transparent), so the CTA + footer flow BELOW it, never over it. */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <EndBlock onNavigate={onNavigate} isMobile={isMobile} />
      </div>
    </div>
  )
}

// One card in the desktop reel. Positioned by its distance from the current
// progress; the center is full and bright, neighbours fade and the blurb/label
// only show near the center.
function ReelEntry({ stopIndex, diff, spacing, labelInfo }) {
  const stop = STOPS[stopIndex]
  const absDiff = Math.abs(diff)
  const entryOpacity = absDiff <= 1 ? 1 - 0.82 * absDiff : Math.max(0, 0.18 - 0.36 * (absDiff - 1))
  const isCenter = absDiff < 0.5
  return (
    <div
      data-testid={isCenter ? 'stop-card' : undefined}
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        transform: `translateY(calc(-50% + ${diff * spacing}px))`,
        opacity: entryOpacity,
        pointerEvents: 'none',
      }}
    >
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '1.6px', margin: '0 0 14px' }}>
        {ordinal(stopIndex + 1)} of {STOPS.length} Stops
      </p>
      {/* PRIMARY: where + why */}
      <h2 style={{ color: '#fff', fontSize: 27, fontWeight: 800, letterSpacing: '-0.7px', lineHeight: 1.05, margin: '0 0 6px' }}>
        {stop.region}
      </h2>
      <p style={{ color: '#fff', fontSize: 16, fontWeight: 600, lineHeight: 1.3, margin: '0 0 18px' }}>{stop.event}</p>
      {/* SECONDARY: when + exactly where */}
      <p style={{ color: '#fff', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>{stop.dates}</p>
      <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 13, fontWeight: 400, lineHeight: 1.45, margin: 0 }}>{stop.venues}</p>
    </div>
  )
}

// One clickable dot on the left progress rail — flies the globe to that stop and
// reveals the stop's name/dates on hover.
function RailDot({ top, name, dates, active, done, onClick }) {
  const [hover, setHover] = useState(false)
  const size = hover || active ? 15 : 10
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={name}
      style={{
        position: 'absolute', left: RAIL_DOT_X, top,
        transform: 'translate(-50%, -50%)',
        background: 'none', border: 'none', margin: 0,
        padding: 8, // bigger invisible hit area → easy to click
        cursor: 'pointer', display: 'flex', alignItems: 'center',
      }}
    >
      <span style={{
        display: 'block', width: size, height: size, borderRadius: '50%',
        background: active ? '#1E40FF' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.3)',
        boxShadow: hover ? '0 0 0 5px rgba(30,64,255,0.25)' : 'none',
        transition: 'width 0.2s ease, height 0.2s ease, background 0.3s ease, box-shadow 0.2s ease',
      }} />
      {hover && (
        <span style={{
          position: 'absolute', left: 30, whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.78)', color: '#fff',
          fontSize: 12, fontWeight: 500, letterSpacing: '0.2px',
          padding: '6px 10px', borderRadius: 5, pointerEvents: 'none',
          border: '1px solid rgba(255,255,255,0.14)',
        }}>
          {name} <span style={{ color: 'rgba(255,255,255,0.5)' }}>· {dates}</span>
        </span>
      )}
    </button>
  )
}

// "Back to Biography" pill — centered at the top (below the nav), docks up with a
// little padding once scrolled, fades out as the LA 2028 finale header takes over.
function BackButton({ onNavigate, docked, finaleT }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => onNavigate('Biography')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed', top: docked ? 20 : 74, left: '50%', transform: 'translateX(-50%)',
        zIndex: 6,
        opacity: 1 - Math.min(1, finaleT * 2),
        pointerEvents: finaleT > 0.4 ? 'none' : 'auto',
        transition: 'top 0.35s ease, opacity 0.35s ease, background 0.2s ease, border-color 0.2s ease',
        background: hover ? 'rgba(20,24,40,0.82)' : 'rgba(10,12,20,0.55)',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)'}`,
        borderRadius: 100, color: '#fff', padding: '9px 20px',
        fontSize: 13.5, fontWeight: 600, letterSpacing: '0.3px',
        fontFamily: 'inherit', cursor: 'pointer',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
      }}
    >
      ← Back to Biography
    </button>
  )
}

function Hero({ visible, seamless }) {
  // After a seamless morph, hold the hero text back so it fades in LAST — after
  // the overlay has dissolved to the globe and the pins have faded in.
  const entrance = usePageEntrance(2, { staggerMs: 150, initialDelayMs: seamless ? 1450 : 200 })
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
        pointerEvents: 'none',
        padding: '0 20px',
      }}
    >
      <h1 style={{ ...entrance.style(0), color: '#fff', fontSize: 'clamp(40px, 7vw, 88px)', fontWeight: 800, letterSpacing: '-3px', margin: 0 }}>
        The Road to LA 2028
      </h1>
      {/* scroll cue — right beneath the title, large + white so it's obvious */}
      <div style={{ ...entrance.style(1), marginTop: 30 }}>
        <div style={{
          color: '#fff', fontSize: 22, fontWeight: 500, letterSpacing: '0.5px',
          animation: 'scrollHint 1.6s ease-in-out infinite',
        }}>
          scroll ↓
        </div>
      </div>
    </div>
  )
}

// Positionless control row ("to the start • play • to the end"). Placement +
// visibility are handled by the wrapper — under the rail on desktop, under the
// stop card on mobile.
function TourControls({ tour, playing }) {
  const [hover, setHover] = useState(null)
  if (!tour) return null
  const btn = (id, label, onClick) => (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(id)}
      onMouseLeave={() => setHover(null)}
      style={{
        background: hover === id ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
        color: '#fff', cursor: 'pointer', padding: '9px 16px',
        fontSize: 15, fontWeight: 600, letterSpacing: '0.3px', fontFamily: 'inherit',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {btn('start', 'To Start', tour.toStart)}
      {btn('play', playing ? 'Pause' : 'Play', tour.toggle)}
      {btn('end', 'To End', tour.toEnd)}
    </div>
  )
}

// Fancy image-backed exit cards for the end of the tour — richer than the flat
// Biography "explore" cards: a sailing photo per destination, dark scrim, and a
// lift + zoom + royal-blue glow on hover.
const EXIT_LINKS = [
  { label: 'Home', page: 'Home', img: cardHome, desc: 'Back to the start' },
  { label: 'Biography', page: 'Biography', img: cardBio, desc: 'The story so far' },
  { label: 'Path & Team', page: 'Path', img: cardPath, desc: 'The journey & crew' },
  { label: 'Support', page: 'Support', img: cardSupport, desc: 'Fuel the campaign' },
]

function EndBlock({ onNavigate, isMobile }) {
  const { days, hrs, mins, secs } = useCountdown(new Date('2028-07-14T00:00:00'))
  return (
    <>
      {/* END SECTION — the LA 2028 chrome rises, then FREEZES as a clean header
          pinned to the TOP of the page. Its solid-black band occludes anything that
          scrolls up beneath it, so the exit nav + support never overlap the headline.
          The sticky scope spans the whole block; LA 2028 releases into the footer. */}
      <div style={{ position: 'relative' }}>
        {/* brief lead-in so LA 2028 reads over the zoomed globe before it docks up top */}
        <div style={{ height: '46vh' }} />

        <div style={{
          position: 'sticky', top: 0, zIndex: 3,
          background: 'rgb(0,0,0)',
          boxShadow: '0 12px 34px rgba(0,0,0,0.6)',
          textAlign: 'center', padding: '54px 20px 32px',
        }}>
          <h1 className="chrome-text" style={{
            fontSize: 'clamp(48px, 9vw, 104px)', fontWeight: 800,
            letterSpacing: '-4px', margin: '0 0 10px',
          }}>
            LA 2028
          </h1>
          <p style={{ color: '#fff', fontSize: 18, fontWeight: 400, letterSpacing: '1px', margin: 0 }}>
            {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} : {String(secs).padStart(2, '0')}
          </p>
        </div>

        {/* exit nav scrolls up UNDER the frozen header, on solid black */}
        <div style={{
          position: 'relative', zIndex: 2, background: 'rgb(0,0,0)',
          padding: '72px 0 90px',
        }}>
          <ExitNav links={EXIT_LINKS} onNavigate={onNavigate} isMobile={isMobile} />
          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <BackToTop />
          </div>
        </div>
      </div>
      <Footer variant="dark" onNavigate={onNavigate} />
    </>
  )
}

// "Back to the top" — smooth-scrolls to the top of the tour. Styled like the tour
// controls (white, bordered) for consistency.
function BackToTop() {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.4)', borderRadius: 3,
        color: '#fff', cursor: 'pointer', padding: '10px 22px',
        fontSize: 14, fontWeight: 600, letterSpacing: '0.3px', fontFamily: 'inherit',
        transition: 'background 0.2s ease',
      }}
    >
      ↑ Back to the top
    </button>
  )
}

// ---------- fallback: static timeline (reduced motion / no WebGL) ----------

function StaticTimeline({ onNavigate }) {
  const entrance = usePageEntrance(4, { staggerMs: 120, initialDelayMs: 50 })
  const { days, hrs, mins, secs } = useCountdown(new Date('2028-07-14T00:00:00'))
  return (
    <div style={{ background: 'rgb(0,0,0)', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '110px 20px 30px' }}>
        <p style={{ ...entrance.style(0), fontStyle: 'italic', color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 12px' }}>
          coming soon
        </p>
        <h1 style={{ ...entrance.style(1), color: '#fff', fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-2px', margin: 0 }}>
          The Road to LA 2028
        </h1>
      </div>

      <div style={{ ...entrance.style(2), maxWidth: 720, margin: '0 auto', padding: '0 24px 50px' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
          {STOPS.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                gap: 16,
                padding: '18px 0',
                borderBottom: '1px solid rgba(255,255,255,0.12)',
              }}
            >
              <div>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 500, letterSpacing: '1px', margin: '0 0 5px' }}>
                  {ordinal(i + 1)} of {STOPS.length} Stops
                </p>
                <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 2px' }}>{s.region}</p>
                <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>{s.event}</p>
                <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 400, margin: 0 }}>{s.venues}</p>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: 400, flexShrink: 0 }}>{s.dates}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...entrance.style(3), textAlign: 'center', padding: '10px 20px 80px' }}>
        <h2 className="chrome-text" style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 800, letterSpacing: '-3px', margin: '0 0 8px' }}>
          LA 2028
        </h2>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 400, letterSpacing: '1px', margin: 0 }}>
          {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} : {String(secs).padStart(2, '0')}
        </p>
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
