const BASE = import.meta.env.BASE_URL

// A plain, classy WHITE rectangle "sticker" banner carrying the campaign's partners.
//   DESKTOP: a slim vertical bar running top→bottom on the right, inset from the edge.
//   MOBILE:  a slim horizontal bar side-to-side across the top.
// Logos show in their own art on the white (NOT knocked white). `wide` marks a
// horizontal wordmark that is rotated sideways on the vertical desktop bar so it reads
// at a legible size; every logo is upright in the horizontal mobile row. Assets live in
// public/ and are kept small (PNG/JPG, crisp on any browser). Non-interactive
// (pointerEvents:'none') so it never competes with the orb's click zone. Edit SPONSORS
// to change the set / order.
const SPONSORS = [
  { name: 'AA Entertainment', logo: 'AAENT-Logo.png', wide: false },
  { name: 'Charter Financial Group', logo: 'charter-logo.jpg', wide: true },
  { name: 'AYC Foundation', logo: 'ayc-logo.png', wide: true },
  { name: 'Sailing Foundation of New York', logo: 'sfny-logo.png', wide: true },
]

const PANEL_BG = '#ffffff'
const PANEL_SHADOW = '0 6px 30px rgba(0,0,0,0.32)'

export default function HomeSponsorStrip({ embedded = false, uiVisible = true, textOut = 0 }) {
  // Appears after the intro settles and fades on exit, in lockstep with the home nav.
  const opacity = (uiVisible ? 1 : 0) * (1 - textOut)

  if (embedded) {
    // MOBILE: full-width horizontal white bar across the top — all logos upright in a
    // centered row. Sits BELOW the hamburger so the auto-colored menu icon stays legible
    // on the dark field above; position:absolute so it scrolls off with the hero.
    return (
      <div
        style={{
          position: 'absolute',
          top: 'clamp(56px, 8vh, 76px)',
          left: 0,
          right: 0,
          minHeight: 'clamp(54px, 9vh, 66px)',
          background: PANEL_BG,
          boxShadow: PANEL_SHADOW,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'clamp(10px, 3vw, 18px)',
          padding: '8px 14px',
          zIndex: 20,
          pointerEvents: 'none',
          opacity,
          transition: 'opacity 0.6s ease',
        }}
      >
        {SPONSORS.map((s) => (
          <img
            key={s.logo}
            src={`${BASE}${s.logo}`}
            alt={s.name}
            style={{ height: 'clamp(16px, 4.2vw, 22px)', width: 'auto', maxWidth: '30vw', objectFit: 'contain', display: 'block' }}
          />
        ))}
      </div>
    )
  }

  // DESKTOP: slim vertical white bar top→bottom on the right, inset (padded from edge).
  // Wide wordmarks are rotated -90° (sideways) so they read at a legible size down the
  // bar; the square badge stays upright. Top inset clears the hover-revealed top nav.
  const V = 'clamp(84px, 8.5vw, 112px)' // rotated wordmark's vertical extent
  return (
    <div
      style={{
        position: 'fixed',
        top: 'clamp(64px, 9vh, 96px)',
        bottom: 'clamp(24px, 4vh, 40px)',
        right: 'clamp(32px, 4vw, 64px)',
        width: 'clamp(82px, 7vw, 104px)',
        background: PANEL_BG,
        boxShadow: PANEL_SHADOW,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'clamp(16px, 2.4vh, 24px)',
        zIndex: 46,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.6s ease',
      }}
    >
      {SPONSORS.map((s) =>
        s.wide ? (
          // rotated sideways: fixed layout box (short × V); img absolute-centered + rotated
          <div key={s.logo} style={{ position: 'relative', width: 'clamp(30px, 3.4vw, 46px)', height: V }}>
            <img
              src={`${BASE}${s.logo}`}
              alt={s.name}
              style={{ position: 'absolute', top: '50%', left: '50%', width: V, maxWidth: 'none', transform: 'translate(-50%, -50%) rotate(-90deg)', display: 'block' }}
            />
          </div>
        ) : (
          <img
            key={s.logo}
            src={`${BASE}${s.logo}`}
            alt={s.name}
            style={{ height: 'clamp(38px, 3.2vw, 48px)', width: 'auto', maxWidth: '78%', objectFit: 'contain', display: 'block' }}
          />
        )
      )}
    </div>
  )
}
