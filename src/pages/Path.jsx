import { useState, useEffect, useRef, useCallback } from 'react'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'

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

// ---------- Team data ----------

const TEAM_ACCENT = 'rgb(10,85,235)'
const TEAM_LABEL = {
  color: 'rgb(117,117,117)',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: '-0.48px',
  textTransform: 'uppercase',
  margin: '0 0 6px',
}
const TEAM_META = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: 15,
  fontWeight: 400,
  lineHeight: 1.8,
}

const SPONSORS = [
  {
    name: 'AA ENT',
    photo: 'sponsor-aaent.jpg',
    logo: 'AAENT-Logo.png',
    url: 'https://aaentmd.com/',
    desc: 'Leading ENT and facial plastic surgery practice providing world-class care.',
  },
  {
    name: 'US Sailing Team',
    photo: 'sponsor-ussailing.jpg',
    logo: 'us-sailing-team-logo.png',
    url: 'https://www.ussailing.org/teams/ussailingteam/',
    desc: 'The national sailing team representing the United States at the Olympic Games.',
  },
  {
    name: 'Sailing Foundation of NY',
    photo: 'sponsor-sfny.jpg',
    logo: 'sfny-logo.png',
    url: 'https://sfny.org/',
    desc: 'Supporting competitive sailors and maritime education across the country.',
  },
  {
    name: 'Annapolis Yacht Club',
    photo: 'sponsor-ayc.jpg',
    logo: null,
    url: 'https://www.annapolisyc.com/',
    desc: 'Historic yacht club in Annapolis, Maryland. Where the journey started.',
  },
]

const SUPPORTERS = [
  { name: 'AA ENT', url: 'https://aaentmd.com/' },
  { name: 'US Sailing Team', url: 'https://www.ussailing.org/teams/ussailingteam/' },
  { name: 'Sailing Foundation of NY', url: 'https://sfny.org/' },
  { name: 'Annapolis Yacht Club', url: 'https://www.annapolisyc.com/' },
  { name: 'Charter Financial Group', url: 'https://www.charterfinancialgroup.com/' },
  { name: 'The Strom Family' },
  { name: 'The Ziskind Family' },
  { name: 'The Callahan Family' },
  { name: 'Parabh Gill' },
]

const EMPTY_SLOTS = 4

function SponsorCard({ sponsor, hovered, locked, onHover, onLeave, onClick }) {
  const revealed = hovered || locked
  return (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
      style={{
        position: 'relative',
        overflow: 'hidden',
        display: 'block',
        flexGrow: 1,
        flexBasis: 0,
        flexShrink: 1,
        minWidth: 0,
        height: '100%',
        cursor: 'pointer',
        border: '8px solid rgb(0,0,0)',
        boxSizing: 'border-box',
      }}
    >
      <img
        src={`${BASE}${sponsor.photo}`}
        alt={sponsor.name}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.6s ease, filter 0.6s ease',
          transform: revealed ? 'scale(1.06)' : 'scale(1)',
          filter: revealed ? 'brightness(0.25)' : 'grayscale(0.15) brightness(0.55)',
          display: 'block',
        }}
      />
      {/* Blue overlay when revealed */}
      <div style={{
        position: 'absolute', inset: 0,
        background: TEAM_ACCENT,
        opacity: revealed ? 0.85 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }} />
      {/* Resting state: centered title over darkened photo */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        opacity: revealed ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }}>
        <p style={{
          color: '#fff',
          fontSize: 'clamp(16px, 1.8vw, 24px)',
          fontWeight: 400,
          fontFamily: '"Didot", "Bodoni 72", "Bodoni MT", "Playfair Display", Georgia, serif',
          letterSpacing: '0.03em',
          textAlign: 'center',
          margin: 0,
          textShadow: '0 2px 12px rgba(0,0,0,0.6)',
        }}>
          {sponsor.name}
        </p>
      </div>
      {/* Revealed state: logo + name + description */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        opacity: revealed ? 1 : 0,
        transform: revealed ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
        pointerEvents: 'none',
      }}>
        {sponsor.logo && (
          <img
            src={`${BASE}${sponsor.logo}`}
            alt=""
            style={{
              maxWidth: 180, maxHeight: 72, objectFit: 'contain',
              marginBottom: 22,
              filter: 'brightness(0) invert(1)',
            }}
          />
        )}
        <p style={{
          color: '#fff', fontSize: 17, fontWeight: 500,
          letterSpacing: '-0.3px',
          margin: sponsor.logo ? 0 : '0 0 10px', textAlign: 'center',
        }}>{sponsor.name}</p>
        <p style={{
          color: 'rgba(255,255,255,0.95)', fontSize: 13,
          textAlign: 'center', lineHeight: 1.65, margin: '12px 0 0',
          maxWidth: 340,
        }}>{sponsor.desc}</p>
      </div>
    </div>
  )
}

