import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

export default function Landing({ onNavigate }) {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    document.body.style.background = dark ? 'rgb(19,23,31)' : 'rgb(245,245,245)'
  }, [dark])

  const bg = dark ? 'rgb(19,23,31)' : 'rgb(245,245,245)'
  const textPrimary = dark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.8)'
  const textDim = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
  const textNav = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
  const divider = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
  const gif = dark ? `${BASE}[0001-0250].gif` : `${BASE}[0001-0240].gif`

  return (
    <div style={{
      background: bg,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'space-between',
      overflow: 'hidden',
      transition: 'background 0.5s ease',
    }}>
      {/* Nav */}
      <nav style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 8, padding: '20px 0', width: '100%',
      }}>
        {['Biography', 'Event Calendar', 'Team', 'Contact'].map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onNavigate(item)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: textNav, fontSize: 14, fontWeight: 400,
                letterSpacing: '-0.3px', padding: '4px 8px',
                transition: 'color 0.5s ease',
              }}
            >
              {item}
            </button>
            {i < 3 && (
              <span style={{ color: textNav, fontSize: 14, transition: 'color 0.5s ease' }}>|</span>
            )}
          </div>
        ))}
      </nav>

      {/* Center content */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 32, flex: 1, justifyContent: 'center',
      }}>
        {/* Sailboat GIF */}
        <img
          src={gif}
          alt="Sailboat"
          onClick={() => onNavigate('Home')}
          style={{
            width: 'clamp(140px, 20vw, 220px)',
            height: 'clamp(140px, 20vw, 220px)',
            cursor: 'pointer',
          }}
        />

        {/* Tagline */}
        <p style={{
          color: textPrimary,
          fontSize: 'clamp(14px, 1.6vw, 18px)',
          fontWeight: 400,
          letterSpacing: '-0.3px',
          textAlign: 'center',
          maxWidth: 560,
          lineHeight: 1.5,
          padding: '0 24px',
          transition: 'color 0.5s ease',
        }}>
          Harvard Student and US ODP Sailor Campaigning for the 2028 Olympics in Los Angeles
        </p>

        {/* Join the Team button */}
        <button
          onClick={() => onNavigate('Team')}
          style={{
            background: 'none',
            border: `1px solid ${divider}`,
            color: textDim,
            fontSize: 13,
            fontWeight: 400,
            letterSpacing: '-0.2px',
            padding: '10px 28px',
            cursor: 'pointer',
            transition: 'color 0.5s ease, border-color 0.5s ease',
          }}
        >
          Join the Team
        </button>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        width: '100%', padding: '20px 32px',
      }}>
        <p style={{
          color: textDim, fontSize: 10, transition: 'color 0.5s ease',
        }}>
          Website designed and made by Robby Meek
        </p>

        {/* Light/Dark toggle */}
        <button
          onClick={() => setDark(d => !d)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: textDim, fontSize: 12, fontWeight: 400,
            letterSpacing: '-0.2px', padding: '4px 8px',
            transition: 'color 0.5s ease',
          }}
        >
          {dark ? 'Light' : 'Dark'}
        </button>
      </div>
    </div>
  )
}
