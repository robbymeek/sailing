import { useState } from 'react'
import Footer from '../components/Footer'
import usePageEntrance from '../hooks/usePageEntrance'

const BASE = import.meta.env.BASE_URL

const SPONSORS = [
  {
    name: 'AA ENT & Facial Plastic Surgery',
    img: 'AAENT-Logo.png',
    url: 'https://aaentmd.com/',
    bg: '#000',
    hoverBg: 'rgb(0,80,255)',
    desc: 'Leading ENT and facial plastic surgery practice providing world-class care.',
  },
  {
    name: 'US Sailing Team',
    img: 'us-sailing-team-logo.png',
    url: 'https://www.ussailing.org/teams/ussailingteam/',
    bg: 'rgb(10,20,50)',
    hoverBg: 'rgb(180,30,30)',
    desc: 'The national sailing team representing the United States at the Olympic Games.',
  },
  {
    name: 'Sailing Foundation of New York',
    img: 'sfny-logo.png',
    url: 'https://sfny.org/',
    bg: '#fff',
    hoverBg: 'rgb(10,10,10)',
    desc: 'Supporting competitive sailors and maritime education across the country.',
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
        background: sponsor.bg,
        padding: '40px 24px',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
        textDecoration: 'none',
        transition: 'transform 0.4s ease, box-shadow 0.4s ease',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        boxShadow: hovered ? '0 12px 40px rgba(0,0,0,0.4)' : '0 0 0 rgba(0,0,0,0)',
        minHeight: 180,
        zIndex: hovered ? 2 : 1,
      }}
    >
      <img
        src={`${BASE}${sponsor.img}`}
        alt={sponsor.name}
        style={{
          maxWidth: '70%', maxHeight: 70, objectFit: 'contain',
          transition: 'filter 0.4s ease, transform 0.4s ease',
          filter: hovered ? 'brightness(1.3)' : 'brightness(1)',
          transform: hovered ? 'scale(1.08)' : 'scale(1)',
        }}
      />
      {/* Description on hover */}
      <div style={{
        maxHeight: hovered ? 60 : 0,
        opacity: hovered ? 1 : 0,
        overflow: 'hidden',
        transition: 'max-height 0.4s ease, opacity 0.3s ease 0.1s',
        marginTop: hovered ? 16 : 0,
      }}>
        <p style={{
          color: sponsor.bg === '#fff' ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)',
          fontSize: 11, textAlign: 'center', lineHeight: 1.5, margin: 0,
        }}>{sponsor.desc}</p>
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
  { name: 'Annapolis YC' },
]

const EMPTY_SLOTS = 4

export default function Team({ onNavigate }) {
  const entrance = usePageEntrance(5, { staggerMs: 100, initialDelayMs: 50 })

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Full page background photo */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img
          src={`${BASE}IMG_5854.JPG`}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 30%',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(18,0,120,0.88)',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '60px 20px 80px' }}>
          <h1 style={{
            color: '#fff', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800,
            letterSpacing: '-2px', margin: '0 0 12px', textTransform: 'uppercase',
          }}>The Team</h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 500,
            margin: '0 auto 24px', lineHeight: 1.6,
          }}>
            The sponsors, families, and supporters who make this Olympic campaign possible.
          </p>
          <button
            onClick={() => onNavigate('Support')}
            style={{
              display: 'inline-block',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13, fontWeight: 400,
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '10px 28px',
              background: 'none', cursor: 'pointer',
            }}
          >
            Support the Campaign
          </button>
        </div>

        {/* Sponsors — bold full-width blocks with harsh lines */}
        <div style={{ ...entrance.style(1), maxWidth: 1000, margin: '0 auto', padding: '0 40px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}>
            {SPONSORS.map((s) => (
              <SponsorCard key={s.name} sponsor={s} />
            ))}
          </div>
        </div>

        {/* Action photo strip between sponsors and supporters */}
        <div style={{ ...entrance.style(2), position: 'relative', height: 250, overflow: 'hidden' }}>
          <img
            src={`${BASE}IMG_5957 2.JPG`}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 20%',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(18,0,120,0.6) 0%, rgba(18,0,120,0.3) 50%, rgba(18,0,120,0.6) 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <p style={{
              color: '#fff', fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 800,
              letterSpacing: '-1px', textTransform: 'uppercase',
              textAlign: 'center',
            }}>
              LA 2028
            </p>
          </div>
        </div>

        {/* Individual Supporters — bold cards */}
        <div style={{ ...entrance.style(3), padding: '50px 40px' }}>
          <p style={{
            color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '2px', marginBottom: 24, textAlign: 'center',
          }}>
            Individual Supporters
          </p>
          <div style={{
            display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 0,
            maxWidth: 900, margin: '0 auto',
          }}>
            {SUPPORTERS.map((s) => {
              const card = (
                <div key={s.name} style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderLeft: '3px solid rgb(0,120,255)',
                  padding: '14px 24px',
                  color: '#fff',
                  fontSize: 14, fontWeight: 600,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  width: '100%', maxWidth: 280,
                }}>
                  {s.name}
                </div>
              )
              return s.url ? (
                <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', width: '100%', maxWidth: 280 }}>
                  {card}
                </a>
              ) : <div key={s.name} style={{ width: '100%', maxWidth: 280 }}>{card}</div>
            })}
            {Array.from({ length: EMPTY_SLOTS }).map((_, i) => (
              <div key={`empty-${i}`} style={{
                background: 'transparent',
                borderLeft: '3px solid rgba(255,255,255,0.08)',
                padding: '14px 24px',
                color: 'rgba(255,255,255,0.2)',
                fontSize: 14, fontStyle: 'italic',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                width: '100%', maxWidth: 280,
              }}>
                Your Name
              </div>
            ))}
          </div>
        </div>

        {/* White accent line */}
        <div style={{ height: 2, background: 'rgba(255,255,255,0.1)', maxWidth: 120, margin: '0 auto' }} />

        {/* Thank you letter — with sailing photo alongside */}
        <div style={{ ...entrance.style(4), maxWidth: 900, margin: '0 auto', padding: '50px 40px 40px' }}>
          <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Photo */}
            <div style={{ flex: '0 0 auto', width: 'clamp(200px, 25vw, 280px)' }}>
              <img
                src={`${BASE}IMG_5958.JPG`}
                alt=""
                style={{ width: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ height: 3, background: 'rgb(0,120,255)' }} />
            </div>
            {/* Letter */}
            <div style={{ flex: 1, minWidth: 280 }}>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                I wanted to take a moment to express my deepest gratitude for any and all guidance and support throughout my Olympic sailing journey. Belief in me has meant more than words can say, and it has been one of the driving forces behind every step I have taken on this path.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                Some of you have been with me since the very beginning, learning to sail on the Chesapeake Bay, to racing for the United States on the world stage. Whether it was encouragement after a tough regatta, advice on a difficult decision, or simply the confidence that someone believed in what I was working toward, those moments have shaped who I am as a sailor and as a person.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                As I look ahead to this chapter of dedicating myself full-time to the LA 2028 Olympic campaign, I will carry forward everything I learn. The discipline, the resilience, the joy of competition, and the understanding that no great achievement is ever accomplished alone.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
                Thank you for being part of this journey. I am incredibly fortunate to have people in my corner, and I promise to continue working every day.
              </p>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.8, marginBottom: 4 }}>
                With my sincerest thanks and appreciation,
              </p>
              <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.8 }}>Robby</p>
            </div>
          </div>
        </div>

        <Footer variant="blue" onNavigate={onNavigate} />
      </div>
    </div>
  )
}
