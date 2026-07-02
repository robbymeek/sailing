import { useState } from 'react'

// ============================================================================
//  ExitNav — image-backed "where to next" banner shared across page ends
//  (Coming Soon tour, Event Calendar, Biography). Desktop: parallelogram cards
//  that share a slanted seam (square outer edges) and enlarge + lift on hover.
//  Mobile: plain stacked tiles (slanted-thin cards don't work on a phone).
//
//  Props: links = [{ label, page, img, light }], onNavigate, isMobile
//  Card variants (see components/exitCards.js for the canonical definitions):
//  • img   — photo card (default): dark scrim + white label
//  • light — solid white card, black text (the Support card)
//  Cards show ONLY their title — no sub-description line.
// ============================================================================

// Cards share a slanted seam; the leftmost/rightmost outer edges stay square.
// Equal widths + a -SLANT left margin make the seams line up.
const SLANT = 30
function clipFor(index, count) {
  const S = `${SLANT}px`
  if (index === 0) return `polygon(0 0, 100% 0, calc(100% - ${S}) 100%, 0 100%)` // square left
  if (index === count - 1) return `polygon(${S} 0, 100% 0, 100% 100%, 0 100%)` // square right
  return `polygon(${S} 0, 100% 0, calc(100% - ${S}) 100%, 0 100%)` // parallelogram
}

// Desktop card — an image-backed parallelogram that enlarges + slides up above
// its neighbours on hover.
function ExitCard({ label, page, img, light, onNavigate, index, count }) {
  const [hover, setHover] = useState(false)
  const clip = clipFor(index, count)
  const labelColor = light ? '#111' : '#fff'
  return (
    <button
      onClick={() => onNavigate(page)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'relative', flex: '1 1 0', minWidth: 0, height: '100%',
        marginLeft: index === 0 ? 0 : -SLANT,
        clipPath: clip, WebkitClipPath: clip,
        border: 'none', padding: 0, cursor: 'pointer',
        background: light ? '#fff' : '#111',
        textAlign: 'left',
        zIndex: hover ? count + 1 : count - index, // hovered on top; else left-over-right
        transform: hover ? 'translateY(-16px) scale(1.06)' : 'none',
        transition: 'transform 0.3s cubic-bezier(0.2,0.7,0.2,1)',
      }}
    >
      {img && (
        <img
          src={img}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover',
            transform: hover ? 'scale(1.08)' : 'scale(1)',
            filter: hover ? 'brightness(1)' : 'brightness(0.6)',
            transition: 'transform 0.6s ease, filter 0.35s ease',
          }}
        />
      )}
      {img && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.32) 55%, rgba(0,0,0,0.06) 100%)',
        }} />
      )}
      {/* inset past the slanted edges so the label never gets clipped */}
      <div style={{ position: 'absolute', left: SLANT + 6, right: SLANT + 6, bottom: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: labelColor, fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px' }}>{label}</span>
          <span style={{
            color: labelColor, fontSize: 16,
            opacity: hover ? 1 : 0, transform: hover ? 'translateX(0)' : 'translateX(-6px)',
            transition: 'opacity 0.2s ease, transform 0.2s ease',
          }}>→</span>
        </div>
      </div>
    </button>
  )
}

// Mobile card — a full-width image tile with SHARP slanted left/right edges
// (a parallelogram), the lean ALTERNATING down the stack (╱, ╲, ╱, ╲ …).
const MSLANT = 32
function mClip(index) {
  const S = `${MSLANT}px`
  return index % 2 === 0
    ? `polygon(${S} 0, 100% 0, calc(100% - ${S}) 100%, 0 100%)` // ╱ lean
    : `polygon(0 0, calc(100% - ${S}) 0, 100% 100%, ${S} 100%)` // ╲ lean
}

function ExitCardSimple({ label, page, img, light, onNavigate, index }) {
  const clip = mClip(index)
  const labelColor = light ? '#111' : '#fff'
  return (
    <button
      onClick={() => onNavigate(page)}
      style={{
        position: 'relative', height: 104, overflow: 'hidden',
        cursor: 'pointer', padding: 0, textAlign: 'left',
        background: light ? '#fff' : '#111',
        width: '100%', border: 'none',
        clipPath: clip, WebkitClipPath: clip,
      }}
    >
      {img && (
        <img src={img} alt="" aria-hidden="true" style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.58)',
        }} />
      )}
      {img && (
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 100%)' }} />
      )}
      {/* label inset past both slanted edges so it never clips */}
      <div style={{ position: 'absolute', left: MSLANT + 14, right: MSLANT + 14, top: 0, bottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <span style={{ color: labelColor, fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>{label} →</span>
      </div>
    </button>
  )
}

export default function ExitNav({ links, onNavigate, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '0 20px', display: 'grid', gap: 12 }}>
        {links.map((l, i) => (
          <ExitCardSimple key={l.page} {...l} onNavigate={onNavigate} index={i} />
        ))}
      </div>
    )
  }
  return (
    <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 24px' }}>
      <div style={{ display: 'flex', height: 210 }}>
        {links.map((l, i) => (
          <ExitCard key={l.page} {...l} onNavigate={onNavigate} index={i} count={links.length} />
        ))}
      </div>
    </div>
  )
}
