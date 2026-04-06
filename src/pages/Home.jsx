import { useState, useEffect } from 'react'
import useCountdown from '../hooks/useCountdown'

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

  return (
    <div style={{
      background: 'rgb(19,23,31)',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: 'inset 0 0 120px 20px rgba(120,60,20,0.15), inset 0 0 60px 10px rgba(80,30,10,0.1)',
      borderRadius: 12,
      border: '1px solid rgba(100,50,20,0.15)',
    }}>
      {/* Left - Event Calendar */}
      <div style={{
        position: 'absolute', left: 80, top: '50%',
        transform: 'translateY(-50%)', textAlign: 'center',
      }}>
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

      {/* Center - Sailboat */}
      <svg width="180" height="200" viewBox="0 0 180 200" fill="none">
        <line x1="90" y1="30" x2="90" y2="155" stroke="rgb(80,90,110)" strokeWidth="2" />
        <path d="M90 30 C90 30,130 85,130 140 L90 140Z" fill="rgb(70,80,100)" opacity="0.5" />
        <path d="M90 30 C90 30,128 85,128 135 L90 135Z" fill="rgb(80,90,110)" opacity="0.35" />
        <path d="M92 45 C92 45,118 90,120 125 L92 125Z" fill="rgb(90,100,120)" opacity="0.2" />
        <path d="M90 50 C90 50,70 95,68 135 L90 135Z" fill="rgb(65,75,95)" opacity="0.3" />
        <ellipse cx="90" cy="158" rx="28" ry="5" fill="rgb(70,80,100)" opacity="0.5" />
        <rect x="62" y="152" width="56" height="7" rx="2" fill="rgb(65,75,95)" opacity="0.5" />
      </svg>

      {/* Right - Biography */}
      <div style={{
        position: 'absolute', right: 80, top: '50%',
        transform: 'translateY(-50%)', textAlign: 'center',
      }}>
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
  )
}
