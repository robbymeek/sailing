import { useState, useEffect, useRef } from 'react'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'
import SailboatIcon from '../components/SailboatIcon'
import ExitNav from '../components/ExitNav'
import { EXIT_CARDS } from '../components/exitCards'
// Opening statement + era photos that live in src/assets (the rest come from public/)
import teamPhoto from '../assets/exit-cards/exit-path.jpg'
import usstPhoto from '../assets/home-intro/p1177244.jpeg'
import nowPhoto from '../assets/home-intro/img-5957-alt.jpg'

const BASE = import.meta.env.BASE_URL

// ============================================================================
//  THE TEAM — celebration of the people behind the campaign, told as the
//  journey they powered. The frame: the ILCA is a singlehanded boat — nobody
//  sails it to the Olympics alone. The celebration IS the recruitment: no
//  tier language, no pitch sections; prospects read how backers are treated.
//
//  Page arc: statement hero (solo water → team photo crossfade) → era
//  chapters on the sailboat spine, each credited to its backers → the "now"
//  chapter (AA ENT flagship — the only chapter that renders a real logo) →
//  THE PARTNERS gallery → the roster as the spine's continuation (filled
//  square = aboard, hollow = open berth) → closing hand-off to The Road →
//  the letter → exits. The timeline deliberately ENDS at now: the future is
//  The Road's content — here it's the thing being offered.
// ============================================================================

// ---------- Chapter data ----------

// Five full-viewport scroll-snap chapters. The opening statement chapter makes
// the hero argument with imagery (the team — "Never sailed alone."), per the
// owner's non-cheesy spec: flat declarative type. Era chapters credit the
// backers of each stretch of the journey — achievements stay to one or two
// lines; RESULTS owns race-by-race.
const CHAPTERS = [
  {
    type: 'statement',
    photo: teamPhoto,
    dark: 0.45,
    label: 'Never sailed alone',
  },
  {
    type: 'era',
    photo: `${BASE}sailing-photos/IMG_4733.jpeg`,
    dark: 0.6,
    label: '2017–2018',
    era: {
      years: '2017 – 2018',
      kicker: 'BACKED BY',
      backer: 'Annapolis Yacht Club',
      lines: [
        'Racing on the Chesapeake in Annapolis at nine years old',
        'First Youth Championships two seasons later',
      ],
    },
  },
  {
    type: 'era',
    photo: `${BASE}sailing-photos/IMG_0062.JPG`,
    dark: 0.55,
    label: '2019–2023',
    era: {
      years: '2019 – 2023',
      kicker: 'BACKED BY',
      backer: 'Severn Sailing Association',
      lines: [
        'Two High School National Championships',
        'Orange Bowl Champion',
        'Fifth in the world at the Youth Worlds',
        'First ILCA 7 North American title',
      ],
    },
  },
  {
    type: 'era',
    photo: usstPhoto,
    dark: 0.55,
    label: '2023–2026',
    era: {
      years: '2023 – 2026',
      kicker: 'BACKED BY',
      backer: 'Harvard Sailing · US Sailing Team',
      lines: [
        'Team captain at Harvard',
        'Team Race and Singlehanded National Champion',
        'Three-time ILCA 7 North American Champion',
        'Racing for the United States',
      ],
    },
  },
  {
    type: 'era',
    photo: nowPhoto,
    dark: 0.55,
    label: 'Now',
    now: true, // the climax chapter — the boat glows here
    era: {
      years: 'NOW',
      kicker: 'FLAGSHIP PARTNERS',
      backer: 'AA ENT · US Sailing Team', // shown like a history backer (middot-separated)
      note: 'and backed by: Annapolis Yacht Club', // plain line, no bullet
      tagline: 'Every start from here points at Los Angeles.',
    },
  },
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

// AA ENT leads the row — flagship billing continues from the "now" chapter
// directly above it.
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

// ---------- Partner cards (unchanged interaction from the old Path page) ----------

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
        loading="lazy"
        decoding="async"
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
            loading="lazy"
            decoding="async"
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

// ---------- Roster rows (the spine's continuation) ----------

// Filled blue square = aboard. The squares sit ON the roster rail (the thin
// vertical line), continuing the timeline spine's language: stops on a course.
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

// Hollow square = open berth. Click → inline name input → Support, which
// greets the typed name ("Reserving a berth for …" — donations happen on the
// external SFNY platform, so an acknowledgment is the honest maximum). The
// conversion moment is literally a gap in the crew line.
// showBoat: the small sailboat resting beside the first open berth (desktop).
function YourNameInput({ onNavigate, showBoat = false }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('')
  const inputRef = useRef(null)

  const submit = () => {
    if (name.trim()) {
      onNavigate('Support', { prefillName: name.trim() })
    }
  }

  const boat = showBoat && (
    <span aria-hidden="true" style={{
      position: 'absolute', left: -34, top: '50%',
      transform: 'translateY(-50%)',
      opacity: 0.8,
    }}>
      <SailboatIcon variant="ghost" size={16} />
    </span>
  )

  if (!editing) {
    return (
      <div
        onClick={() => setEditing(true)}
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '14px 0',
          borderBottom: '1px solid rgba(255,255,255,0.14)',
          cursor: 'pointer',
        }}
      >
        {boat}
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
      position: 'relative',
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 0',
      borderBottom: '1px solid rgba(255,255,255,0.14)',
    }}>
      {boat}
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

