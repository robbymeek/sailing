import { useState, useEffect } from 'react'
import Footer from '../components/Footer'

const BASE = import.meta.env.BASE_URL

const PRE_ILCA = [
  { label: "Opti's", past: true },
]

const POST_ILCA = [
  { year: '2017', items: ['Started racing in the ILCA'], past: true },
  { year: '2018', items: ['First Youth Champs, ILCA 6'], past: true },
  { year: '2019', items: ['5th at High School Nationals as a freshman, ILCA 6'], past: true },
  { year: '2020', items: ['Covid'], past: true },
  { year: '2021', items: ['High School National Champion ILCA 6', 'Orange Bowl Champion', '9th at ILCA 6 Youth Worlds', 'North American Champion ILCA 6'], past: true },
  { year: '2022', items: ['High School National Champion ILCA 7', '5th at ILCA 6 Youth Worlds'], past: true },
  { year: '2023', items: ['Harvard Sailing', 'ILCA 7 North American Champion'], past: true },
  { year: '2024', items: ['Train and work at CrossnoKaye'], past: true },
  { year: '2025', items: ['Train', 'ILCA 7 North American Champion', 'Top American at Europeans'], past: true },
  { year: '2026', items: ['School and full-time Olympic training'], current: true },
  { year: '2027', items: ['World Championship contender'] },
  { year: '2028', items: ['LA Olympics'] },
]

const COSTS = [
  { label: 'Training', pct: 50, color: 'rgb(200,40,40)' },
  { label: 'Equipment', pct: 20, color: 'rgb(220,220,240)' },
  { label: 'Travel', pct: 15, color: 'rgb(60,80,180)' },
  { label: 'Coaching', pct: 10, color: 'rgb(200,40,40)' },
  { label: 'Entry Fees', pct: 5, color: 'rgb(220,220,240)' },
]

