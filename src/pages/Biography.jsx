import { useEffect, useRef } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

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

export default function Biography({ onNavigate }) {
  const imageRef = useRef(null)
  const text1Ref = useRef(null)
  const text2Ref = useRef(null)
  const ilcaRef = useRef(null)

  // Parallax: text moves faster than image, image moves faster than page
  useEffect(() => {
    let rafId
    const update = () => {
      const y = window.scrollY
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
  }, [])

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

        {/* Right side: Regatta cards — horizontal row on desktop, portrait orientation */}
        <div style={{
          position: 'absolute', right: '3%', top: '8%',
          display: 'flex', flexDirection: 'row', gap: 14,
          alignItems: 'center',
          zIndex: 2,
        }}
          className="bio-regatta-cards"
        >
          {REGATTAS.map((r, i) => {
            const isMid = r.current
            const cardWidth = isMid ? 210 : 175
            return (
            <div key={i} style={{
              background: r.current ? 'rgb(18,0,120)' : 'rgb(50,55,65)',
              padding: '0',
              width: cardWidth,
              flexShrink: 0,
              position: 'relative',
              overflow: 'hidden',
              transform: isMid ? 'scale(1)' : 'scale(0.95)',
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
              <div className="card-body" style={{ padding: isMid ? '20px 16px 28px' : '16px 14px 22px' }}>
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

        {/* Logos — desktop: below events on right; mobile: between image and events */}
        <div className="bio-logos" style={{
          position: 'absolute', right: '3%', bottom: '5%',
          display: 'flex', gap: 32, alignItems: 'center', justifyContent: 'center',
          zIndex: 2,
        }}>
          <div style={{
            width: 90, height: 90,
            perspective: '600px',
          }}>
            <img
              src={`${BASE}harvard-crest.png`}
              alt="Harvard Crest"
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

      {/* ===== BIO CONTENT — black, matching event calendar vibe ===== */}
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
              I'm currently campaigning for the 2028 Olympic Games in the ILCA 7, the men's single-handed sailing class. I've been sailing since I was nine years old and started racing in the ILCA class at age twelve. Since then, I've been fortunate to win six national championships and three continental titles.
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
              I'm incredibly grateful for the opportunity to chase this Olympic dream and excited for everything the journey ahead holds.
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', maxWidth: 900, margin: '0 auto' }} />

        {/* Press — clean list */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 40px 60px' }}>
          <p style={{
            color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase',
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

        <Footer variant="blue" onNavigate={onNavigate} />
      </div>
    </div>
  )
}
