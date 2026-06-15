import { useState, useEffect, useRef } from 'react'
import STOPS from '../data/campaignStops'
import createGlobeScene from '../lib/globeScene'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'

// Scroll choreography in viewport-height units. A "stop" is a card; a stop can
// span several waypoints (e.g. Australia hopping Adelaide → Perth → Sydney),
// each of which is a "frame" the globe rotates to. The first frame of a stop
// gets a full segment (the card reads); extra waypoints are quick hops.
const HERO = 1.0
const FIRST_LEN = 0.95 // segment for the first waypoint of a stop
const HOP_LEN = 0.55 // segment for each extra waypoint within a stop
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
        : [{ lat: stop.lat, lng: stop.lng, label: stop.location }]
    pts.forEach((pt, pi) => {
      frames.push({
        lat: pt.lat,
        lng: pt.lng,
        label: pt.label || stop.location,
        stopIndex: si,
        isFirstOfStop: pi === 0,
        isLastOfStop: pi === pts.length - 1,
        isFinale: stop.status === 'finale',
        multi: pts.length > 1,
      })
    })
  })
  return frames
}

const FRAMES = buildFrames(STOPS)
const F = FRAMES.length

function segLen(i) {
  if (i === F - 1) return FINALE_EXTRA
  return FRAMES[i].isFirstOfStop ? FIRST_LEN : HOP_LEN
}

// Cumulative vh offset where each frame's segment begins.
const OFFSETS = (() => {
  const o = new Array(F)
  o[0] = HERO
  for (let i = 1; i < F; i++) o[i] = o[i - 1] + segLen(i - 1)
  return o
})()
const TOTAL_VH = (OFFSETS[F - 1] + FINALE_EXTRA + 0.8) * 100 // +0.8 screen of finale linger before the end block

const TAGS = { confirmed: 'Confirmed', training: 'Training', projected: 'Planned' }
const REEL_SPACING = 152 // px between reel cards (vertical slot-machine pitch)

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
  const labelStop = FRAMES[labelFrameIdx].stopIndex
  const showLabel = !!(STOPS[labelStop] && STOPS[labelStop].points && STOPS[labelStop].points.length > 1)

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

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

// seamless: arrived via the home orb→globe morph. The body-level orb overlay is
// already showing the finished globe, so this page's globe must paint opaque from
// the first frame (no 1.2s black-in) and relay onReady up so the overlay dissolves.
export default function ComingSoon({ onNavigate, seamless = false, onGlobeReady }) {
  // Fallback gate: reduced motion, no WebGL, or the renderer failing to boot
  // (some environments pass the context probe but refuse a real context).
  const [useFallback, setUseFallback] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || !hasWebGL()
  )
  return useFallback ? (
    <StaticTimeline onNavigate={onNavigate} />
  ) : (
    <GlobeTour
      onNavigate={onNavigate}
      seamless={seamless}
      onGlobeReady={onGlobeReady}
      onSceneFail={() => setUseFallback(true)}
    />
  )
}

// ---------- scroll-driven globe tour ----------

