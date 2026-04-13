import { useState, useEffect, useRef, useCallback } from 'react'
import useCountdown from '../hooks/useCountdown'

const BASE = import.meta.env.BASE_URL

// ---------- Data ----------

const TIMELINE_DATA = [
  { year: '2017', main: 'Started racing', sub: null, past: true },
  { year: '2018', main: 'First Youth Champs', sub: null, past: true },
  { year: '2019', main: '5th at HS Nationals', sub: ['Freshman year'], past: true },
  { year: '2020', main: 'Covid', sub: null, past: true },
  { year: '2021', main: 'HS National Champion', sub: ['Orange Bowl Champion', '9th at Youth Worlds', 'North American Champion'], past: true },
  { year: '2022', main: 'HS National Champion', sub: ['5th at Youth Worlds'], past: true },
  { year: '2023', main: 'Harvard Sailing', sub: ['North American Champion'], past: true },
  { year: '2024', main: 'CrossnoKaye', sub: ['Train and work'], past: true },
  { year: '2025', main: 'North American Champion', sub: ['Top American at Europeans'], past: true },
  { year: '2026', main: 'Olympic training', sub: null, current: true },
  { year: '2027', main: 'World Champs contender', sub: null },
  { year: '2028', main: 'LA Olympics', sub: null },
]

const FACT_BOXES = {
  '2017': { label: 'AGE 9', text: 'Started sailing on Long Island Sound. Fell in love with the speed, the strategy, and the solitude of singlehanded racing.' },
  '2019': { label: 'FRESHMAN', text: '5th at HS Nationals as a freshman — the youngest sailor in the top 10.' },
  '2021': { label: 'BREAKTHROUGH', text: 'Won the HS National Championship, the Orange Bowl, and placed 9th at Youth Worlds — all in the same year. Three continental titles would follow.' },
  '2023': { label: 'HARVARD', text: 'Joined Harvard Sailing as Team Captain while studying Applied Mathematics and Economics. Won North Americans again.' },
  '2025': { label: 'TOP AMERICAN', text: 'North American Champion for the third time. Top American finisher at the European Championships — a statement on the world stage.' },
  '2026': { label: 'NOW', text: 'Full-time Olympic training. Every day is focused on one goal: making the US team for LA 2028.' },
}

const COSTS = [
  { label: 'Training', pct: 50 },
  { label: 'Equipment', pct: 20 },
  { label: 'Travel', pct: 15 },
  { label: 'Coaching', pct: 10 },
  { label: 'Entry Fees', pct: 5 },
]

const BIO_STATS = [
  ['6x', 'National Champ'],
  ['3x', 'Continental Champ'],
  ['9+', 'Years in ILCA'],
]

// All slides — hero is slide 0, timeline slides 1-3, final slide 4
const SLIDES = [
  { type: 'hero', photo: 'IMG_5343.jpeg', label: 'Intro' },
  { type: 'quad', indices: [2, 3, 4, 5], photo: 'IMG_4733.jpeg', label: '2019–2022' },
  { type: 'pair', indices: [6, 7], photo: 'IMG_5956.JPG', label: '2023–2024' },
  { type: 'pair', indices: [8, 9], photo: 'IMG_6285.JPG', label: '2025–2026' },
  { type: 'final', indices: [10, 11], photo: null, label: '2027–2028' },
]
const NUM_SLIDES = SLIDES.length

const LABEL = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '2px',
  textTransform: 'uppercase',
}

// ---------- Sailboat SVG ----------

