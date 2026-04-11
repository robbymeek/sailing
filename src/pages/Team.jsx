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
const valueStyle = {
  color: 'rgb(157,174,194)',
  fontSize: 20,
  fontWeight: 400,
  letterSpacing: '-0.8px',
  margin: '0 0 8px',
}
const metaStyle = {
  color: 'rgba(255,255,255,0.7)',
  fontSize: 15,
  fontWeight: 400,
  lineHeight: 1.8,
}

const ACCENT = '#1E40FF'

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

function SponsorCard({ sponsor }) {
  const [hovered, setHovered] = useState(false)

  return (
    <a
      href={sponsor.url}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative', overflow: 'hidden',
        textDecoration: 'none',
        display: 'block',
        aspectRatio: '3/4',
      }}
    >
      {/* Photo — mild desaturation at rest, darkens on hover */}
      <img
        src={`${BASE}${sponsor.photo}`}
        alt={sponsor.name}
        style={{
          width: '100%', height: '100%',
          objectFit: 'cover',
          transition: 'transform 0.5s ease, filter 0.5s ease',
          transform: hovered ? 'scale(1.04)' : 'scale(1)',
          filter: hovered ? 'brightness(0.25)' : 'grayscale(0.2) brightness(0.9)',
          display: 'block',
        }}
      />
      {/* Hover overlay — single royal-blue accent for every sponsor */}
      <div style={{
        position: 'absolute', inset: 0,
        background: ACCENT,
        opacity: hovered ? 0.85 : 0,
        transition: 'opacity 0.4s ease',
        pointerEvents: 'none',
      }} />
      {/* Hover content — logo + description, centered */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '24px 16px',
        opacity: hovered ? 1 : 0,
        transform: hovered ? 'translateY(0)' : 'translateY(10px)',
        transition: 'opacity 0.4s ease, transform 0.4s ease',
        pointerEvents: 'none',
      }}>
        {sponsor.logo && (
          <img
            src={`${BASE}${sponsor.logo}`}
            alt=""
            style={{
              maxWidth: '60%', maxHeight: 50, objectFit: 'contain',
              marginBottom: 16,
              filter: 'brightness(0) invert(1)',
            }}
          />
        )}
        <p style={{
          color: '#fff', fontSize: 13, fontWeight: 500,
          letterSpacing: '-0.2px',
          margin: sponsor.logo ? 0 : '0 0 8px', textAlign: 'center',
        }}>{sponsor.name}</p>
        <p style={{
          color: 'rgba(255,255,255,0.85)', fontSize: 12,
          textAlign: 'center', lineHeight: 1.6, margin: '8px 0 0',
          maxWidth: 220,
        }}>{sponsor.desc}</p>
      </div>
      {/* Resting bottom label — solid bar, fades out on hover */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'rgba(0,0,0,0.8)',
        padding: '14px 14px 12px',
        opacity: hovered ? 0 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: 'none',
      }}>
        <p style={{ ...labelStyle, margin: 0, color: 'rgb(117,117,117)' }}>
          {sponsor.name}
        </p>
      </div>
    </a>
  )
}

const SUPPORTERS = [
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
      borderBottom: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{
        width: 6, height: 6,
        background: ACCENT,
        opacity: supporter.url ? (hovered ? 1 : 0.85) : 0.85,
        flexShrink: 0,
        transition: 'opacity 0.25s ease',
      }} />
      <span style={{
        fontSize: 14,
        fontWeight: 500,
        letterSpacing: '-0.2px',
        color: supporter.url && hovered ? '#fff' : 'rgba(255,255,255,0.85)',
        transition: 'color 0.25s ease',
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
  const entrance = usePageEntrance(5, { staggerMs: 100, initialDelayMs: 50 })

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(0,150,235)' }}>
      {/* Hero */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 'clamp(320px, 42vh, 440px)',
        overflow: 'hidden',
        marginBottom: 60,
      }}>
        {/* Photo */}
        <img
          src={`${BASE}IMG_5854.JPG`}
          alt=""
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 30%',
          }}
        />
        {/* Two stacked solid overlays — near-black with a faint blue tint */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.72)',
        }} />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(30,64,255,0.08)',
        }} />

        {/* Hero content — left-aligned */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          paddingLeft: 'clamp(24px, 5vw, 80px)',
          paddingRight: 'clamp(24px, 5vw, 80px)',
          maxWidth: 720,
        }}>
          <p style={labelStyle}>THE TEAM</p>
          <p style={{
            ...valueStyle,
            fontSize: 24,
            margin: '0 0 14px',
            maxWidth: 560,
          }}>
            The sponsors, families, and supporters who make<br />
            this Olympic campaign possible.
          </p>
          <p style={{
            ...labelStyle,
            margin: '0 0 22px',
          }}>
            LA 2028 CAMPAIGN · BUILT BY MANY HANDS
          </p>
          <div>
            <button
              onClick={() => onNavigate('Support')}
              className="chrome-text"
              style={{
                // leave `background` unset so .chrome-text's gradient can paint
                // (background-clip: text needs that gradient as the background source)
                border: 'none',
                cursor: 'pointer',
                padding: '10px 28px',
                paddingLeft: 0,
                fontSize: 15,
                fontWeight: 500,
                letterSpacing: '-0.3px',
                fontFamily: 'inherit',
              }}
            >
              Support the Campaign
            </button>
          </div>
        </div>
      </div>

      {/* Sponsors grid */}
      <div style={{ ...entrance.style(1), maxWidth: 1100, margin: '0 auto', padding: '0 40px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 12,
        }}>
          {SPONSORS.map((s) => (
            <SponsorCard key={s.name} sponsor={s} />
          ))}
        </div>
      </div>

      {/* Individual Supporters */}
      <div style={{
        ...entrance.style(2),
        maxWidth: 900,
        margin: '0 auto',
        padding: '80px 40px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <p style={labelStyle}>INDIVIDUAL SUPPORTERS</p>
          <p style={{ ...valueStyle, fontSize: 24, margin: 0 }}>
            Those Who Show Up
          </p>
        </div>
        <div style={{ maxWidth: 420, margin: '0 auto' }}>
          {SUPPORTERS.map((s) => (
            <SupporterRow key={s.name} supporter={s} />
          ))}
          {Array.from({ length: EMPTY_SLOTS }).map((_, i) => (
            <div key={`empty-${i}`} style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '14px 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <span style={{
                width: 6, height: 6,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'transparent',
                flexShrink: 0,
              }} />
              <span style={{
                fontSize: 14,
                fontWeight: 400,
                letterSpacing: '-0.2px',
                fontStyle: 'italic',
                color: 'rgba(255,255,255,0.2)',
              }}>
                Your Name
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Thin divider */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', maxWidth: 120, margin: '0 auto' }} />

      {/* Thank-you letter */}
      <div style={{ ...entrance.style(4), maxWidth: 900, margin: '0 auto', padding: '50px 40px 40px' }}>
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
