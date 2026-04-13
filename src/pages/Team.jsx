import { useState } from 'react'
import Footer from '../components/Footer'
import usePageEntrance from '../hooks/usePageEntrance'

const BASE = import.meta.env.BASE_URL

// Shared typographic tokens — same language as the home page (MainView)
const labelStyle = {
  color: 'rgb(117,117,117)',
  fontSize: 12,
  fontWeight: 400,
  letterSpacing: '-0.48px',
  textTransform: 'uppercase',
  margin: '0 0 6px',
}
const metaStyle = {
  color: 'rgba(255,255,255,0.72)',
  fontSize: 15,
  fontWeight: 400,
  lineHeight: 1.8,
}

const ACCENT = 'rgb(10,85,235)'
const PAGE_BG = 'rgb(22,24,28)'

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

// Expanding-panel sponsor card: sits in a flex row, grows wider via
// flex-grow when hovered while siblings slim. Container controls row height.
function SponsorCard({ sponsor, hovered, onHover, onLeave }) {
  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      style={{
        position: 'relative',
        overflow: 'hidden',
        textDecoration: 'none',
        display: 'block',
        flexGrow: hovered ? 2.2 : 1,
        flexBasis: 0,
        flexShrink: 1,
        minWidth: 0,
        height: '100%',
        transition: 'flex-grow 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Photo */}
      <img
        src={`${BASE}${sponsor.photo}`}
        alt={sponsor.name}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.6s ease, filter 0.6s ease',
          transform: hovered ? 'scale(1.06)' : 'scale(1)',
          filter: hovered ? 'brightness(0.25)' : 'grayscale(0.3) brightness(0.82)',
          display: 'block',
        }}
      />
      {/* Cobalt overlay on hover — near-opaque so the highlight reads strong */}
      <div style={{
        position: 'absolute', inset: 0,
        background: ACCENT,
        opacity: hovered ? 0.95 : 0,
        transition: 'opacity 0.5s ease',
        pointerEvents: 'none',
      }} />
      {/* Hover content — logo + description, centered */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(12px)',
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
      {/* Resting bottom label — solid bar, fades out on hover */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.85)',
        padding: '16px 18px',
        opacity: hovered ? 0 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }}>
        <p style={{ ...labelStyle, color: '#fff', margin: 0 }}>
          {sponsor.name}
        </p>
      </div>
    </a>
  )
}

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
        background: ACCENT,
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

export default function Team({ onNavigate }) {
  const entrance = usePageEntrance(3, { staggerMs: 100, initialDelayMs: 50 })
  const [hoveredIdx, setHoveredIdx] = useState(null)

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      {/* Sponsor cards — full-bleed hero. Row grows taller when any card
          is hovered; hovered card also expands horizontally via flex-grow. */}
      <div style={{
        ...entrance.style(0),
        display: 'flex',
        width: '100%',
        height: hoveredIdx !== null
          ? 'clamp(460px, 68vh, 660px)'
          : 'clamp(380px, 56vh, 560px)',
        transition: 'height 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        {SPONSORS.map((s, i) => (
          <SponsorCard
            key={s.name}
            sponsor={s}
            hovered={hoveredIdx === i}
            onHover={() => setHoveredIdx(i)}
            onLeave={() => setHoveredIdx(null)}
          />
        ))}
      </div>

      {/* Editorial photo section — "The Team" ornate heading + Individual
          Supporters list, both sitting over the aggressively stylized
          sailing photo. */}
      <div style={{
        ...entrance.style(1),
        position: 'relative',
        overflow: 'hidden',
        padding: '80px 40px 140px',
        minHeight: 'clamp(720px, 94vh, 1040px)',
      }}>
        {/* Aggressive grayscale/high-contrast sailing photo */}
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
          {/* Solid dark wash */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.62)',
          }} />
          {/* Cobalt tint layer */}
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
          {/* The Team — tall ornate serif caps in metallic white via .chrome-text */}
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

          {/* Tagline — white body */}
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

          {/* Support CTA — plain underlined white so the chrome-text treatment
              stays reserved for the single editorial headline above. */}
          <div style={{ marginBottom: 48 }}>
            <button
              onClick={() => onNavigate('Path')}
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
              The Path to LA
            </button>
          </div>

          {/* Individual Supporters — cobalt heading, white list */}
          <div style={{ maxWidth: 440, margin: '0 auto', textAlign: 'left' }}>
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
      <div style={{ ...entrance.style(2), maxWidth: 900, margin: '0 auto', padding: '60px 40px 50px' }}>
        <p style={{ ...labelStyle, marginBottom: 24 }}>A NOTE FROM ROBBY</p>
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Photo */}
          <div style={{ flex: '0 0 auto', width: 'clamp(200px, 25vw, 280px)' }}>
            <img
              src={`${BASE}IMG_5958.JPG`}
              alt=""
              style={{ width: '100%', objectFit: 'cover', display: 'block' }}
            />
            <div style={{ height: 2, background: ACCENT }} />
          </div>
          {/* Letter */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <p style={{ ...metaStyle, marginBottom: 16 }}>
              I wanted to take a moment to express my deepest gratitude for any and all guidance and support throughout my Olympic sailing journey. Belief in me has meant more than words can say, and it has been one of the driving forces behind every step I have taken on this path.
            </p>
            <p style={{ ...metaStyle, marginBottom: 16 }}>
              Some of you have been with me since the very beginning, learning to sail on the Chesapeake Bay, to racing for the United States on the world stage. Whether it was encouragement after a tough regatta, advice on a difficult decision, or simply the confidence that someone believed in what I was working toward, those moments have shaped who I am as a sailor and as a person.
            </p>
            <p style={{ ...metaStyle, marginBottom: 16 }}>
              As I look ahead to this chapter of dedicating myself full-time to the LA 2028 Olympic campaign, I will carry forward everything I learn. The discipline, the resilience, the joy of competition, and the understanding that no great achievement is ever accomplished alone.
            </p>
            <p style={{ ...metaStyle, marginBottom: 20 }}>
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

      <Footer variant="blue" onNavigate={onNavigate} />
    </div>
  )
}