// ---------- Chapter content ----------

// ---------- The engraved roll-call plate (shared desktop + mobile) ----------

// The supporters' names pressed into a brushed steel plaque — a boat builder's
// plate / donor honor-wall. This is a deliberate, one-spot exception to the
// "names on the photo" rule: the sponsors get called out on their own object.
// Steel tones sit between the /team root rgb(12,14,18) and cool-steel
// rgb(201,208,220); names are incised (light lower lip + dark upper groove =
// lit from above), kept bright for legibility. Shared by the desktop
// RollCallOverlay (sticky, brushed + a slow sheen) and the mobile
// SponsorRollCall (a simpler static panel).

// Plate padding around the name block. Left < the container's 40px spine offset
// so the plate's left edge lands ~8px right of the 50% spine (clears it).
const PLATE_PAD_L = 32
const PLATE_PAD_R = 44
const PLATE_PAD_Y = 30

// Brushed dark steel, lit from the top edge.
const STEEL_GRADIENT =
  'linear-gradient(180deg, rgb(54,59,68) 0%, rgb(40,44,52) 38%, rgb(30,33,40) 72%, rgb(24,27,33) 100%)'
// Fine horizontal brushing (3px period, low alpha → HiDPI-safe). Desktop only.
const STEEL_BRUSH =
  'repeating-linear-gradient(0deg, rgba(255,255,255,0.028) 0px, rgba(255,255,255,0.028) 1px, rgba(0,0,0,0.05) 1px, rgba(0,0,0,0.05) 3px)'
// Raised-plaque bevel: bright top lip, dark bottom, inner depth, drop shadow.
const PLATE_BEVEL =
  'inset 0 1px 0 rgba(255,255,255,0.16), inset 0 -1px 0 rgba(0,0,0,0.60), inset 0 0 22px rgba(0,0,0,0.35), 0 14px 34px rgba(0,0,0,0.50), 0 2px 6px rgba(0,0,0,0.45)'
// One slow chrome glint sweeping the steel — animated by .plate-sheen, and sits
// inside the plate under the names, so it never costs legibility.
const SHEEN_STYLE = {
  position: 'absolute',
  inset: 0,
  backgroundImage:
    'linear-gradient(115deg, transparent 38%, rgba(200,220,255,0.12) 47%, rgba(255,255,255,0.22) 50%, rgba(0,180,255,0.10) 53%, transparent 62%)',
  backgroundSize: '260% 100%',
  backgroundRepeat: 'no-repeat',
  pointerEvents: 'none',
}

// A name incised into the steel. Bright fill + two-tone shadow = pressed in.
const engravedRow = {
  fontStyle: 'italic',
  fontSize: 'clamp(16px, 1.4vw, 22px)',
  fontWeight: 500,
  letterSpacing: '-0.2px',
  lineHeight: 1.5,
  margin: '0 0 12px',
  color: 'rgb(207,214,225)',
  textShadow: '0 1px 1px rgba(240,246,255,0.16), 0 -1px 1px rgba(0,0,0,0.62)',
}

// The small tracked label titling the plaque, over an incised divider rule.
const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '2.5px',
  textTransform: 'uppercase',
  color: 'rgba(150,161,178,0.92)',
  textShadow: '0 1px 0 rgba(235,242,252,0.10), 0 -1px 1px rgba(0,0,0,0.60)',
  paddingBottom: 12,
  marginBottom: 16,
  borderBottom: '1px solid rgba(0,0,0,0.35)',
  boxShadow: '0 1px 0 rgba(255,255,255,0.05)',
}

