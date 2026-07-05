import { useState } from 'react'

// ============================================================================
//  Results-list UI — used by the Biography RESULTS section (the site's single
//  home for past results since the standalone Event Calendar page was
//  retired). Data lives in src/data/events.js and mirrors the sailing résumé:
//  every row is a uniform { place, fleet, event, year } record, grouped by
//  era (ILCA 7 / ILCA 6 / College / High School).
// ============================================================================

// 1st / 2nd / 3rd get medal-tinted ordinals; everything else stays neutral.
const PLACE_COLORS = {
  1: 'rgb(255,214,120)',
  2: 'rgb(201,208,220)',
  3: 'rgb(226,171,124)',
}

function placeColor(place) {
  return PLACE_COLORS[place] || '#fff'
}

function ordinal(n) {
  const rem10 = n % 10
  const rem100 = n % 100
  if (rem10 === 1 && rem100 !== 11) return `${n}st`
  if (rem10 === 2 && rem100 !== 12) return `${n}nd`
  if (rem10 === 3 && rem100 !== 13) return `${n}rd`
  return `${n}th`
}

// Era header: "▸ ILCA 7 ————————— 2022 – Present". Clicking toggles the
// group's list. Each group toggles independently (all four can be open at
// once); state lives in Biography's openGroups.
export function GroupHeader({ title, years, open, onToggle }) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-expanded={open}
      aria-label={`${title} results, ${years}`}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 16,
        width: '100%',
        background: 'none',
        border: 'none',
        borderBottom: '1px solid rgba(255,255,255,0.25)',
        fontFamily: 'inherit',
        textAlign: 'left',
        cursor: 'pointer',
        padding: '44px 0 12px',
      }}
    >
      <span
        style={{
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          transition: 'color 0.2s ease',
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: 'inline-block',
            marginRight: 12,
            fontSize: 10,
            color: '#fff',
            transform: open ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.25s ease, color 0.2s ease',
          }}
        >
          ▶
        </span>
        {title}
      </span>
      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, letterSpacing: '1px', flexShrink: 0 }}>
        {years}
      </span>
    </button>
  )
}

// One uniform result row: place badge → event name (+ class) | tag → year.
// The distinction tag ("Top American") reads as plain text after a vertical
// bar, same size and colour as the event name (owner request — no chip box).
// Every row opens the modal — at minimum it shows the full stat line.
// isMobile (<700px, incl. the MobileHome embed): tighter place column.
export function ResultRow({ result, isActive, isMobile, onActivate }) {
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
      <div style={{ display: 'flex', alignItems: 'baseline', gap: isMobile ? 12 : 14 }}>
        <span style={{ width: isMobile ? 78 : 96, flexShrink: 0, whiteSpace: 'nowrap' }}>
          <span style={{ color: placeColor(result.place), fontSize: isMobile ? 13 : 14, fontWeight: 700 }}>
            {ordinal(result.place)}
          </span>
          <span style={{ color: '#fff', fontSize: isMobile ? 11 : 12 }}> of {result.fleet}</span>
        </span>
        <span style={{ flex: 1, minWidth: 0, overflowWrap: 'break-word' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 400 }}>
            {result.event}
          </span>
          {result.classNote && (
            <span style={{ color: '#fff', fontSize: 12.5 }}> · {result.classNote}</span>
          )}
          {result.tag && (
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 400 }}> | {result.tag}</span>
          )}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, flexShrink: 0, marginLeft: isMobile ? 8 : 16 }}>
          {result.year}
        </span>
      </div>
    </div>
  )
}

// The chrome "door" into the future campaign tour. Styled with the same LA 2028
// shimmer (chrome-text) so it invites the click, and navigates to The Road
// instead of opening a modal.
export function BridgeRow({ onNavigate }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => onNavigate('The Road')}
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

export function EventModal({ result, group, onClose }) {
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
        <p style={{
          color: '#fff', fontSize: 12, letterSpacing: '2px',
          textTransform: 'uppercase', margin: '0 0 10px',
        }}>
          {group.title} · {result.year}
        </p>
        <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 600, margin: '0 0 14px', letterSpacing: '-0.3px' }}>
          {result.event}
          {result.classNote && (
            <span style={{ color: '#fff', fontSize: 14, fontWeight: 400 }}> · {result.classNote}</span>
          )}
        </h2>
        {/* Stat line: "1st of 41 | Top American" — the tag as plain text
             after the bar, matching the "of N" size (owner request). */}
        <div style={{ margin: '0 0 20px' }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: placeColor(result.place), letterSpacing: '-0.5px' }}>
            {ordinal(result.place)}
          </span>
          <span style={{ color: '#fff', fontSize: 15, fontWeight: 400 }}> of {result.fleet}</span>
          {result.tag && (
            <span style={{ color: '#fff', fontSize: 15, fontWeight: 400 }}> | {result.tag}</span>
          )}
        </div>
        {result.summary && (
          <p style={{ color: '#fff', fontSize: 14, lineHeight: 1.7, margin: '0 0 20px' }}>
            {result.summary}
          </p>
        )}
        {result.fleetNote && (
          <p style={{ color: '#fff', fontSize: 13, fontStyle: 'italic', margin: '0 0 20px' }}>
            {result.fleetNote}
          </p>
        )}
        <div style={{ display: 'flex', gap: 12 }}>
          {result.url && (
            <a
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: '#fff', fontSize: 13, fontWeight: 400,
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
              color: '#fff', fontSize: 13,
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
