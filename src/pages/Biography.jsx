import { useEffect, useState, useRef } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const BASE = import.meta.env.BASE_URL

const WORDS_TOP = [
  'ROBBY MEEK', 'US SAILING TEAM', 'OLYMPICS',
  'LOS ANGELES', 'APPLIED MATHEMATICS', 'HARVARD',
  'SAILING', 'CAMPAIGN', 'LA 2028', 'BOSTON',
  'ROBBY MEEK', 'STUDENT-ATHLETE', 'ILCA 7',
  'US SAILING TEAM', 'ANNAPOLIS',
]

const WORDS_BOTTOM = [
  'SAILING', 'CAMPAIGN', 'LA 2028',
  'STUDENT-ATHLETE', 'ROBBY MEEK',
  'HARVARD', 'OLYMPICS', 'ANNAPOLIS',
]

const PHOTOS = [
  'IMG_5854.JPG', 'IMG_5866.JPG', 'IMG_5956.JPG',
  'IMG_5957.JPG', 'IMG_5958.JPG', 'IMG_5959.JPG',
  'IMG_8856.JPG', 'P1166617.jpeg',
]

const PRESS = [
  { t: 'ILCAs dominate US Open Long Beach', u: 'https://www.sailingscuttlebutt.com/2023/07/16/ilcas-dominate-us-open-long-beach/' },
  { t: 'School Nationals for Singlehanded titles', u: 'https://www.sailingscuttlebutt.com/2023/07/16/ilcas-dominate-us-open-long-beach/' },
  { t: 'Meek, Braun win High School Nationals', u: 'https://www.sailingscuttlebutt.com/2021/12/19/meek-braun-win-high-school-nationals/' },
  { t: 'Robby Meek Named NEISA Open Sailor of the Week', u: 'https://gocrimson.com/news/2024/9/18/sailing-robby-meek-named-neisa-open-sailor-of-the-week' },
  { t: 'ILCA 6 Youth Worlds: quest for best', u: 'https://www.sailingscuttlebutt.com/2021/07/28/ilca-6-youth-worlds-midway-point/' },
  { t: 'ILCA 6 Youth Worlds: Midway point', u: 'https://www.sailingscuttlebutt.com/2021/07/30/ilca-6-youth-worlds-quest-for-best/' },
  { t: 'This has turned into a Robby Meek feed this week. Congrats goes out to the sophomore!', u: 'https://www.threads.com/@harvardsailing/post/DAEgzXRvfyN' },
  { t: 'Robby Meek - 2022 West Marine US Open Sailing Series Ft. Lauderdale', u: 'https://www.sail-world.com/photo/345661' },
  { t: 'No. 1 Sailing Wins 2025 ICSA Open Team Race National Championship', u: 'https://gocrimson.com/news/2025/4/26/no-1-sailing-wins-2025-icsa-open-team-race-national-championship.aspx' },
]

function TextWithPhotos({ words, photos }) {
  return (
    <div style={{ position: 'relative' }}>
      {/* Photo collage behind the text */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: 'repeat(3, 1fr)',
        gap: 0,
        overflow: 'hidden',
      }}>
        {photos.map((p, i) => (
          <img
            key={i}
            src={`${BASE}${p}`}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: 0.6,
              filter: 'saturate(0.3) brightness(1.1)',
            }}
          />
        ))}
      </div>
      {/* Text that clips the photos - dark blue text reveals photos through letterforms */}
      <div style={{
        position: 'relative',
        fontSize: 'clamp(52px, 8vw, 110px)',
        fontWeight: 900,
        lineHeight: 0.95,
        letterSpacing: '-3px',
        textTransform: 'uppercase',
        wordBreak: 'break-word',
        userSelect: 'none',
        color: 'rgb(80,130,255)',
        mixBlendMode: 'multiply',
      }}>
        {words.map((word, i) => (
          <span key={i}>{word} </span>
        ))}
      </div>
      {/* Overlay tint to blend */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(80,130,255,0.35)',
        pointerEvents: 'none',
        mixBlendMode: 'color',
      }} />
    </div>
  )
}

