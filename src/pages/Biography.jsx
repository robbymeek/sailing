import { useState, useEffect, useRef } from 'react'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'
import useTextSpray from '../hooks/useTextSpray'
import EVENTS from '../data/events'
import { EventRow, BridgeRow, EventModal } from '../components/eventUI'
import ExitNav from '../components/ExitNav'
import SailingBanner from '../components/SailingBanner'
import { EXIT_CARDS } from '../components/exitCards'
import ctaBg from '../assets/home-intro/img-8856.jpg'

const BASE = import.meta.env.BASE_URL

// Support stays LAST in the stack on every page (bottom on mobile, far right on desktop).
const BIO_EXIT_LINKS = [EXIT_CARDS.home, EXIT_CARDS.team, EXIT_CARDS.contact, EXIT_CARDS.support]

const REGATTAS = [
  {
    date: '16 MAY', month: 'MAY',
    status: 'FINISHED',
    name: 'European Championships',
    league: 'Senior Europeans',
    location: 'Split, Croatia',
    past: true,
  },
  {
    // Centre card is the "Road to LA 2028" promo → The Road tour (see RoadCard).
    roadPromo: true,
    current: true,
  },
  {
    date: '17 AUG', month: 'AUG',
    status: 'UPCOMING',
    name: 'World Championship',
    league: 'Senior Worlds',
    location: 'Dún Laoghaire, Ireland',
    blue: true, // owner: the right card gets the blue treatment (greys read boring)
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
  { t: 'Olympic Class Racing Season Opens With Eyes on LA', u: 'https://www.sailingworld.com/racing/olympic-class-racing-season-opens-with-eyes-on-la/' },
]


// Centre regatta card, repurposed as a chrome "Road to LA 2028" promo: a sailing
// photo fades in from the bottom (transparent up top), chrome shimmer text, and a
// tap sends people to The Road tour.
function RoadCard({ isMid, isMobile, onNavigate, img }) {
  const [hover, setHover] = useState(false)
  const imgFade = 'linear-gradient(to bottom, transparent 8%, #000 58%)'
  return (
    <div
      className="bio-regatta-card"
      onClick={() => onNavigate('The Road', { from: 'Biography' })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        cursor: 'pointer', background: 'rgb(18,0,120)',
        flex: isMid ? '1.2 1 0' : '1 1 0', minWidth: 0,
        minHeight: isMid ? 'min(580px, 54vw)' : 'min(430px, 42vw)',
        position: 'relative', overflow: 'hidden',
        boxShadow: '0 14px 30px rgba(0,0,0,0.22)',
        display: 'flex', flexDirection: 'column',
        transition: 'transform 0.25s ease',
        transform: hover && !isMobile ? 'translateY(-4px)' : 'none',
      }}
    >
      {/* sailing photo, fading up to transparent so the top stays the blue card */}
      <img
        src={img}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: '70% center', // frame the USA 211414 sail
          WebkitMaskImage: imgFade, maskImage: imgFade,
          transform: hover ? 'scale(1.06)' : 'scale(1)',
          transition: 'transform 0.6s ease',
        }}
      />
      {/* bottom scrim grounds the photo's lower edge (kept after the CTA's removal) */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', background: 'linear-gradient(to top, rgba(0,0,0,0.72), transparent)' }} />

      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        padding: isMobile ? '14px 12px' : '22px 18px',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{
          color: 'rgba(255,255,255,0.8)', fontWeight: 700,
          fontSize: isMobile ? 8 : 11, letterSpacing: '2px', textTransform: 'uppercase',
          marginBottom: isMobile ? 6 : 12,
        }}>
          Up Next
        </div>
        <h3 className="chrome-text" style={{
          fontSize: isMobile ? 15 : 26, fontWeight: 800, letterSpacing: '-0.6px',
          lineHeight: 1.08, margin: 0,
        }}>
          The Road to LA 2028
        </h3>
      </div>
    </div>
  )
}

