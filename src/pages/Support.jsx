import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import Footer from '../components/Footer'
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

const YEAR_PHOTOS = {
  '2017': 'IMG_5343.jpeg',
  '2018': 'IMG_0062.JPG',
  '2019': 'Screen Shot 2022-01-18 at 6.25.56 PM.jpg',
  '2020': 'IMG_3867.jpeg',
  '2021': 'IMG_4733.jpeg',
  '2022': 'IMG_8481.jpeg',
  '2023': 'IMG_5956.JPG',
  '2024': 'IMG_5957.JPG',
  '2025': 'P1233011 (1).JPG',
  '2026': 'IMG_6285.JPG',
}

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

// Snap pages — each shows two years. Photo is from the more notable year.
const SNAP_PAGES = [
  { indices: [0, 1], photo: 'IMG_5343.jpeg' },      // 2017 + 2018
  { indices: [2, 3], photo: 'Screen Shot 2022-01-18 at 6.25.56 PM.jpg' }, // 2019 + 2020
  { indices: [4, 5], photo: 'IMG_4733.jpeg' },       // 2021 + 2022
  { indices: [6, 7], photo: 'IMG_5956.JPG' },        // 2023 + 2024
  { indices: [8, 9], photo: 'IMG_6285.JPG' },        // 2025 + 2026
  { indices: [10, 11], photo: null },                 // 2027 + 2028 (dark)
]
const NUM_PAGES = SNAP_PAGES.length
const PAGE_VH = 100 // each page is 100vh of scroll
const TOTAL_VH = NUM_PAGES * PAGE_VH // outer container height

const LABEL = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '2px',
  textTransform: 'uppercase',
}

// ---------- Sailboat SVG ----------

function SailboatIcon({ variant = 'default', size = 22 }) {
  // variant: 'active' (blue), 'ghost' (faint white), 'glow' (red for 2026)
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

// ---------- First page overlay: hero + bio integrated into page 0 ----------

function FirstPageContent({ isMobile }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: isMobile ? '0 24px 0 48px' : '0 clamp(48px, 6vw, 100px)',
    }}>
      {/* Headline + bio — left side on desktop, full width on mobile */}
      <div style={{
        maxWidth: isMobile ? '100%' : 480,
        marginLeft: isMobile ? 0 : 'clamp(24px, 4vw, 80px)',
      }}>
        <div style={{ ...LABEL, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>
          Support the Campaign
        </div>
        <h1 style={{
          color: '#fff',
          fontSize: isMobile ? 'clamp(32px, 9vw, 56px)' : 'clamp(36px, 5vw, 72px)',
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

        {/* Compact stats row */}
        <div style={{
          display: 'flex',
          gap: isMobile ? 24 : 36,
          marginTop: 24,
          flexWrap: 'wrap',
        }}>
          {BIO_STATS.map(([n, l]) => (
            <div key={l}>
              <span style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 700, color: '#fff', letterSpacing: '-1px' }}>{n}</span>
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginLeft: 8 }}>{l}</span>
            </div>
          ))}
        </div>

        {/* Scroll hint */}
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

// ---------- Scroll-driven Timeline ----------

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

  // Desktop: position on one side of the spine
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

