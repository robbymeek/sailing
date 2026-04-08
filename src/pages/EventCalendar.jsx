import { useState, useEffect } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'

const EVENTS = [
  {
    n: 'Upcoming: European Championships (July)',
    d: 'July 2026',
    upcoming: true,
    summary: 'The ILCA European Championships bring together the top sailors from across Europe and beyond. A critical event for Olympic qualification points and fleet racing experience at the highest level.',
    url: 'https://www.ilca-class.org',
  },
  {
    n: 'Upcoming: Midwinters Easy (Feb)',
    d: 'February 2026',
    upcoming: true,
    summary: 'Annual winter regatta held in warm waters, providing essential training and competitive racing during the off-season. A staple event for ILCA sailors on the East Coast.',
    url: 'https://www.clearwatersailing.com',
  },
  {
    n: 'Past: Miami Training Block',
    d: 'November 2025',
    summary: 'Intensive training block in Miami focused on boat speed, fitness, and race preparation with members of the US Sailing Team in Biscayne Bay conditions.',
  },
  {
    n: 'Past: Vilamoura Grand-Prix',
    d: 'November 2025',
    summary: 'International grand-prix regatta in Vilamoura, Portugal. A high-level European fleet racing event with strong Atlantic Ocean conditions.',
    url: 'https://www.vilamoura-sailing.com',
  },
  {
    n: 'Past: College Single-handed National Championship',
    d: 'November 2025',
    summary: 'The premier college single-handed sailing championship. Won the national title representing Harvard in the ILCA fleet.',
  },
  {
    n: 'Past: Miami Training',
    d: 'November 2025',
    summary: 'Continuation of Miami-based training with focus on starts, upwind speed, and tactical decision-making in shifty bay conditions.',
  },
  {
    n: 'Past: European Championship',
    d: 'August 2025',
    summary: 'Competed at the ILCA 7 European Championship. Finished as the top American in a fleet of over 200 sailors from across the continent.',
    url: 'https://www.ilca-class.org',
  },
  {
    n: 'Past: Long Beach Olympic Classes',
    d: 'July 2025',
    summary: 'Olympic classes regatta on the 2028 Olympic venue waters in Long Beach, California. Critical for learning the local conditions ahead of LA 2028.',
  },
  {
    n: 'Past: Kiel Week',
    d: 'June 2025',
    summary: 'One of the world\'s largest and most prestigious sailing events, held annually in Kiel, Germany. Features world-class competition across all Olympic classes.',
    url: 'https://www.kieler-woche.de',
  },
  {
    n: 'Past: North American Championship',
    d: 'June 2025',
    summary: 'The ILCA North American Championship. Won the title of top North American sailor against a competitive continental fleet.',
  },
  {
    n: 'Past: LA Training',
    d: 'June 2025',
    summary: 'Training in Los Angeles waters to build familiarity with the Olympic venue. Focused on the unique thermal breeze and current patterns of the LA coast.',
  },
]

function EventRow({ event }) {
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: hovered ? '22px 20px' : '18px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        background: hovered ? 'rgb(0,20,120)' : 'transparent',
        borderRadius: hovered ? 6 : 0,
        margin: hovered ? '4px -20px' : '0',
        transition: 'all 0.25s ease',
      }}
    >
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          color: event.upcoming ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)',
          fontSize: 14, fontWeight: event.upcoming ? 500 : 400,
        }}>{event.n}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, flexShrink: 0, marginLeft: 16 }}>{event.d}</span>
      </div>
    </div>
  )
}

function EventModal({ event, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgb(15,25,60)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '36px 40px',
          maxWidth: 520,
          width: '100%',
        }}
      >
        <h2 style={{
          color: '#fff', fontSize: 18, fontWeight: 600,
          margin: '0 0 6px', letterSpacing: '-0.3px',
        }}>
          {event.n}
        </h2>
        <p style={{
          color: 'rgba(255,255,255,0.35)', fontSize: 13,
          margin: '0 0 20px',
        }}>
          {event.d}
        </p>
        <p style={{
          color: 'rgba(255,255,255,0.75)', fontSize: 14,
          lineHeight: 1.7, margin: '0 0 24px',
        }}>
          {event.summary}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.5)',
                fontSize: 13, fontWeight: 400,
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '8px 20px',
                textDecoration: 'none',
                borderRadius: 4,
              }}
            >
              Event Page
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.35)', fontSize: 13,
              padding: '8px 20px', cursor: 'pointer',
              borderRadius: 4,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default function EventCalendar({ onNavigate }) {
  useEffect(() => { document.body.style.background = 'rgb(0,0,0)' }, [])

  const [selected, setSelected] = useState(null)
  const target = new Date('2028-07-14T00:00:00')
  const { days, hrs, mins, secs } = useCountdown(target)

  return (
    <div style={{ background: 'rgb(0,0,0)', minHeight: '100vh' }}>
      <Nav current="Event Calendar" onNavigate={onNavigate} variant="dark" />

      <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
        <h1 style={{
          color: '#fff', fontSize: 100, fontWeight: 800,
          letterSpacing: '-4px', margin: '0 0 10px',
        }}>LA 2028</h1>
        <p style={{
          color: 'rgb(153,153,153)', fontSize: 18, fontWeight: 500, margin: '0 0 8px',
        }}>
          {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} : {String(secs).padStart(2, '0')}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>
          Click on event to learn more.
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 40px' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {EVENTS.map((e, i) => (
            <div key={i} onClick={() => setSelected(e)}>
              <EventRow event={e} />
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <EventModal event={selected} onClose={() => setSelected(null)} />
      )}

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
