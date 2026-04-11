const PAGES = ['Home', 'Biography', 'Event Calendar', 'Team', 'Contact', 'Support']

const SHORT_LABELS = {
  'Biography': 'Bio',
  'Event Calendar': 'Events',
}

export default function Nav({ current, onNavigate, variant, excludeItems, plainSupport }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 600

  let dim, active
  if (variant === 'red') {
    dim = 'rgba(40,5,5,0.5)'
    active = 'rgba(40,5,5,0.8)'
  } else if (variant === 'light') {
    dim = 'rgba(0,0,0,0.4)'
    active = 'rgba(0,0,0,0.6)'
  } else {
    dim = 'rgba(255,255,255,0.5)'
    active = 'rgba(255,255,255,0.6)'
  }

  // On the dark variant, emphasize Support with chrome-shimmer as the single CTA accent.
  // Pass plainSupport to opt out (e.g. on the home hover nav, where Support
  // should match the rest of the items visually).
  const homeSupportCTA = variant === 'dark' && !plainSupport

  const visiblePages = excludeItems
    ? PAGES.filter((p) => !excludeItems.includes(p))
    : PAGES

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      gap: 8, padding: '20px 0',
    }}>
      {visiblePages.map((item, i) => {
        const isSupport = item === 'Support'
        const shimmerCTA = isSupport && homeSupportCTA
        return (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onNavigate(item)}
              className={shimmerCTA ? 'chrome-text' : undefined}
              style={{
                // NOTE: leave background unset for shimmerCTA so the chrome-text class's
                // linear-gradient can paint — background-clip: text needs that gradient as
                // the background source. Setting `background: 'none'` inline here would
                // make the text fill transparent with no gradient to clip, rendering it invisible.
                background: shimmerCTA ? undefined : 'none',
                border: 'none', cursor: 'pointer',
                color: shimmerCTA ? undefined : (item === current ? active : dim),
                fontSize: 14,
                fontWeight: shimmerCTA ? 500 : (item === current ? 500 : 400),
                letterSpacing: '-0.3px', padding: '4px 8px',
                transition: 'color 0.4s ease',
              }}
            >
              {isMobile && SHORT_LABELS[item] ? SHORT_LABELS[item] : item}
            </button>
            {i < visiblePages.length - 1 && (
              <span style={{ color: dim, fontSize: 14, transition: 'color 0.4s ease' }}>|</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
