import { useState } from 'react'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'

const EVENTS = [
  {
    n: 'Upcoming: ILCA 7 Senior World Championship',
    d: 'August 2026',
    upcoming: true,
    summary: 'The ILCA 7 Senior World Championship in Ireland. The pinnacle event of the ILCA 7 calendar, bringing together the best sailors in the world to compete for the world title.',
    url: 'https://ilcasailing.org/',
  },
  {
    n: 'Upcoming: ILCA 7 European Championships',
    d: 'May 2026',
    upcoming: true,
    summary: 'The ILCA 7 Senior European Championships in Split, Croatia. A critical event for fleet racing experience at the highest international level, bringing together top sailors from across Europe and beyond.',
    url: 'https://eurilca.org/',
  },
  {
    n: 'Upcoming: San Pedro OCR',
    d: 'July 20\u201324, 2026',
    upcoming: true,
    summary: 'Olympic classes regatta in San Pedro on the LA 2028 Olympic venue waters. An important opportunity to race in the conditions and waters where the 2028 Olympic sailing events will be held.',
  },
  {
    n: 'Past: Trofeo Princesa Sofia \u2014 Palma',
    d: 'March 2026',
    summary: 'The 55th Trofeo Princesa Sofia in Palma de Mallorca, opening the 2026 Sailing Grand Slam season. One of the largest ILCA 7 fleets of the year with sailors from across all continents racing on the Bay of Palma.',
    url: 'https://www.trofeoprincesasofia.org/en/default/races/race',
  },
  {
    n: 'Past: Miami Training Block',
    d: 'November 2025',
    summary: 'Intensive training block in Miami focused on boat speed, fitness, and race preparation with members of the US Sailing Team in Biscayne Bay conditions.',
  },
  {
    n: 'Past: Vilamoura Grand-Prix',
    d: 'November 2025',
    summary: 'International ILCA 7 grand-prix regatta in Vilamoura, Portugal. A high-level European fleet racing event with strong Atlantic Ocean conditions.',
    url: 'https://www.vilamourasailing.com/events',
  },
  {
    n: 'Past: College Single-Handed National Championship \u{1F947}',
    d: 'November 2025',
    summary: 'The ICSA College Singlehanded National Championship hosted by Old Dominion University. Won the Open National Championship title representing Harvard.',
    url: 'https://collegesailing.org/championships/national-championships',
  },
  {
    n: 'Past: Miami Training',
    d: 'November 2025',
    summary: 'Continuation of Miami-based training with focus on starts, upwind speed, and tactical decision-making in shifty bay conditions.',
  },
  {
    n: 'Past: ILCA 7 European Championship \u{1F4AA}',
    d: 'August 2025',
    summary: 'The ILCA 7 Senior European Championships in Marstrand, Sweden. I was really happy with my performance here among the best in the world. A great learning experience racing against the top fleet on the international stage.',
    url: 'https://eurilca.org/2025-ilca-senior-european-championships-final-results/',
  },
  {
    n: 'Past: Long Beach Olympic Classes',
    d: 'July 2025',
    summary: 'ILCA 7 Olympic classes regatta on the 2028 Olympic venue waters in Long Beach, California. Critical for learning the local conditions ahead of LA 2028.',
  },
  {
    n: 'Past: Kiel Week',
    d: 'June 2025',
    summary: 'One of the world\'s largest and most prestigious sailing events, held annually in Kiel, Germany. Raced in the ILCA 7 fleet alongside world-class competition across all Olympic classes.',
    url: 'https://www.kieler-woche.de/en/sailing.php',
  },
  {
    n: 'Past: ILCA 7 North American Championship \u{1F947}',
    d: 'June 2025',
    summary: 'The ILCA 7 North American Championship hosted by Alamitos Bay Yacht Club. Won the title of top North American in the 45-boat ILCA 7 fleet.',
    url: 'https://ilcanasailing.org/major-regattas',
  },
  {
    n: 'Past: LA Training',
    d: 'June 2025',
    summary: 'Training in Los Angeles waters to build familiarity with the Olympic venue. Focused on the unique thermal breeze and current patterns of the LA coast.',
  },
]

function EventRow({ event, isActive, onActivate }) {
  const [hovered, setHovered] = useState(false)
  const highlighted = hovered || isActive

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onActivate()}
      style={{
        padding: highlighted ? '22px 20px' : '18px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        background: highlighted ? 'rgb(0,20,120)' : 'transparent',
        borderRadius: 0,
        margin: highlighted ? '4px -20px' : '0',
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
  const [selected, setSelected] = useState(null)
  const olympicTarget = new Date('2028-07-14T00:00:00')
  const olympic = useCountdown(olympicTarget)

  // Next event countdown — Europeans in Split, May 2026
  const nextEventTarget = new Date('2026-05-16T00:00:00')
  const nextEvent = useCountdown(nextEventTarget)

  const entrance = usePageEntrance(5, { staggerMs: 120, initialDelayMs: 0 })

  return (
    <div style={{ background: 'rgb(0,0,0)', minHeight: '100vh' }}>

      <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
        <h1 style={{
          color: '#fff', fontSize: 100, fontWeight: 800,
          letterSpacing: '-4px', margin: '0 0 10px',
        }}>LA 2028</h1>
        <p style={{
          ...entrance.style(1),
          color: 'rgb(153,153,153)', fontSize: 18, fontWeight: 500, margin: '0 0 8px',
        }}>
          {olympic.days} : {String(olympic.hrs).padStart(2, '0')} : {String(olympic.mins).padStart(2, '0')} : {String(olympic.secs).padStart(2, '0')}
        </p>

        {/* Next event countdown — chrome shimmer */}
        <div style={{ ...entrance.style(2), margin: '28px 0 12px' }}>
          <p
            className="chrome-text"
            style={{
              fontSize: 'clamp(16px, 2.5vw, 22px)',
              fontWeight: 800,
              letterSpacing: '-0.5px',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Next Event — European Championships, Split — {nextEvent.days} days
          </p>
        </div>

        <p style={{ ...entrance.style(3), color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '16px 0 0' }}>
          Click on event to learn more.
        </p>
      </div>

      <div style={{ ...entrance.style(4), maxWidth: 900, margin: '40px auto', padding: '0 40px' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {EVENTS.map((e, i) => (
            <EventRow
              key={i}
              event={e}
              isActive={selected === e}
              onActivate={() => setSelected(e)}
            />
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
