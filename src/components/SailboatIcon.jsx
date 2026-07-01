// Shared sailboat marker — used on the Path & Team timeline spine and as the
// traveling marker on the Coming Soon progress rail. Variants tint the sail/hull
// and add a glow: 'default' | 'active' (blue) | 'glow' (white) | 'ghost' (faint).
export default function SailboatIcon({ variant = 'default', size = 22 }) {
  const scale = size / 22
  let mast, sail, jib, hull, filterStyle
  if (variant === 'active') {
    mast = 'rgba(120,190,255,1)'
    sail = 'rgba(100,175,255,0.95)'
    jib = 'rgba(120,190,255,0.8)'
    hull = 'rgba(140,200,255,1)'
    filterStyle = 'drop-shadow(0 0 8px rgba(80,160,255,0.6))'
  } else if (variant === 'glow') {
    mast = 'rgba(255,255,255,0.95)'
    sail = 'rgba(255,255,255,0.8)'
    jib = 'rgba(255,255,255,0.6)'
    hull = 'rgba(255,255,255,0.9)'
    filterStyle = 'drop-shadow(0 0 8px rgba(220,40,40,0.5))'
  } else if (variant === 'ghost') {
    mast = 'rgba(255,255,255,0.18)'
    sail = 'rgba(255,255,255,0.1)'
    jib = 'rgba(255,255,255,0.07)'
    hull = 'rgba(255,255,255,0.15)'
    filterStyle = 'none'
  } else {
    mast = 'rgba(255,255,255,0.9)'
    sail = 'rgba(255,255,255,0.7)'
    jib = 'rgba(255,255,255,0.5)'
    hull = 'rgba(255,255,255,0.85)'
    filterStyle = 'none'
  }
  return (
    <svg width={size} height={Math.round(26 * scale)} viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{ filter: filterStyle, transition: 'filter 0.4s ease' }}
    >
      <line x1="11" y1="2" x2="11" y2="20" stroke={mast} strokeWidth="1.2" />
      <path d="M11 3 L11 18 L4 18 Z" fill={sail} />
      <path d="M11 3 L11 14 L16 14 Z" fill={jib} />
      <path d="M3 20 L19 20 L17 24 L5 24 Z" fill={hull} />
    </svg>
  )
}
