import { useState, useEffect } from 'react'
import Footer from '../components/Footer'

const BASE = import.meta.env.BASE_URL

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
    <div style={{ minHeight: '100vh', background: 'rgb(18,0,120)' }}>

      {/* Top breathing space */}
      <div style={{ height: 80 }} />

      {/* Core message */}
      <div style={{
        maxWidth: 600, margin: '0 auto', padding: '0 40px',
        textAlign: 'center',
      }}>
        <p style={{
          ...fade(0),
          color: 'rgba(255,255,255,0.3)', fontSize: 12, textTransform: 'uppercase',
          letterSpacing: '2px', margin: '0 0 40px',
        }}>
          Support
        </p>

        <h1 style={{
          ...fade(0.1),
          color: '#fff', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 600,
          letterSpacing: '-1px', lineHeight: 1.3, margin: '0 0 24px',
        }}>
          Every contribution moves this campaign forward.
        </h1>

        <p style={{
          ...fade(0.2),
          color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.8,
          margin: '0 0 16px',
        }}>
          Olympic sailing demands competing against the best in the world, in person, at regattas across the globe. There is no shortcut. The only way to improve is to race the top sailors under the same conditions, on the same water, at the same time.
        </p>

        <p style={{
          ...fade(0.25),
          color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.8,
          margin: '0 0 16px',
        }}>
          Your support goes directly toward the costs of this journey: international travel, regatta entry fees, equipment, coaching, and extended training blocks in key locations around the world.
        </p>

        <p style={{
          ...fade(0.3),
          color: 'rgba(255,255,255,0.55)', fontSize: 15, lineHeight: 1.8,
          margin: '0 0 60px',
        }}>
          Whether it is financial support, advice, a connection, or simply following along, it all matters. I am grateful for every person who has been part of this.
        </p>
      </div>

      {/* Divider line */}
      <div style={{
        ...fade(0.35),
        maxWidth: 60, margin: '0 auto 60px',
        borderTop: '1px solid rgba(255,255,255,0.15)',
      }} />

      {/* Actions */}
      <div style={{
        maxWidth: 600, margin: '0 auto', padding: '0 40px',
        textAlign: 'center',
      }}>
        <div style={{
          ...fade(0.4),
          display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
        }}>
          <a
            href="https://venmo.com/robbymeek"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#fff', fontSize: 14, fontWeight: 500,
              border: '1px solid rgba(255,255,255,0.2)',
              padding: '14px 40px', width: '100%', maxWidth: 280,
              textDecoration: 'none', textAlign: 'center',
              transition: 'border-color 0.3s ease',
            }}
          >
            Donate via Venmo
          </a>

          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
            style={{
              color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: 400,
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '14px 40px', width: '100%', maxWidth: 280,
              textDecoration: 'none', textAlign: 'center',
              transition: 'border-color 0.3s ease',
            }}
          >
            Email to Donate
          </a>

          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting%20About%20Your%20Campaign"
            style={{
              color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: 400,
              padding: '12px 40px', width: '100%', maxWidth: 280,
              textDecoration: 'none', textAlign: 'center',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            Just want to connect
          </a>
        </div>

        {/* Back to Team */}
        <div style={{ ...fade(0.5), marginTop: 60, marginBottom: 60 }}>
          <button
            onClick={() => onNavigate('Team')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.3)', fontSize: 12,
              letterSpacing: '0.5px',
            }}
          >
            Back to Team
          </button>
        </div>
      </div>

      <Footer variant="blue" onNavigate={onNavigate} />
    </div>
  )
}
