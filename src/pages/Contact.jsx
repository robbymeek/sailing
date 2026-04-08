import { useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

export default function Contact({ onNavigate }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 50)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Background photo */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img
          src={`${BASE}P1177244.jpeg`}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 40%',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,20,80,0.75)',
        }} />
      </div>

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 1, flex: 1,
        display: 'flex', flexDirection: 'column',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 0.5s ease, transform 0.5s ease',
      }}>
        {/* Main content - centered */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            width: '100%',
            background: 'rgba(240,240,240,0.94)',
            padding: '48px 20px',
            textAlign: 'center',
          }}>
            <h1 style={{
              color: 'rgb(30,30,30)', fontSize: 22, fontWeight: 600, margin: '0 0 4px',
              letterSpacing: '-0.3px',
            }}>Robby Meek</h1>
            <p style={{ color: 'rgb(110,110,110)', fontSize: 14, margin: '0 0 24px' }}>
              Annapolis, Maryland
            </p>
            <p style={{ color: 'rgb(80,80,80)', fontSize: 13, margin: '0 0 4px' }}>
              Sailing: robbymeek+LA2028@gmail.com
            </p>
            <p style={{ color: 'rgb(80,80,80)', fontSize: 13, margin: '0 0 24px' }}>
              Personal: robbymeek@gmail.com
            </p>
            <button
              onClick={() => onNavigate('Team')}
              style={{
                display: 'inline-block', color: 'rgb(60,60,60)', fontSize: 13,
                border: '1px solid rgb(180,180,180)', padding: '10px 28px',
                background: 'none', cursor: 'pointer',
              }}
            >
              Support the Journey
            </button>
          </div>
        </div>

        {/* Footer credit */}
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10 }}>
            Website designed and made by Robby Meek
          </p>
        </div>
      </div>
    </div>
  )
}
