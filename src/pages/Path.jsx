import { useState, useEffect, useRef } from 'react'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'
import SailboatIcon from '../components/SailboatIcon'

const BASE = import.meta.env.BASE_URL

// ---------- Data ----------

const TIMELINE_DATA = [
  { year: '2017', main: 'Started racing', sub: null, past: true },
  { year: '2018', main: 'First Youth Champs', sub: null, past: true },
  { year: '2019', main: '5th at HS Nationals', sub: ['Freshman year'], past: true },
  { year: '2020', main: 'Trained mainly in the Waszp, ILCA, and two-person Dinghies', sub: null, past: true },
  { year: '2021', main: 'HS National Champion', sub: ['Orange Bowl Champion', '9th at Youth Worlds', 'North American Champion'], past: true },
  { year: '2022', main: 'HS National Champion', sub: ['5th at Youth Worlds'], past: true },
  { year: '2023', main: 'Harvard Sailing', sub: ['North American Champion'], past: true },
  { year: '2024', main: 'CrossnoKaye', sub: ['Train, work at a start-up, and compete at the ILCA 7 Worlds'], past: true },
  { year: '2025', main: 'North American Champion', sub: ['Top American at Europeans'], past: true },
  { year: '2026', main: 'Olympic training', sub: null, current: true },
  { year: '2027', main: 'World Champs contender', sub: null },
  { year: '2028', main: 'LA Olympics', sub: null },
]

const FACT_BOXES = {
  '2017': { label: 'AGE 9', text: 'Started sailing on Long Island Sound. Fell in love with the speed, the strategy, and the solitude of singlehanded racing.' },
  '2019': { label: 'FRESHMAN', text: '5th at HS Nationals as a freshman — the youngest sailor in the top 10.' },
  '2021': { label: 'BREAKTHROUGH', text: 'Won the HS National Championship, the Orange Bowl, and placed 9th at Youth Worlds — all in the same year. Three continental titles would follow.' },
  '2023': { label: 'HARVARD', text: 'Joined the Harvard Sailing team where I study Applied Mathematics and Economics. Won the Senior ILCA 7 North American Championship' },
  '2025': { label: 'SUMMER', text: 'North American Champion for the third time. Trained in LA all summer attending regattas held on the Olympic waters and in Europe.' },
  '2026': { label: 'NOW', text: 'Full-time Olympic training while attending Harvard' },
}

const BIO_STATS = [
  ['6x', 'National Champ'],
  ['3x', 'Continental Champ'],
  ['9+', 'Years in ILCA'],
]

// Timeline chapters — intro is chapter 0, year chapters 1-3, final chapter 4.
// Each is a full-viewport scroll-snap section in normal document flow.
const CHAPTERS = [
  { type: 'intro', photo: 'IMG_5343.jpeg', label: 'Intro' },
  { type: 'quad', indices: [2, 3, 4, 5], photo: 'IMG_4733.jpeg', label: '2019–2022' },
  { type: 'pair', indices: [6, 7], photo: 'IMG_5956.JPG', label: '2023–2024' },
  { type: 'pair', indices: [8, 9], photo: 'IMG_6285.JPG', label: '2025–2026' },
  { type: 'final', indices: [10, 11], photo: null, label: '2027–2028' },
]
const NUM_CHAPTERS = CHAPTERS.length

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

function YourNameInput({ onNavigate }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  const submit = () => {
    if (name.trim()) {
      onNavigate('Support', { prefillName: name.trim() })
    }
  }

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 0',
          borderBottom: '1px solid rgba(255,255,255,0.14)',
          cursor: 'pointer',
        }}
      >
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
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.14)',
    }}>
      <span style={{
        width: 6, height: 6,
        border: '1px solid rgba(255,255,255,0.5)',
        background: 'transparent',
        flexShrink: 0,
      }} />
      <input
        ref={inputRef}
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        onBlur={() => { if (!name.trim()) { setEditing(false); setName('') } }}
        placeholder="Enter your name"
        style={{
          flex: 1,
          background: 'none',
          border: 'none',
          borderBottom: '1px solid rgba(255,255,255,0.3)',
          outline: 'none',
          color: '#fff',
          fontSize: 14,
          fontWeight: 400,
          letterSpacing: '-0.2px',
          fontFamily: 'inherit',
          padding: '4px 0',
        }}
      />
      <button
        onClick={submit}
        style={{
          background: 'none',
          border: 'none',
          cursor: name.trim() ? 'pointer' : 'default',
          color: name.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
          fontSize: 18,
          padding: '0 4px',
          fontFamily: 'inherit',
          transition: 'color 0.2s ease',
        }}
        aria-label="Go to support"
      >
        →
      </button>
    </div>
  )
}

