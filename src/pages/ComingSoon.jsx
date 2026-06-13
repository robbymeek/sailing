import { useState, useEffect, useRef } from 'react'
import STOPS from '../data/campaignStops'
import createGlobeScene from '../lib/globeScene'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'

// Scroll choreography, in viewport-height units: a hero screen, then one
// STOP-length segment per campaign stop (dwell, then travel to the next),
// then extra runway for the LA 2028 finale zoom.
const HERO = 1.0
const STOP = 1.2
const FINALE_EXTRA = 1.0
const N = STOPS.length
const TOTAL_VH = (HERO + (N - 1) * STOP + FINALE_EXTRA + 1) * 100

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Single source of truth for scroll progress — the three.js loop calls this
// every frame, and the React scroll listener uses it for coarse card state.
function computeScroll() {
  const vh = window.innerHeight || 1
  const y = window.scrollY / vh
  const heroT = clamp(y / HERO, 0, 1)
  const tl = (y - HERO) / STOP
  const seg = Math.floor(clamp(tl, 0, N - 1.0001))
  const local = clamp(tl - seg, 0, 1)
  const travelT = smoothstep(0.55, 1.0, local) // dwell 0–0.55, travel 0.55–1
  const finaleT = clamp((tl - (N - 1)) / (FINALE_EXTRA / STOP), 0, 1)
  return { heroT, seg, local, travelT, finaleT }
}

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

export default function ComingSoon({ onNavigate }) {
  // Fallback gate: reduced motion, no WebGL, or the renderer failing to boot
  // (some environments pass the context probe but refuse a real context).
  const [useFallback, setUseFallback] = useState(
    () =>
      window.matchMedia('(prefers-reduced-motion: reduce)').matches || !hasWebGL()
  )
  return useFallback ? (
    <StaticTimeline onNavigate={onNavigate} />
  ) : (
    <GlobeTour onNavigate={onNavigate} onSceneFail={() => setUseFallback(true)} />
  )
}

// ---------- scroll-driven globe tour ----------