// preload: App mounts a hidden off-screen copy for snappier transitions —
// that copy must never boot the RESULTS spray effect (see useTextSpray).
export default function Biography({ onNavigate, scrollOffsetRef, preload = false }) {
  const [selectedEvent, setSelectedEvent] = useState(null)
  const rootRef = useRef(null)
  const imageRef = useRef(null)
  const text1Ref = useRef(null)
  const text2Ref = useRef(null)
  const ilcaRef = useRef(null)
  const eventsRef = useRef(null)
  const resultsRef = useRef(null)
  const nextEventRef = useRef(null)
  const hintRef = useRef(null)
  // Mirror for the spray module: pause the overlay while the event modal is
  // open (the modal shares the events section's stacking context, and spray
  // must not drift over it).
  const sprayPausedRef = useRef(false)
  useEffect(() => {
    sprayPausedRef.current = selectedEvent !== null
  }, [selectedEvent])

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 700
  )
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const nextEvent = useCountdown(new Date('2026-07-20T00:00:00'))

  // RESULTS sea-spray dissolve — replaces the old sticky banner. The headline
  // scrolls naturally; as its letters cross the top edge of the viewport they
  // atomize into wind-blown spray, and scrolling back reassembles them.
  useTextSpray(resultsRef, {
    enabled: !preload,
    palette: 'white',
    containerRef: eventsRef,
    zIndex: 20,
    fadeRefs: [nextEventRef, hintRef],
    pausedRef: sprayPausedRef,
  })

  // Parallax: text moves faster than image, image moves faster than page.
  // Based on the PAGE ROOT's top edge (owner request): the effect starts the
  // second you scroll — while the video banner is still on screen — not only
  // once the white hero reaches the viewport top. One formula for both modes
  // (standalone: root top == -scrollY; embedded in MobileHome: root top is
  // the biography section's own offset).
  useEffect(() => {
    if (preload) return undefined // hidden preload copy: no rAF churn
    let rafId
    const update = () => {
      let y = 0
      if (rootRef.current) {
        y = Math.max(0, -rootRef.current.getBoundingClientRect().top)
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
  }, [preload])


  return (
    <div ref={rootRef} style={{ background: 'rgb(230,235,240)', minHeight: '100vh' }}>

      {/* ===== OPENING HERO — the sailing film, nav floating over it =====
           hero only on the standalone route (embedded MobileHome plays it
           mid-page; the hidden preload copy renders it inert — no <video>,
           or every route would download the film). */}
      <SailingBanner
        isMobile={isMobile}
        hero={!scrollOffsetRef && !preload}
        inert={preload}
      />

      {/* ===== INTRO SECTION — Messi-inspired parallax =====
           overflow visible + z2 (> banner's z1): the parallax bars and photo
           rise OVER the film strip as you scroll instead of clipping at the
           hero's top edge. Downward photo bleed is covered by the blue bio
           section (z5). */}
      <div style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'visible',
        background: 'rgb(230,235,240)',
        zIndex: 2,
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
              marginBottom: 12,
              display: 'inline-block',
              boxShadow: '0 12px 32px rgba(8,12,60,0.30)',
            }}>
              <span style={{
                color: 'rgb(18,0,120)', fontSize: 'clamp(18px, 2.6vw, 28px)',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-1px',
              }}>
                3x Continental Champion
              </span>
            </div>
          </div>
          <div ref={text2Ref} style={{ willChange: 'transform' }}>
            <div style={{
              background: 'rgb(18,0,120)',
              padding: '14px 40px 14px 40px',
              marginBottom: 12,
              display: 'inline-block',
              boxShadow: '0 12px 32px rgba(8,12,60,0.30)',
            }}>
              <span style={{
                color: '#fff', fontSize: 'clamp(20px, 2.9vw, 34px)',
                fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-1px',
              }}>
                6x National Champion
              </span>
            </div>
          </div>
          <div ref={ilcaRef} style={{ willChange: 'transform' }}>
            <div style={{
              background: 'rgb(0,80,255)',
              padding: '10px 40px',
              display: 'inline-flex', alignItems: 'center', gap: 14,
              boxShadow: '0 12px 32px rgba(8,12,60,0.30)',
            }}>
              <span style={{
                color: '#fff', fontSize: 'clamp(16px, 2.2vw, 28px)',
                fontWeight: 800, textTransform: 'uppercase', letterSpacing: '-0.5px',
                lineHeight: 1,
              }}>
                9+ Years in the
              </span>
              <img
                src={`${BASE}ilca-logo.png`}
                alt="ILCA"
                style={{
                  // sized to the same clamp as the text so logo == "font size"
                  height: 'clamp(16px, 2.2vw, 28px)',
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
          // Reserve a 620px lane for the text banners on the left: the widest
          // bar tops out ≈550px (font caps chosen to guarantee it), so the
          // cards can never overlap the stats at rest (owner: the collision
          // looked messy). Wide screens cap at 58% / the cards' max-content.
          maxWidth: 'min(58%, calc(100% - 620px))',
        }}>
        <div style={{
          display: 'flex', flexDirection: 'row', gap: 14,
          alignItems: 'center',
        }}
          className="bio-regatta-cards"
        >
          {REGATTAS.map((r, i) => {
            const isMid = r.current
            if (r.roadPromo) {
              return <RoadCard key={i} isMid={isMid} isMobile={isMobile} onNavigate={onNavigate} img={ctaBg} />
            }
            return (
            <div key={i} className="bio-regatta-card" onClick={() => eventsRef.current?.scrollIntoView({ behavior: 'smooth' })} style={{
              cursor: 'pointer',
              background: (r.current || r.blue) ? 'rgb(18,0,120)' : 'rgb(50,55,65)',
              padding: '0',
              flex: isMid ? '1.2 1 0' : '1 1 0',
              minWidth: 0,
              // Skinny-and-TALL towers (owner request) — vw caps keep the
              // proportions sane as the banner lane squeezes the row.
              minHeight: isMid ? 'min(580px, 54vw)' : 'min(430px, 42vw)',
              boxShadow: '0 14px 30px rgba(0,0,0,0.22)',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Date badge */}
              <div className="card-date-badge" style={{
                background: (r.current || r.blue) ? 'rgb(0,80,255)' : 'rgba(255,255,255,0.1)',
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
                  color: (r.current || r.blue) ? 'rgb(0,180,255)' : r.past ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.5)',
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

      {/* ===== BIO CONTENT — blue section. Just the bio in words (the stats
           moved up into the hero text banners) + the resume quick link. The
           hard white rule keeps the seam language the film strip used to
           carry here. ===== */}
      <div style={{ background: 'rgb(18,0,120)', position: 'relative', zIndex: 5, borderTop: '4px solid #ffffff' }}>

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

        {/* Resume quick link — sharp-cornered bordered CTA, on-brand (no radius) */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 40px 56px' }}>
          <a
            href={`${BASE}resume/Robby-Meek-Sailing-Resume.pdf`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-block',
              padding: '13px 28px',
              border: '2px solid rgba(255,255,255,0.85)',
              color: '#fff', textDecoration: 'none',
              fontSize: 13, fontWeight: 700,
              letterSpacing: '1.5px', textTransform: 'uppercase',
              transition: 'background 0.25s ease, color 0.25s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = 'rgb(18,0,120)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#fff' }}
          >
            View Sailing Résumé (PDF) →
          </a>
        </div>
      </div>

      {/* ===== EVENTS SECTION — black background ===== */}
      <div ref={eventsRef} style={{ background: 'rgb(0,0,0)', position: 'relative', zIndex: 5 }}>

        {/* RESULTS headline — no longer sticky. It scrolls with the page; as
             the letters cross the top edge they dissolve into wind-blown spray
             (useTextSpray → lib/textSpray) and reassemble on scroll-back. The
             lines below fade out just before the edge instead of clipping.
             The Olympic countdown moved with the LA 2028 climax to The Road —
             one page, one climax; this header owns the record instead. */}
        <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
          <h1 ref={resultsRef} style={{
            color: '#fff', fontSize: 80, fontWeight: 800,
            letterSpacing: '-4px', margin: '0 0 10px',
          }}>
            {/* per-glyph spans: the spray module measures each glyph's box */}
            {'RESULTS'.split('').map((ch, i) => (ch === ' ' ? ' ' : <span key={i}>{ch}</span>))}
          </h1>

          {/* Next Event — chrome shimmer, clicks through to The Road */}
          <div ref={nextEventRef} style={{ margin: '20px 0 12px' }}>
            <button
              onClick={() => onNavigate('The Road')}
              aria-label="Next event: San Pedro OCR — see The Road"
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
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
                Next Event: San Pedro OCR in {nextEvent.days} Days
              </p>
            </button>
          </div>

          <p ref={hintRef} style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '16px 0 0' }}>
            Click on event to learn more.
          </p>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            {/* The chrome "door" into the future campaign tour, pinned to the top. */}
            <BridgeRow onNavigate={onNavigate} />
            {EVENTS.map((e, i) => (
              <EventRow
                key={i}
                event={e}
                isActive={selectedEvent === e}
                onActivate={() => setSelectedEvent(e)}
              />
            ))}
          </div>
        </div>

        {selectedEvent && (
          <EventModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />
        )}
      </div>

      {/* ===== WHERE TO NEXT — parallelogram nav (between events and press) ===== */}
      <div style={{ background: '#000', padding: isMobile ? '40px 0 52px' : '64px 0 84px' }}>
        <ExitNav links={BIO_EXIT_LINKS} onNavigate={onNavigate} isMobile={isMobile} />
      </div>

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
