import { useState, useEffect } from 'react'
import useCountdown from '../hooks/useCountdown'
import Nav from '../components/Nav'

const BASE = import.meta.env.BASE_URL

export default function Home({ onNavigate }) {
  const target = new Date('2028-07-14T00:00:00')
  const { days, hrs, mins, secs } = useCountdown(target)
  const [clock, setClock] = useState('')

  useEffect(() => {
    const update = () => {
      const n = new Date()
      setClock(
        `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`
      )
    }
    update()
    const iv = setInterval(update, 1000)
    return () => clearInterval(iv)
  }, [])

  useEffect(() => { document.body.style.background = 'rgb(19,23,31)' }, [])

  const [showNav, setShowNav] = useState(false)

  return (
    <div
      onMouseMove={(e) => setShowNav(e.clientY < 80)}
      onMouseLeave={() => setShowNav(false)}
      style={{
        background: 'rgb(19,23,31)',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        boxShadow: 'inset 0 0 120px 20px rgba(120,60,20,0.15), inset 0 0 60px 10px rgba(80,30,10,0.1)',
      }}
    >
      {/* Nav - appears on hover near top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        opacity: showNav ? 1 : 0,
        transform: showNav ? 'translateY(0)' : 'translateY(-10px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
        pointerEvents: showNav ? 'auto' : 'none',
      }}>
        <Nav current="Home" onNavigate={onNavigate} />
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(40px, 8vw, 120px)',
        width: '100%',
        padding: '0 clamp(20px, 4vw, 60px)',
      }}>
        {/* Left - Event Calendar */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <button
            onClick={() => onNavigate('Event Calendar')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
          >
            <p style={{
              color: 'rgb(117,117,117)', fontSize: 12, fontWeight: 400,
              letterSpacing: '-0.48px', textTransform: 'uppercase', margin: '0 0 6px',
            }}>EVENT CALENDAR</p>
            <h1 style={{
              color: 'rgb(157,174,194)', fontSize: 20, fontWeight: 400,
              letterSpacing: '-0.8px', margin: '0 0 8px',
            }}>LA 2028</h1>
          </button>
          <p style={{ color: 'rgb(153,153,153)', fontSize: 16, fontWeight: 500, margin: 0 }}>
            {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} : {String(secs).padStart(2, '0')}
          </p>
        </div>

        {/* Center - Sailboat GIF */}
        <img
          src={`${BASE}[0001-0250].gif`}
          alt="Sailboat"
          onClick={() => onNavigate('Team')}
          style={{
            width: 'clamp(120px, 18vw, 200px)',
            height: 'clamp(120px, 18vw, 200px)',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        />

        {/* Right - Biography */}
        <div style={{ textAlign: 'center', flexShrink: 0 }}>
          <button
            onClick={() => onNavigate('Biography')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'center' }}
          >
            <p style={{
              color: 'rgb(117,117,117)', fontSize: 12, fontWeight: 400,
              letterSpacing: '-0.48px', textTransform: 'uppercase', margin: '0 0 6px',
            }}>BIOGRAPHY</p>
            <h1 style={{
              color: 'rgb(157,174,194)', fontSize: 20, fontWeight: 400,
              letterSpacing: '-0.8px', margin: '0 0 8px',
            }}>ROBBY MEEK</h1>
          </button>
          <p style={{ color: 'rgb(153,153,153)', fontSize: 16, fontWeight: 500, margin: 0 }}>
            {clock}
          </p>
        </div>
      </div>
    </div>
  )
}