function GlobeTour({ onNavigate, onSceneFail }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [cardVisible, setCardVisible] = useState(false)
  const [finaleOn, setFinaleOn] = useState(false)
  const [heroDone, setHeroDone] = useState(false)
  const [isMobile] = useState(() => window.innerWidth < 700)

  useEffect(() => {
    let scene
    try {
      scene = createGlobeScene(canvasRef.current, STOPS, {
        isMobile: window.innerWidth < 700,
        baseUrl: import.meta.env.BASE_URL,
        onReady: () => setReady(true),
        getProgress: computeScroll,
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

  // Coarse state only — the heavy per-frame work happens in the scene's own
  // rAF loop; here CSS transitions do the actual fading.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const p = computeScroll()
        setActiveIndex(p.seg)
        setHeroDone(p.heroT > 0.5)
        setCardVisible(
          p.heroT >= 1 && p.local < 0.6 && p.seg < N - 1 && p.finaleT === 0
        )
        setFinaleOn(p.finaleT > 0.15)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  const stop = STOPS[Math.min(activeIndex, N - 1)]

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
          opacity: ready ? 1 : 0,
          transition: 'opacity 1.2s ease',
        }}
      />

      {/* scroll runway — all visible content is fixed-position above it */}
      <div style={{ height: `${TOTAL_VH}vh` }} />

      <Hero visible={!heroDone} />

      {/* progress rail (desktop) */}
      {!isMobile && (
        <div
          style={{
            position: 'fixed',
            left: 28,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            zIndex: 1,
            opacity: heroDone && !finaleOn ? 1 : 0,
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
                  i === activeIndex
                    ? '#1E40FF'
                    : i < activeIndex
                      ? 'rgba(255,255,255,0.5)'
                      : 'rgba(255,255,255,0.18)',
                transition: 'background 0.3s ease',
              }}
            />
          ))}
        </div>
      )}

      {/* stop card */}
      <div
        style={{
          position: 'fixed',
          ...(isMobile
            ? { left: 20, right: 20, bottom: 28 }
            : { right: '7vw', top: '50%', width: 340, transform: 'translateY(-50%)' }),
          zIndex: 1,
          opacity: cardVisible ? 1 : 0,
          transition: 'opacity 0.45s ease',
          pointerEvents: 'none',
        }}
      >
        <p
          style={{
            color: 'rgba(255,255,255,0.3)',
            fontSize: 13,
            letterSpacing: '2px',
            margin: '0 0 14px',
          }}
        >
          {String(activeIndex + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
        </p>
        <p
          style={{
            color: stop.status === 'confirmed' ? '#1E40FF' : 'rgba(255,255,255,0.35)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '1px',
            textTransform: 'uppercase',
            margin: '0 0 8px',
          }}
        >
          {stop.status === 'confirmed' ? 'Confirmed' : 'Projected'}
        </p>
        <h2
          style={{
            color: 'rgba(255,255,255,0.92)',
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: '-0.8px',
            margin: '0 0 6px',
          }}
        >
          {stop.name}
        </h2>
        <p
          style={{
            color: 'rgb(157,174,194)',
            fontSize: 14,
            fontWeight: 500,
            margin: '0 0 4px',
          }}
        >
          {stop.dates}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: '0 0 10px' }}>
          {stop.location}
        </p>
        <p
          style={{
            color: 'rgba(255,255,255,0.65)',
            fontSize: 13,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          {stop.blurb}
        </p>
      </div>

      {/* finale */}
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
          opacity: finaleOn ? 1 : 0,
          transition: 'opacity 0.8s ease',
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

function Hero({ visible }) {
  const entrance = usePageEntrance(3, { staggerMs: 150, initialDelayMs: 200 })
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
      <p
        style={{
          ...entrance.style(0),
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.45)',
          fontSize: 14,
          margin: '0 0 14px',
        }}
      >
        coming soon
      </p>
      <h1
        style={{
          ...entrance.style(1),
          color: '#fff',
          fontSize: 'clamp(40px, 7vw, 88px)',
          fontWeight: 800,
          letterSpacing: '-3px',
          margin: 0,
        }}
      >
        The Road to LA 2028
      </h1>
      <p
        style={{
          ...entrance.style(2),
          color: 'rgba(255,255,255,0.35)',
          fontSize: 13,
          margin: '18px 0 0',
        }}
      >
        Two years. Nine stops. One goal.
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
      <h1
        className="chrome-text"
        style={{
          fontSize: 'clamp(56px, 10vw, 120px)',
          fontWeight: 800,
          letterSpacing: '-4px',
          margin: '0 0 10px',
        }}
      >
        LA 2028
      </h1>
      <p
        style={{
          color: 'rgb(153,153,153)',
          fontSize: 18,
          fontWeight: 500,
          margin: '0 0 10px',
        }}
      >
        {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} :{' '}
        {String(secs).padStart(2, '0')}
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
        <h2
          style={{
            color: '#fff',
            fontSize: 'clamp(24px, 3.4vw, 38px)',
            fontWeight: 600,
            letterSpacing: '-0.8px',
            margin: '0 0 14px',
          }}
        >
          Two years. One goal.
        </h2>
        <p
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 14,
            lineHeight: 1.6,
            maxWidth: 520,
            margin: '0 auto 30px',
          }}
        >
          Every stop on this map takes funding, training, and a team behind it.
          Be part of the road to LA 2028.
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
        <p
          style={{
            ...entrance.style(0),
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.45)',
            fontSize: 14,
            margin: '0 0 12px',
          }}
        >
          coming soon
        </p>
        <h1
          style={{
            ...entrance.style(1),
            color: '#fff',
            fontSize: 'clamp(36px, 6vw, 64px)',
            fontWeight: 800,
            letterSpacing: '-2px',
            margin: 0,
          }}
        >
          The Road to LA 2028
        </h1>
      </div>

      <div
        style={{
          ...entrance.style(2),
          maxWidth: 720,
          margin: '0 auto',
          padding: '0 24px 50px',
        }}
      >
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {STOPS.map((s) => (
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
                <p
                  style={{
                    color: 'rgba(255,255,255,0.85)',
                    fontSize: 15,
                    fontWeight: 500,
                    margin: '0 0 3px',
                  }}
                >
                  {s.name}
                  {s.status === 'confirmed' && (
                    <span
                      style={{
                        color: '#1E40FF',
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '1px',
                        marginLeft: 10,
                        textTransform: 'uppercase',
                      }}
                    >
                      Confirmed
                    </span>
                  )}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: 0 }}>
                  {s.location}
                </p>
              </div>
              <span
                style={{
                  color: 'rgba(255,255,255,0.3)',
                  fontSize: 13,
                  flexShrink: 0,
                }}
              >
                {s.dates}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...entrance.style(3), textAlign: 'center', padding: '10px 20px 80px' }}>
        <h2
          className="chrome-text"
          style={{
            fontSize: 'clamp(40px, 7vw, 72px)',
            fontWeight: 800,
            letterSpacing: '-3px',
            margin: '0 0 8px',
          }}
        >
          LA 2028
        </h2>
        <p style={{ color: 'rgb(153,153,153)', fontSize: 16, fontWeight: 500, margin: 0 }}>
          {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} :{' '}
          {String(secs).padStart(2, '0')}
        </p>
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
