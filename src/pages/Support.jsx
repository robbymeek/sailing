import { useState, useEffect } from 'react'
import Footer from '../components/Footer'

const BASE = import.meta.env.BASE_URL

const PRE_ILCA = [
  { label: "Opti's", past: true },
]

const POST_ILCA = [
  { year: '2017', label: 'Started racing in the ILCA', past: true },
  { year: '2018', label: 'First Youth Champs, ILCA 6', past: true },
  { year: '2019', label: '5th at High School Nationals as a freshman, ILCA 6', past: true },
  { year: '2020', label: 'Covid', past: true },
  { year: '2021', label: 'High School National Champion ILCA 6, Orange Bowl Champion, 9th at ILCA 6 Youth Worlds, North American Champion ILCA 6', past: true },
  { year: '2022', label: 'High School National Champion ILCA 7, 5th at ILCA 6 Youth Worlds', past: true },
  { year: '2023', label: 'Harvard Sailing, ILCA 7 North American Champion', past: true },
  { year: '2024', label: 'Train and work at CrossnoKaye', past: true },
  { year: '2025', label: 'Train, ILCA 7 North American Champion, Top American at Europeans', past: true },
  { year: '2026', label: 'School and full-time Olympic training', current: true },
  { year: '2027', label: 'World Championship contender' },
  { year: '2028', label: 'LA Olympics' },
]

const COSTS = [
  { label: 'Travel', pct: 40, color: 'rgb(200,40,40)' },
  { label: 'Entry Fees', pct: 20, color: 'rgb(220,220,240)' },
  { label: 'Equipment', pct: 18, color: 'rgb(60,80,180)' },
  { label: 'Coaching', pct: 15, color: 'rgb(200,40,40)' },
  { label: 'Training', pct: 7, color: 'rgb(220,220,240)' },
]

