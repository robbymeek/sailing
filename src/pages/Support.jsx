import { useState, useEffect } from 'react'
import Footer from '../components/Footer'

const BASE = import.meta.env.BASE_URL

const TIMELINE_DATA = [
  { year: '2017', main: 'Started racing', past: true },
  { year: '2018', main: 'First Youth Champs', past: true },
  { year: '2019', main: '5th at HS Nationals', sub: ['Freshman year'], past: true },
  { year: '2020', main: 'Covid', past: true },
  { year: '2021', main: 'HS National Champion', sub: ['Orange Bowl Champion', '9th at Youth Worlds', 'North American Champion'], past: true },
  { year: '2022', main: 'HS National Champion', sub: ['5th at Youth Worlds'], past: true },
  { year: '2023', main: 'Harvard Sailing', sub: ['North American Champion'], past: true },
  { year: '2024', main: 'CrossnoKaye', sub: ['Train and work'], past: true },
  { year: '2025', main: 'North American Champion', sub: ['Top American at Europeans'], past: true },
  { year: '2026', main: 'Olympic training', current: true },
  { year: '2027', main: 'World Champs contender' },
  { year: '2028', main: 'LA Olympics' },
]

const COSTS = [
  { label: 'Training', pct: 50, color: 'rgb(200,40,40)' },
  { label: 'Equipment', pct: 20, color: 'rgb(220,220,240)' },
  { label: 'Travel', pct: 15, color: 'rgb(60,80,180)' },
  { label: 'Coaching', pct: 10, color: 'rgb(200,40,40)' },
  { label: 'Entry Fees', pct: 5, color: 'rgb(220,220,240)' },
]

function Timeline() {
  return (
    <div style={{ position: 'relative' }}>
      {/* Vertical line — left side */}
      <div style={{
        position: 'absolute', left: 6, top: 0, bottom: 0, width: 2,
        background: 'linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.15) 30%, rgb(200,40,40) 75%, rgba(255,255,255,0.12) 100%)',
      }} />

      {/* B.I. / A.I. header */}
      <div style={{ paddingLeft: 24, marginBottom: 8 }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontStyle: 'italic', letterSpacing: '1px' }}>
          B.I.
        </span>
        <span style={{ color: 'rgba(255,255,255,0.15)', fontSize: 10, margin: '0 6px' }}>|</span>
        <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, fontStyle: 'italic' }}>
          Opti's
        </span>
      </div>
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginLeft: 24, marginBottom: 12 }} />
      <div style={{ paddingLeft: 24, marginBottom: 16 }}>
        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontStyle: 'italic', letterSpacing: '1px' }}>A.I.</span>
      </div>

      {/* Entries */}
      {TIMELINE_DATA.map((item, i) => (
        <div key={i} style={{ position: 'relative', paddingLeft: 24, marginBottom: 20 }}>
          {/* Dot on the line */}
          <div style={{
            width: item.current ? 14 : 10, height: item.current ? 14 : 10,
            borderRadius: '50%',
            background: item.current ? 'rgb(200,40,40)' : item.past ? '#fff' : 'rgba(255,255,255,0.15)',
            position: 'absolute', left: item.current ? 0 : 2, top: 2,
            zIndex: 1,
            boxShadow: item.current ? '0 0 12px rgba(200,40,40,0.5)' : 'none',
          }} />
          {/* Year */}
          <div style={{
            color: item.current ? 'rgb(200,40,40)' : item.past ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
            fontSize: 11, fontWeight: 800, letterSpacing: '1px', marginBottom: 2,
          }}>{item.year}</div>
          {/* Main event */}
          <div style={{
            color: item.current ? '#fff' : item.past ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)',
            fontSize: 12, fontWeight: 600, lineHeight: 1.4,
          }}>{item.main}</div>
          {/* Sub events */}
          {item.sub && item.sub.map((s, si) => (
            <div key={si} style={{
              color: item.past ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.2)',
              fontSize: 10, lineHeight: 1.4, marginTop: 2,
            }}>{s}</div>
          ))}
        </div>
      ))}
    </div>
  )
}