function SailboatIcon({ variant = 'default', size = 22 }) {
  const scale = size / 22
  let mast, sail, jib, hull, filterStyle
  if (variant === 'active') {
    mast = 'rgba(80,160,255,0.95)'
    sail = 'rgba(60,140,255,0.8)'
    jib = 'rgba(80,160,255,0.6)'
    hull = 'rgba(100,180,255,0.9)'
    filterStyle = 'drop-shadow(0 0 6px rgba(60,140,255,0.5))'
  } else if (variant === 'glow') {
    mast = 'rgba(255,255,255,0.95)'
    sail = 'rgba(255,255,255,0.8)'
    jib = 'rgba(255,255,255,0.6)'
    hull = 'rgba(255,255,255,0.9)'
    filterStyle = 'drop-shadow(0 0 8px rgba(220,40,40,0.5))'
  } else if (variant === 'ghost') {
    mast = 'rgba(255,255,255,0.18)'
    sail = 'rgba(255,255,255,0.1)'
    jib = 'rgba(255,255,255,0.07)'
    hull = 'rgba(255,255,255,0.15)'
    filterStyle = 'none'
  } else {
    mast = 'rgba(255,255,255,0.9)'
    sail = 'rgba(255,255,255,0.7)'
    jib = 'rgba(255,255,255,0.5)'
    hull = 'rgba(255,255,255,0.85)'
    filterStyle = 'none'
  }
  return (
    <svg width={size} height={Math.round(26 * scale)} viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: filterStyle, transition: 'filter 0.4s ease' }}
    >
      <line x1="11" y1="2" x2="11" y2="20" stroke={mast} strokeWidth="1.2" />
      <path d="M11 3 L11 18 L4 18 Z" fill={sail} />
      <path d="M11 3 L11 14 L16 14 Z" fill={jib} />
      <path d="M3 20 L19 20 L17 24 L5 24 Z" fill={hull} />
    </svg>
  )
}

// ---------- Year helpers ----------

function getYearStyle(item) {
  if (item.current) return { color: '#fff', shadow: '0 0 30px rgba(220,40,40,0.35)', milestone: 'rgba(255,255,255,0.9)', sub: 'rgba(255,255,255,0.7)' }
  if (item.past) return { color: 'rgba(255,255,255,0.7)', shadow: 'none', milestone: 'rgba(255,255,255,0.65)', sub: 'rgba(255,255,255,0.45)' }
  return { color: 'rgba(255,255,255,0.4)', shadow: 'none', milestone: 'rgba(255,255,255,0.4)', sub: 'rgba(255,255,255,0.3)' }
}

function YearBlock({ item, side, verticalPos, isMobile, factBox }) {
  const s = getYearStyle(item)
  const isCurrent = item.current

  if (isMobile) {
    return (
      <div style={{
        position: 'absolute',
        left: 48,
        right: 20,
        top: verticalPos,
        transform: 'translateY(-50%)',
      }}>
        <div style={{ fontSize: 'clamp(28px, 7vw, 44px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-1px', color: s.color, textShadow: s.shadow, marginBottom: 6 }}>
          {item.year}
        </div>
        <div style={{ fontSize: 'clamp(13px, 1.2vw, 16px)', fontWeight: 400, color: s.milestone, lineHeight: 1.5 }}>
          {item.main}
        </div>
        {item.sub && item.sub.map((t, i) => (
          <div key={i} style={{ fontSize: 12, fontStyle: 'italic', color: s.sub, lineHeight: 1.5, marginTop: 2 }}>{t}</div>
        ))}
        {factBox && (
          <div style={{
            marginTop: 12,
            maxWidth: 'calc(100vw - 80px)',
            padding: '12px 16px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8,
            borderLeft: isCurrent ? '2px solid rgba(220,40,40,0.5)' : '1px solid rgba(255,255,255,0.08)',
          }}>
            <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 4, fontWeight: 500 }}>{factBox.label}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{factBox.text}</div>
          </div>
        )}
      </div>
    )
  }

  const isLeft = side === 'left'
  const positioning = isLeft
    ? { right: 'calc(50% + 40px)', textAlign: 'right' }
    : { left: 'calc(50% + 40px)', textAlign: 'left' }

  return (
    <div style={{
      position: 'absolute',
      top: verticalPos,
      transform: 'translateY(-50%)',
      maxWidth: 360,
      ...positioning,
    }}>
      <div style={{ fontSize: 'clamp(40px, 5.5vw, 80px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-2px', color: s.color, textShadow: s.shadow, marginBottom: 8 }}>
        {item.year}
      </div>
      <div style={{ fontSize: 'clamp(14px, 1.2vw, 18px)', fontWeight: 400, color: s.milestone, lineHeight: 1.5 }}>
        {item.main}
      </div>
      {item.sub && item.sub.map((t, i) => (
        <div key={i} style={{ fontSize: 13, fontStyle: 'italic', color: s.sub, lineHeight: 1.5, marginTop: 3 }}>{t}</div>
      ))}
      {factBox && (
        <div style={{
          marginTop: 16,
          maxWidth: 280,
          padding: '16px 20px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 8,
          borderLeft: isCurrent ? '2px solid rgba(220,40,40,0.5)' : '1px solid rgba(255,255,255,0.08)',
          marginLeft: isLeft ? 'auto' : 0,
          marginRight: !isLeft ? 'auto' : 0,
        }}>
          <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 500 }}>{factBox.label}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>{factBox.text}</div>
        </div>
      )}
    </div>
  )
}

