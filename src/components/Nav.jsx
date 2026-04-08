const PAGES = ['Home', 'Biography', 'Event Calendar', 'Team', 'Contact']

export default function Nav({ current, onNavigate, variant }) {
  const dark = variant !== 'light'
  const dim = dark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'
  const active = dark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'

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
            {item}
          </button>
          {i < PAGES.length - 1 && (
            <span style={{ color: dim, fontSize: 14, transition: 'color 0.4s ease' }}>|</span>
          )}
        </div>
      ))}
    </div>
  )
}
