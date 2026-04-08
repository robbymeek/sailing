import { useEffect } from 'react'
import Nav from '../components/Nav'

const BASE = import.meta.env.BASE_URL

export default function Contact({ onNavigate }) {
  useEffect(() => { document.body.style.background = 'rgb(10,30,80)' }, [])

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Background photo */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0,
      }}>
        <img
          src={`${BASE}P1177244.jpeg`}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 40%',
          }}
        />
        {/* Blue overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(10,20,80,0.75)',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Nav current="Contact" onNavigate={onNavigate} variant="blue" />

        {/* Main content - centered */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            textAlign: 'center', padding: '60px 20px',
            background: 'rgba(0,0,0,0.2)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.08)',
            maxWidth: 460,
            width: '100%',
            margin: '20px',
          }}>
            <h1 style={{
              color: '#fff', fontSize: 24, fontWeight: 600, margin: '0 0 6px',
              letterSpacing: '-0.5px',
            }}>Robby Meek</h1>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, margin: '0 0 32px' }}>
              Annapolis, Maryland
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 6px' }}>
              Sailing: robbymeek+LA2028@gmail.com
            </p>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, margin: '0 0 32px' }}>
              Personal: robbymeek@gmail.com
            </p>
            <button
              onClick={() => onNavigate('Team')}
              style={{
                display: 'inline-block', color: 'rgba(255,255,255,0.6)', fontSize: 13,
                border: '1px solid rgba(255,255,255,0.2)', padding: '10px 28px',
                background: 'none', cursor: 'pointer', borderRadius: 4,
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
