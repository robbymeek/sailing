import { Component, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BoatExperience from '../components/BoatExperience'
import computeBoatScroll, { P, setViewport, totalVh, centerVh } from '../lib/boatScroll'
import { hasWebGL2 } from '../lib/webglSupport'
import useTextSpray from '../hooks/useTextSpray'

// /boat — "ONE SAIL": hidden scroll-driven 3D showcase of the sailboat
// sculpture. The page is a z-sandwich: DOM text BEHIND the transparent canvas
// (the boat's opaque pixels occlude it), the WebGL boat, DOM text in front,
// and one tall runway div that owns the scroll. Every visual is a closed form
// of scrollY (boatScroll.js); this file adds no animation state of its own —
// text "choreography" is just document-positioned type scrolling naturally.

// Copy beats. Each line is a FIXED element whose opacity/drift is a closed
// form of scroll: it fades in around `at - w`, dwells (drifting gently upward
// so it stays alive), and fades out by `at + w` — so lines are actually
// readable instead of whipping past at raw scroll speed. `y` = resting offset
// from screen centre in vh; layer 'back' renders behind the boat so the sail
// carves through the type. (Not a sticky banner: nothing pins during normal
// reading — this is The Road's chapter-card grammar.)
const COPY = [
  { at: 0.02, layer: 'front', kind: 'kicker', text: 'ROBBY MEEK — ILCA 7', y: -14, w: 0.03 },
  { at: 0.055, layer: 'back', kind: 'giant', text: 'ONE SAIL.', w: 0.042 },
  { at: 0.098, layer: 'front', kind: 'line', text: 'One sail.', align: 'left', y: -6 },
  { at: 0.128, layer: 'back', kind: 'line', text: 'One hull.' },
  { at: 0.158, layer: 'front', kind: 'line', text: 'One sailor.', align: 'right', y: 6 },
  { at: 0.186, layer: 'front', kind: 'small', text: 'No crew. No engine. Everything else stays on shore.', y: 15 },
  { at: 0.325, layer: 'front', kind: 'small', text: 'One design. The boat is identical for every sailor on Earth.', y: 24 },
  { at: 0.345, layer: 'front', kind: 'line', text: 'You don’t get to change the boat.', y: -12 },
  { at: 0.358, layer: 'front', kind: 'line', text: 'So you change.', y: -2 },
  { at: 0.502, layer: 'front', kind: 'chrome-small', text: 'Nine years in.', y: 26 },
  { at: 0.53, layer: 'back', kind: 'stat', text: '3× CONTINENTAL CHAMPION', y: -18, w: 0.034 },
  { at: 0.575, layer: 'front', kind: 'stat', text: '6× NATIONAL CHAMPION', y: 0, w: 0.034 },
  { at: 0.62, layer: 'back', kind: 'stat', text: '9+ YEARS IN THE CLASS', y: 18, w: 0.034 },
  { at: 0.652, layer: 'front', kind: 'small', text: 'Same hull. Same sail. Different sailor.', y: 26 },
  { at: 0.685, layer: 'front', kind: 'small', text: 'The next three years decide everything.', y: 12 },
  { at: 0.845, layer: 'front', kind: 'line', text: 'The Games come home to Los Angeles.', y: -12 },
  { at: 0.878, layer: 'front', kind: 'line', text: 'So does the boat.', y: -2 },
]
const BEAT_W = 0.024 // default half-window (t units)

const KIND_STYLE = {
  kicker: { fontSize: 'clamp(13px, 1.1vw, 16px)', letterSpacing: '0.34em', fontWeight: 600, color: 'rgba(220,230,255,0.85)' },
  giant: { fontSize: 'clamp(64px, 13vw, 230px)', fontWeight: 800, letterSpacing: '-0.01em', lineHeight: 0.95, color: '#f4f7ff' },
  line: { fontSize: 'clamp(30px, 4.4vw, 74px)', fontWeight: 700, color: '#eef2ff' },
  small: { fontSize: 'clamp(15px, 1.5vw, 20px)', fontWeight: 500, letterSpacing: '0.02em', color: 'rgba(205,216,240,0.9)' },
  stat: { fontSize: 'clamp(34px, 5.6vw, 100px)', fontWeight: 800, letterSpacing: '0.01em' },
  'chrome-small': { fontSize: 'clamp(22px, 2.6vw, 40px)', fontWeight: 700 },
}

function TextItem({ item, refFn }) {
  const chrome = item.kind === 'stat' || item.kind === 'chrome-small'
  return (
    <div
      ref={refFn}
      style={{
        position: 'fixed',
        top: '50%',
        left: 0,
        right: 0,
        opacity: 0,
        transform: 'translateY(-50%)',
        padding: '0 7vw',
        textAlign: item.align || 'center',
        pointerEvents: 'none',
      }}
    >
      <span className={chrome ? 'chrome-text' : undefined} style={KIND_STYLE[item.kind]}>
        {item.text}
      </span>
    </div>
  )
}

function Ctas({ isMobile }) {
  const navigate = useNavigate()
  const btn = {
    display: 'inline-block',
    border: '1px solid rgba(255,255,255,0.45)',
    padding: '15px 26px',
    letterSpacing: '0.12em',
    fontSize: 'clamp(12px, 1.1vw, 15px)',
    fontWeight: 600,
    color: '#f4f7ff',
    background: 'none',
    cursor: 'pointer',
  }
  return (
    <div
      style={{
        position: 'absolute',
        top: `${centerVh(0.955, isMobile)}vh`,
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        textAlign: 'center',
        pointerEvents: 'auto',
      }}
    >
      <div style={{ fontSize: 'clamp(17px, 1.9vw, 26px)', fontWeight: 600, color: '#dfe7fa', marginBottom: 34 }}>
        The campaign is real. The road is long.
      </div>
      <div style={{ display: 'flex', gap: 18, justifyContent: 'center', flexWrap: 'wrap', padding: '0 6vw' }}>
        <button type="button" style={btn} onClick={() => navigate('/the-road')}>
          FOLLOW THE ROAD →
        </button>
        <button type="button" style={btn} onClick={() => navigate('/support')}>
          PUT YOUR NAME ON THE HULL →
        </button>
      </div>
      <div style={{ marginTop: 46, fontSize: 12, letterSpacing: '0.3em', color: 'rgba(190,205,235,0.6)' }}>
        ROBBY MEEK — ILCA 7 — LA 2028
      </div>
    </div>
  )
}

// Non-WebGL / reduced-motion / Save-Data fallback: the words still work
function BoatStatic({ isMobile }) {
  const navigate = useNavigate()
  return (
    <div style={{ background: '#000', color: '#eef2ff', minHeight: '100vh', padding: '22vh 8vw 16vh' }}>
      {COPY.map((c) => {
        const chrome = c.kind === 'stat' || c.kind === 'chrome-small'
        return (
          <div key={c.at} style={{ margin: '9vh 0', textAlign: 'center' }}>
            <span className={chrome ? 'chrome-text' : undefined} style={KIND_STYLE[c.kind]}>
              {c.text}
            </span>
          </div>
        )
      })}
      <div style={{ margin: '12vh 0 6vh', textAlign: 'center' }}>
        <span className="chrome-text" style={{ fontSize: isMobile ? '13vw' : '9vw', fontWeight: 900 }}>LA 2028</span>
      </div>
      <div style={{ textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => navigate('/the-road')}
          style={{ border: '1px solid rgba(255,255,255,0.45)', padding: '15px 26px', color: '#f4f7ff', background: 'none', letterSpacing: '0.12em', cursor: 'pointer' }}
        >
          FOLLOW THE ROAD →
        </button>
      </div>
    </div>
  )
}

class BoatErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(err) {
    console.warn('Boat scene failed to initialize, using static page', err)
    if (this.props.onFail) this.props.onFail()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}

function BoatLive({ isMobile }) {
  const TVH = totalVh(isMobile)
  const [failed, setFailed] = useState(false)
  const [frameloop, setFrameloop] = useState('always')
  const headlineRef = useRef(null)
  const bgGlowRef = useRef(null)
  const beatRefs = useRef({}) // COPY index -> element

  // the LA 2028 headline dissolves via the site's sea-spray motif on exit
  useTextSpray(headlineRef, { palette: 'chrome', enabled: !failed })

  useEffect(() => {
    if (failed) return undefined
    setViewport(window.innerWidth, window.innerHeight, isMobile)
    let raf = 0
    const write = () => {
      raf = 0
      computeBoatScroll()
      if (headlineRef.current) headlineRef.current.style.opacity = String(P.headlineFade)
      if (bgGlowRef.current) bgGlowRef.current.style.opacity = String(P.bgLift * 0.9)
      // copy beats: opacity/drift = closed form of scroll (see COPY comment)
      for (let i = 0; i < COPY.length; i++) {
        const el = beatRefs.current[i]
        if (!el) continue
        const item = COPY[i]
        const w = item.w || BEAT_W
        const x = (P.t - (item.at - w)) / (2 * w) // 0..1 across the beat window
        if (x <= 0 || x >= 1) {
          el.style.opacity = '0'
          continue
        }
        el.style.opacity = String(Math.min(1, Math.min(x, 1 - x) * 4)) // 25% ramps
        const drift = (0.5 - x) * 7 // vh: +3.5 -> -3.5, alive but readable
        el.style.transform = `translateY(calc(-50% + ${(item.y || 0) + drift}vh))`
      }
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(write)
    }
    const onResize = () => {
      setViewport(window.innerWidth, window.innerHeight, isMobile)
      onScroll()
    }
    const onVis = () => setFrameloop(document.hidden ? 'never' : 'always')
    write()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [failed, isMobile])

  if (failed) return <BoatStatic isMobile={isMobile} />

  return (
    <div style={{ position: 'relative', background: '#000', color: '#fff' }}>
      {/* deep-blue radial lift for the chrome era (opacity scroll-driven) */}
      <div
        ref={bgGlowRef}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          opacity: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(ellipse 90% 70% at 50% 45%, #0a1430 0%, #050a18 55%, #000 100%)',
        }}
      />
      {/* text BEHIND the boat — its opaque pixels carve through these glyphs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        {COPY.map((c, i) =>
          c.layer === 'back' ? (
            <TextItem key={c.at} item={c} refFn={(el) => { beatRefs.current[i] = el }} />
          ) : null
        )}
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <BoatErrorBoundary onFail={() => setFailed(true)}>
          <BoatExperience isMobile={isMobile} frameloop={frameloop} />
        </BoatErrorBoundary>
      </div>
      {/* text in FRONT of the boat */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: `${TVH}vh`, zIndex: 2, pointerEvents: 'none' }}>
        {COPY.map((c, i) =>
          c.layer === 'front' ? (
            <TextItem key={c.at} item={c} refFn={(el) => { beatRefs.current[i] = el }} />
          ) : null
        )}
        {/* the transmutation target: particles land into this exact line; fontSize
            and weight are coupled to boatParticles' raster + pose.glyphSize */}
        <h1
          ref={headlineRef}
          className="chrome-text"
          style={{
            position: 'absolute',
            top: `${centerVh(0.8, isMobile)}vh`,
            left: 0,
            right: 0,
            transform: 'translateY(-50%)',
            textAlign: 'center',
            fontSize: '12vh',
            fontWeight: 900,
            letterSpacing: '0.01em',
            margin: 0,
            opacity: 0,
          }}
        >
          LA 2028
        </h1>
        <Ctas isMobile={isMobile} />
      </div>
      {/* the scroll runway — the page's only in-flow element */}
      <div style={{ height: `${TVH}vh` }} />
    </div>
  )
}

export default function Boat() {
  const [isMobile] = useState(() => window.innerWidth < 700)
  const [staticMode] = useState(
    () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      navigator.connection?.saveData ||
      !hasWebGL2()
  )
  return staticMode ? <BoatStatic isMobile={isMobile} /> : <BoatLive isMobile={isMobile} />
}
