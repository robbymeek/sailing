import { useState, useEffect, useRef } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'

const BASE = import.meta.env.BASE_URL

const REGATTAS = [
  {
    date: '27 MAR', month: 'MAR',
    status: 'FINISHED',
    name: 'Trofeo Princesa Sofia',
    league: 'Grand Slam',
    location: 'Palma, Spain',
    past: true,
  },
  {
    date: '16 MAY', month: 'MAY',
    status: 'UPCOMING',
    name: 'European Championships',
    league: 'Senior Europeans',
    location: 'Split, Croatia',
    current: true,
  },
  {
    date: '20 JUL', month: 'JUL',
    status: 'UPCOMING',
    name: 'San Pedro OCR',
    league: 'Olympic Classes',
    location: 'Los Angeles, CA',
  },
]

const PRESS = [
  { t: 'ILCAs dominate US Open Long Beach', u: 'https://www.sailingscuttlebutt.com/2023/07/16/ilcas-dominate-us-open-long-beach/' },
  { t: 'School Nationals for Singlehanded titles', u: 'https://www.sailingscuttlebutt.com/2023/07/16/ilcas-dominate-us-open-long-beach/' },
  { t: 'Meek, Braun win High School Nationals', u: 'https://www.sailingscuttlebutt.com/2021/12/19/meek-braun-win-high-school-nationals/' },
  { t: 'Robby Meek Named NEISA Open Sailor of the Week', u: 'https://gocrimson.com/news/2024/9/18/sailing-robby-meek-named-neisa-open-sailor-of-the-week' },
  { t: 'ILCA 6 Youth Worlds: quest for best', u: 'https://www.sailingscuttlebutt.com/2021/07/28/ilca-6-youth-worlds-midway-point/' },
  { t: 'ILCA 6 Youth Worlds: Midway point', u: 'https://www.sailingscuttlebutt.com/2021/07/30/ilca-6-youth-worlds-quest-for-best/' },
  { t: 'Robby Meek feed this week. Congrats goes out to the sophomore!', u: 'https://www.threads.com/@harvardsailing/post/DAEgzXRvfyN' },
  { t: 'Robby Meek - 2022 West Marine US Open Sailing Series', u: 'https://www.sail-world.com/photo/345661' },
  { t: 'No. 1 Sailing Wins 2025 ICSA Open Team Race National Championship', u: 'https://gocrimson.com/news/2025/4/26/no-1-sailing-wins-2025-icsa-open-team-race-national-championship.aspx' },
]

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

