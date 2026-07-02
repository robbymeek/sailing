import { useState } from 'react'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'
import EVENTS from '../data/events'
import { EventRow, BridgeRow, EventModal } from '../components/eventUI'
import ExitNav from '../components/ExitNav'
import { EXIT_CARDS } from '../components/exitCards'

const EXIT_LINKS = [EXIT_CARDS.home, EXIT_CARDS.biography, EXIT_CARDS.path, EXIT_CARDS.support]

export default function EventCalendar({ onNavigate }) {
  const [selected, setSelected] = useState(null)
  const olympicTarget = new Date('2028-07-14T00:00:00')
  const olympic = useCountdown(olympicTarget)

  // Next event countdown — San Pedro OCR, July 2026 (also the first Coming Soon stop)
  const nextEventTarget = new Date('2026-07-20T00:00:00')
  const nextEvent = useCountdown(nextEventTarget)

  const entrance = usePageEntrance(5, { staggerMs: 120, initialDelayMs: 0 })

  return (
    <div style={{ background: 'rgb(0,0,0)', minHeight: '100vh' }}>

      <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
        <h1 style={{
          color: '#fff', fontSize: 100, fontWeight: 800,
          letterSpacing: '-4px', margin: '0 0 10px',
        }}>LA 2028</h1>
        <p style={{
          ...entrance.style(1),
          color: 'rgb(153,153,153)', fontSize: 18, fontWeight: 500, margin: '0 0 8px',
        }}>
          {olympic.days} : {String(olympic.hrs).padStart(2, '0')} : {String(olympic.mins).padStart(2, '0')} : {String(olympic.secs).padStart(2, '0')}
        </p>

        {/* Next event countdown — chrome shimmer */}
        <div style={{ ...entrance.style(2), margin: '28px 0 12px' }}>
          <p
            className="chrome-text"
            style={{
              fontSize: 'clamp(12px, 1.8vw, 16px)',
              fontWeight: 600,
              letterSpacing: '-0.3px',
              margin: 0,
              whiteSpace: 'nowrap',
            }}
          >
            Next Event: San Pedro OCR in {nextEvent.days} Days
          </p>
        </div>

        <p style={{ ...entrance.style(3), color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: '16px 0 0' }}>
          Click on event to learn more.
        </p>
      </div>

      <div style={{ ...entrance.style(4), maxWidth: 900, margin: '40px auto', padding: '0 40px' }}>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          {/* The chrome "door" into the future campaign tour, pinned to the top. */}
          <BridgeRow onNavigate={onNavigate} />
          {EVENTS.map((e, i) => (
            <EventRow
              key={i}
              event={e}
              isActive={selected === e}
              onActivate={() => setSelected(e)}
            />
          ))}
        </div>
      </div>

      {selected && (
        <EventModal event={selected} onClose={() => setSelected(null)} />
      )}

      {/* where-to-next parallelogram nav */}
      <div style={{ padding: '30px 0 80px' }}>
        <ExitNav links={EXIT_LINKS} onNavigate={onNavigate} isMobile={window.innerWidth < 700} />
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
