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
    <div style={{ minHeight: '100vh', background: 'rgb(18,0,120)', position: 'relative' }}>

      {/* Background ILCA logo watermark */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 0, pointerEvents: 'none',
      }}>
        <img
          src={`${BASE}ilca-logo.png`}
          alt=""
          style={{
            width: 'clamp(400px, 60vw, 800px)',
            filter: 'brightness(0) invert(1)',
            opacity: 0.03,
          }}
        />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Back to Team — top */}
        <div style={{ ...fade(0), padding: '24px 40px' }}>
          <button
            onClick={() => onNavigate('Team')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: 13,
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>&larr;</span> Back to Team
          </button>
        </div>

        {/* Hero */}
        <div style={{ padding: '40px 40px 0', maxWidth: 700, margin: '0 auto' }}>
          <p style={{
            ...fade(0.05),
            color: 'rgba(255,255,255,0.25)', fontSize: 11, textTransform: 'uppercase',
            letterSpacing: '3px', margin: '0 0 30px',
          }}>
            LA 2028 Olympic Campaign
          </p>

          <h1 style={{
            ...fade(0.1),
            color: '#fff', fontSize: 'clamp(36px, 5vw, 56px)', fontWeight: 800,
            letterSpacing: '-2px', lineHeight: 1.1, margin: '0 0 40px',
          }}>
            Support<br />the Journey.
          </h1>
        </div>

        {/* Full-width photo strip */}
        <div style={{
          ...fade(0.15),
          height: 'clamp(180px, 25vw, 300px)',
          position: 'relative', overflow: 'hidden',
          margin: '0 0 60px',
        }}>
          <img
            src={`${BASE}P1177244.jpeg`}
            alt="Sailing"
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 45%',
            }}
          />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgb(18,0,120) 0%, transparent 20%, transparent 80%, rgb(18,0,120) 100%)',
          }} />
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(18,0,120,0.3)',
          }} />
        </div>

        {/* Body text */}
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '0 40px' }}>
          <p style={{
            ...fade(0.2),
            color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.9,
            margin: '0 0 20px',
          }}>
            Olympic sailing demands competing against the best in the world, in person, at regattas across the globe. There is no shortcut. The only way to improve is to race the top sailors under the same conditions, on the same water, at the same time.
          </p>

          <p style={{
            ...fade(0.25),
            color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.9,
            margin: '0 0 20px',
          }}>
            Your support goes directly toward the costs of this campaign: international travel, regatta entry fees, equipment, coaching, and training blocks at key venues around the world.
          </p>

          <p style={{
            ...fade(0.3),
            color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 1.9,
            margin: '0 0 60px',
          }}>
            Whether it is financial support, advice, a connection, or simply following along, it all matters. I am grateful for every person who has been part of this.
          </p>
        </div>

        {/* Where it goes — visual breakdown */}
        <div style={{
          ...fade(0.35),
          maxWidth: 700, margin: '0 auto', padding: '0 40px 60px',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 1, background: 'rgba(255,255,255,0.06)',
          }}>
            {[
              ['Travel', 'Flights and housing for international regattas'],
              ['Entry Fees', 'World championships, Europeans, Grand Slam events'],
              ['Equipment', 'Sails, lines, blades, boat maintenance'],
              ['Coaching', 'Professional coaching, video analysis, camps'],
              ['Training', 'Extended blocks in Miami, LA, and Europe'],
            ].map(([title, desc]) => (
              <div key={title} style={{
                background: 'rgb(18,0,120)',
                padding: '24px 20px',
              }}>
                <p style={{
                  color: '#fff', fontSize: 14, fontWeight: 600,
                  margin: '0 0 6px',
                }}>{title}</p>
                <p style={{
                  color: 'rgba(255,255,255,0.4)', fontSize: 12,
                  margin: 0, lineHeight: 1.5,
                }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{
          ...fade(0.4),
          textAlign: 'center', padding: '20px 40px 0',
          maxWidth: 600, margin: '0 auto',
        }}>
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
          }}>
            {/* Email — primary action */}
            <a
              href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
              style={{
                color: 'rgb(18,0,120)', fontSize: 14, fontWeight: 600,
                background: '#fff',
                padding: '14px 0', width: '100%', maxWidth: 280,
                textDecoration: 'none', textAlign: 'center',
                display: 'block',
              }}
            >
              Email to Donate
            </a>

            {/* Venmo — secondary */}
            <a
              href="https://venmo.com/robbymeek"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.6)', fontSize: 14,
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '14px 0', width: '100%', maxWidth: 280,
                textDecoration: 'none', textAlign: 'center',
                display: 'block',
              }}
            >
              Donate via Venmo
            </a>
          </div>
        </div>

        {/* Connect section */}
        <div style={{
          ...fade(0.45),
          textAlign: 'center', padding: '60px 40px',
          maxWidth: 500, margin: '0 auto',
        }}>
          <p style={{
            color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 1.7,
            margin: '0 0 20px',
          }}>
            Not looking to donate? If you have advice, connections, or just want to follow along, I would love to hear from you.
          </p>
          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting"
            style={{
              color: 'rgba(255,255,255,0.35)', fontSize: 13,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
            }}
          >
            Reach out
          </a>
        </div>

        {/* Back to Team — bottom */}
        <div style={{ ...fade(0.5), textAlign: 'center', padding: '0 20px 60px' }}>
          <button
            onClick={() => onNavigate('Team')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>&larr;</span> Back to Team
          </button>
        </div>

        <Footer variant="blue" onNavigate={onNavigate} />
      </div>
    </div>
  )
}