// Mobile: the same plaque, simpler — a static steel panel (no brush striations,
// so no HiDPI shimmer on phones; no sheen). Names incised at 16px on both beats.
function SponsorRollCall() {
  const names = SUPPORTERS.map((s) => s.name)
  return (
    <div style={{
      marginTop: 30,
      padding: '22px 20px 12px',
      borderRadius: 4,
      backgroundImage: 'linear-gradient(180deg, rgb(52,57,66) 0%, rgb(38,42,50) 55%, rgb(28,31,38) 100%)',
      border: '1px solid rgba(0,0,0,0.5)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.55), 0 8px 22px rgba(0,0,0,0.45)',
    }}>
      <div style={{ ...eyebrowStyle, fontSize: 10 }}>Behind the Campaign</div>
      {names.map((n) => (
        <p key={n} style={{ ...engravedRow, fontSize: 16, margin: '0 0 10px' }}>{n}</p>
      ))}
    </div>
  )
}

// ---------- Roll-call engraved plate (desktop) ----------

// One engraved plaque in the timeline's sticky layer, centered on the opening
// statement page. It rides the page UP and off the top as you scroll (clipped
// by the sticky layer) — the same "scroll away" behavior as the mobile inline
// roll call, rather than fading in place. Pure closed form of scrollY (reverse
// scroll replays exactly); pure CSS, reduced motion stills the sheen.
function RollCallOverlay() {
  const wrapRef = useRef(null)

  useEffect(() => {
    let raf = 0
    // Scroll the plaque up 1:1 with the page so it rides the statement up and
    // off the top of the sticky layer (clipped there), like the mobile inline
    // roll call — no in-place fade.
    const update = () => {
      raf = 0
      const wrap = wrapRef.current
      if (!wrap) return
      wrap.style.transform = `translateY(${-window.scrollY}px)`
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const names = SUPPORTERS.map((s) => s.name)

  // A raised steel plaque just right of the center spine, reading off it the way
  // the era chapters do. The names are engraved into the metal so the sponsors
  // are called out and stay easy to read.
  return (
    <div style={{
      position: 'absolute',
      // Plate LEFT EDGE lands at 50%+40px — the era-chapter column — after it
      // extends left by PLATE_PAD_L(32): 72 − 32 = 40. Names indent inside.
      left: 'calc(50% + 72px)',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 3,
      padding: '36px 0',
      minWidth: 260,
      pointerEvents: 'none',
    }}>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        {/* The brushed-steel plate + its sheen, painted behind the names */}
        <div aria-hidden="true" style={{
          position: 'absolute',
          top: -PLATE_PAD_Y,
          bottom: -PLATE_PAD_Y,
          left: -PLATE_PAD_L,
          right: -PLATE_PAD_R,
          borderRadius: 4,
          backgroundImage: `${STEEL_BRUSH}, ${STEEL_GRADIENT}`,
          border: '1px solid rgba(0,0,0,0.5)',
          boxShadow: PLATE_BEVEL,
          overflow: 'hidden',
        }}>
          <div className="plate-sheen" style={SHEEN_STYLE} />
        </div>
        {/* The engraved content, above the plate */}
        <div style={{ position: 'relative', textAlign: 'left' }}>
          <div style={eyebrowStyle}>Behind the Campaign</div>
          {names.map((n) => (
            <p key={n} style={engravedRow}>{n}</p>
          ))}
        </div>
      </div>
    </div>
  )
}

// The opening statement: the hero argument in flat declarative type — no
// italics, no exclamation, no nautical kitsch. The team photo argues; the copy
// just names it. One page (the old solo "singlehanded class" page was cut).
function StatementChapter({ isMobile, onMeetTeam }) {
  const lineStyle = {
    fontSize: isMobile ? 'clamp(30px, 8.5vw, 52px)' : 'clamp(38px, 5vw, 72px)',
    fontWeight: 700,
    lineHeight: 1.05,
    letterSpacing: '-2px',
    margin: 0,
  }
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
      overflowY: isMobile ? 'auto' : 'visible',
    }}>
      <div>
        {/* The page's single <h1> — two lines: the setup greyed, the thesis white. */}
        <h1 style={lineStyle}>
          <span style={{ display: 'block', color: 'rgba(255,255,255,0.4)' }}>The singlehanded class.</span>
          <span style={{ display: 'block', color: '#fff', marginTop: 8 }}>Never sailed alone.</span>
        </h1>
        <button
          onClick={onMeetTeam}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.6)',
            fontSize: isMobile ? 11 : 13,
            fontWeight: 400,
            letterSpacing: '-0.2px',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
            marginTop: 26,
            pointerEvents: 'auto',
          }}
        >
          Meet the full team
        </button>
        {/* Ambient floor cue — keep scrolling into the journey. */}
        <div style={{
          marginTop: 24,
          ...LABEL,
          letterSpacing: '1.5px',
          color: 'rgba(255,255,255,0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          Scroll
          <span style={{ display: 'inline-block', animation: 'scrollHint 2s ease-in-out infinite' }}>↓</span>
        </div>
        {/* Mobile: the engraved roll-call plaque flows below the statement */}
        {isMobile && <SponsorRollCall />}
      </div>
      {/* Desktop: the roll call lives in the timeline's sticky layer
          (RollCallOverlay), pinned center-right over the statement. */}
    </div>
  )
}