export default function Support({ onNavigate }) {
  const [visible, setVisible] = useState(false)
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
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 45%',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(12,0,60,0.7) 0%, rgba(12,0,60,0.85) 50%, rgb(12,0,60) 100%)',
          }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Nav handled by App.jsx — sticky red transparent bar */}

          <div style={{ padding: '80px 40px 80px', maxWidth: 700, margin: '0 auto' }}>
            <p style={{
              ...fade(0.05),
              color: 'rgb(200,40,40)', fontSize: 11, textTransform: 'uppercase',
              letterSpacing: '3px', margin: '0 0 20px', fontWeight: 600,
            }}>
              LA 2028 Olympic Campaign
            </p>

            <h1 style={{
              ...fade(0.1),
              color: '#fff', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800,
              letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 20px',
            }}>
              Support<br />the Journey.
            </h1>

            <p style={{
              ...fade(0.15),
              color: 'rgba(255,255,255,0.6)', fontSize: 15, lineHeight: 1.8,
              maxWidth: 500,
            }}>
              Olympic sailing demands competing against the best in the world. Your support makes that possible.
            </p>
          </div>
        </div>
      </div>

      {/* Red accent stripe */}
      <div style={{ height: 4, background: 'rgb(200,40,40)' }} />

      {/* Body text */}
      <div style={{ ...fade(0.2), maxWidth: 600, margin: '0 auto', padding: '50px 40px 40px' }}>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.9, margin: '0 0 20px' }}>
          There is no shortcut. The only way to improve is to race the top sailors under the same conditions, on the same water, at the same time. That means traveling to wherever the best regattas are happening.
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.9, margin: 0 }}>
          Whether it is financial support, advice, a connection, or simply following along, it all matters. I am grateful for every person who has been part of this.
        </p>
      </div>

      {/* Timeline */}
      <div style={{ ...fade(0.25), maxWidth: 700, margin: '0 auto', padding: '40px 40px 50px' }}>
        <p style={{
          color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '2px', marginBottom: 30, textAlign: 'center',
        }}>
          The Journey So Far — And Where Your Support Goes
        </p>

        {/* Pre-ILCA era */}
        <div style={{ marginBottom: 20 }}>
          <p style={{
            color: 'rgba(255,255,255,0.25)', fontSize: 10, textTransform: 'uppercase',
            letterSpacing: '2px', marginBottom: 12, fontStyle: 'italic',
          }}>
            Pre-ILCA
          </p>
          <div style={{ position: 'relative', paddingLeft: 32 }}>
            <div style={{
              position: 'absolute', left: 7, top: 0, bottom: 0, width: 2,
              background: 'rgba(255,255,255,0.08)',
            }} />
            {PRE_ILCA.map((item, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center',
                marginBottom: 8, position: 'relative',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.25)',
                  position: 'absolute', left: -29,
                }} />
                <span style={{
                  color: 'rgba(255,255,255,0.4)', fontSize: 13, fontStyle: 'italic',
                }}>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Post-ILCA era */}
        <p style={{
          color: 'rgba(255,255,255,0.25)', fontSize: 10, textTransform: 'uppercase',
          letterSpacing: '2px', marginBottom: 12, fontStyle: 'italic',
        }}>
          Post-ILCA
        </p>
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          <div style={{
            position: 'absolute', left: 7, top: 0, bottom: 0, width: 2,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.15) 0%, rgb(200,40,40) 70%, rgba(255,255,255,0.3) 100%)',
          }} />
          {POST_ILCA.map((item, i) => (
            <div key={i} style={{
              marginBottom: i < POST_ILCA.length - 1 ? 20 : 0,
              position: 'relative',
            }}>
              <div style={{
                width: item.current ? 16 : 12, height: item.current ? 16 : 12, borderRadius: '50%',
                background: item.current ? 'rgb(200,40,40)' : item.past ? '#fff' : 'rgba(255,255,255,0.2)',
                border: item.current ? '3px solid rgba(200,40,40,0.3)' : 'none',
                position: 'absolute', left: item.current ? -34 : -32, top: 2,
                boxShadow: item.current ? '0 0 12px rgba(200,40,40,0.5)' : 'none',
              }} />
              <div>
                <span style={{
                  color: item.current ? 'rgb(200,40,40)' : item.past ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.25)',
                  fontSize: 12, fontWeight: 700, letterSpacing: '1px',
                  marginRight: 10,
                }}>{item.year}</span>
                <span style={{
                  color: item.current ? '#fff' : item.past ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.35)',
                  fontSize: 13, fontWeight: item.current ? 600 : 400,
                  lineHeight: 1.5,
                }}>
                  {item.label}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Red accent stripe */}
      <div style={{ height: 2, background: 'rgba(200,40,40,0.3)', maxWidth: 200, margin: '0 auto' }} />

      {/* Where support goes — bar chart */}
      <div style={{ ...fade(0.3), maxWidth: 500, margin: '0 auto', padding: '50px 40px' }}>
        <p style={{
          color: 'rgba(255,255,255,0.3)', fontSize: 11, textTransform: 'uppercase',
          letterSpacing: '2px', marginBottom: 24, textAlign: 'center',
        }}>
          Where Your Support Goes
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {COSTS.map((item) => (
            <div key={item.label}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: 6,
              }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: 500 }}>
                  {item.label}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
                  {item.pct}%
                </span>
              </div>
              <div style={{
                height: 6, background: 'rgba(255,255,255,0.06)', overflow: 'hidden',
              }}>
                <div style={{
                  height: '100%', width: `${item.pct}%`,
                  background: item.color,
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Photo strip */}
      <div style={{
        ...fade(0.35),
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        gap: 2, maxWidth: 700, margin: '0 auto', padding: '20px 40px',
      }}>
        <img src={`${BASE}IMG_5957 2.JPG`} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
        <img src={`${BASE}IMG_5854.JPG`} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} />
      </div>

      {/* Actions */}
      <div style={{
        ...fade(0.4),
        textAlign: 'center', padding: '50px 40px 0',
        maxWidth: 600, margin: '0 auto',
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
            style={{
              color: 'rgb(12,0,60)', fontSize: 14, fontWeight: 600,
              background: '#fff',
              padding: '14px 0', width: '100%', maxWidth: 300,
              textDecoration: 'none', textAlign: 'center',
              display: 'block',
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
              padding: '14px 0', width: '100%', maxWidth: 300,
              textDecoration: 'none', textAlign: 'center',
              display: 'block',
            }}
          >
            Donate via Venmo
          </a>
        </div>
      </div>

      {/* Connect + Back to Team — bottom */}
      <div style={{ ...fade(0.45), textAlign: 'center', padding: '50px 40px 40px' }}>
        <p style={{
          color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 1.7,
          margin: '0 0 16px', maxWidth: 460, marginLeft: 'auto', marginRight: 'auto',
        }}>
          Not looking to donate? If you have advice, connections, or just want to follow along, I would love to hear from you.
        </p>
        <a
          href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting"
          style={{
            color: '#fff', fontSize: 14, fontWeight: 500,
            textDecoration: 'underline',
            textUnderlineOffset: '4px',
            textDecorationColor: 'rgb(200,40,40)',
          }}
        >
          Reach Out
        </a>
      </div>

      <div style={{ textAlign: 'center', padding: '20px 20px 50px' }}>
        <button
          onClick={() => onNavigate('Team')}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.15)',
            cursor: 'pointer',
            color: '#fff', fontSize: 14, fontWeight: 500,
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 28px',
          }}
        >
          <span>&larr;</span> Back to Team
        </button>
      </div>

      <Footer variant="blue" onNavigate={onNavigate} />
    </div>
  )
}
