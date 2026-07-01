import { useState } from 'react'

// ============================================================================
//  Shared events-calendar UI — used by BOTH the standalone Event Calendar page
//  and the Biography events section so they never drift. Data lives in
//  src/data/events.js.
// ============================================================================

// One clickable past-event row → opens the modal.
export function EventRow({ event, isActive, onActivate }) {
  const [hovered, setHovered] = useState(false)
  const highlighted = hovered || isActive
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onActivate}
      style={{
        padding: highlighted ? '22px 20px' : '18px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        background: highlighted ? 'rgb(0,20,120)' : 'transparent',
        margin: highlighted ? '4px -20px' : '0',
        transition: 'all 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 400 }}>{event.n}</span>
        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, flexShrink: 0, marginLeft: 16 }}>{event.d}</span>
      </div>
    </div>
  )
}

// The chrome "door" into the future campaign tour. Styled with the same LA 2028
// shimmer (chrome-text) so it invites the click, and navigates to Coming Soon
// instead of opening a modal.
export function BridgeRow({ onNavigate }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate('Coming Soon')}
      style={{
        padding: hovered ? '22px 20px' : '18px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        cursor: 'pointer',
        background: hovered ? 'rgb(0,20,120)' : 'transparent',
        margin: hovered ? '4px -20px' : '0',
        transition: 'all 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span className="chrome-text" style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.2px' }}>
          Upcoming: Full-Time Olympic Training
        </span>
        <span
          style={{
            color: hovered ? '#fff' : 'rgba(255,255,255,0.5)',
            fontSize: 13,
            flexShrink: 0,
            whiteSpace: 'nowrap',
            transition: 'color 0.2s ease',
          }}
        >
          2026 – 2028 →
        </span>
      </div>
    </div>
  )
}

export function EventModal({ event, onClose }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgb(15,25,60)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '36px 40px',
          maxWidth: 520,
          width: '100%',
        }}
      >
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 6px', letterSpacing: '-0.3px' }}>
          {event.n}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, margin: '0 0 20px' }}>{event.d}</p>
        <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.7, margin: '0 0 24px' }}>
          {event.summary}
        </p>
        <div style={{ display: 'flex', gap: 12 }}>
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: 400,
                border: '1px solid rgba(255,255,255,0.15)', padding: '8px 20px',
                textDecoration: 'none', borderRadius: 4,
              }}
            >
              Event Page
            </a>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.35)', fontSize: 13,
              padding: '8px 20px', cursor: 'pointer', borderRadius: 4,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