function SupporterRow({ supporter }) {
  const [hovered, setHovered] = useState(false)
  const row = (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 0',
      borderBottom: '1px solid rgba(255,255,255,0.14)',
    }}>
      <span style={{
        width: 6, height: 6,
        background: TEAM_ACCENT,
        opacity: supporter.url ? (hovered ? 1 : 0.9) : 0.9,
        flexShrink: 0,
        transition: 'opacity 0.25s ease',
      }} />
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '-0.2px',
        color: '#fff',
        opacity: supporter.url && hovered ? 1 : 0.95,
        transition: 'opacity 0.25s ease',
      }}>
        {supporter.name}
      </span>
    </div>
  )

  if (supporter.url) {
    return (
      <a
        href={supporter.url}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        {row}
      </a>
    )
  }
  return row
}

function SponsorRow({ sponsors, hoveredSponsor, setHoveredSponsor, entrance }) {
  const [layout, setLayout] = useState('full')
  const [lockedIdx, setLockedIdx] = useState(0)

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w < 500) setLayout('one')
      else if (w < 900) setLayout('two')
      else setLayout('full')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function handleClick(i, sponsor) {
    if (lockedIdx === i) {
      // Already locked on this card — navigate to URL
      window.open(sponsor.url, '_blank', 'noopener,noreferrer')
    } else {
      // Lock this card (always keep one locked)
      setLockedIdx(i)
    }
  }


  if (layout === 'full') {
    const baseH = 'clamp(266px, 39vh, 392px)'
    const tallH = 'clamp(376px, 55vh, 502px)'
    return (
      <div data-sponsor-row style={{
        ...entrance.style(0),
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        padding: '55px 0',
        background: 'rgb(0,0,0)',
      }}>
        {sponsors.map((s, i) => {
          // When hovering a different card, suppress the locked card's revealed state
          const isActive = hoveredSponsor !== null ? hoveredSponsor === i : lockedIdx === i
          return (
            <div key={s.name} style={{
              flexGrow: isActive ? 1.76 : 1,
              flexBasis: 0,
              flexShrink: 1,
              minWidth: 0,
              height: isActive ? tallH : baseH,
              transition: 'flex-grow 0.6s cubic-bezier(0.22, 1, 0.36, 1), height 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            }}>
              <SponsorCard
                sponsor={s}
                hovered={hoveredSponsor === i}
                locked={lockedIdx === i && hoveredSponsor === null}
                onHover={() => setHoveredSponsor(i)}
                onLeave={() => { setHoveredSponsor(null); setLockedIdx(i) }}
                onClick={(e) => { e.stopPropagation(); handleClick(i, s) }}
              />
            </div>
          )
        })}
      </div>
    )
  }

  const cardWidth = layout === 'one' ? 'calc(80vw)' : 'calc(45vw)'
  return (
    <div data-sponsor-row style={{
      ...entrance.style(0),
      overflowX: 'auto',
      overflowY: 'hidden',
      WebkitOverflowScrolling: 'touch',
      scrollSnapType: 'x mandatory',
      display: 'flex',
      height: 'clamp(266px, 39vh, 392px)',
    }}>
      {sponsors.map((s, i) => (
        <div
          key={s.name}
          style={{
            flex: `0 0 ${cardWidth}`,
            height: '100%',
            scrollSnapAlign: 'start',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <SponsorCard
            sponsor={s}
            hovered={hoveredSponsor === i}
            locked={lockedIdx === i && hoveredSponsor === null}
            onHover={() => setHoveredSponsor(i)}
            onLeave={() => { setHoveredSponsor(null); setLockedIdx(i) }}
            onClick={(e) => { e.stopPropagation(); handleClick(i, s) }}
          />
        </div>
      ))}
    </div>
  )
}

// ---------- Sailboat SVG ----------

function SailboatIcon({ variant = 'default', size = 22 }) {
  const scale = size / 22
  let mast, sail, jib, hull, filterStyle
  if (variant === 'active') {
    mast = 'rgba(120,190,255,1)'
    sail = 'rgba(100,175,255,0.95)'
    jib = 'rgba(120,190,255,0.8)'
    hull = 'rgba(140,200,255,1)'
    filterStyle = 'drop-shadow(0 0 8px rgba(80,160,255,0.6))'
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

function YearBlock({ item, side, verticalPos, isMobile, factBox, anchor = 'center' }) {
  const s = getYearStyle(item)
  const isCurrent = item.current

  if (isMobile) {
    return (
      <div style={{
        position: 'absolute',
        left: 56,
        right: 28,
        top: verticalPos,
        transform: anchor === 'center' ? 'translateY(-50%)' : 'none',
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
      transform: anchor === 'center' ? 'translateY(-50%)' : 'none',
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

function YourNameSlot({ onNavigate, isMobile }) {
  const [hovered, setHovered] = useState(false)
  const [pressed, setPressed] = useState(false)
  return (
    <div
      onClick={() => onNavigate('Support')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setPressed(false) }}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: isMobile ? 8 : 12,
        padding: isMobile ? '4px 0' : '8px 0',
        borderBottom: `1px solid rgba(255,255,255,${isMobile ? 0.06 : 0.08})`,
        cursor: 'pointer',
        pointerEvents: 'auto',
        transform: pressed ? 'scale(0.97)' : 'scale(1)',
        transition: 'transform 0.1s ease',
      }}
    >
      <span style={{
        width: isMobile ? 4 : 5, height: isMobile ? 4 : 5,
        border: hovered ? '1px solid rgb(10,85,235)' : '1px solid rgba(255,255,255,0.3)',
        background: hovered ? 'rgb(10,85,235)' : 'transparent',
        flexShrink: 0,
        transition: 'background 0.2s ease, border-color 0.2s ease',
      }} />
      <span style={{
        fontSize: isMobile ? 10 : 13,
        fontWeight: hovered ? 500 : 400,
        letterSpacing: '-0.2px',
        fontStyle: 'italic',
        color: hovered ? 'rgb(10,85,235)' : 'rgba(255,255,255,0.38)',
        transition: 'color 0.2s ease',
      }}>
        Your Name
      </span>
    </div>
  )
}

function HeroSlide({ isMobile, onSeeTeam, onNavigate }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: isMobile
        ? '110px 28px 30px 56px'
        : '0 calc(50% + 60px) 0 clamp(48px, 6vw, 100px)',
      justifyContent: isMobile ? 'flex-start' : 'center',
    }}>
      <div style={{
        maxWidth: isMobile ? '100%' : undefined,
      }}>
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
          color: 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          Scroll to explore the journey
          <span style={{ display: 'inline-block', animation: 'scrollHint 2s ease-in-out infinite' }}>↓</span>
        </div>
      </div>
      {/* Team list — right side of spine on desktop, bottom grid on mobile */}
      <div style={{
        position: 'absolute',
        ...(isMobile
          ? { bottom: 108, left: 56, right: 28 }
          : { top: '50%', transform: 'translateY(-50%)', left: 'calc(50% + 60px)', right: 'clamp(40px, 5vw, 100px)', maxWidth: 280 }
        ),
      }}>
        <div style={isMobile ? {
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          columnGap: 12,
        } : undefined}>
          {SUPPORTERS.map((s) => (
            <div key={s.name} style={{
              display: 'flex',
              alignItems: 'center',
              gap: isMobile ? 8 : 12,
              padding: isMobile ? '4px 0' : '8px 0',
              borderBottom: `1px solid rgba(255,255,255,${isMobile ? 0.06 : 0.08})`,
            }}>
              <span style={{
                width: isMobile ? 4 : 5, height: isMobile ? 4 : 5,
                background: 'rgb(10,85,235)',
                opacity: 0.9,
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: isMobile ? 10 : 13,
                fontWeight: 500,
                letterSpacing: '-0.2px',
                color: isMobile ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.85)',
              }}>
                {s.name}
              </span>
            </div>
          ))}
          <YourNameSlot onNavigate={onNavigate} isMobile={isMobile} />
        </div>
        <button
          onClick={onSeeTeam}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: isMobile ? 11 : 13,
            fontWeight: 400,
            letterSpacing: '-0.2px',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            marginTop: isMobile ? 16 : 20,
            pointerEvents: 'auto',
          }}
        >
          See the full team &darr;
        </button>
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
    ? [{ top: '14%' }, { top: '33%' }, { top: '52%' }, { top: '71%' }]
    : [
        { top: '12%', side: 'left' },
        { top: '32%', side: 'right' },
        { top: '52%', side: 'left' },
        { top: '76%', side: 'right' },
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
          factBox={isMobile ? null : FACT_BOXES[item.year]}
          anchor="top"
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
      {/* 2027 — left side, upper area */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '25%' : '30%',
        left: isMobile ? 56 : undefined,
        right: isMobile ? 28 : 'calc(50% + 40px)',
        textAlign: isMobile ? 'left' : 'right',
      }}>
        <div style={{ fontSize: isMobile ? 'clamp(24px, 6vw, 36px)' : 'clamp(32px, 4vw, 56px)', fontWeight: 700, lineHeight: 1, letterSpacing: '-2px', color: s2027.color, marginBottom: 6 }}>
          2027
        </div>
        <div style={{ fontSize: 'clamp(13px, 1.1vw, 16px)', fontWeight: 400, color: s2027.milestone, lineHeight: 1.5 }}>
          World Champs contender
        </div>
      </div>

      {/* 2028 + CTA — right side, well clear of the spine */}
      <div style={{
        position: 'absolute',
        top: isMobile ? '62%' : '65%',
        left: isMobile ? 56 : 'calc(50% + 60px)',
        right: isMobile ? 28 : 'clamp(40px, 5vw, 100px)',
        transform: 'translateY(-50%)',
      }}>
        <div style={{
          fontSize: isMobile ? 'clamp(48px, 12vw, 80px)' : 'clamp(60px, 8vw, 120px)',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-3px',
          color: '#fff',
        }}>
          2028
        </div>
        <div style={{ ...LABEL, color: 'rgba(255,255,255,0.5)', marginTop: 10 }}>
          LA Olympics
        </div>
        <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{ fontSize: 'clamp(24px, 3.5vw, 44px)', fontWeight: 700, color: '#fff', lineHeight: 1, letterSpacing: '-1px' }}>{days}</span>
          <span style={{ ...LABEL, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Days</span>
        </div>
        <div style={{ marginTop: 28 }}>
          <button
            onClick={() => onNavigate('Support')}
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            style={{
              display: 'inline-block',
              fontSize: 'clamp(16px, 2vw, 26px)',
              fontWeight: 500,
              color: ctaHover ? '#fff' : 'rgba(255,255,255,0.92)',
              background: 'none',
              border: 'none',
              borderBottomStyle: 'solid',
              borderBottomWidth: ctaHover ? 3 : 2,
              borderBottomColor: 'rgb(220,40,40)',
              padding: 0,
              paddingBottom: 6,
              transition: 'color 0.2s ease, border-bottom-width 0.2s ease',
              letterSpacing: '-0.3px',
              pointerEvents: 'auto',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            SUPPORT &rarr;
          </button>
        </div>
        <div style={{ marginTop: 14 }}>
          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
            style={{
              fontSize: 13,
              fontStyle: 'italic',
              color: '#fff',
              textDecoration: 'none',
              borderBottom: '1px solid rgb(10,85,235)',
              paddingBottom: 2,
              pointerEvents: 'auto',
            }}
          >
            or email Robby
          </a>
        </div>
      </div>
    </>
  )
}

// ---------- Main component ----------

export default function Path({ onNavigate }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 700
  )
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const { days } = useCountdown(new Date('2028-07-14T00:00:00'))
  const [hoveredSponsor, setHoveredSponsor] = useState(null)
  const teamEntrance = usePageEntrance(3, { staggerMs: 100, initialDelayMs: 50 })
  const teamSectionRef = useRef(null)
  const frameRef = useRef(null)
  const [activeSlide, setActiveSlide] = useState(0)
  const activeRef = useRef(0)
  activeRef.current = activeSlide

  const goToSlide = useCallback((idx) => {
    const clamped = Math.max(0, Math.min(NUM_SLIDES - 1, idx))
    if (clamped === activeRef.current) return
    setActiveSlide(clamped)
    activeRef.current = clamped
    if (clamped === NUM_SLIDES - 1) arrivedAtLastSlide.current = Date.now()
  }, [])

  // Draggable sailboat along the spine
  const [dragging, setDragging] = useState(false)
  const [dragTop, setDragTop] = useState(null)
  const draggingRef = useRef(false)

  const getSlideFromY = useCallback((clientY) => {
    const frame = frameRef.current
    if (!frame) return activeRef.current
    const rect = frame.getBoundingClientRect()
    const pct = ((clientY - rect.top) / rect.height) * 100
    // Spine runs from 15% to 90%, stops are evenly spaced
    const t = Math.max(0, Math.min(1, (pct - 15) / 75))
    return Math.round(t * (NUM_SLIDES - 1))
  }, [])

  const onDragStart = useCallback((e) => {
    if (window.scrollY > 0) return
    e.preventDefault()
    setDragging(true)
    draggingRef.current = true
    const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY
    const frame = frameRef.current
    if (frame) {
      const rect = frame.getBoundingClientRect()
      const pct = ((clientY - rect.top) / rect.height) * 100
      setDragTop(Math.max(15, Math.min(90, pct)))
    }
  }, [])

  useEffect(() => {
    if (!dragging) return

    function onMove(e) {
      const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY
      const frame = frameRef.current
      if (!frame) return
      const rect = frame.getBoundingClientRect()
      const pct = ((clientY - rect.top) / rect.height) * 100
      const clamped = Math.max(15, Math.min(90, pct))
      setDragTop(clamped)
      // Live-update the slide as you drag
      const idx = getSlideFromY(clientY)
      if (idx !== activeRef.current) {
        setActiveSlide(idx)
        activeRef.current = idx
      }
    }

    function onEnd(e) {
      const clientY = e.type === 'touchend'
        ? e.changedTouches[0].clientY
        : e.clientY
      const idx = getSlideFromY(clientY)
      setActiveSlide(idx)
      activeRef.current = idx
      setDragging(false)
      draggingRef.current = false
      setDragTop(null)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onEnd)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onEnd)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
    }
  }, [dragging, getSlideFromY])

  // Continuous sailboat position along the spine (15% to 90%)
  // The boat moves smoothly with scroll, snaps to a stop when close enough.
  // 5 slide stops + 1 exit stop (half-gap past the last slide)
  const baseStops = SLIDES.map((_, si) => 15 + (si / (NUM_SLIDES - 1)) * 75)
  const normalGap = baseStops[1] - baseStops[0]
  const slideStops = [...baseStops, baseStops[baseStops.length - 1] + normalGap * 0.2]
  const [boatPos, setBoatPos] = useState(slideStops[0])
  const boatPosRef = useRef(slideStops[0])
  const SNAP_THRESHOLD = 1.5 // percentage points — ~10px on a 700px viewport
  const arrivedAtLastSlide = useRef(0)
  const reenteredSlides = useRef(0)

  // Snap boat to current slide stop (used when slide changes via click/drag/touch)
  useEffect(() => {
    if (!draggingRef.current) {
      const target = slideStops[activeSlide]
      setBoatPos(target)
      boatPosRef.current = target
    }
  }, [activeSlide])

  useEffect(() => {
    function onWheel(e) {
      // Page is scrolled past slides — let browser handle normally
      if (window.scrollY > 0) {
        // Reset boat to the last slide stop so it's ready when we re-enter
        const lastSlideStop = slideStops[NUM_SLIDES - 1]
        if (boatPosRef.current !== lastSlideStop) {
          boatPosRef.current = lastSlideStop
          setBoatPos(lastSlideStop)
        }
        return
      }


      const dir = e.deltaY > 0 ? 1 : -1
      const lastStop = slideStops[NUM_SLIDES - 1]

      // On last slide scrolling down — boat needs to reach the exit stop before scrolling through
      const exitStop = slideStops[slideStops.length - 1]
      if (dir > 0 && activeRef.current >= NUM_SLIDES - 1) {
        if (boatPosRef.current >= exitStop - 0.1) {
          // Boat is at the exit stop — let scroll through
          return
        }
        // Move boat toward exit stop
        e.preventDefault()
        const delta = Math.min(Math.abs(e.deltaY) * 0.04, 2.5)
        const newPos = Math.min(exitStop, boatPosRef.current + delta)
        boatPosRef.current = newPos
        setBoatPos(newPos)
        return
      }

      // At first slide scrolling up — do nothing
      if (dir < 0 && activeRef.current <= 0 && boatPosRef.current <= slideStops[0]) {
        e.preventDefault()
        return
      }

      e.preventDefault()

      // Move the boat continuously based on scroll delta
      // Normalize deltaY: trackpad gives small values, mouse wheel gives ~100
      const delta = Math.sign(e.deltaY) * Math.min(Math.abs(e.deltaY) * 0.04, 2.5)
      const newPos = Math.max(slideStops[0], Math.min(slideStops[slideStops.length - 1], boatPosRef.current + delta))
      boatPosRef.current = newPos
      setBoatPos(newPos)

      // Check if we're close enough to a stop to snap
      for (let i = 0; i < slideStops.length; i++) {
        if (Math.abs(newPos - slideStops[i]) < SNAP_THRESHOLD) {
          // The 6th stop (exit stop) — don't change slides, just let scroll through
          if (i === slideStops.length - 1 && i >= NUM_SLIDES) {
            boatPosRef.current = slideStops[i]
            setBoatPos(slideStops[i])
            break
          }
          if (i !== activeRef.current) {
            setActiveSlide(i)
            activeRef.current = i
            boatPosRef.current = slideStops[i]
            setBoatPos(slideStops[i])
          }
          break
        }
      }
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [goToSlide])

  // Touch: swipe up/down — mirrors the wheel handler for mobile
  useEffect(() => {
    let touchStartY = 0
    let lastTouchY = 0
    let consumed = false // true once this gesture has been claimed by slide nav
    let startedInFrame = false // only intercept touches that began in the slides frame

    function onTouchStart(e) {
      const frame = frameRef.current
      startedInFrame = frame && frame.contains(e.target)
      touchStartY = e.touches[0].clientY
      lastTouchY = touchStartY
      consumed = false
    }

    function onTouchMove(e) {
      if (!startedInFrame) return
      if (draggingRef.current) return
      const currentY = e.touches[0].clientY
      const incrDy = lastTouchY - currentY // incremental: positive = swiping up
      lastTouchY = currentY

      // If page is already scrolled past slides, let browser scroll normally
      if (window.scrollY > 0 && !consumed) return

      // Small dead zone to avoid hijacking taps
      const totalDy = Math.abs(touchStartY - currentY)
      if (totalDy < 5 && !consumed) return

      const dir = incrDy > 0 ? 1 : -1

      // At first slide swiping backward — block scroll, do nothing
      if (dir < 0 && activeRef.current <= 0 && boatPosRef.current <= slideStops[0]) {
        e.preventDefault()
        return
      }

      // On last slide swiping forward — move boat toward exit stop, then release to native scroll
      const exitStop = slideStops[slideStops.length - 1]
      if (dir > 0 && activeRef.current >= NUM_SLIDES - 1) {
        if (boatPosRef.current >= exitStop - 0.1) {
          // Exit reached — let this and future touches scroll natively
          consumed = false
          return
        }
        e.preventDefault()
        consumed = true
        const pxToPct = 75 / (window.innerHeight * 0.75)
        const delta = Math.abs(incrDy) * pxToPct
        const newPos = Math.min(exitStop, boatPosRef.current + delta)
        boatPosRef.current = newPos
        setBoatPos(newPos)
        return
      }

      // Normal slide navigation — prevent scroll, move boat smoothly
      e.preventDefault()
      consumed = true
      const pxToPct = 75 / (window.innerHeight * 0.75)
      const delta = incrDy * pxToPct
      const newPos = Math.max(slideStops[0], Math.min(slideStops[slideStops.length - 1], boatPosRef.current + delta))
      boatPosRef.current = newPos
      setBoatPos(newPos)

      // Snap to nearest stop if close enough
      for (let i = 0; i < slideStops.length; i++) {
        if (Math.abs(newPos - slideStops[i]) < SNAP_THRESHOLD) {
          if (i === slideStops.length - 1 && i >= NUM_SLIDES) {
            boatPosRef.current = slideStops[i]
            setBoatPos(slideStops[i])
            break
          }
          if (i !== activeRef.current) {
            setActiveSlide(i)
            activeRef.current = i
            boatPosRef.current = slideStops[i]
            setBoatPos(slideStops[i])
          }
          break
        }
      }
    }

    function onTouchEnd() {
      if (!consumed) return
      // Snap boat to the nearest slide stop for a clean landing
      let closest = 0
      let minDist = Infinity
      for (let i = 0; i < NUM_SLIDES; i++) {
        const d = Math.abs(boatPosRef.current - slideStops[i])
        if (d < minDist) { minDist = d; closest = i }
      }
      if (closest !== activeRef.current) {
        goToSlide(closest)
      }
      consumed = false
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [goToSlide])

  // Keyboard: arrow keys
  useEffect(() => {
    function onKey(e) {
      if (window.scrollY > 0) return
      if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && activeRef.current >= NUM_SLIDES - 1) return
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
    <div style={{ background: 'rgb(12,14,18)' }}>
    <div
      ref={frameRef}
      style={{
        position: 'relative',
        height: isMobile ? '100svh' : '100dvh',
        minHeight: isMobile ? '100vh' : undefined,
        width: '100%',
        overflow: 'hidden',
        background: 'rgb(12,14,18)',
        touchAction: isMobile ? 'none' : undefined,
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
              filter: si === 0 ? 'grayscale(0.2) contrast(1.1) brightness(0.4)' : 'grayscale(0.2) contrast(1.1) brightness(0.65)',
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
        bottom: '5%',
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
              zIndex: 10,
              cursor: 'pointer',
              padding: 16,
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

      {/* Active sailboat — draggable */}
      <div
        className={dragging ? undefined : 'sail-bob'}
        onMouseDown={onDragStart}
        onTouchStart={onDragStart}
        style={{
          position: 'absolute',
          left: spineLeft,
          top: dragging && dragTop !== null
            ? `${dragTop}%`
            : `${boatPos}%`,
          transform: 'translate(-50%, -50%)',
          zIndex: 11,
          transition: dragging ? 'none' : (boatPos === slideStops[activeSlide] ? 'top 0.3s ease' : 'none'),
          pointerEvents: 'auto',
          cursor: dragging ? 'grabbing' : 'grab',
          padding: 10,
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <SailboatIcon variant={hasYears2026 ? 'glow' : 'active'} size={30} />
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
                <HeroSlide isMobile={isMobile} onNavigate={onNavigate} onSeeTeam={() => teamSectionRef.current?.scrollIntoView({ behavior: 'smooth' })} />
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

    {/* ===== TEAM SECTION — scrollable below slides ===== */}
    <div ref={teamSectionRef} style={{ background: 'rgb(22,24,28)' }}>

      {/* Sponsor card panels — responsive: 1+peek / 2+peek / all 4 */}
      <SponsorRow
        sponsors={SPONSORS}
        hoveredSponsor={hoveredSponsor}
        setHoveredSponsor={setHoveredSponsor}
        entrance={teamEntrance}
      />

      {/* "The Team" editorial section */}
      <div style={{
        ...teamEntrance.style(1),
        position: 'relative',
        overflow: 'hidden',
        padding: isMobile ? '80px 28px 140px' : '80px 40px 140px',
        minHeight: 'clamp(720px, 94vh, 1040px)',
      }}>
        {/* Background photo */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <img
            src={`${BASE}IMG_5957 2.JPG`}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 20%',
              filter: 'grayscale(1) contrast(1.55) brightness(0.5)',
              transform: 'scale(1.14)',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.62)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(10,85,235,0.14)',
          }} />
        </div>

        {/* Foreground content */}
        <div style={{
          position: 'relative',
          zIndex: 1,
          maxWidth: 1100,
          margin: '0 auto',
          textAlign: 'center',
        }}>
          <h1
            className="chrome-text"
            style={{
              fontFamily: '"Didot", "Bodoni 72", "Bodoni MT", "Playfair Display", Georgia, serif',
              fontSize: 'clamp(44px, 7vw, 104px)',
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.035em',
              lineHeight: 1,
              margin: '0 0 14px',
            }}
          >
            The Team
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.88)',
            fontSize: 'clamp(15px, 1.4vw, 18px)',
            fontWeight: 400,
            lineHeight: 1.7,
            letterSpacing: '-0.2px',
            maxWidth: 620,
            margin: '0 auto 34px',
          }}>
            The sponsors, families, and supporters who make this Olympic campaign possible.
          </p>

          <div style={{ marginBottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
            <button
              onClick={() => onNavigate('Support')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 0',
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '-0.3px',
                fontFamily: 'inherit',
                color: '#fff',
                borderBottom: '1px solid rgba(255,255,255,0.45)',
              }}
            >
              Join the Team
            </button>
          </div>

          {/* Individual Supporters */}
          <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'left', padding: isMobile ? '0 16px' : undefined }}>
            {SUPPORTERS.map((s) => (
              <SupporterRow key={s.name} supporter={s} />
            ))}
            {Array.from({ length: EMPTY_SLOTS }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 0',
                borderBottom: '1px solid rgba(255,255,255,0.14)',
              }}>
                <span style={{
                  width: 6, height: 6,
                  border: '1px solid rgba(255,255,255,0.3)',
                  background: 'transparent',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 14,
                  fontWeight: 400,
                  letterSpacing: '-0.2px',
                  fontStyle: 'italic',
                  color: 'rgba(255,255,255,0.38)',
                }}>
                  Your Name
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Thin divider */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', maxWidth: 120, margin: '0 auto' }} />

      {/* Thank-you letter */}
      <div style={{ ...teamEntrance.style(2), maxWidth: 900, margin: '0 auto', padding: isMobile ? '60px 28px 50px' : '60px 40px 50px' }}>
        <p style={{ ...TEAM_LABEL, marginBottom: 24 }}>A NOTE FROM ROBBY</p>
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto', width: 'clamp(200px, 25vw, 280px)' }}>
            <img
              src={`${BASE}IMG_5958.JPG`}
              alt=""
              style={{ width: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ height: 2, background: TEAM_ACCENT }} />
          </div>
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ ...TEAM_META, marginBottom: 16 }}>
              I wanted to take a moment to express my deepest gratitude for any and all guidance and support throughout my Olympic sailing journey. Belief in me has meant more than words can say, and it has been one of the driving forces behind every step I have taken on this path.
            </p>
            <p style={{ ...TEAM_META, marginBottom: 16 }}>
              Some of you have been with me since the very beginning, learning to sail on the Chesapeake Bay, to racing for the United States on the world stage. Whether it was encouragement after a tough regatta, advice on a difficult decision, or simply the confidence that someone believed in what I was working toward, those moments have shaped who I am as a sailor and as a person.
            </p>
            <p style={{ ...TEAM_META, marginBottom: 16 }}>
              As I look ahead to this chapter of dedicating myself full-time to the LA 2028 Olympic campaign, I will carry forward everything I learn. The discipline, the resilience, the joy of competition, and the understanding that no great achievement is ever accomplished alone.
            </p>
            <p style={{ ...TEAM_META, marginBottom: 20 }}>
              Thank you for being part of this journey. I am incredibly fortunate to have people in my corner, and I promise to continue working every day.
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14,
              lineHeight: 1.8,
              fontStyle: 'italic',
              marginBottom: 4,
            }}>
              With my sincerest thanks and appreciation,
            </p>
            <p style={{
              color: 'rgba(255,255,255,0.85)',
              fontSize: 14,
              lineHeight: 1.8,
              fontStyle: 'italic',
            }}>
              Robby
            </p>
          </div>
        </div>
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
    </div>
  )
}
