const PAGES = ['Home', 'Biography', 'The Team', 'The Road', 'Contact', 'Support']

// Display-label overrides for nav items whose page key shouldn't render
// verbatim. The route key stays 'Support' (routing + the /support page) — only the
// label reads clearer, so a newcomer doesn't mistake it for a help desk.
const SHORT_LABELS = { Support: 'Donate and Support' }

export default function Nav({ current, onNavigate, variant, excludeItems }) {
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

  // Home pins to the far LEFT and Contact to the far RIGHT, visually separated
  // from the centered main group. Everything else lives in the center cell.
  const centerPages = visiblePages.filter((p) => p !== 'Contact' && p !== 'Home')
  const contactIncluded = visiblePages.includes('Contact')
  const homeIncluded = visiblePages.includes('Home')

  const renderButton = (item) => {
    // Support is the primary CTA — give it the chrome sheen instead of a plain link
    // color (a light-friendly variant on the light nav). The gradient's
    // -webkit-text-fill-color:transparent overrides `color`, so Support's color is
    // left undefined and the sheen carries the emphasis.
    const isSupport = item === 'Support'
    const chromeClass = isSupport ? (variant === 'light' ? 'chrome-text-ink' : 'chrome-text') : undefined
    return (
      <button
        onClick={() => onNavigate(item)}
        className={chromeClass}
        style={{
          // Leave background undefined for Support so the chrome gradient (from the
          // class) shows through the clipped text; inline 'none' would kill the sheen.
          background: isSupport ? undefined : 'none',
          border: 'none', cursor: 'pointer',
          color: isSupport ? undefined : (item === current ? active : dim),
          fontSize: 14,
          fontWeight: isSupport || item === current ? 500 : 400,
          letterSpacing: '-0.3px', padding: '4px 8px',
          // The chrome sheen (light) washes out on a bright hero (e.g. /biography's
          // sky video, where the nav floats transparent). A soft shadow gives the
          // clipped text an edge on bright backgrounds; harmless on the dark ones.
          filter: isSupport ? 'drop-shadow(0 1px 2px rgba(0,0,0,0.38))' : undefined,
          transition: 'color 0.4s ease',
        }}
      >
        {SHORT_LABELS[item] || item}
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
      {/* Left cell: Home pinned to the left edge (mirrors Contact on the right;
          the 1fr column keeps the center group truly centered). */}
      <div style={{ justifySelf: 'start' }}>
        {homeIncluded && renderButton('Home')}
      </div>

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
