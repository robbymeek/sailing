const BASE = import.meta.env.BASE_URL

// Plain, classy WHITE "sticker" panels carrying the campaign's partners.
//   MOBILE:  one slim horizontal bar across the top, all four logos in a row (default export).
//   DESKTOP: two lockups of TWO logos each — exported as <SponsorRect>, placed by MainView
//            (top nav bar + bottom-left). All logos upright.
//
// Every logo is sized to EQUAL VISUAL WEIGHT — not equal height. The logos differ wildly in
// aspect ratio and ink density, so equal height lets the wide/bold marks dominate. Instead
// each logo is sized on an equal-AREA basis (rendered area ∝ base², independent of aspect)
// with a per-logo optical `weight` correction (a dense/bold mark scaled down, an airy/thin
// one scaled up) so all read at the same perceived size. Non-interactive (pointerEvents:
// 'none') so they never compete with the orb's click zone. Edit SPONSORS to change the set.
const SPONSORS = [
  { name: 'AA Entertainment', logo: 'AAENT-Logo.png', aspect: 354 / 329, weight: 0.93, wide: false },
  { name: 'Charter Financial Group', logo: 'charter-logo.jpg', aspect: 652 / 143, weight: 1.0, wide: true },
  { name: 'AYC Foundation', logo: 'ayc-logo.png', aspect: 440 / 87, weight: 0.92, wide: true },
  { name: 'Sailing Foundation of New York', logo: 'sfny-logo.png', aspect: 543 / 177, weight: 1.08, wide: true },
]

// Equal-AREA multiplier. shortMul scales a logo's upright HEIGHT; because
// shortMul = weight/√aspect, the rendered area ≈ base²·weight² — equal across logos
// when weights match, nudged only by the optical `weight`. (Widths follow from the
// image aspect via width:auto, so each logo holds equal visual weight.)
const shortMul = (s) => s.weight / Math.sqrt(s.aspect)
// Bake a per-logo clamp() by scaling each stop, so equal-area holds across the whole
// responsive range (every logo scales together) while staying fluid.
const scaledClamp = (min, vw, max, mul) =>
  `clamp(${(min * mul).toFixed(2)}px, ${(vw * mul).toFixed(3)}vw, ${(max * mul).toFixed(2)}px)`

const PANEL_BG = '#ffffff'
const PANEL_SHADOW = '0 6px 30px rgba(0,0,0,0.32)'

// The four sponsors split into two pairs — one lockup each on desktop.
export const SPONSOR_PAIRS = [SPONSORS.slice(0, 2), SPONSORS.slice(2, 4)]

// One white sponsor rectangle carrying a PAIR of logos, upright side by side (equal-AREA
// / equal-weight sizing). The caller positions and widths it via `style` — MainView uses
// it as a flex sibling in the desktop top bar and as an absolute lockup bottom-left.
// Non-interactive so it never competes with the orb's click zone.
export function SponsorRect({ pair, style }) {
  return (
    <div
      style={{
        background: PANEL_BG,
        boxShadow: PANEL_SHADOW,
        display: 'flex',
        alignItems: 'stretch',
        minHeight: 'clamp(56px, 7.5vh, 74px)',
        padding: '8px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {pair.map((s) => (
        <div
          key={s.logo}
          style={{ flex: '1 1 0', minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 clamp(5px, 0.9vw, 13px)' }}
        >
          <img
            src={`${BASE}${s.logo}`}
            alt={s.name}
            style={{
              height: scaledClamp(26, 2.2, 40, shortMul(s)),
              width: 'auto',
              maxWidth: '100%',
              maxHeight: 'clamp(32px, 4.4vh, 46px)',
              objectFit: 'contain',
              display: 'block',
            }}
          />
        </div>
      ))}
    </div>
  )
}

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

  // DESKTOP: the two sponsor lockups are placed by MainView using <SponsorRect> — one as a
  // flex sibling in the top nav bar (so the banner, links, and CTA share equal gaps and
  // wrap instead of overlapping) and one bottom-left above the blurb. Nothing here.
  return null
}
