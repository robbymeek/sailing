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
  { name: 'AA Entertainment', logo: 'AAENT-Logo.png', logoDark: 'AAENT-Logo-white.png', aspect: 354 / 329, weight: 0.93, wide: false },
  { name: 'Charter Financial Group', logo: 'charter-logo.jpg', logoDark: 'charter-logo-white.png', aspect: 652 / 143, weight: 1.0, wide: true },
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
// The sticker's drop shadow, parameterized by presence (0..1): DesktopBanner fades it out
// in lockstep with the box background as the lockup melts into the frosted bar — a
// full-strength shadow around a transparent box would paint a ghost rectangle.
export const panelShadow = (presence = 1) => `0 6px 30px rgba(0, 0, 0, ${0.32 * presence})`
const PANEL_SHADOW = panelShadow()

// The mobile sponsor banner's height — shared as a CSS clamp for the banner itself and as
// a px estimate for App's sticky menu bar, which rests just below the banner on home.
export const MOBILE_BANNER_H = 'clamp(58px, 9vh, 70px)'
export const mobileBannerHeightPx = () =>
  Math.min(70, Math.max(58, 0.09 * (typeof window !== 'undefined' ? window.innerHeight : 800)))

// The desktop nav banner's height ≡ the SponsorRect's height (the lockup IS the banner,
// zero vertical padding around it). Every consumer that must clear the banner (The Road's
// back button, Support's top padding) composes this clamp via CSS calc().
export const DESKTOP_BANNER_H = 'clamp(66px, 9vh, 92px)'

// The four sponsors split into two pairs — one lockup each on desktop.
export const SPONSOR_PAIRS = [SPONSORS.slice(0, 2), SPONSORS.slice(2, 4)]

// One sponsor rectangle carrying a PAIR of logos, upright side by side (equal-AREA /
// equal-weight sizing). The caller positions and widths it via `style` — DesktopBanner
// uses it as the sticky nav banner's left lockup, MainView as an absolute lockup
// bottom-left. Non-interactive so it never competes with the orb's click zone.
//
// `darkAware` (only the DesktopBanner top lockup sets it): the box follows CSS vars the
// banner writes as it pins — `--sponsor-box-bg` (white → transparent), `--sponsor-box-shadow`
// (fading out with it) and `--sponsor-dark` (0 → 1). Each logo is a colour/white pair sharing
// one grid cell, cross-fading on `--sponsor-dark`, so the lockup melts from a white sticker
// (floating over the orb / on the light pages) into bare white marks sitting directly on the
// frosted glass once it pins to the dark bar — no box, no shadow. Without it the lockup stays
// the plain white sticker (pair[1] bottom-left, the mobile strip).
export function SponsorRect({ pair, style, darkAware = false }) {
  // Equal-AREA target height pushed up to (nearly) fill the cell; maxWidth/maxHeight 100%
  // then cap each logo to its cell so nothing overflows.
  const imgStyle = (s) => ({
    height: scaledClamp(52, 5.2, 80, shortMul(s)),
    width: 'auto',
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
    display: 'block',
  })
  return (
    <div
      style={{
        background: darkAware ? 'var(--sponsor-box-bg, #ffffff)' : PANEL_BG,
        boxShadow: darkAware ? `var(--sponsor-box-shadow, ${PANEL_SHADOW})` : PANEL_SHADOW,
        display: 'flex',
        alignItems: 'stretch',
        // Taller than before so the logos can grow — each fills its cell as much as
        // possible while the equal-AREA sizing keeps the pair at equal visual weight
        // (so the wide marks fill the cell WIDTH and the squarer ones the HEIGHT).
        // Single source of truth with the desktop nav banner: banner height ≡ this.
        minHeight: DESKTOP_BANNER_H,
        padding: '7px',
        boxSizing: 'border-box',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {pair.map((s) => (
        <div
          key={s.logo}
          style={{
            flex: '1 1 0',
            minWidth: 0,
            padding: '0 clamp(3px, 0.45vw, 7px)',
            ...(darkAware
              ? { display: 'grid', placeItems: 'center' }
              : { display: 'flex', alignItems: 'center', justifyContent: 'center' }),
          }}
        >
          {darkAware ? (
            // Colour mark + its white twin stacked in one grid cell; complementary opacities
            // so one fades in exactly as the other fades out on --sponsor-dark.
            <>
              <img
                src={`${BASE}${s.logo}`}
                alt={s.name}
                style={{ ...imgStyle(s), gridArea: '1 / 1', opacity: 'calc(1 - var(--sponsor-dark, 0))' }}
              />
              <img
                src={`${BASE}${s.logoDark || s.logo}`}
                alt=""
                aria-hidden="true"
                style={{ ...imgStyle(s), gridArea: '1 / 1', opacity: 'var(--sponsor-dark, 0)' }}
              />
            </>
          ) : (
            <img src={`${BASE}${s.logo}`} alt={s.name} style={imgStyle(s)} />
          )}
        </div>
      ))}
    </div>
  )
}

export default function HomeSponsorStrip({ embedded = false, uiVisible = true, textOut = 0 }) {
  // Appears after the intro settles and fades on exit, in lockstep with the home nav.
  const opacity = (uiVisible ? 1 : 0) * (1 - textOut)

  if (embedded) {
    // MOBILE: full-width horizontal white bar at the VERY TOP — FOUR EQUAL COLUMNS, one logo
    // centered in each. The hamburger + "Menu" bar rests just BELOW it (App's sticky bar) and
    // pins to the top on scroll; position:absolute so the banner scrolls off with the hero.
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          minHeight: MOBILE_BANNER_H,
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
