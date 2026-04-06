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

      {/* Center - Sailboat GIF */}
      <img
        src="/[0001-0250].gif"
        alt="Sailboat"
        onClick={() => onNavigate('Team')}
        style={{
          width: 200,
          height: 200,
          cursor: 'pointer',
          animation: 'spin 8s linear infinite',
        }}
      />

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
