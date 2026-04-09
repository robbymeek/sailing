const PAGES = ['Home', 'Biography', 'Event Calendar', 'Team', 'Contact']

const SHORT_LABELS = {
  'Biography': 'Bio',
  'Event Calendar': 'Events',
}

export default function Nav({ current, onNavigate, variant }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600

  let dim, active
  if (variant === 'red') {
    dim = 'rgba(80,0,0,0.7)'
    active = 'rgba(120,0,0,0.9)'
  } else if (variant === 'light') {
    dim = 'rgba(0,0,0,0.4)'
    active = 'rgba(0,0,0,0.6)'
  } else {
    dim = 'rgba(255,255,255,0.5)'
    active = 'rgba(255,255,255,0.6)'
  }

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: 8, padding: '20px 0',
    }}>
      {PAGES.map((item, i) => (
        <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => onNavigate(item)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: item === current ? active : dim,
              fontSize: 14, fontWeight: item === current ? 500 : 400,
              letterSpacing: '-0.3px', padding: '4px 8px',
              transition: 'color 0.4s ease',
            }}
          >
            {isMobile && SHORT_LABELS[item] ? SHORT_LABELS[item] : item}
          </button>
          {i < PAGES.length - 1 && (
            <span style={{ color: dim, fontSize: 14, transition: 'color 0.4s ease' }}>|</span>
          )}
        </div>
      ))}
    </div>
  )
}
