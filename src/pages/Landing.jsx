import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

export default function Landing({ onNavigate }) {
  const [dark, setDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e) => setDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    document.body.style.background = dark ? 'rgb(19,23,31)' : 'rgb(245,245,245)'
  }, [dark])

  const textDim = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
  const textNav = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
  const gif = dark ? `${BASE}[0001-0250].gif` : `${BASE}[0001-0240].gif`

  return (
    <div style={{
      background: dark ? 'rgb(19,23,31)' : 'rgb(245,245,245)',
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
        {['Home', 'Biography', 'Event Calendar', 'Team', 'Contact'].map((item, i) => (
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
            {i < 4 && (
              <span style={{ color: textNav, fontSize: 14, transition: 'color 0.5s ease' }}>|</span>
            )}
          </div>
        ))}
      </nav>

      {/* Center - just the sailboat */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 32px', width: '100%', textAlign: 'center' }}>
        <p style={{
          color: textDim, fontSize: 10, transition: 'color 0.5s ease',
        }}>
          Website designed and made by Robby Meek
        </p>
      </div>
    </div>
  )
}
