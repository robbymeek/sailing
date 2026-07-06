import { useState, useEffect, useRef } from 'react'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'
import SailboatIcon from '../components/SailboatIcon'
import ExitNav from '../components/ExitNav'
import { EXIT_CARDS } from '../components/exitCards'
import { hasWebGL2 } from '../lib/webglSupport'
// Hero second beat + era photos that live in src/assets (the rest come from public/)
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

// Six full-viewport scroll-snap chapters. The two statement chapters make the
// hero argument with imagery (alone on open water → the team), per the
// owner's non-cheesy spec: flat declarative type, the crossfade does the
// arguing. Era chapters credit the backers of each stretch of the journey —
// achievements stay to one or two lines; RESULTS owns race-by-race.
const CHAPTERS = [
  {
    type: 'statement-1',
    photo: `${BASE}sailing-photos/P1233011 (1).JPG`,
    dark: 0.5,
    label: 'The singlehanded class',
  },
  {
    type: 'statement-2',
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
        'Annapolis, Maryland. Racing on the Chesapeake at nine years old.',
        'First Youth Championships two seasons later.',
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
        'Two High School National Championships. Orange Bowl Champion.',
        'Fifth in the world at the Youth Worlds. A first ILCA 7 North American title.',
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
        'Team captain at Harvard — Team Race and Singlehanded National Champion.',
        'Three-time ILCA 7 North American Champion, racing for the United States.',
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
      kicker: 'FLAGSHIP PARTNER',
      backer: 'AA ENT',
      logo: 'AAENT-Logo.png', // the ONLY logo on the timeline — everyone else is typeset
      lines: [
        'Full-time Olympic training.',
        'Every start from here points at Los Angeles.',
      ],
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

// The roll call — the roster's names, present on BOTH statement beats. On
// "The singlehanded class." they sit quiet in white italic (the crew is
// there even when the water looks empty); on "Never sailed alone." the same
// list comes alive in the site's chrome shimmer. Mobile flows the list below
// the statement per beat; desktop mounts ONE fixed copy in the sticky layer
// (RollCallOverlay below) so the names hold their ground while the scroll
// sprays them apart and reforms them as chrome.
function SponsorRollCall({ colored, isMobile }) {
  const names = SUPPORTERS.map((s) => s.name)
  // Left-aligned to the content column (owner-directed) — a little larger than
  // before. Mobile keeps the CSS chrome shimmer on beat 2 (the liquid-metal
  // panel is a desktop enhancement; see RollCallOverlay).
  return (
    <div style={{ marginTop: 30, textAlign: 'left' }}>
      {names.map((n) => (
        <p
          key={n}
          className={colored ? 'chrome-text' : undefined}
          style={{
            color: colored ? undefined : 'rgba(255,255,255,0.92)',
            fontStyle: 'italic',
            fontSize: isMobile ? 16 : 'clamp(16px, 1.4vw, 22px)',
            fontWeight: 500,
            letterSpacing: '-0.2px',
            lineHeight: 1.5,
            margin: '0 0 10px',
          }}
        >
          {n}
        </p>
      ))}
    </div>
  )
}

// ---------- Roll-call liquid metal (desktop) ----------

const clamp01 = (v) => Math.min(1, Math.max(0, v))
const sstep = (a, b, x) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

// One fixed roll call in the timeline's sticky layer. Scroll choreography is a
// pure closed form of scrollY (no one-shot state — reverse scrub reassembles):
// beat 0 shows the white italic list; scrolling toward beat 1 crossfades the
// white names into a living liquid-metal render of the SAME names (the letters
// become flowing, refracting chrome), fully formed exactly at the beat-2 snap;
// the whole panel fades out as the era chapters arrive. Reduced motion / no
// WebGL2 / data-saver fall back to the CSS .chrome-text crossfade — the static
// form of the same look (the DOM lists stay mounted as that fallback and as the
// metal raster's source geometry).
function RollCallOverlay() {
  const wrapRef = useRef(null)
  const whiteRef = useRef(null)
  const chromeRef = useRef(null)
  const canvasRef = useRef(null)
  const sceneRef = useRef(null)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const saveData = !!(navigator.connection && navigator.connection.saveData)
    let useMetal = hasWebGL2() && !reduced && !saveData
    let built = false
    let metal = null    // lazily-imported { createLiquidMetal, buildMetalField }
    let canceled = false
    const PAD = 44

    // Rasterize the live white list into a beveled depth field and size the
    // WebGL canvas to the padded name block so the metal glyphs land exactly
    // where the white DOM glyphs are (same getBoundingClientRect + computed
    // font the crossfade registers against). Rebuilt on resize / fonts.ready.
    const buildField = () => {
      const wrap = wrapRef.current
      const white = whiteRef.current
      const canvas = canvasRef.current
      const scene = sceneRef.current
      if (!metal || !wrap || !white || !canvas || !scene) return
      const wrapRect = wrap.getBoundingClientRect()
      if (wrapRect.width === 0) return
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      const field = metal.buildMetalField({ nameEls: white.children, wrapRect, pad: PAD, dpr })
      canvas.style.left = `${-PAD}px`
      canvas.style.top = `${-PAD}px`
      canvas.style.width = `${wrapRect.width + PAD * 2}px`
      canvas.style.height = `${wrapRect.height + PAD * 2}px`
      scene.resize()
      scene.setField(field)
      built = true
    }

    // Scroll choreography windows, in viewport-heights of scrollY:
    //   0.12 → 1.00  white → liquid metal. The metal is fully formed exactly at
    //                the beat-2 snap (owner-directed: only once the boat is fully
    //                at the next stop).
    //   1.45 → 1.92  whole roll call fades out as the first era arrives.
    let raf = 0
    const update = () => {
      raf = 0
      const wrap = wrapRef.current
      const white = whiteRef.current
      const chrome = chromeRef.current
      const canvas = canvasRef.current
      if (!wrap || !white || !chrome || !canvas) return
      const vh = window.innerHeight || 1
      const y = window.scrollY / vh
      const t = sstep(0.12, 1, y)
      const vis = 1 - sstep(1.45, 1.92, y)
      wrap.style.opacity = String(vis)

      if (!useMetal || !built) {
        // Fallback: the CSS white → .chrome-text crossfade (static form of the
        // same look), used for reduced motion / no WebGL2 / data-saver and for
        // the brief window before the metal field is built.
        white.style.opacity = String(1 - t)
        chrome.style.opacity = String(t)
        canvas.style.opacity = '0'
        if (sceneRef.current) sceneRef.current.setRunning(false)
        return
      }
      // Metal path: white fades early, the metal fades in and lands fully formed
      // at the beat-2 snap (t ≈ 0.98). The chrome DOM stays hidden.
      chrome.style.opacity = '0'
      white.style.opacity = String(1 - sstep(0.02, 0.22, t))
      canvas.style.opacity = String(sstep(0.16, 0.98, t))
      sceneRef.current.setRunning(t > 0.02 && y < 1.95)
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    const rebuild = () => { if (useMetal) buildField(); onScroll() }

    // Lazy-load the metal module (gated to desktop + capable clients) so it
    // stays out of the main bundle and never loads on the fallback paths or
    // off-route. Create the scene, then build the field once fonts settle so
    // the glyph metrics match the DOM raster.
    if (useMetal) {
      import('../lib/liquidMetal').then((mod) => {
        if (canceled) return
        metal = mod
        try {
          sceneRef.current = mod.createLiquidMetal(canvasRef.current, { isMobile: false })
        } catch (err) {
          console.warn('Liquid-metal roll call unavailable, using chrome fallback', err)
          useMetal = false
          update()
          return
        }
        const boot = () => { if (!canceled) { buildField(); onScroll() } }
        if (document.fonts?.ready) document.fonts.ready.then(boot)
        else boot()
      }).catch((err) => {
        console.warn('Liquid-metal roll call failed to load, using chrome fallback', err)
        useMetal = false
        update()
      })
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', rebuild)
    return () => {
      canceled = true
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', rebuild)
      if (sceneRef.current) { sceneRef.current.dispose(); sceneRef.current = null }
    }
  }, [])

  const names = SUPPORTERS.map((s) => s.name)
  const listStyle = (colored) => ({
    position: colored ? 'absolute' : 'relative',
    inset: colored ? 0 : undefined,
    textAlign: 'left', // left-aligned, reading rightward off the center spine
    opacity: colored ? 0 : 1,
  })
  const rowStyle = {
    fontStyle: 'italic',
    fontSize: 'clamp(16px, 1.4vw, 22px)',
    fontWeight: 500, // identical metrics on both lists — one raster serves both
    letterSpacing: '-0.2px',
    lineHeight: 1.5,
    margin: '0 0 12px',
  }

  // A padded box just right of the center spine — left-aligned, so the roll
  // call reads off the spine the way the era chapters do. NO scrim/shader
  // behind the text (owner style rule: the names sit directly on the photo).
  return (
    <div style={{
      position: 'absolute',
      left: 'calc(50% + 40px)', // same offset off the spine as the era chapters
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 3,
      padding: '36px 0',
      minWidth: 260,
    }}>
      <div ref={wrapRef} style={{ position: 'relative' }}>
        <div ref={whiteRef} style={listStyle(false)}>
          {names.map((n) => (
            <p key={n} style={{ ...rowStyle, color: 'rgba(255,255,255,0.92)' }}>{n}</p>
          ))}
        </div>
        <div ref={chromeRef} style={listStyle(true)} aria-hidden="true">
          {names.map((n) => (
            <p key={n} className="chrome-text" style={rowStyle}>{n}</p>
          ))}
        </div>
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          style={{ position: 'absolute', opacity: 0, pointerEvents: 'none' }}
        />
      </div>
    </div>
  )
}

// Statement chapters: the hero argument, two beats. Flat declarative type —
// no italics, no exclamation, no nautical kitsch. The photos argue: chapter 0
// is one boat on open water; the scroll to chapter 1 crossfades to the team.
function StatementChapter({ beat, isMobile, onMeetTeam }) {
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
        <h1 style={{ ...lineStyle, color: beat === 1 ? 'rgba(255,255,255,0.4)' : '#fff' }}>
          The singlehanded class.
        </h1>
        {beat === 1 && (
          <h1 style={{ ...lineStyle, color: '#fff', marginTop: 8 }}>
            Never sailed alone.
          </h1>
        )}
        {beat === 0 && (
          <div style={{
            marginTop: 32,
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
        )}
        {beat === 1 && (
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
            Meet the full team ↓
          </button>
        )}
        {/* Mobile: the roll call flows below the statement */}
        {isMobile && <SponsorRollCall colored={beat === 1} isMobile />}
      </div>
      {/* Desktop: the roll call lives in the timeline's sticky layer
          (RollCallOverlay) so the names hold their ground across both beats
          while the scroll sprays them from white into chrome. */}
    </div>
  )
}

// Era chapter: the journey as evidence of what backing produces. Years big,
// the backer credited above the achievement lines. Desktop alternates sides
// around the spine; mobile stacks left of the 24px spine.
function EraChapter({ era, side, isMobile, isNow }) {
  const positioning = isMobile
    ? { left: 56, right: 28, textAlign: 'left' }
    : side === 'left'
      ? { right: 'calc(50% + 40px)', left: 'clamp(40px, 5vw, 100px)', textAlign: 'right' }
      : { left: 'calc(50% + 40px)', right: 'clamp(40px, 5vw, 100px)', textAlign: 'left' }

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      transform: 'translateY(-50%)',
      ...positioning,
    }}>
      <div style={{
        fontSize: isMobile ? 'clamp(30px, 8vw, 48px)' : 'clamp(40px, 5vw, 72px)',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-2px',
        color: '#fff',
        textShadow: isNow ? '0 0 30px rgba(10,85,235,0.35)' : 'none',
        marginBottom: 18,
      }}>
        {era.years}
      </div>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.45)', marginBottom: 8 }}>
        {era.kicker}
      </div>
      {era.logo && (
        <img
          src={`${BASE}${era.logo}`}
          alt=""
          style={{
            maxHeight: isMobile ? 56 : 84,
            maxWidth: 'min(60vw, 260px)',
            objectFit: 'contain',
            filter: 'brightness(0) invert(1) drop-shadow(0 2px 10px rgba(0,0,0,0.55))',
            display: 'inline-block',
            marginBottom: 10,
          }}
        />
      )}
      <div style={{
        fontSize: isMobile ? 'clamp(17px, 4.5vw, 22px)' : 'clamp(20px, 2vw, 28px)',
        fontWeight: 600,
        letterSpacing: '-0.5px',
        color: '#fff',
        lineHeight: 1.25,
        marginBottom: 14,
        textShadow: '0 1px 10px rgba(0,0,0,0.5)',
      }}>
        {era.backer}
      </div>
      {era.lines.map((t, i) => (
        <div key={i} style={{
          fontSize: isMobile ? 13 : 'clamp(14px, 1.15vw, 17px)',
          fontWeight: 400,
          color: 'rgba(255,255,255,0.75)',
          lineHeight: 1.55,
          marginTop: i === 0 ? 0 : 4,
          maxWidth: 440,
          marginLeft: !isMobile && side === 'left' ? 'auto' : 0,
        }}>
          {t}
        </div>
      ))}
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

  // Gentle chapter snapping on the root scroller (desktop-only via the CSS
  // media query). Cleanup is mandatory so other routes don't snap.
  useEffect(() => {
    document.documentElement.classList.add('team-snap-root')
    return () => document.documentElement.classList.remove('team-snap-root')
  }, [])

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
        if (chapter.type === 'statement-1') {
          content = <StatementChapter beat={0} isMobile={isMobile} />
        } else if (chapter.type === 'statement-2') {
          content = (
            <StatementChapter
              beat={1}
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
