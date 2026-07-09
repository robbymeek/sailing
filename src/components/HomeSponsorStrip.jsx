const BASE = import.meta.env.BASE_URL

// A plain, classy WHITE rectangle "sticker" banner carrying the campaign's partners.
//   DESKTOP: a slim vertical bar running top→bottom on the right, inset from the edge.
//   MOBILE:  a slim horizontal bar side-to-side across the top.
//
// The banner is split into FOUR EQUAL ZONES (one partner each), and every logo is sized to
// EQUAL VISUAL WEIGHT — not equal height. The logos differ wildly in aspect ratio and ink
// density, so equal height lets the wide/bold marks dominate. Instead each logo is sized on
// an equal-AREA basis (rendered area ∝ base², independent of aspect) with a per-logo optical
// `weight` correction (a dense/bold mark scaled down, an airy/thin one scaled up) so all
// four read at the same perceived size. `wide` marks a horizontal wordmark that is rotated
// -90° on the narrow desktop bar so it can use the bar's LONG axis and hold equal weight; on
// mobile every logo is upright. Non-interactive (pointerEvents:'none') so it never competes
// with the orb's click zone. Edit SPONSORS to change the set / order / weights.
const SPONSORS = [
  { name: 'AA Entertainment', logo: 'AAENT-Logo.png', aspect: 354 / 329, weight: 0.93, wide: false },
  { name: 'Charter Financial Group', logo: 'charter-logo.jpg', aspect: 652 / 143, weight: 1.0, wide: true },
  { name: 'AYC Foundation', logo: 'ayc-logo.png', aspect: 440 / 87, weight: 0.92, wide: true },
  { name: 'Sailing Foundation of New York', logo: 'sfny-logo.png', aspect: 543 / 177, weight: 1.08, wide: true },
]

// Equal-AREA multipliers. shortMul scales a logo's SHORT axis (upright height, or the
// horizontal extent of a rotated wordmark); longMul scales its LONG axis (= shortMul·aspect,
// the width upright / the vertical extent rotated). Because shortMul = weight/√aspect, the
// rendered area ≈ base²·weight² — equal across logos when weights match, nudged only by the
// optical `weight`.
const shortMul = (s) => s.weight / Math.sqrt(s.aspect)
const longMul = (s) => s.weight * Math.sqrt(s.aspect)
// Bake a per-logo clamp() by scaling each stop, so equal-area holds across the whole
// responsive range (every logo scales together) while staying fluid.
const scaledClamp = (min, vw, max, mul) =>
  `clamp(${(min * mul).toFixed(2)}px, ${(vw * mul).toFixed(3)}vw, ${(max * mul).toFixed(2)}px)`

const PANEL_BG = '#ffffff'
const PANEL_SHADOW = '0 6px 30px rgba(0,0,0,0.32)'

export default function HomeSponsorStrip({ embedded = false, uiVisible = true, textOut = 0 }) {
  // Appears after the intro settles and fades on exit, in lockstep with the home nav.
  const opacity = (uiVisible ? 1 : 0) * (1 - textOut)

  if (embedded) {
    // MOBILE: full-width horizontal white bar across the top — FOUR EQUAL COLUMNS, one logo
    // centered in each. Sits BELOW the hamburger so the auto-colored menu icon stays legible
    // on the dark field above; position:absolute so it scrolls off with the hero.
    return (
      <div
        style={{
          position: 'absolute',
          top: 'clamp(56px, 8vh, 76px)',
          left: 0,
          right: 0,
          minHeight: 'clamp(58px, 9vh, 70px)',
          background: PANEL_BG,
          boxShadow: PANEL_SHADOW,
          display: 'flex',
          alignItems: 'stretch',
          padding: '8px 6px',
          zIndex: 20,
          pointerEvents: 'none',
          opacity,
          transition: 'opacity 0.6s ease',
        }}
      >
        {SPONSORS.map((s) => (
          <div
            key={s.logo}
            style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 clamp(4px, 1.4vw, 10px)' }}
          >
            <img
              src={`${BASE}${s.logo}`}
              alt={s.name}
              style={{
                height: scaledClamp(30, 9.0, 38, shortMul(s)),
                width: 'auto',
                maxWidth: '100%',
                maxHeight: 'clamp(40px, 6.4vh, 50px)',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          </div>
        ))}
      </div>
    )
  }

  // DESKTOP: slim vertical white bar top→bottom on the right, inset (padded from edge).
  // FOUR EQUAL ROWS, one logo centered in each. Wide wordmarks are rotated -90° so they use
  // the bar's LONG (vertical) axis — essential for equal weight on a ~100px-wide bar, where
  // an upright wordmark would shrink to a sliver. The square badge stays upright.
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
        alignItems: 'stretch',
        padding: 'clamp(10px, 1.6vh, 18px) 0',
        zIndex: 46,
        pointerEvents: 'none',
        opacity,
        transition: 'opacity 0.6s ease',
      }}
    >
      {SPONSORS.map((s) => (
        <div
          key={s.logo}
          style={{ flex: '1 1 0', minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(3px, 0.7vh, 9px) 6px', overflow: 'hidden' }}
        >
          {s.wide ? (
            // Rotated wordmark: a fixed layout box (horizontal extent × vertical extent) with
            // the img absolute-centered and rotated, so the large un-rotated width never skews
            // the flex layout. Both extents come from the same equal-area base.
            <div style={{ position: 'relative', width: scaledClamp(56, 5.4, 72, shortMul(s)), height: scaledClamp(56, 5.4, 72, longMul(s)) }}>
              <img
                src={`${BASE}${s.logo}`}
                alt={s.name}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  width: scaledClamp(56, 5.4, 72, longMul(s)),
                  maxWidth: 'none',
                  transform: 'translate(-50%, -50%) rotate(-90deg)',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <img
              src={`${BASE}${s.logo}`}
              alt={s.name}
              style={{ height: scaledClamp(56, 5.4, 72, shortMul(s)), width: 'auto', maxWidth: '84%', objectFit: 'contain', display: 'block' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}