// ---------- Slide content types ----------

function HeroSlide({ isMobile }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: isMobile ? '60px 24px 0' : '0 clamp(48px, 6vw, 100px)',
    }}>
      <div style={{
        maxWidth: isMobile ? '100%' : 540,
        marginLeft: isMobile ? 0 : 'clamp(24px, 4vw, 80px)',
      }}>
        <div style={{ ...LABEL, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
          Support the Campaign
        </div>
        <h1 style={{
          color: '#fff',
          fontSize: isMobile ? 'clamp(36px, 10vw, 64px)' : 'clamp(40px, 5.5vw, 80px)',
          fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: '-2px',
          margin: 0,
        }}>
          JOIN THE TEAM.
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.7)',
          fontSize: 'clamp(14px, 1.3vw, 18px)',
          fontWeight: 400,
          lineHeight: 1.55,
          maxWidth: 420,
          marginTop: 16,
          marginBottom: 0,
        }}>
          Campaigning for the 2028 Olympic Games in the ILCA 7. Six national championships, three continental titles, Harvard Team Captain.
        </p>
        <div style={{ display: 'flex', gap: isMobile ? 24 : 36, marginTop: 24, flexWrap: 'wrap' }}>
          {BIO_STATS.map(([n, l]) => (
            <div key={l}>
              <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-1px' }}>{n}</span>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{l}</span>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 32,
          fontSize: 12,
          fontWeight: 400,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          Scroll to explore the journey
          <span style={{ display: 'inline-block', animation: 'scrollHint 2s ease-in-out infinite' }}>↓</span>
        </div>
      </div>
    </div>
  )
}

function PairSlide({ items, isMobile, slideIndex }) {
  const firstSide = slideIndex % 2 === 0 ? 'left' : 'right'
  const secondSide = slideIndex % 2 === 0 ? 'right' : 'left'
  return (
    <>
      <YearBlock item={items[0]} side={firstSide} verticalPos="33%" isMobile={isMobile} factBox={FACT_BOXES[items[0].year]} />
      <YearBlock item={items[1]} side={secondSide} verticalPos="70%" isMobile={isMobile} factBox={FACT_BOXES[items[1].year]} />
    </>
  )
}

function QuadSlide({ items, isMobile }) {
  const positions = isMobile
    ? [{ top: '15%' }, { top: '38%' }, { top: '61%' }, { top: '84%' }]
    : [
        { top: '22%', side: 'left' },
        { top: '38%', side: 'right' },
        { top: '62%', side: 'left' },
        { top: '78%', side: 'right' },
      ]
  return (
    <>
      {items.map((item, i) => (
        <YearBlock
          key={item.year}
          item={item}
          side={positions[i].side || 'left'}
          verticalPos={positions[i].top}
          isMobile={isMobile}
          factBox={FACT_BOXES[item.year]}
        />
      ))}
    </>
  )
}

function FinalSlide({ days, isMobile }) {
  const [ctaHover, setCtaHover] = useState(false)
  const s2027 = getYearStyle(TIMELINE_DATA[10])

  return (
    <>
      {/* 2027 — muted, upper left */}
      <div style={{
        position: 'absolute',
        top: '12%',
        left: isMobile ? 48 : undefined,
        right: isMobile ? 20 : 'calc(50% + 40px)',
        textAlign: isMobile ? 'left' : 'right',
        transform: 'translateY(-50%)',
      }}>
        <div style={{ fontSize: isMobile ? 'clamp(24px, 6vw, 36px)' : 'clamp(32px, 4vw, 56px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-2px', color: s2027.color, marginBottom: 6 }}>
          2027
        </div>
        <div style={{ fontSize: 'clamp(13px, 1.1vw, 16px)', fontWeight: 400, color: s2027.milestone, lineHeight: 1.5 }}>
          World Champs contender
        </div>
      </div>

      {/* 2028 CTA block — centered */}
      <div style={{
        position: 'absolute',
        top: '38%',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '0 24px' : 0,
      }}>
        <div style={{
          fontSize: isMobile ? 'clamp(48px, 12vw, 80px)' : 'clamp(60px, 10vw, 140px)',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-3px',
          color: '#fff',
          textAlign: 'center',
        }}>
          2028
        </div>
        <div style={{ ...LABEL, color: 'rgba(255,255,255,0.5)', marginTop: 14, textAlign: 'center' }}>
          LA Olympics
        </div>
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>{days}</span>
          <span style={{ ...LABEL, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Days</span>
        </div>
        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            style={{
              display: 'inline-block',
              fontSize: 'clamp(18px, 2.2vw, 30px)',
              fontWeight: 500,
              color: ctaHover ? '#fff' : 'rgba(255,255,255,0.92)',
              textDecoration: 'none',
              borderBottomStyle: 'solid',
              borderBottomWidth: ctaHover ? 3 : 2,
              borderBottomColor: 'rgb(220,40,40)',
              paddingBottom: 6,
              transition: 'color 0.2s ease, border-bottom-width 0.2s ease',
              letterSpacing: '-0.3px',
              pointerEvents: 'auto',
            }}
          >
            EMAIL ROBBY &rarr;
          </a>
        </div>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting"
            style={{
              fontSize: 13,
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.5)',
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              pointerEvents: 'auto',
            }}
          >
            or reach out about anything else
          </a>
        </div>
      </div>

      {/* Cost breakdown + closing — bottom section */}
      <div style={{
        position: 'absolute',
        bottom: isMobile ? '3%' : '5%',
        left: 0,
        right: 0,
        textAlign: 'center',
        padding: isMobile ? '0 20px' : '0 40px',
      }}>
        <div style={{ ...LABEL, color: 'rgba(255,255,255,0.25)', marginBottom: 16, fontSize: 10 }}>
          Where Your Support Goes
        </div>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: isMobile ? 16 : 'clamp(24px, 3vw, 48px)',
          flexWrap: 'wrap',
        }}>
          {COSTS.map((item) => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
                <span style={{
                  fontSize: isMobile ? 'clamp(20px, 5vw, 32px)' : 'clamp(24px, 3vw, 40px)',
                  fontWeight: 700,
                  lineHeight: 1,
                  letterSpacing: '-1px',
                  color: 'rgba(255,255,255,0.7)',
                }}>{item.pct}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: 'rgba(255,255,255,0.25)', marginLeft: 2 }}>%</span>
              </div>
              <div style={{ ...LABEL, fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{
          marginTop: 16,
          fontSize: 'clamp(13px, 1.2vw, 16px)',
          fontStyle: 'italic',
          color: 'rgba(255,255,255,0.4)',
          lineHeight: 1.4,
        }}>
          &ldquo;Whether it&rsquo;s financial support, advice, a connection, or simply following along &mdash; it all matters.&rdquo;
          <span style={{ display: 'block', marginTop: 4, fontStyle: 'normal', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>&mdash; Robby</span>
        </div>
      </div>
    </>
  )
}

// ---------- Main component ----------

export default function Support({ onNavigate }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 700
  )
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const { days } = useCountdown(new Date('2028-07-14T00:00:00'))
  const frameRef = useRef(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const activeRef = useRef(0)
  activeRef.current = activeSlide

  const goToSlide = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(NUM_SLIDES - 1, idx))
    if (clamped === activeRef.current) return
    setActiveSlide(clamped)
    activeRef.current = clamped
  }, [])

  // Wheel: any continuous scroll gesture moves exactly one slide.
  // We track whether we've already moved for this gesture. The gesture
  // "resets" after 300ms of no wheel events (user lifted fingers / stopped).
  const wheelMovedRef = useRef(false)
  const wheelResetTimer = useRef(null)

  useEffect(() => {
    function onWheel(e) {
      e.preventDefault()

      // Reset the "settled" timer on every wheel event
      clearTimeout(wheelResetTimer.current)
      wheelResetTimer.current = setTimeout(() => {
        wheelMovedRef.current = false
      }, 300)

      // If we already moved this gesture, eat the event
      if (wheelMovedRef.current) return

      wheelMovedRef.current = true
      if (e.deltaY > 0) goToSlide(activeRef.current + 1)
      else if (e.deltaY < 0) goToSlide(activeRef.current - 1)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      clearTimeout(wheelResetTimer.current)
    }
  }, [goToSlide])

  // Touch: swipe up/down
  useEffect(() => {
    let touchStartY = 0
    let touchMoved = false
    function onTouchStart(e) { touchStartY = e.touches[0].clientY; touchMoved = false }
    function onTouchEnd(e) {
      if (touchMoved) return
      const dy = touchStartY - e.changedTouches[0].clientY
      if (Math.abs(dy) < 40) return
      touchMoved = true
      if (dy > 0) goToSlide(activeRef.current + 1)
      else goToSlide(activeRef.current - 1)
    }
    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [goToSlide])

  // Keyboard: arrow keys
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); goToSlide(activeRef.current + 1) }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); goToSlide(activeRef.current - 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goToSlide])

  const spineLeft = isMobile ? 24 : '50%'
  const hasYears2026 = SLIDES[activeSlide].indices
    ? SLIDES[activeSlide].indices.some(i => TIMELINE_DATA[i]?.current)
    : false

  return (
    <div
      ref={frameRef}
      style={{
        position: 'relative',
        height: '100dvh',
        width: '100%',
        overflow: 'hidden',
        background: 'rgb(12,14,18)',
      }}
    >
      {/* Background photos — one per slide, crossfading */}
      {SLIDES.map((slide, si) => {
        if (!slide.photo) return null
        return (
          <img
            key={si}
            src={`${BASE}sailing-photos/${slide.photo}`}
            alt=""
            loading={si < 2 ? 'eager' : 'lazy'}
            decoding="async"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center',
              filter: 'grayscale(0.2) contrast(1.1) brightness(0.65)',
              opacity: activeSlide === si ? 1 : 0,
              transition: 'opacity 0.8s ease',
              willChange: 'opacity',
              zIndex: 0,
            }}
          />
        )
      })}

      {/* Dark overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1 }} />

      {/* Spine line */}
      <div style={{
        position: 'absolute',
        left: spineLeft,
        top: '15%',
        bottom: '10%',
        width: 1,
        background: 'rgba(255,255,255,0.15)',
        transform: isMobile ? 'none' : 'translateX(-0.5px)',
        zIndex: 2,
      }} />

      {/* Ghost sailboat stops */}
      {SLIDES.map((slide, si) => {
        const stopTop = 15 + (si / (NUM_SLIDES - 1)) * 75
        const isActive = activeSlide === si
        return (
          <div
            key={`ghost-${si}`}
            onClick={() => goToSlide(si)}
            style={{
              position: 'absolute',
              left: spineLeft,
              top: `${stopTop}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isActive ? 5 : 3,
              cursor: 'pointer',
              padding: 8,
              opacity: isActive ? 0 : 1,
              transition: 'opacity 0.4s ease',
              pointerEvents: isActive ? 'none' : 'auto',
            }}
            title={slide.label}
          >
            <SailboatIcon variant="ghost" size={16} />
          </div>
        )
      })}

      {/* Active sailboat */}
      <div
        className="sail-bob"
        style={{
          position: 'absolute',
          left: spineLeft,
          top: `${15 + (activeSlide / (NUM_SLIDES - 1)) * 75}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 5,
          transition: 'top 0.5s ease',
          pointerEvents: 'none',
        }}
      >
        <SailboatIcon variant={hasYears2026 ? 'glow' : 'active'} />
      </div>

      {/* Slide content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
        {SLIDES.map((slide, si) => {
          const isActive = activeSlide === si
          return (
            <div key={si} style={{
              position: 'absolute',
              inset: 0,
              opacity: isActive ? 1 : 0,
              transform: isActive ? 'translateY(0)' : 'translateY(8px)',
              transition: 'opacity 0.5s ease, transform 0.5s ease',
              pointerEvents: isActive ? 'auto' : 'none',
            }}>
              {slide.type === 'hero' ? (
                <HeroSlide isMobile={isMobile} />
              ) : slide.type === 'final' ? (
                <FinalSlide days={days} isMobile={isMobile} />
              ) : slide.type === 'quad' ? (
                <QuadSlide items={slide.indices.map(i => TIMELINE_DATA[i])} isMobile={isMobile} />
              ) : (
                <PairSlide
                  items={[TIMELINE_DATA[slide.indices[0]], TIMELINE_DATA[slide.indices[1]]]}
                  isMobile={isMobile}
                  slideIndex={si}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
