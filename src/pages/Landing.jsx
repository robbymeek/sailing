import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL
const BOAT_SIZE = 180

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

  // Entrance animation
  const [entered, setEntered] = useState(false)
  const [spinning, setSpinning] = useState(true)

  useEffect(() => {
    const t1 = setTimeout(() => setSpinning(false), 800)
    const t2 = setTimeout(() => setEntered(true), 1000)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  const handleGoToHome = () => {
    setEntered(false)
    setSpinning(true)
    setTimeout(() => onNavigate('Home'), 600)
  }

  const textDim = dark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
  const textNav = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
  const divider = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'
  const gif = dark ? `${BASE}[0001-0250].gif` : `${BASE}[0001-0240].gif`

  const textFade = {
    opacity: entered ? 1 : 0,
    transform: entered ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.6s ease, transform 0.6s ease',
  }

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
      <nav style={{ ...textFade,
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

      {/* Center - sailboat + Join the Team */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 28,
      }}>
        <img
          src={gif}
          alt="Sailboat"
          onClick={handleGoToHome}
          style={{
            width: BOAT_SIZE,
            height: BOAT_SIZE,
            cursor: 'pointer',
            animation: spinning ? 'spinFast 0.3s linear infinite' : 'none',
            transition: 'transform 0.5s ease',
          }}
        />
        <button
          onClick={() => onNavigate('Team')}
          style={{
            ...textFade,
            background: 'none',
            border: `1px solid ${divider}`,
            color: textDim,
            fontSize: 13, fontWeight: 400, letterSpacing: '-0.2px',
            padding: '10px 28px', cursor: 'pointer',
            transition: 'opacity 0.6s ease, transform 0.6s ease, color 0.5s ease, border-color 0.5s ease',
          }}
        >
          Join the Team
        </button>
      </div>

      {/* Footer */}
      <div style={{ padding: '20px 32px', width: '100%', textAlign: 'center', ...textFade }}>
        <p style={{
          color: textDim, fontSize: 10, transition: 'color 0.5s ease',
        }}>
          Website designed and made by Robby Meek
        </p>
      </div>
    </div>
  )
}