export default function Biography({ onNavigate }) {
  useEffect(() => { document.body.style.background = 'rgb(18,0,120)' }, [])

  const [scrollY, setScrollY] = useState(0)
  const containerRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={containerRef} style={{ background: 'rgb(18,0,120)', minHeight: '100vh' }}>
      {/* ===== DARK NAVY HEADER ===== */}
      <div style={{ background: 'rgb(18,0,120)' }}>
        <Nav current="Biography" onNavigate={onNavigate} variant="blue" />
      </div>

      {/* ===== LIGHT BLUE TEXT SECTION with photos inside letters ===== */}
      <div style={{
        background: 'rgb(100,150,255)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <TextWithPhotos words={WORDS_TOP} photos={PHOTOS} />
      </div>

      {/* ===== BRIGHT BLUE SECTION: Photo + ILCA with parallax ===== */}
      <div style={{
        background: 'rgb(0,70,255)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Sailing photo with parallax */}
        <div style={{
          maxWidth: 600,
          margin: '0 auto',
          padding: '50px 40px',
          transform: `translateY(${scrollY * -0.15}px)`,
          transition: 'transform 0.05s linear',
        }}>
          <div style={{
            border: '6px solid rgb(0,70,255)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <img
              src={`${BASE}P1177244.jpeg`}
              alt="Robby Meek sailing"
              style={{
                width: '100%',
                display: 'block',
                objectFit: 'cover',
                maxHeight: 420,
              }}
            />
          </div>
        </div>

        {/* ILCA Logo with parallax */}
        <div style={{
          textAlign: 'center',
          padding: '40px 40px 60px',
          transform: `translateY(${scrollY * -0.1}px)`,
          transition: 'transform 0.05s linear',
        }}>
          <img
            src={`${BASE}ilca-logo.png`}
            alt="ILCA"
            style={{
              width: 'clamp(250px, 40vw, 500px)',
              filter: 'brightness(0) invert(1)',
            }}
          />
        </div>
      </div>

      {/* ===== SECOND TEXT SECTION with photos ===== */}
      <div style={{
        background: 'rgb(100,150,255)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <TextWithPhotos words={WORDS_BOTTOM} photos={[...PHOTOS].reverse()} />
      </div>

      {/* ===== BIO CONTENT on dark blue ===== */}
      <div style={{ background: 'rgb(18,0,120)' }}>
        <Nav current="Biography" onNavigate={onNavigate} variant="blue" />

        <div style={{
          maxWidth: 850, margin: '0 auto', padding: '20px 40px 60px',
          color: 'rgba(255,255,255,0.85)', fontSize: 15, lineHeight: 1.7,
        }}>
          <p style={{ marginBottom: 20 }}>
            I'm currently campaigning for the 2028 Olympic Games in the ILCA 7, the men's single-handed sailing class. I've been sailing since I was nine years old and started racing in the ILCA class at age twelve. Since then, I've been fortunate to win six national championships and three continental titles. I now compete as part of the Harvard Sailing Team while studying Applied Mathematics and Economics at Harvard College.
          </p>
          <p style={{ marginBottom: 20 }}>
            At Harvard, I serve as Team Captain and have won the Team Race National Championship in double-handed boats (Boat Starters On Top) and the Single-Handed National Championship. You can find me in the gym working on my sailing fitness, in class, or hanging with some friends.
          </p>
          <p style={{ marginBottom: 20 }}>
            Originally from Annapolis, Maryland, sailing has always been a central part of my life. Outside of training and academics, I enjoy painting, cooking, and spending time with my family. I'm also deeply interested in architecture, start-ups, and investing—interests I pursue through campus clubs and side projects.
          </p>
          <p>
            I'm incredibly grateful for the opportunity to chase this Olympic dream and excited for everything the journey ahead holds.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 80, padding: '50px 20px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          maxWidth: 850, margin: '0 auto', flexWrap: 'wrap',
        }}>
          {[['6x', 'National Championships'], ['3x', 'Continental Championships'], ['8 years', 'In the ILCA']].map(([n, l]) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ color: '#fff', fontSize: 48, fontWeight: 800 }}>{n}</div>
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 500, marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Press clippings */}
        <div style={{ maxWidth: 850, margin: '0 auto', padding: '30px 40px 60px' }}>
          {PRESS.map((item, i) => (
            <a
              key={i}
              href={item.u}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '14px 18px', marginBottom: 6,
                background: 'rgba(100,100,160,0.25)', borderRadius: 4,
                textDecoration: 'none',
              }}
            >
              <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>+</span>
              <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{item.t}</span>
            </a>
          ))}
        </div>
      </div>

      <Footer variant="blue" onNavigate={onNavigate} />
    </div>
  )
}