function SponsorRow({ sponsors, hoveredSponsor, setHoveredSponsor, entranceStyle }) {
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
    // Fixed container height = tallH + 20px padding (10 top + 10 bottom)
    return (
      <div data-sponsor-row style={{
        ...entranceStyle,
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        height: `calc(${tallH} + 20px)`,
        padding: '10px 0',
        background: 'rgb(0,0,0)',
        overflow: 'hidden',
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
      ...entranceStyle,
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

// ---------- Chapter content types ----------

function IntroChapter({ isMobile, onSeeTeam }) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      flexDirection: 'column',
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
        <button
          onClick={onSeeTeam}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.55)',
            fontSize: isMobile ? 11 : 13,
            fontWeight: 400,
            letterSpacing: '-0.2px',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            marginTop: 18,
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

function FinalSlide({ days, isMobile, onNavigate }) {
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

// ---------- Title sponsor banner ----------

function TitleSponsorBanner({ sponsor, isMobile, entranceStyle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        ...entranceStyle,
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        height: 'clamp(380px, 56vh, 560px)',
        // Clears the overlay nav at the top of /path
        padding: isMobile ? '110px 28px 36px' : '120px 40px 44px',
        overflow: 'hidden',
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      <img
        src={`${BASE}${sponsor.photo}`}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          filter: hovered
            ? 'grayscale(0.2) contrast(1.1) brightness(0.5)'
            : 'grayscale(0.2) contrast(1.1) brightness(0.4)',
          transform: hovered ? 'scale(1.03)' : 'scale(1)',
          transition: 'filter 0.6s ease, transform 0.6s ease',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
        <img
          src={`${BASE}${sponsor.logo}`}
          alt={sponsor.name}
          style={{
            maxHeight: 'clamp(56px, 9vw, 90px)',
            maxWidth: 'min(70vw, 360px)',
            objectFit: 'contain',
            filter: 'brightness(0) invert(1)',
            display: 'block',
            margin: '0 auto',
          }}
        />
        <p style={{
          color: hovered ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.65)',
          fontSize: 14,
          lineHeight: 1.6,
          letterSpacing: '-0.2px',
          maxWidth: 420,
          margin: '22px auto 0',
          transition: 'color 0.4s ease',
        }}>
          {sponsor.desc}
        </p>
      </div>
    </a>
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
  const entrance = usePageEntrance(4, { staggerMs: 100, initialDelayMs: 50 })
  const teamSectionRef = useRef(null)

  // Gentle chapter snapping on the root scroller (desktop-only via the CSS
  // media query). Cleanup is mandatory so other routes don't snap.
  useEffect(() => {
    document.documentElement.classList.add('path-snap-root')
    return () => document.documentElement.classList.remove('path-snap-root')
  }, [])

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ----- Scroll-driven sailboat -----
  // The boat's spine position is derived from native scroll progress through
  // the timeline region. No wheel/touch capture anywhere — the page scrolls
  // like a normal page. Boat top is written straight to the DOM (no setState
  // per frame); React state only changes when the active chapter flips.
  const timelineRef = useRef(null)
  const chapterRefs = useRef([])
  const boatElRef = useRef(null)
  const [activeChapter, setActiveChapter] = useState(0)

  useEffect(() => {
    let raf = 0
    const update = () => {
      raf = 0
      const el = timelineRef.current
      const boat = boatElRef.current
      if (!el || !boat) return
      const rect = el.getBoundingClientRect()
      const travel = rect.height - window.innerHeight
      const p = travel > 0 ? Math.max(0, Math.min(1, -rect.top / travel)) : 0
      // Spine runs 15% → 90% — same formula as the ghost stops, so the boat
      // sits exactly on a stop whenever its chapter is snapped to the top.
      boat.style.top = `${15 + p * 75}%`
      const idx = Math.round(p * (NUM_CHAPTERS - 1))
      setActiveChapter((prev) => (prev === idx ? prev : idx))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update() // initial position — handles mid-page refresh + back/forward restoration
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const scrollToChapter = (i) => {
    chapterRefs.current[i]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }


  const spineLeft = isMobile ? 24 : '50%'
  const hasYears2026 = CHAPTERS[activeChapter].indices
    ? CHAPTERS[activeChapter].indices.some(i => TIMELINE_DATA[i]?.current)
    : false

  return (
    <div style={{ background: 'rgb(12,14,18)' }}>

    {/* ===== TITLE SPONSOR — AA ENT (logo + blurb only, no kicker text) ===== */}
    <TitleSponsorBanner
      sponsor={SPONSORS[0]}
      isMobile={isMobile}
      entranceStyle={entrance.style(0)}
    />

    {/* ===== SPONSOR ROW — remaining sponsors, sponsors-first layout.
        AA ENT is excluded: it has exclusive top billing in the banner. ===== */}
    <SponsorRow
      sponsors={SPONSORS.slice(1)}
      hoveredSponsor={hoveredSponsor}
      setHoveredSponsor={setHoveredSponsor}
      entranceStyle={entrance.style(1)}
    />

    {/* ===== TIMELINE — native-scroll chapters with a sticky spine/boat.
        The page scrolls like a normal page; chapters gently snap (CSS
        proximity); the boat's position is derived from scroll progress. ===== */}
    <section ref={timelineRef} style={{ position: 'relative', background: 'rgb(12,14,18)' }}>

      {/* Sticky overlay — backgrounds, spine, ghost stops, boat. The absolute
          wrapper spans the whole 5-viewport region so the sticky layer pins
          for exactly the duration of the timeline. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden' }}>

          {/* Background photos — one per chapter, crossfading */}
          {CHAPTERS.map((chapter, ci) => {
            if (!chapter.photo) return null
            return (
              <img
                key={ci}
                src={`${BASE}sailing-photos/${chapter.photo}`}
                alt=""
                loading={ci < 2 ? 'eager' : 'lazy'}
                decoding="async"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center',
                  filter: ci === 0 ? 'grayscale(0.2) contrast(1.1) brightness(0.4)' : 'grayscale(0.2) contrast(1.1) brightness(0.65)',
                  opacity: activeChapter === ci ? 1 : 0,
                  transition: prefersReducedMotion() ? 'none' : 'opacity 0.8s ease',
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

          {/* Ghost sailboat stops — click to jump to a chapter */}
          {CHAPTERS.map((chapter, ci) => {
            const stopTop = 15 + (ci / (NUM_CHAPTERS - 1)) * 75
            const isActive = activeChapter === ci
            return (
              <button
                key={`ghost-${ci}`}
                onClick={() => scrollToChapter(ci)}
                aria-label={`Go to ${chapter.label}`}
                title={chapter.label}
                style={{
                  position: 'absolute',
                  left: spineLeft,
                  top: `${stopTop}%`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  cursor: 'pointer',
                  padding: 16,
                  background: 'none',
                  border: 'none',
                  opacity: isActive ? 0 : 1,
                  transition: 'opacity 0.4s ease',
                  pointerEvents: isActive ? 'none' : 'auto',
                }}
              >
                <SailboatIcon variant="ghost" size={16} />
              </button>
            )
          })}

          {/* Active sailboat — rides the spine with scroll (top set via ref) */}
          <div
            ref={boatElRef}
            className="sail-bob"
            style={{
              position: 'absolute',
              left: spineLeft,
              top: '15%',
              transform: 'translate(-50%, -50%)',
              zIndex: 11,
              userSelect: 'none',
            }}
          >
            <SailboatIcon variant={hasYears2026 ? 'glow' : 'active'} size={30} />
          </div>
        </div>
      </div>

      {/* Chapters — real sections in document flow, content above the sticky
          layer. pointerEvents: none on the wrapper lets clicks reach the
          ghost stops; interactive children re-enable themselves. */}
      {CHAPTERS.map((chapter, ci) => (
        <div
          key={ci}
          ref={(el) => { chapterRefs.current[ci] = el }}
          style={{
            position: 'relative',
            zIndex: 1,
            height: isMobile ? '100svh' : '100dvh',
            scrollSnapAlign: 'start',
            pointerEvents: 'none',
          }}
        >
          {chapter.type === 'intro' ? (
            <IntroChapter isMobile={isMobile} onSeeTeam={() => teamSectionRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })} />
          ) : chapter.type === 'final' ? (
            <FinalSlide days={days} isMobile={isMobile} onNavigate={onNavigate} />
          ) : chapter.type === 'quad' ? (
            <QuadSlide items={chapter.indices.map(i => TIMELINE_DATA[i])} isMobile={isMobile} />
          ) : (
            <PairSlide
              items={[TIMELINE_DATA[chapter.indices[0]], TIMELINE_DATA[chapter.indices[1]]]}
              isMobile={isMobile}
              slideIndex={ci}
            />
          )}
        </div>
      ))}
    </section>

    {/* ===== TEAM SECTION ===== */}
    <div ref={teamSectionRef} style={{ background: 'rgb(22,24,28)' }}>

      {/* "The Team" editorial section */}
      <div style={{
        ...entrance.style(2),
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
              <YourNameInput key={`empty-${i}`} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </div>

      {/* Thin divider */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', maxWidth: 120, margin: '0 auto' }} />

      {/* Thank-you letter */}
      <div style={{ ...entrance.style(3), maxWidth: 900, margin: '0 auto', padding: isMobile ? '60px 28px 50px' : '60px 40px 50px' }}>
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
