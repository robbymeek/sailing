import { useState, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import useCountdown from '../hooks/useCountdown'

const BASE = import.meta.env.BASE_URL
const BOAT_SIZE = 180

export default function MainView({ onNavigate }) {
  const location = useLocation()
  const isLanding = location.pathname.includes('landing')

  // System dark mode
  const [sysDark, setSysDark] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const h = (e) => setSysDark(e.matches)
    mq.addEventListener('change', h)
    return () => mq.removeEventListener('change', h)
  }, [])

  // Mode: 'home' or 'landing'
  const [mode, setMode] = useState(isLanding ? 'landing' : 'home')
  const [transitioning, setTransitioning] = useState(false)
  const [textVisible, setTextVisible] = useState(false)

  // Fade text in on mount
  useEffect(() => {
    const t = setTimeout(() => setTextVisible(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Sync mode with route on initial load
  useEffect(() => {
    setMode(isLanding ? 'landing' : 'home')
  }, [isLanding])

  const handleToggle = useCallback(() => {
    if (transitioning) return
    setTransitioning(true)
    setTextVisible(false)

    setTimeout(() => {
      const newMode = mode === 'home' ? 'landing' : 'home'
      setMode(newMode)
      const newPath = newMode === 'home' ? '/' : '/landing'
      window.history.replaceState(null, '', `${BASE.replace(/\/$/, '')}${newPath}`)
    }, 500)

    setTimeout(() => {
      setTextVisible(true)
      setTransitioning(false)
    }, 1200)
  }, [mode, transitioning])

  // Scroll detection on dark home page: scroll down → landing, scroll up → contact
  useEffect(() => {
    if (mode !== 'home' || transitioning) return

    let accumulated = 0
    const threshold = 80

    const onWheel = (e) => {
      if (transitioning) return
      accumulated += e.deltaY

      if (accumulated > threshold) {
        accumulated = 0
        handleToggle()
      } else if (accumulated < -threshold) {
        accumulated = 0
        setTextVisible(false)
        setTimeout(() => onNavigate('Contact'), 400)
      }

      // Decay toward zero
      setTimeout(() => { accumulated *= 0.5 }, 200)
    }

    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [mode, transitioning, handleToggle, onNavigate])

  // Countdown + clock
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

  // Responsive
  const [portrait, setPortrait] = useState(window.innerHeight > window.innerWidth)
  useEffect(() => {
    const h = () => setPortrait(window.innerHeight > window.innerWidth)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])


  // Colors
  const inHome = mode === 'home'
  const landingDark = sysDark
  const homeBg = 'rgb(19,23,31)'
  const landingBg = landingDark ? 'rgb(19,23,31)' : 'rgb(245,245,245)'
  const bg = inHome ? homeBg : landingBg

  useEffect(() => {
    document.body.style.background = bg
    document.body.style.transition = 'background 0.7s ease'
  }, [bg])

  // Landing colors
  const textDim = landingDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)'
  const textNav = landingDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
  const divider = landingDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'

  const textFade = {
    opacity: textVisible ? 1 : 0,
    transform: textVisible ? 'translateY(0)' : 'translateY(8px)',
    transition: 'opacity 0.5s ease, transform 0.5s ease',
  }

  // The boat: both GIFs stacked, cross-fade between them
  const darkGif = `${BASE}[0001-0250].gif`
  const lightGif = `${BASE}[0001-0240].gif`

  // Which GIF is on top depends on mode
  const showDarkGif = inHome || (mode === 'landing' && landingDark)

  const boatEl = (
    <div
      onClick={handleToggle}
      style={{
        width: BOAT_SIZE, height: BOAT_SIZE,
        position: 'relative', cursor: 'pointer', flexShrink: 0,
      }}
    >
      {/* Dark boat: scaled up slightly to match light boat size */}
      <img
        src={darkGif}
        alt="Sailboat dark"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          opacity: showDarkGif ? 1 : 0,
          transition: 'opacity 0.7s ease',
          transform: 'scale(1.23) translate(-1%, 8%)',
          transformOrigin: 'center center',
        }}
      />
      {/* Light boat: slight offset to align hull */}
      <img
        src={lightGif}
        alt="Sailboat light"
        style={{
          position: 'absolute',
          top: 0, left: 0,
          width: '100%', height: '100%',
          opacity: showDarkGif ? 0 : 1,
          transition: 'opacity 0.7s ease',
          transform: 'scale(0.92) translate(4%, 5%)',
          transformOrigin: 'center center',
        }}
      />
    </div>
  )

  // ========== LANDING MODE ==========
  if (!inHome) {
    return (
      <div style={{
        background: bg,
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        transition: 'background 0.7s ease',
      }}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 28,
        }}>
          {boatEl}
          <button
            onClick={() => onNavigate('Team')}
            style={{
              ...textFade,
              background: 'none',
              border: `1px solid ${divider}`,
              color: textDim,
              fontSize: 13, fontWeight: 400, letterSpacing: '-0.2px',
              padding: '10px 28px', cursor: 'pointer',
            }}
          >
            Join the Team
          </button>
        </div>

        <div style={{ padding: '20px 32px', width: '100%', textAlign: 'center', ...textFade }}>
          <p style={{ color: textDim, fontSize: 10, transition: 'color 0.5s ease' }}>
            Website designed and made by Robby Meek
          </p>
        </div>
      </div>
    )
  }

  // ========== HOME MODE ==========
  if (portrait) {
    return (
      <div
        style={{
          background: bg,
          height: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
          transition: 'background 0.7s ease',
        }}
      >
        <div style={{ textAlign: 'center', position: 'absolute', top: '15%', ...textFade }}>
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

        {boatEl}

        <div style={{ textAlign: 'center', position: 'absolute', bottom: '15%', ...textFade }}>
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

  // Home landscape
  return (
    <div
      style={{
        background: bg,
        height: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        overflow: 'hidden',
        position: 'relative',
        padding: '0 clamp(20px, 5vw, 80px)',
        transition: 'background 0.7s ease',
      }}
    >
      <div style={{ textAlign: 'center', flexShrink: 0, ...textFade }}>
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

      {boatEl}

      <div style={{ textAlign: 'center', flexShrink: 0, ...textFade }}>
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