function TimelineSection({ isMobile, days }) {
  const outerRef = useRef(null)
  const [activePage, setActivePage] = useState(0)
  const [sailboatProgress, setSailboatProgress] = useState(0)
  const rafRef = useRef(null)
  const snapTimerRef = useRef(null)
  const isSnappingRef = useRef(false)

  useEffect(() => {
    function onScroll() {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const outer = outerRef.current
        if (!outer) return

        const rect = outer.getBoundingClientRect()
        const outerHeight = outer.offsetHeight
        const viewportH = window.innerHeight
        const scrolled = -rect.top
        const scrollRange = outerHeight - viewportH
        if (scrollRange <= 0) return
        const progress = Math.max(0, Math.min(1, scrolled / scrollRange))

        setSailboatProgress(progress)

        // Determine active page
        const pageIdx = Math.min(
          NUM_PAGES - 1,
          Math.floor(progress * NUM_PAGES)
        )
        setActivePage(pageIdx)

        // Snap on scroll stop (debounced)
        clearTimeout(snapTimerRef.current)
        if (!isSnappingRef.current) {
          snapTimerRef.current = setTimeout(() => {
            // Re-read position for snap target
            const r = outer.getBoundingClientRect()
            const s = -r.top
            const range = outerHeight - viewportH
            if (range <= 0) return
            const p = Math.max(0, Math.min(1, s / range))
            const nearestPage = Math.round(p * (NUM_PAGES - 1))
            const targetProgress = nearestPage / (NUM_PAGES - 1)
            const outerTop = window.scrollY + r.top
            const targetScroll = outerTop + targetProgress * range

            // Only snap if we're not already close
            if (Math.abs(window.scrollY - targetScroll) > 20) {
              isSnappingRef.current = true
              window.scrollTo({ top: targetScroll, behavior: 'smooth' })
              setTimeout(() => { isSnappingRef.current = false }, 600)
            }
          }, 120)
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener('scroll', onScroll)
      clearTimeout(snapTimerRef.current)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // Jump to a specific page when clicking a ghost sailboat
  const scrollToPage = (pageIdx) => {
    const outer = outerRef.current
    if (!outer) return
    const rect = outer.getBoundingClientRect()
    const outerHeight = outer.offsetHeight
    const viewportH = window.innerHeight
    const scrollRange = outerHeight - viewportH
    const targetProgress = pageIdx / (NUM_PAGES - 1)
    const outerTop = window.scrollY + rect.top
    const targetScroll = outerTop + targetProgress * scrollRange
    isSnappingRef.current = true
    window.scrollTo({ top: targetScroll, behavior: 'smooth' })
    setTimeout(() => { isSnappingRef.current = false }, 600)
  }

  const spineLeft = isMobile ? 24 : '50%'
  const activePageData = SNAP_PAGES[activePage]
  const hasYears2026 = activePageData.indices.some(i => TIMELINE_DATA[i]?.current)

  return (
    <div
      ref={outerRef}
      style={{
        position: 'relative',
        height: `${TOTAL_VH}vh`,
      }}
    >
      {/* Sticky viewport frame */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: 'rgb(12,14,18)',
      }}>
        {/* Background photos — one per page, crossfading */}
        {SNAP_PAGES.map((page, pi) => {
          if (!page.photo) return null
          return (
            <img
              key={pi}
              src={`${BASE}sailing-photos/${page.photo}`}
              alt=""
              loading={pi < 2 ? 'eager' : 'lazy'}
              decoding="async"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                filter: 'grayscale(0.2) contrast(1.1) brightness(0.65)',
                opacity: activePage === pi ? 1 : 0,
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
          top: '10%',
          bottom: '10%',
          width: 1,
          background: 'rgba(255,255,255,0.15)',
          transform: isMobile ? 'none' : 'translateX(-0.5px)',
          zIndex: 2,
        }} />

        {/* Ghost sailboat stops — one per page */}
        {SNAP_PAGES.map((_, pi) => {
          const stopTop = 10 + (pi / (NUM_PAGES - 1)) * 80
          const isActive = activePage === pi
          return (
            <div
              key={`ghost-${pi}`}
              onClick={() => scrollToPage(pi)}
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
              title={`${TIMELINE_DATA[SNAP_PAGES[pi].indices[0]].year}–${TIMELINE_DATA[SNAP_PAGES[pi].indices[1]].year}`}
            >
              <SailboatIcon variant="ghost" size={16} />
            </div>
          )
        })}

        {/* Active sailboat indicator */}
        <div
          className="sail-bob"
          style={{
            position: 'absolute',
            left: spineLeft,
            top: `${10 + (activePage / (NUM_PAGES - 1)) * 80}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 5,
            transition: 'top 0.5s ease',
            pointerEvents: 'none',
          }}
        >
          <SailboatIcon variant={hasYears2026 ? 'glow' : 'active'} />
        </div>

        {/* Page content — each page shows two years */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
          {SNAP_PAGES.map((page, pi) => {
            const isActive = activePage === pi
            const isLastPage = pi === NUM_PAGES - 1
            const firstYear = TIMELINE_DATA[page.indices[0]]
            const secondYear = TIMELINE_DATA[page.indices[1]]
            // Alternate: even pages → first year top-left, second bottom-right
            // Odd pages → first year top-right, second bottom-left
            const firstSide = pi % 2 === 0 ? 'left' : 'right'
            const secondSide = pi % 2 === 0 ? 'right' : 'left'

            return (
              <div key={pi} style={{
                position: 'absolute',
                inset: 0,
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                pointerEvents: isActive ? 'auto' : 'none',
              }}>
                {pi === 0 ? (
                  // First page: hero + bio + scroll hint
                  <FirstPageContent isMobile={isMobile} />
                ) : isLastPage ? (
                  // Last page: 2027 + 2028 CTA
                  <LastPageContent
                    year2027={firstYear}
                    days={days}
                    isMobile={isMobile}
                  />
                ) : (
                  <>
                    <YearBlock
                      item={firstYear}
                      side={firstSide}
                      verticalPos="33%"
                      isMobile={isMobile}
                      factBox={FACT_BOXES[firstYear.year]}
                    />
                    <YearBlock
                      item={secondYear}
                      side={secondSide}
                      verticalPos="70%"
                      isMobile={isMobile}
                      factBox={FACT_BOXES[secondYear.year]}
                    />
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function LastPageContent({ year2027, days, isMobile }) {
  const s2027 = getYearStyle(year2027)
  return (
    <>
      {/* 2027 — muted, upper portion */}
      <div style={{
        position: 'absolute',
        top: '22%',
        left: isMobile ? 48 : undefined,
        right: isMobile ? 20 : 'calc(50% + 40px)',
        textAlign: isMobile ? 'left' : 'right',
        transform: 'translateY(-50%)',
      }}>
        <div style={{ fontSize: isMobile ? 'clamp(28px, 7vw, 44px)' : 'clamp(40px, 5.5vw, 80px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-2px', color: s2027.color, marginBottom: 8 }}>
          {year2027.year}
        </div>
        <div style={{ fontSize: 'clamp(14px, 1.2vw, 18px)', fontWeight: 400, color: s2027.milestone, lineHeight: 1.5 }}>
          {year2027.main}
        </div>
      </div>

      {/* 2028 — centered CTA */}
      <div style={{
        position: 'absolute',
        top: '60%',
        left: 0,
        right: 0,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: isMobile ? '0 24px' : 0,
      }}>
        <div style={{
          fontSize: isMobile ? 'clamp(56px, 14vw, 100px)' : 'clamp(72px, 13vw, 200px)',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-3px',
          color: '#fff',
          textAlign: 'center',
        }}>
          2028
        </div>
        <div style={{ ...LABEL, color: 'rgba(255,255,255,0.5)', marginTop: 20, textAlign: 'center' }}>
          LA Olympics
        </div>
        <div style={{ marginTop: 28, display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span style={{ fontSize: 'clamp(32px, 4.5vw, 64px)', fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>{days}</span>
          <span style={{ ...LABEL, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Days</span>
        </div>
        <CTABlock isMobile={isMobile} />
      </div>
    </>
  )
}

function CTABlock({ isMobile }) {
  const [ctaHover, setCtaHover] = useState(false)
  return (
    <>
      <div style={{ marginTop: 48, textAlign: 'center' }}>
        <a
          href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          style={{
            display: 'inline-block',
            fontSize: 'clamp(20px, 2.5vw, 36px)',
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
      <div style={{ marginTop: 24, textAlign: 'center' }}>
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
    </>
  )
}

// ---------- Cost Breakdown ----------

function CostBreakdown({ isMobile }) {
  return (
    <section style={{
      background: 'rgba(255,255,255,0.03)',
      padding: 'clamp(60px, 10vh, 120px) clamp(24px, 5vw, 80px)',
    }}>
      <div style={{
        ...LABEL,
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        marginBottom: 'clamp(40px, 6vh, 64px)',
      }}>
        Where Your Support Goes
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? 'clamp(16px, 4vw, 32px)' : 'clamp(32px, 4vw, 64px)',
        flexWrap: 'wrap',
        maxWidth: 1000,
        margin: '0 auto',
      }}>
        {COSTS.map((item) => (
          <div key={item.label} style={{
            textAlign: 'center',
            minWidth: isMobile ? 'calc(45% - 16px)' : 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
              <span style={{
                fontSize: isMobile ? 'clamp(40px, 10vw, 72px)' : 'clamp(48px, 7vw, 100px)',
                fontWeight: 700,
                lineHeight: 0.9,
                letterSpacing: '-2px',
                color: '#fff',
              }}>{item.pct}</span>
              <span style={{
                fontSize: 'clamp(14px, 1.5vw, 22px)',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.3)',
                marginLeft: 4,
                marginTop: '0.08em',
              }}>%</span>
            </div>
            <div style={{
              ...LABEL,
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              marginTop: 8,
            }}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Close ----------

function CloseSection() {
  return (
    <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto', padding: 'clamp(40px, 6vh, 80px) 20px' }}>
      <div style={{
        fontSize: 'clamp(20px, 2.4vw, 32px)',
        fontWeight: 400,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.45,
        marginBottom: 16,
      }}>
        &ldquo;Whether it&rsquo;s financial support, advice, a connection, or simply following along &mdash; it all matters.&rdquo;
      </div>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.4)', marginBottom: 'clamp(32px, 4vh, 56px)' }}>
        &mdash; Robby
      </div>
      <div style={{
        fontSize: 'clamp(18px, 2.2vw, 28px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.4,
      }}>
        Thank you for being part of this.
      </div>
    </div>
  )
}

// ---------- Page ----------

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

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(12,14,18)' }}>
      <TimelineSection isMobile={isMobile} days={days} />
      <CostBreakdown isMobile={isMobile} />
      <CloseSection />
      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
