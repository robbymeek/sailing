import { useEffect } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'

const BASE = import.meta.env.BASE_URL

const BG_WORDS = [
  'ROBBY MEEK', 'US SAILING TEAM', 'OLYMPICS',
  'LOS ANGELES', 'APPLIED MATHEMATICS', 'HARVARD',
  'SAILING', 'CAMPAIGN', 'LA 2028', 'BOSTON',
  'ROBBY MEEK', 'STUDENT-ATHLETE', 'ILCA 7',
  'US SAILING TEAM', 'ANNAPOLIS',
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

export default function Biography({ onNavigate }) {
  useEffect(() => { document.body.style.background = 'rgb(18,0,200)' }, [])

  return (
    <div style={{ background: 'rgb(18,0,200)', minHeight: '100vh' }}>
      {/* ===== TOP SECTION: Bright blue with text background ===== */}
      <div style={{
        background: 'rgb(18,0,200)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Nav current="Biography" onNavigate={onNavigate} variant="blue" />

        {/* Background text wall */}
        <div style={{
          position: 'relative',
          padding: '20px 40px 0',
          maxWidth: 1100,
          margin: '0 auto',
        }}>
          {/* The large text words behind everything */}
          <div style={{
            color: 'rgba(255,255,255,0.08)',
            fontSize: 'clamp(48px, 7vw, 90px)',
            fontWeight: 900,
            lineHeight: 1.0,
            letterSpacing: '-2px',
            textTransform: 'uppercase',
            wordBreak: 'break-word',
            userSelect: 'none',
          }}>
            {BG_WORDS.map((word, i) => (
              <span key={i}>{word} </span>
            ))}
          </div>

          {/* Sailing photo overlaid on top of text - with colored border */}
          <div style={{
            position: 'relative',
            maxWidth: 500,
            margin: '-180px auto 0',
            zIndex: 2,
          }}>
            <div style={{
              border: '6px solid rgb(0,80,255)',
              background: 'rgb(0,80,255)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}>
              <img
                src={`${BASE}P1177244.jpeg`}
                alt="Robby Meek sailing"
                style={{
                  width: '100%',
                  display: 'block',
                  objectFit: 'cover',
                  maxHeight: 380,
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== HARD TRANSITION to deeper blue ===== */}
      <div style={{ background: 'rgb(10,0,180)' }}>
        {/* ILCA Logo - white on blue */}
        <div style={{
          textAlign: 'center',
          padding: '60px 40px',
        }}>
          <img
            src={`${BASE}ilca-logo.png`}
            alt="ILCA"
            style={{
              width: 'clamp(200px, 30vw, 380px)',
              filter: 'brightness(0) invert(1)',
              opacity: 0.9,
            }}
          />
        </div>

        {/* Second nav */}
        <Nav current="Biography" onNavigate={onNavigate} variant="blue" />

        {/* Bio text */}
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
