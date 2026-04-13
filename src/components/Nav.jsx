import { useState } from 'react'

const PAGES = ['Home', 'Biography', 'Event Calendar', 'Path', 'Team', 'Contact', 'Support']

const SHORT_LABELS = {
  'Biography': 'Bio',
  'Event Calendar': 'Events',
}

export default function Nav({ current, onNavigate, variant, excludeItems }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600
  const [hoveredItem, setHoveredItem] = useState(null)

  let dim, active
  if (variant === 'red') {
    dim = 'rgba(40,5,5,0.5)'
    active = 'rgba(40,5,5,0.8)'
  } else if (variant === 'light') {
    dim = 'rgba(0,0,0,0.55)'
    active = 'rgba(0,0,0,0.9)'
  } else {
    dim = 'rgba(255,255,255,0.5)'
    active = 'rgba(255,255,255,0.6)'
  }

  const visiblePages = excludeItems
    ? PAGES.filter((p) => !excludeItems.includes(p))
    : PAGES

  // Contact is always pinned to the right of the nav, visually separated from
  // the centered main group. The rest of the items live in the center cell.
  const centerPages = visiblePages.filter((p) => p !== 'Contact')
  const contactIncluded = visiblePages.includes('Contact')

  const renderButton = (item) => {
    const supportHover = item === 'Support' && hoveredItem === 'Support'
    return (
      <button
        onClick={() => onNavigate(item)}
        onMouseEnter={() => setHoveredItem(item)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          background: 'none',
          border: 'none', cursor: 'pointer',
          color: supportHover ? 'rgb(10,85,235)' : (item === current ? active : dim),
          fontSize: 14,
          fontWeight: item === current ? 500 : 400,
          letterSpacing: '-0.3px', padding: '4px 8px',
          transition: 'color 0.4s ease',
        }}
      >
        {isMobile && SHORT_LABELS[item] ? SHORT_LABELS[item] : item}
      </button>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '20px 24px',
    }}>
      {/* Left cell: empty spacer (the 1fr column keeps the center group
          truly centered while Contact anchors to the right edge). */}
      <div />

      {/* Center cell: the main nav items with their pipe separators. */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        justifySelf: 'center',
      }}>
        {centerPages.map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {renderButton(item)}
            {i < centerPages.length - 1 && (
              <span style={{ color: dim, fontSize: 14, transition: 'color 0.4s ease' }}>|</span>
            )}
          </div>
        ))}
      </div>

      {/* Right cell: Contact pinned to the right edge. */}
      <div style={{ justifySelf: 'end' }}>
        {contactIncluded && renderButton('Contact')}
      </div>
    </div>
  )
}