function TimelineEntry({ item }) {
  const yearColor = item.current ? 'rgb(200,40,40)' : item.past ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)'
  const textColor = item.current ? '#fff' : item.past ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.3)'

  return (
    <div style={{ marginBottom: 18, position: 'relative' }}>
      {/* Year dot */}
      <div style={{
        width: item.current ? 14 : 10, height: item.current ? 14 : 10, borderRadius: '50%',
        background: item.current ? 'rgb(200,40,40)' : item.past ? '#fff' : 'rgba(255,255,255,0.2)',
        border: item.current ? '3px solid rgba(200,40,40,0.3)' : 'none',
        position: 'absolute', left: item.current ? -9 : -7, top: 3,
        boxShadow: item.current ? '0 0 12px rgba(200,40,40,0.5)' : 'none',
      }} />
      <div style={{ paddingLeft: 16 }}>
        <div style={{
          color: yearColor,
          fontSize: 11, fontWeight: 700, letterSpacing: '1px', marginBottom: 3,
        }}>{item.year}</div>
        {item.items.length === 1 ? (
          <div style={{ color: textColor, fontSize: 11, lineHeight: 1.5 }}>
            {item.items[0]}
          </div>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 12, marginTop: 2 }}>
            {/* Sub-line connecting items */}
            <div style={{
              position: 'absolute', left: 3, top: 4, bottom: 4, width: 1,
              background: item.current ? 'rgba(200,40,40,0.3)' : 'rgba(255,255,255,0.06)',
            }} />
            {item.items.map((sub, si) => (
              <div key={si} style={{
                color: textColor, fontSize: 11, lineHeight: 1.4,
                position: 'relative', paddingLeft: 10, marginBottom: si < item.items.length - 1 ? 4 : 0,
              }}>
                {/* Sub-dot */}
                <div style={{
                  width: 5, height: 5, borderRadius: '50%',
                  background: item.current ? 'rgba(200,40,40,0.6)' : 'rgba(255,255,255,0.2)',
                  position: 'absolute', left: 0, top: 4,
                }} />
                {sub}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Timeline() {
  return (
    <div>
      <p style={{
        color: 'rgba(255,255,255,0.2)', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '2px', marginBottom: 8, fontStyle: 'italic',
      }}>Pre-ILCA</p>
      <div style={{ position: 'relative', paddingLeft: 20, marginBottom: 14 }}>
        <div style={{ position: 'absolute', left: 3, top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,0.06)' }} />
        {PRE_ILCA.map((item, i) => (
          <div key={i} style={{ position: 'relative', marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', position: 'absolute', left: -20, top: 3 }} />
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, fontStyle: 'italic' }}>{item.label}</span>
          </div>
        ))}
      </div>
      <p style={{
        color: 'rgba(255,255,255,0.2)', fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '2px', marginBottom: 8, fontStyle: 'italic',
      }}>Post-ILCA</p>
      <div style={{ position: 'relative', paddingLeft: 20 }}>
        <div style={{
          position: 'absolute', left: 3, top: 0, bottom: 0, width: 1,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgb(200,40,40) 70%, rgba(255,255,255,0.2) 100%)',
        }} />
        {POST_ILCA.map((item, i) => (
          <TimelineEntry key={i} item={item} />
        ))}
      </div>
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
        <div style={{ position: 'relative', zIndex: 1, padding: '80px 40px 80px', maxWidth: 900, margin: '0 auto' }}>
          <p style={{ ...fade(0.05), color: 'rgb(200,40,40)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '3px', margin: '0 0 20px', fontWeight: 600 }}>
            LA 2028 Olympic Campaign
          </p>
          <h1 style={{ ...fade(0.1), color: '#fff', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 20px' }}>
            Support the Journey.
          </h1>
          <p style={{ ...fade(0.15), color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8, maxWidth: 500 }}>
            Olympic sailing demands competing against the best in the world. Your support makes that possible.
          </p>
        </div>
      </div>

      <div style={{ height: 4, background: 'rgb(200,40,40)' }} />

      {/* Main layout: timeline left, content right */}
      <div style={{
        maxWidth: 1100, margin: '0 auto',
        display: 'flex', position: 'relative',
      }}>

        {/* Timeline — fixed to left on desktop, faded overlay on mobile */}
        <div style={{
          width: 200, flexShrink: 0,
          padding: '40px 20px 40px 40px',
          position: 'sticky', top: 60, alignSelf: 'flex-start',
          height: 'fit-content',
          // On narrow screens this will be hidden via the media query approach below
        }}
          className="timeline-sidebar"
        >
          <Timeline />
        </div>

        {/* Content area */}
        <div style={{ flex: 1, minWidth: 0, padding: '40px 40px 0 20px' }}>

          {/* Body text */}
          <div style={{ ...fade(0.2), maxWidth: 550, marginBottom: 40 }}>
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
          <div style={{ ...fade(0.3), maxWidth: 450, marginBottom: 40 }}>
            <p style={{
              color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '2px', marginBottom: 20,
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

          {/* Photo strip */}
          <div style={{
            ...fade(0.35),
            display: 'grid', gridTemplateColumns: '1fr 1fr',
            gap: 2, marginBottom: 50,
          }}>
            <img src={`${BASE}IMG_5957 2.JPG`} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
            <img src={`${BASE}IMG_5854.JPG`} alt="" style={{ width: '100%', height: 180, objectFit: 'cover' }} />
          </div>

          {/* Actions */}
          <div style={{ ...fade(0.4), marginBottom: 50 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
                style={{
                  color: 'rgb(12,0,60)', fontSize: 14, fontWeight: 600,
                  background: '#fff', padding: '14px 36px',
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                Email to Donate
              </a>
              <a
                href="https://venmo.com/robbymeek"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'rgba(255,255,255,0.7)', fontSize: 14,
                  border: '1px solid rgba(255,255,255,0.15)',
                  padding: '14px 36px',
                  textDecoration: 'none', textAlign: 'center',
                }}
              >
                Donate via Venmo
              </a>
            </div>
          </div>

          {/* Connect */}
          <div style={{ ...fade(0.45), marginBottom: 40 }}>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7, margin: '0 0 16px', maxWidth: 420 }}>
              Not looking to donate? If you have advice, connections, or just want to follow along, I would love to hear from you.
            </p>
            <a
              href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting"
              style={{
                color: '#fff', fontSize: 14, fontWeight: 500,
                textDecoration: 'underline', textUnderlineOffset: '4px',
                textDecorationColor: 'rgb(200,40,40)',
              }}
            >
              Reach Out
            </a>
          </div>

          {/* Back to Team */}
          <div style={{ marginBottom: 50 }}>
            <button
              onClick={() => onNavigate('Team')}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.15)',
                cursor: 'pointer', color: '#fff', fontSize: 14, fontWeight: 500,
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 28px',
              }}
            >
              <span>&larr;</span> Back to Team
            </button>
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