export default function Support({ onNavigate }) {
  const [visible, setVisible] = useState(false)
  const [showBio, setShowBio] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  const fade = (delay = 0) => ({
    opacity: visible ? 1 : 0,
    transform: visible ? 'translateY(0)' : 'translateY(16px)',
    transition: `opacity 0.8s ease ${delay}s, transform 0.8s ease ${delay}s`,
  })

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(12,0,60)' }}>

      {/* Hero section with photo */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0 }}>
          <img
            src={`${BASE}P1177244.jpeg`}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 45%' }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(12,0,60,0.7) 0%, rgba(12,0,60,0.85) 50%, rgb(12,0,60) 100%)',
          }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '60px 20px 80px', textAlign: 'center' }}>
          <h1 style={{
            ...fade(0.1), color: '#fff', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800,
            letterSpacing: '-2px', margin: '0 0 12px', textTransform: 'uppercase',
          }}>
            Support the journey
          </h1>
          <p style={{
            ...fade(0.15), color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 500,
            margin: '0 auto 24px', lineHeight: 1.6,
          }}>
            Olympic sailing demands competing against the best in the world. Your support makes that possible.
          </p>
          <button
            onClick={() => onNavigate('Team')}
            style={{
              ...fade(0.2),
              display: 'inline-block',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 13, fontWeight: 400,
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '10px 28px',
              background: 'none', cursor: 'pointer',
            }}
          >
            Back to Team
          </button>
        </div>
      </div>

      <div style={{ height: 4, background: 'rgb(200,40,40)' }} />

      {/* Main layout: timeline left, content right */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', position: 'relative',
      }}
        className="support-layout"
      >

        {/* Timeline sidebar */}
        <div style={{
          width: 220, flexShrink: 0,
          padding: '40px 24px 40px 40px',
          position: 'sticky', top: 60, alignSelf: 'flex-start',
          height: 'fit-content',
        }}
          className="timeline-sidebar"
        >
          <Timeline />
        </div>

        {/* Content area — center aligned */}
        <div style={{ flex: 1, minWidth: 0, padding: '40px 40px 0 20px', textAlign: 'center' }}>

          {/* Body text */}
          <div style={{ ...fade(0.2), maxWidth: 550, margin: '0 auto 40px' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.9, margin: '0 0 20px' }}>
              There is no shortcut. The only way to improve is to race the top sailors under the same conditions, on the same water, at the same time. That means traveling to wherever the best regattas are happening.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
              Whether it is financial support, advice, a connection, or simply following along, it all matters. I am grateful for every person who has been part of this.
            </p>
          </div>

          {/* Bio popup trigger */}
          <div style={{ ...fade(0.22), marginBottom: 40 }}>
            <button
              onClick={() => setShowBio(true)}
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 13, fontWeight: 500,
                padding: '10px 24px', cursor: 'pointer',
              }}
            >
              About Robby Meek
            </button>
          </div>

          {/* Where support goes */}
          <div style={{ ...fade(0.3), maxWidth: 400, margin: '0 auto 40px', textAlign: 'left' }}>
            <p style={{
              color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '2px', marginBottom: 20, textAlign: 'center',
            }}>
              Where Your Support Goes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {COSTS.map((item) => (
                <div key={item.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>{item.label}</span>
                    <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{item.pct}%</span>
                  </div>
                  <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${item.pct}%`, background: item.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Photos stacked */}
          <div style={{ ...fade(0.35), maxWidth: 500, margin: '0 auto 50px' }}>
            <img src={`${BASE}IMG_5957 2.JPG`} alt="" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block', marginBottom: 2 }} />
            <img src={`${BASE}IMG_5854.JPG`} alt="" style={{ width: '100%', height: 240, objectFit: 'cover', display: 'block' }} />
          </div>

          {/* Actions — unified look */}
          <div style={{ ...fade(0.4), marginBottom: 40 }}>
            <a
              href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
              style={{
                color: 'rgb(12,0,60)', fontSize: 14, fontWeight: 600,
                background: '#fff', padding: '14px 40px',
                textDecoration: 'none', display: 'inline-block',
                marginBottom: 12,
              }}
            >
              Email to Support
            </a>
            <br />
            <a
              href="https://venmo.com/robbymeek"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.5)', fontSize: 13,
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
            >
              or Venmo
            </a>
          </div>

          {/* Connect */}
          <div style={{ ...fade(0.45), marginBottom: 60 }}>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 1.7, margin: '0 auto 12px', maxWidth: 400 }}>
              Not looking to donate? If you have advice, connections, or just want to follow along, I would love to hear from you.
            </p>
            <a
              href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting"
              style={{
                color: 'rgba(255,255,255,0.5)', fontSize: 13,
                textDecoration: 'underline', textUnderlineOffset: '3px',
              }}
            >
              Reach out
            </a>
          </div>
        </div>
      </div>

      {/* Bio popup */}
      {showBio && (
        <div
          onClick={() => setShowBio(false)}
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
              background: 'rgb(18,0,100)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxWidth: 520, width: '100%',
              maxHeight: '80vh', overflowY: 'auto',
            }}
          >
            <img
              src={`${BASE}IMG_5957 2.JPG`}
              alt="Robby Meek sailing"
              style={{ width: '100%', height: 220, objectFit: 'cover', display: 'block' }}
            />
            <div style={{ padding: '28px 32px' }}>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 6px', letterSpacing: '-0.5px' }}>Robby Meek</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, margin: '0 0 20px' }}>Harvard Sailing | US Sailing Team ODP | ILCA 7</p>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px' }}>
                Campaigning for the 2028 Olympic Games in the ILCA 7. Sailing since age nine, racing the ILCA since twelve. Six national championships, three continental titles. Currently studying Applied Mathematics and Economics at Harvard College while serving as Team Captain.
              </p>
              <div style={{
                display: 'flex', gap: 24, margin: '0 0 24px',
                borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 16,
              }}>
                {[['6x', 'National Champ'], ['3x', 'Continental Champ'], ['9+', 'Years in ILCA']].map(([n, l]) => (
                  <div key={l} style={{ textAlign: 'center' }}>
                    <div style={{ color: '#fff', fontSize: 28, fontWeight: 800 }}>{n}</div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => { setShowBio(false); onNavigate('Biography'); }}
                  style={{ background: '#fff', color: 'rgb(18,0,100)', border: 'none', fontSize: 13, fontWeight: 600, padding: '10px 24px', cursor: 'pointer' }}
                >
                  Full Biography
                </button>
                <button
                  onClick={() => setShowBio(false)}
                  style={{ background: 'none', color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.15)', fontSize: 13, padding: '10px 24px', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer variant="blue" onNavigate={onNavigate} />
    </div>
  )
}