export default function Biography({ onNavigate, scrollOffsetRef }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const imageRef = useRef(null)
  const text1Ref = useRef(null)
  const text2Ref = useRef(null)
  const ilcaRef = useRef(null)
  const eventsRef = useRef(null)

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 700
  )
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const olympic = useCountdown(new Date('2028-07-14T00:00:00'))
  const nextEvent = useCountdown(new Date('2026-05-16T00:00:00'))

  // Parallax: text moves faster than image, image moves faster than page
  // When embedded (scrollOffsetRef), subtract the container's top so
  // parallax starts from zero when the biography section scrolls into view.
  useEffect(() => {
    let rafId
    const update = () => {
      let y = window.scrollY
      if (scrollOffsetRef?.current) {
        const rect = scrollOffsetRef.current.getBoundingClientRect()
        y = Math.max(0, -rect.top)
      }
      if (imageRef.current) {
        imageRef.current.style.transform = `translateY(-${y * 0.3}px)`
      }
      if (text1Ref.current) {
        text1Ref.current.style.transform = `translateY(-${y * 0.55}px)`
      }
      if (text2Ref.current) {
        text2Ref.current.style.transform = `translateY(-${y * 0.5}px)`
      }
      if (ilcaRef.current) {
        ilcaRef.current.style.transform = `translateY(-${y * 0.45}px)`
      }
      rafId = requestAnimationFrame(update)
    }
    rafId = requestAnimationFrame(update)
    return () => cancelAnimationFrame(rafId)
  }, [scrollOffsetRef])


  return (
    <div style={{ background: 'rgb(230,235,240)', minHeight: '100vh' }}>

      {/* ===== HERO SECTION — Messi-inspired parallax ===== */}
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
        background: 'rgb(230,235,240)',
      }}
        className="bio-hero"
      >
        {/* Left side: Image of me + text banners */}
        <div className="bio-left-side" style={{
          position: 'absolute', bottom: 0, left: 0,
          width: '55%', height: '100%',
          display: 'flex', alignItems: 'flex-end',
          zIndex: 2,
        }}>
          {/* Cutout image — starts below text, scrolls up */}
          <div ref={imageRef} style={{
            position: 'absolute', top: '40%', left: '5%',
            width: '85%', maxWidth: 500,
            willChange: 'transform',
          }}>
            <img
              src={`${BASE}IMG_5957 2.JPG`}
              alt="Robby Meek hiking"
              style={{
                width: '100%', display: 'block',
                filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
              }}
            />
          </div>
        </div>

        {/* Text banners — left-aligned, scroll faster */}
        <div className="bio-text-banners" style={{
          position: 'absolute', left: 0, top: '12%',
          zIndex: 3, pointerEvents: 'none',
        }}>
          <div ref={text1Ref} style={{ willChange: 'transform' }}>
            <div style={{
              background: 'rgba(255,255,255,0.85)',
              padding: '12px 40px 12px 40px',
              marginBottom: 4,
              display: 'inline-block',
            }}>
              <span style={{
                color: 'rgb(18,0,120)', fontSize: 'clamp(20px, 3vw, 36px)',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-1px',
              }}>
                Welcome to Robby Meek's
              </span>
            </div>
          </div>
          <div ref={text2Ref} style={{ willChange: 'transform' }}>
            <div style={{
              background: 'rgb(18,0,120)',
              padding: '14px 40px 14px 40px',
              marginBottom: 4,
              display: 'inline-block',
            }}>
              <span style={{
                color: '#fff', fontSize: 'clamp(24px, 3.5vw, 44px)',
                fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px',
              }}>
                Website and Biography
              </span>
            </div>
          </div>
          <div ref={ilcaRef} style={{ willChange: 'transform' }}>
            <div style={{
              background: 'rgb(0,80,255)',
              padding: '10px 40px',
              display: 'inline-block',
            }}>
              <img
                src={`${BASE}ilca-logo.png`}
                alt="ILCA"
                style={{
                  height: 'clamp(24px, 3vw, 40px)',
                  filter: 'brightness(0) invert(1)',
                  display: 'block',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right side: Regatta cards + logos wrapper */}
        <div className="bio-events-wrapper" style={{
          position: 'absolute', right: '3%', top: '50%',
          transform: 'translateY(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          zIndex: 2,
          maxWidth: '60%',
        }}>
        <div style={{
          display: 'flex', flexDirection: 'row', gap: 14,
          alignItems: 'center',
        }}
          className="bio-regatta-cards"
        >
          {REGATTAS.map((r, i) => {
            const isMid = r.current
            return (
            <div key={i} className="bio-regatta-card" onClick={() => eventsRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{
              cursor: 'pointer',
              background: r.current ? 'rgb(18,0,120)' : 'rgb(50,55,65)',
              padding: '0',
              flex: isMid ? '1.2 1 0' : '1 1 0',
              minWidth: 0,
              minHeight: isMid ? 480 : 320,
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Date badge */}
              <div className="card-date-badge" style={{
                background: r.current ? 'rgb(0,80,255)' : 'rgba(255,255,255,0.1)',
                padding: isMid ? '24px 16px' : '18px 16px',
                textAlign: 'center',
              }}>
                <div className="card-date-num" style={{
                  color: '#fff', fontSize: isMid ? 48 : 36, fontWeight: 800,
                  lineHeight: 1,
                }}>{r.date.split(' ')[0]}</div>
                <div className="card-date-month" style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: isMid ? 14 : 12, fontWeight: 600,
                  letterSpacing: '1px', marginTop: 4,
                }}>{r.month}</div>
              </div>
              {/* Content */}
              <div className="card-body" style={{
                padding: isMid ? '20px 16px 28px' : '16px 14px 22px',
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div className="card-status" style={{
                  color: r.current ? 'rgb(0,180,255)' : r.past ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)',
                  fontSize: 10, fontWeight: 700, letterSpacing: '1px',
                  marginBottom: 10, textTransform: 'uppercase',
                }}>{r.status}</div>
                <div className="card-name" style={{
                  color: '#fff', fontSize: isMid ? 20 : 16, fontWeight: 700,
                  marginBottom: 8, lineHeight: 1.3,
                }}>{r.name}</div>
                <div className="card-league" style={{
                  color: 'rgba(255,255,255,0.5)', fontSize: 12,
                  marginBottom: 6,
                }}>{r.league}</div>
                <div className="card-location" style={{
                  color: 'rgba(255,255,255,0.35)', fontSize: 11,
                }}>{r.location}</div>
              </div>
            </div>
            )
          })}
        </div>

        {/* Logos — centered under event cards */}
        <div className="bio-logos" style={{
          display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'center',
          marginTop: 24,
        }}>
          <div style={{
            width: 90, height: 90,
            perspective: '600px',
          }}>
            <img
              src={`${BASE}Harvard-Crimson-Logo-2002.png`}
              alt="Harvard Crimson"
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                transform: 'rotateY(-8deg) rotateX(4deg)',
                filter: 'drop-shadow(4px 8px 16px rgba(0,0,0,0.35))',
                transition: 'transform 0.3s ease',
              }}
            />
          </div>
          <div style={{
            width: 90, height: 90,
            perspective: '600px',
          }}>
            <img
              src={`${BASE}us-sailing-team-logo.png`}
              alt="US Sailing Team"
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                transform: 'rotateY(8deg) rotateX(4deg)',
                filter: 'drop-shadow(4px 8px 16px rgba(0,0,0,0.35))',
                transition: 'transform 0.3s ease',
              }}
            />
          </div>
        </div>
        </div>

      </div>

      {/* ===== BIO CONTENT — blue section ===== */}
      <div style={{ background: 'rgb(18,0,120)', position: 'relative', zIndex: 5 }}>

        {/* Stats — bold, immediate */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 'clamp(40px, 8vw, 100px)',
          padding: '60px 20px 50px', maxWidth: 900, margin: '0 auto', flexWrap: 'wrap',
        }}>
          {[['6x', 'National Champion'], ['3x', 'Continental Champion'], ['9+', 'Years in ILCA']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 56, fontWeight: 800, letterSpacing: '-2px' }}>{n}</div>
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 500, marginTop: 4, textTransform: 'uppercase', letterSpacing: '1px' }}>{l}</div>
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', maxWidth: 900, margin: '0 auto' }} />

        {/* Bio text — clean two-column on desktop */}
        <div style={{
          maxWidth: 900, margin: '0 auto', padding: '50px 40px',
          display: 'flex', gap: 40, flexWrap: 'wrap',
        }}>
          <div style={{ flex: '1 1 380px', minWidth: 280 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, margin: '0 0 20px' }}>
              I'm currently campaigning for the 2028 Olympic Games in the ILCA 7, the men's single-handed sailing class. I've been sailing since I was six years old and started racing at nine years old. 3 years later at age twelve I began racing in the ILCA. Since then, I've been fortunate to win six national championships and three continental titles.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              I now compete as part of the Harvard Sailing Team while studying Applied Mathematics and Economics at Harvard College. At Harvard, I serve as Team Captain and have won the Team Race National Championship and the Single-Handed National Championship.
            </p>
          </div>
          <div style={{ flex: '1 1 380px', minWidth: 280 }}>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, margin: '0 0 20px' }}>
              Originally from Annapolis, Maryland, sailing has always been a central part of my life. Outside of training and academics, I enjoy painting, cooking, and spending time with my family.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, margin: 0 }}>
              I'm incredibly grateful for the opportunity to accomplish my Olympic dream and excited for everything the journey ahead holds.
            </p>
          </div>
        </div>
      </div>

      {/* ===== EVENTS SECTION — black background ===== */}
      <div ref={eventsRef} style={{ background: 'rgb(0,0,0)', position: 'relative', zIndex: 5 }}>

        {/* Sticky scope: header + first batch of events. The sticky header
             naturally releases when this wrapper ends, before the last 4 events. */}
        <div>
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: 'rgb(0,0,0)',
            textAlign: 'center',
            padding: '40px 20px 20px',
          }}>
            <h1 style={{
              color: '#fff', fontSize: 80, fontWeight: 800,
              letterSpacing: '-4px', margin: '0 0 10px',
            }}>LA 2028</h1>
            <p style={{
              color: 'rgb(153,153,153)', fontSize: 18, fontWeight: 500, margin: '0 0 8px',
            }}>
              {olympic.days} : {String(olympic.hrs).padStart(2, '0')} : {String(olympic.mins).padStart(2, '0')} : {String(olympic.secs).padStart(2, '0')}
            </p>

            <div style={{ margin: '28px 0 12px' }}>
              <p
                className="chrome-text"
                style={{
                  fontSize: 'clamp(12px, 1.8vw, 16px)',
                  fontWeight: 600,
                  letterSpacing: '-0.3px',
                  margin: 0,
                  whiteSpace: 'nowrap',
                }}
              >
                Next Event: European Championships, Split in {nextEvent.days} Days
              </p>
            </div>

            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '16px 0 0' }}>
              Click on event to learn more.
            </p>
          </div>

          {/* Events that scroll under the sticky header */}
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px 0' }}>
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
              {EVENTS.slice(0, EVENTS.length - 4).map((e, i) => (
                <EventRow
                  key={i}
                  event={e}
                  isActive={selectedEvent === e}
                  onActivate={() => setSelectedEvent(e)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Last 4 events — outside the sticky scope, header scrolls away */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 40px 40px' }}>
          {EVENTS.slice(EVENTS.length - 4).map((e, i) => (
            <EventRow
              key={i + EVENTS.length - 4}
              event={e}
              isActive={selectedEvent === e}
              onActivate={() => setSelectedEvent(e)}
            />
          ))}
        </div>

        {selectedEvent && (
          <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </div>

      {/* ===== MOBILE NAV BUTTONS — between events and press ===== */}
      {isMobile && (
        <div style={{
          background: 'rgb(12,14,18)',
          padding: '48px 24px',
          textAlign: 'center',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: 12,
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            marginBottom: 28,
          }}>
            Explore more
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxWidth: 280,
            margin: '0 auto',
          }}>
            {[
              { label: 'Path & Team', page: 'Path' },
              { label: 'Contact', page: 'Contact' },
              { label: 'Support', page: 'Support' },
            ].map(({ label, page }) => (
              <button
                key={page}
                onClick={() => onNavigate(page)}
                style={{
                  padding: '14px 24px',
                  fontSize: 15,
                  fontWeight: 500,
                  letterSpacing: '0.5px',
                  color: '#fff',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'background 0.2s ease, border-color 0.2s ease',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===== PRESS + FOOTER — black section ===== */}
      <div style={{ background: 'rgb(0,0,0)', position: 'relative', zIndex: 5 }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px 60px' }}>
          <p style={{
            color: 'rgba(255,255,255,0.7)', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '2px', marginBottom: 20,
          }}>Press</p>
          {PRESS.map((item, i) => (
            <a
              key={i}
              href={item.u}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                padding: '14px 0',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                textDecoration: 'none',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13,
              }}
            >
              {item.t}
            </a>
          ))}
        </div>

        <Footer variant="dark" onNavigate={onNavigate} />
      </div>
    </div>
  )
}