// ---------- Era-card background: transparent white, blurred backdrop ----------
// A translucent white wash + backdrop-blur so the photo reads THROUGH the card,
// softly blurred, with black text on top — see-through, not a solid/frosted card,
// and no spine bar. Mobile uses a higher white alpha (blur kept) so the black
// text stays legible on small screens. NOW is distinguished by STRUCTURE (a
// black-bold kicker + partners as the backer line + a plain note + a tagline),
// not by color.
const GLASS_HISTORY = {
  background: 'rgba(255,255,255,0.35)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
}
const GLASS_HISTORY_MOBILE = {
  background: 'rgba(255,255,255,0.62)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}
const GLASS_NOW = {
  background: 'rgba(255,255,255,0.46)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
}
const GLASS_NOW_MOBILE = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}
const GLASS_HAIRLINE = 'rgba(255,255,255,0.5)' // subtle bright rim; no spine bar
const INK = 'rgb(16,18,26)'                    // near-black text

// Era chapter: the journey as evidence of what backing produces. Years big, the
// backer(s) over the achievement bullets, all on a transparent white panel that
// blurs the photo behind it (black text on top; no spine bar). The NOW card is
// special by STRUCTURE — a black-bold kicker, its flagship partners as the backer
// line ("AA ENT · US Sailing Team"), a plain "and backed by" note, and a closing
// tagline. Desktop alternates sides around the spine.
function EraChapter({ era, side, isMobile, isNow }) {
  const positioning = isMobile
    ? { left: 56, right: 28, textAlign: 'left' }
    : side === 'left'
      ? { right: 'calc(50% + 40px)', left: 'clamp(40px, 5vw, 100px)', textAlign: 'right' }
      : { left: 'calc(50% + 40px)', right: 'clamp(40px, 5vw, 100px)', textAlign: 'left' }
  const rightAligned = !isMobile && side === 'left'

  const panel = isNow
    ? (isMobile ? GLASS_NOW_MOBILE : GLASS_NOW)
    : (isMobile ? GLASS_HISTORY_MOBILE : GLASS_HISTORY)

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      ...positioning,
    }}>
      <div style={{
        width: 'fit-content',
        maxWidth: isMobile ? '100%' : 480,
        boxSizing: 'border-box',
        marginLeft: rightAligned ? 'auto' : 0,
        padding: isMobile ? '22px 24px 24px' : '28px 34px 30px',
        borderRadius: 2,
        border: `1px solid ${GLASS_HAIRLINE}`,
        ...panel,
      }}>
        {/* Years */}
        <div style={{
          fontSize: isMobile ? 'clamp(30px, 8vw, 48px)' : 'clamp(40px, 5vw, 72px)',
          fontWeight: 700,
          lineHeight: 1,
          letterSpacing: '-2px',
          color: INK,
          marginBottom: isNow ? 14 : 18,
        }}>
          {era.years}
        </div>

        {/* Kicker — NOW's is accent-colored, bigger and bolder (more visible) */}
        <div style={{
          ...LABEL,
          color: isNow ? INK : 'rgba(16,18,26,0.5)',
          fontSize: isNow ? 13 : 12,
          fontWeight: isNow ? 700 : 500,
          marginBottom: isNow ? 12 : 8,
        }}>
          {era.kicker}
        </div>

        {/* Backer line — history org, or NOW's flagship partners ("A · B") */}
        {era.backer && (
          <div style={{
            fontSize: isMobile ? 'clamp(17px, 4.5vw, 22px)' : 'clamp(20px, 2vw, 28px)',
            fontWeight: 600,
            letterSpacing: '-0.5px',
            color: INK,
            lineHeight: 1.25,
            marginBottom: 14,
          }}>
            {era.backer}
          </div>
        )}

        {/* Achievement bullets (history only) — black square markers. Row
            reverses on left-of-spine cards so the marker stays spine-side. */}
        {era.lines && era.lines.length > 0 && (
          <ul style={{
            listStyle: 'none',
            margin: 0,
            padding: 0,
            maxWidth: 440,
            marginLeft: rightAligned ? 'auto' : 0,
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 7 : 9,
          }}>
            {era.lines.map((line, i) => (
              <li key={i} style={{
                display: 'flex',
                flexDirection: rightAligned ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: 10,
                fontSize: isMobile ? 13 : 'clamp(14px, 1.15vw, 17px)',
                fontWeight: 400,
                color: 'rgba(16,18,26,0.82)',
                lineHeight: 1.5,
                textAlign: rightAligned ? 'right' : 'left',
              }}>
                <span aria-hidden="true" style={{
                  flex: 'none',
                  width: 5,
                  height: 5,
                  marginTop: '0.55em',
                  borderRadius: 1,
                  background: INK,
                }} />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}

        {/* NOW secondary note — a plain line, NO bullet */}
        {era.note && (
          <div style={{
            maxWidth: 440,
            marginLeft: rightAligned ? 'auto' : 0,
            fontSize: isMobile ? 13 : 'clamp(14px, 1.15vw, 17px)',
            fontWeight: 400,
            color: 'rgba(16,18,26,0.72)',
            lineHeight: 1.5,
            textAlign: rightAligned ? 'right' : 'left',
          }}>
            {era.note}
          </div>
        )}

        {/* NOW-only closing tagline — the culmination; only this card gets it */}
        {isNow && era.tagline && (
          <div style={{
            marginTop: isMobile ? 14 : 18,
            maxWidth: 440,
            marginLeft: rightAligned ? 'auto' : 0,
            fontSize: isMobile ? 13 : 'clamp(14px, 1.1vw, 16px)',
            fontStyle: 'italic',
            color: 'rgba(20,26,40,0.78)',
            lineHeight: 1.4,
          }}>
            {era.tagline}
          </div>
        )}
      </div>
    </div>
  )
}

// ---------- Main component ----------

export default function Team({ onNavigate }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 700
  )
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const [hoveredSponsor, setHoveredSponsor] = useState(null)
  const entrance = usePageEntrance(3, { staggerMs: 100, initialDelayMs: 50 })
  const teamSectionRef = useRef(null)

  const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // ----- Scroll-driven sailboat -----
  // The boat's spine position derives from native scroll progress through the
  // timeline region. No wheel/touch capture anywhere — the page scrolls like
  // a normal page. Boat top is written straight to the DOM (no setState per
  // frame); React state only changes when the active chapter flips.
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

  // Forward-only chapter snapping (desktop). The page scrolls smoothly and
  // freely — the ONLY assist is a gentle settle INTO the next stop in the
  // direction you're already travelling, once you coast to rest near it. It
  // never snaps backward (the old CSS `proximity` snap did, which read as a
  // yank). Reduced motion and mobile get pure native scrolling, no snap.
  useEffect(() => {
    const isDesktop = () => window.innerWidth >= 700
    const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const SNAP_BAND = 0.34 // settle within this fraction of a viewport of the next stop
    let lastY = window.scrollY
    let dir = 0            // +1 travelling down, -1 up
    let idleTimer = 0
    let snapping = false   // true while our own smooth scroll runs — ignore its events
    let snapClear = 0

    const stops = () => chapterRefs.current
      .filter(Boolean)
      .map((el) => el.getBoundingClientRect().top + window.scrollY)
      .sort((a, b) => a - b)

    const settle = () => {
      if (!isDesktop() || reduced() || snapping) return
      const s = stops()
      if (s.length < 2) return
      const y = window.scrollY
      // Only inside the chapter timeline — the partners/roster below scroll free.
      if (y < s[0] - 1 || y > s[s.length - 1] + 1) return
      const vh = window.innerHeight || 1
      const target = dir >= 0
        ? s.find((v) => v > y + 1)                 // next stop ahead (scrolling down)
        : [...s].reverse().find((v) => v < y - 1)  // next stop ahead (scrolling up)
      if (target == null) return
      if (Math.abs(target - y) <= vh * SNAP_BAND) {
        snapping = true
        window.scrollTo({ top: Math.round(target), behavior: 'smooth' })
        clearTimeout(snapClear)
        snapClear = setTimeout(() => { snapping = false }, 700)
      }
    }

    const onScroll = () => {
      const y = window.scrollY
      if (y !== lastY) dir = y > lastY ? 1 : -1
      lastY = y
      if (snapping) return
      clearTimeout(idleTimer)
      idleTimer = setTimeout(settle, 140) // act only once the user coasts to rest
    }
    // A fresh user gesture always wins — never fight the scroll (the timeline
    // otherwise captures no wheel/touch by design).
    const release = () => { snapping = false; clearTimeout(snapClear) }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('wheel', release, { passive: true })
    window.addEventListener('touchstart', release, { passive: true })
    window.addEventListener('keydown', release)
    return () => {
      clearTimeout(idleTimer)
      clearTimeout(snapClear)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('wheel', release)
      window.removeEventListener('touchstart', release)
      window.removeEventListener('keydown', release)
    }
  }, [])

  const scrollToChapter = (i) => {
    chapterRefs.current[i]?.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start',
    })
  }

  const spineLeft = isMobile ? 24 : '50%'
  const atNow = !!CHAPTERS[activeChapter]?.now

  // Era chapters alternate sides on desktop, starting right of the spine
  // (the statement chapters occupy the left half).
  let eraSideFlip = 0

  return (
    <div style={{ background: 'rgb(12,14,18)' }}>

    {/* ===== TIMELINE — native-scroll chapters with a sticky spine/boat. ===== */}
    <section ref={timelineRef} style={{ position: 'relative', background: 'rgb(12,14,18)' }}>

      {/* Sticky overlay — backgrounds, spine, ghost stops, boat. The absolute
          wrapper spans the whole region so the sticky layer pins for exactly
          the duration of the timeline. */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'sticky', top: 0, height: '100svh', overflow: 'hidden' }}>

          {/* Background photos — one per chapter, crossfading. The chapter 0→1
              crossfade IS the hero argument: alone on open water → the team. */}
          {CHAPTERS.map((chapter, ci) => (
            <img
              key={ci}
              src={chapter.photo}
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
                filter: `grayscale(0.2) contrast(1.1) brightness(${chapter.dark})`,
                opacity: activeChapter === ci ? 1 : 0,
                transition: prefersReducedMotion() ? 'none' : 'opacity 0.8s ease',
                willChange: 'opacity',
                zIndex: 0,
              }}
            />
          ))}

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

          {/* Active sailboat — rides the spine with scroll (top set via ref).
              Glows on the "now" chapter: the climax, right before the ask. */}
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
            <SailboatIcon variant={atNow ? 'glow' : 'active'} size={30} />
          </div>

          {/* Desktop roll call — fixed in the sticky layer across the two
              statement beats; scroll sprays white → chrome (see
              RollCallOverlay). Mobile flows its lists inside the chapters. */}
          {!isMobile && <RollCallOverlay />}
        </div>
      </div>

      {/* Chapters — real sections in document flow, content above the sticky
          layer. pointerEvents: none on the wrapper lets clicks reach the
          ghost stops; interactive children re-enable themselves. */}
      {CHAPTERS.map((chapter, ci) => {
        let content
        if (chapter.type === 'statement') {
          content = (
            <StatementChapter
              isMobile={isMobile}
              onMeetTeam={() => teamSectionRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth' })}
            />
          )
        } else {
          const side = eraSideFlip++ % 2 === 0 ? 'right' : 'left'
          content = <EraChapter era={chapter.era} side={side} isMobile={isMobile} isNow={!!chapter.now} />
        }
        return (
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
            {content}
          </div>
        )
      })}
    </section>

    {/* ===== THE PARTNERS — the gallery lands right after the story, so each
        card is a character the reader recognizes, not a logo in a wall.
        teamSectionRef lands HERE: "Meet the full team" must arrive at the
        partners first, then flow into the roster — not skip past them. ===== */}
    <div ref={teamSectionRef} style={{ background: 'rgb(0,0,0)', paddingTop: 56 }}>
      <p style={{
        ...LABEL,
        color: 'rgba(255,255,255,0.45)',
        textAlign: 'center',
        margin: '0 0 8px',
      }}>
        The Partners
      </p>
    </div>
    <SponsorRow
      sponsors={SPONSORS}
      hoveredSponsor={hoveredSponsor}
      setHoveredSponsor={setHoveredSponsor}
      entranceStyle={entrance.style(0)}
    />

    {/* ===== THE ROSTER — the spine's continuation. ===== */}
    <div style={{ background: 'rgb(22,24,28)' }}>

      <div style={{
        ...entrance.style(1),
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
            loading="lazy"
            decoding="async"
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
          <h2
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
          </h2>

          <p style={{
            color: 'rgba(255,255,255,0.88)',
            fontSize: 'clamp(15px, 1.4vw, 18px)',
            fontWeight: 400,
            lineHeight: 1.7,
            letterSpacing: '-0.2px',
            maxWidth: 620,
            margin: '0 auto 44px',
          }}>
            The sponsors, families, and supporters who make this Olympic campaign possible.
          </p>

          {/* The roster: filled squares = aboard, hollow = open berths, all
              sitting on the rail — the same line the boat just sailed. */}
          <div style={{
            maxWidth: 440,
            margin: '0 auto',
            textAlign: 'left',
            paddingLeft: isMobile ? 0 : undefined,
          }}>
            {/* Rail scope: the line must END at the terminal stop, so the
                closing-actions row lives OUTSIDE this positioning context. */}
            <div style={{ position: 'relative' }}>
              {/* The rail — the spine, continued. Runs through the square
                  markers (6px squares, centers at x=3) down into the closing
                  stop. */}
              <div aria-hidden="true" style={{
                position: 'absolute',
                left: 2.5,
                top: 8,
                bottom: 10,
                width: 1,
                background: 'rgba(255,255,255,0.15)',
              }} />

              {SUPPORTERS.map((s) => (
                <SupporterRow key={s.name} supporter={s} />
              ))}
              {Array.from({ length: EMPTY_SLOTS }).map((_, i) => (
                <YourNameInput
                  key={`empty-${i}`}
                  onNavigate={onNavigate}
                  showBoat={!isMobile && i === 0}
                />
              ))}

              {/* Terminal stop — the last entry on the crew line is the
                  destination. */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '18px 0 6px',
              }}>
                <span style={{
                  width: 8, height: 8,
                  marginLeft: -1,
                  background: '#fff',
                  boxShadow: '0 0 14px rgba(10,85,235,0.9), 0 0 4px rgba(255,255,255,0.8)',
                  flexShrink: 0,
                }} />
                <span style={{
                  fontSize: 14,
                  fontWeight: 600,
                  letterSpacing: '-0.2px',
                  color: '#fff',
                }}>
                  This team sails for LA in 2028.
                </span>
              </div>
            </div>

            {/* Closing actions — join the crew, or see where it's going. */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 26, padding: '14px 0 0 20px' }}>
              <button
                onClick={() => onNavigate('Support')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
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
              <button
                onClick={() => onNavigate('The Road')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 0',
                  fontSize: 14,
                  fontWeight: 400,
                  letterSpacing: '-0.2px',
                  fontFamily: 'inherit',
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                See the Road →
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Thin divider */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', maxWidth: 120, margin: '0 auto' }} />

      {/* Thank-you letter — last before the exits: it shows prospects how
          this team treats its backers. */}
      <div style={{ ...entrance.style(2), maxWidth: 900, margin: '0 auto', padding: isMobile ? '60px 28px 50px' : '60px 40px 50px' }}>
        <p style={{ ...TEAM_LABEL, marginBottom: 24 }}>A NOTE FROM ROBBY</p>
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ flex: '0 0 auto', width: 'clamp(200px, 25vw, 280px)' }}>
            <img
              src={`${BASE}IMG_5958.JPG`}
              alt="Robby Meek"
              loading="lazy"
              decoding="async"
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

      {/* Where to next — Support stays LAST in the stack (house rule). */}
      <div style={{ padding: isMobile ? '20px 0 52px' : '32px 0 84px' }}>
        <ExitNav
          links={[EXIT_CARDS.home, EXIT_CARDS.road, EXIT_CARDS.biography, EXIT_CARDS.support]}
          onNavigate={onNavigate}
          isMobile={isMobile}
        />
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
    </div>
  )
}