function GlobeTour({ onNavigate, seamless, onGlobeReady, onSceneFail }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [card, setCard] = useState({ stopIndex: 0, opacity: 0, prog: 0, showLabel: false, label: '', labelKey: 0 })
  const [finaleT, setFinaleT] = useState(0)
  const [heroDone, setHeroDone] = useState(false)
  const [isMobile] = useState(() => window.innerWidth < 700)

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
  const mConfirmed = mStop.status === 'confirmed'
  const mTag = TAGS[mStop.status] || 'Planned'

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

      {/* progress rail (desktop) — one dot per stop */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            left: 28,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 9,
            zIndex: 1,
            opacity: heroDone && finaleT === 0 ? 1 : 0,
            transition: 'opacity 0.5s ease',
            pointerEvents: 'none',
          }}
        >
          {STOPS.map((s, i) => (
            <div
              key={s.id}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background:
                  i === currentStop
                    ? '#1E40FF'
                    : i < currentStop
                      ? 'rgba(255,255,255,0.5)'
                      : 'rgba(255,255,255,0.18)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
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

      {/* mobile: single card (pops in on arrival, no reel) */}
      {isMobile && (
        <div
          data-testid="stop-card"
          style={{
            position: 'fixed',
            left: 20,
            right: 20,
            bottom: 28,
            zIndex: 1,
            opacity: card.opacity,
            pointerEvents: 'none',
          }}
        >
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, letterSpacing: '2px', margin: '0 0 14px' }}>
            {String(card.stopIndex + 1).padStart(2, '0')} / {String(STOPS.length).padStart(2, '0')}
          </p>
          <p style={{ color: mConfirmed ? '#1E40FF' : 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>
            {mTag}
          </p>
          <h2 style={{ color: 'rgba(255,255,255,0.92)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
            {mStop.name}
          </h2>
          <p style={{ color: 'rgb(157,174,194)', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>{mStop.dates}</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 10px' }}>{mStop.location}</p>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{mStop.blurb}</p>
          {card.showLabel && (
            <p key={card.labelKey} className="cs-pop" style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', margin: '16px 0 0' }}>
              ● {card.label}
            </p>
          )}
        </div>
      )}

      {/* finale */}
      <div
        data-testid="finale"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          opacity: smoothstep(0.1, 0.6, finaleT),
          pointerEvents: 'none',
        }}
      >
        <FinaleContent />
      </div>

      {/* end block scrolls up over the fixed layers */}
      <div style={{ position: 'relative', zIndex: 2, background: 'rgb(0,0,0)' }}>
        <EndBlock onNavigate={onNavigate} />
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
  const detail = clamp(1 - absDiff * 2, 0, 1) // blurb + waypoint label only near center
  const isCenter = absDiff < 0.5
  const confirmed = stop.status === 'confirmed'
  const tag = stop.status === 'finale' ? 'The Games' : TAGS[stop.status] || 'Planned'
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
      <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12, letterSpacing: '2px', margin: '0 0 10px' }}>
        {String(stopIndex + 1).padStart(2, '0')} / {String(STOPS.length).padStart(2, '0')}
      </p>
      <p style={{ color: confirmed ? '#1E40FF' : 'rgba(255,255,255,0.35)', fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 8px' }}>
        {tag}
      </p>
      <h2 style={{ color: 'rgba(255,255,255,0.92)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.8px', margin: '0 0 6px' }}>
        {stop.name}
      </h2>
      <p style={{ color: 'rgb(157,174,194)', fontSize: 14, fontWeight: 500, margin: '0 0 4px' }}>{stop.dates}</p>
      <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 10px' }}>{stop.location}</p>
      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 1.5, margin: 0, opacity: detail }}>
        {stop.blurb}
      </p>
      {isCenter && labelInfo.show && (
        <p
          key={labelInfo.key}
          className="cs-pop"
          style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', margin: '16px 0 0', opacity: detail }}
        >
          ● {labelInfo.text}
        </p>
      )}
    </div>
  )
}

function Hero({ visible, seamless }) {
  // After a seamless morph, hold the hero text back so it fades in LAST — after
  // the overlay has dissolved to the globe and the pins have faded in.
  const entrance = usePageEntrance(3, { staggerMs: 150, initialDelayMs: seamless ? 1450 : 200 })
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
      <p style={{ ...entrance.style(0), fontStyle: 'italic', color: 'rgba(255,255,255,0.45)', fontSize: 14, margin: '0 0 14px' }}>
        coming soon
      </p>
      <h1 style={{ ...entrance.style(1), color: '#fff', fontSize: 'clamp(40px, 7vw, 88px)', fontWeight: 800, letterSpacing: '-3px', margin: 0 }}>
        The Road to LA 2028
      </h1>
      <p style={{ ...entrance.style(2), color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '18px 0 0' }}>
        Two years. The whole world. One goal.
      </p>
      <div
        style={{
          position: 'absolute',
          bottom: 36,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,0.4)',
          fontSize: 12,
          animation: 'scrollHint 1.6s ease-in-out infinite',
        }}
      >
        scroll ↓
      </div>
    </div>
  )
}

function FinaleContent() {
  const { days, hrs, mins, secs } = useCountdown(new Date('2028-07-14T00:00:00'))
  return (
    <>
      <h1 className="chrome-text" style={{ fontSize: 'clamp(56px, 10vw, 120px)', fontWeight: 800, letterSpacing: '-4px', margin: '0 0 10px' }}>
        LA 2028
      </h1>
      <p style={{ color: 'rgb(153,153,153)', fontSize: 18, fontWeight: 500, margin: '0 0 10px' }}>
        {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} : {String(secs).padStart(2, '0')}
      </p>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, margin: 0 }}>
        Olympic sailing. Long Beach, California.
      </p>
    </>
  )
}

function EndBlock({ onNavigate }) {
  const [hover, setHover] = useState(false)
  return (
    <>
      <div style={{ textAlign: 'center', padding: '110px 20px 120px' }}>
        <h2 style={{ color: '#fff', fontSize: 'clamp(24px, 3.4vw, 38px)', fontWeight: 600, letterSpacing: '-0.8px', margin: '0 0 14px' }}>
          Two years. One goal.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.6, maxWidth: 520, margin: '0 auto 30px' }}>
          Every stop on this map takes funding, training, and a team behind it. Be part of the road to LA 2028.
        </p>
        <button
          onClick={() => onNavigate('Support')}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: hover ? '#1E40FF' : 'rgba(255,255,255,0.85)',
            fontSize: 17,
            fontWeight: 500,
            transition: 'color 0.25s ease',
          }}
        >
          SUPPORT THE CAMPAIGN →
        </button>
      </div>
      <Footer variant="dark" onNavigate={onNavigate} />
    </>
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
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {STOPS.map((s) => {
            const cities =
              s.points && s.points.length > 1
                ? s.points.map((p) => p.label).filter(Boolean).join(' · ')
                : s.location
            return (
              <div
                key={s.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 16,
                  padding: '18px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <div>
                  <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: 500, margin: '0 0 3px' }}>
                    {s.name}
                    {s.status === 'confirmed' && (
                      <span style={{ color: '#1E40FF', fontSize: 10, fontWeight: 600, letterSpacing: '1px', marginLeft: 10, textTransform: 'uppercase' }}>
                        Confirmed
                      </span>
                    )}
                  </p>
                  <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>{cities}</p>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, flexShrink: 0 }}>{s.dates}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ ...entrance.style(3), textAlign: 'center', padding: '10px 20px 80px' }}>
        <h2 className="chrome-text" style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 800, letterSpacing: '-3px', margin: '0 0 8px' }}>
          LA 2028
        </h2>
        <p style={{ color: 'rgb(153,153,153)', fontSize: 16, fontWeight: 500, margin: 0 }}>
          {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} : {String(secs).padStart(2, '0')}
        </p>
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
