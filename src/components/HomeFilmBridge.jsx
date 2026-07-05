const BASE = import.meta.env.BASE_URL

// ============================================================================
//  HomeFilmBridge — mobile home only: the black title-card beat between the
//  cinematic home frame and the sailing film strip.
// ============================================================================
//  The embedded home used to hard-cut from the dark photo/orb frame straight
//  into the mid-loop film. This band turns that cut into an intentional cinema
//  beat — pure black, the ROBBY MEEK wordmark (same asset as the film strip's
//  fallback card, so it is already warm in cache from the hidden Biography
//  preload copy), a chrome "THE FILM" kicker — echoing the white title cards
//  baked into the film's own edit.
//
//  It also buys loading runway: roughly one extra screen of scroll between the
//  home frame and the strip, which SailingBanner's early-warm observer uses to
//  start fetching the film before it is visible.
//
//  Home click policy applies (background is dead space): nothing here is a
//  click target. The band's black matches MainView's embedded exit fade — by
//  the time this scrolls up, the home frame above it has faded to the same
//  black, so the seam is invisible.
// ============================================================================

export default function HomeFilmBridge() {
  return (
    <section
      aria-label="The film"
      style={{
        position: 'relative',
        minHeight: '56vh',
        background: 'rgb(0,0,0)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        boxSizing: 'border-box',
      }}
    >
      <img
        src={`${BASE}trailer/wordmark.png`}
        alt=""
        aria-hidden="true"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
        style={{ width: 'min(78%, 360px)', height: 'auto', pointerEvents: 'none' }}
      />
      {/* Negative margin tucks the kicker under the wordmark's baked-in glow
          padding (the PNG carries ~40% empty height below the lettering). */}
      <div
        className="chrome-text"
        style={{
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.35em',
          paddingLeft: '0.35em', // re-center: letter-spacing trails the last glyph
          marginTop: -52,
          userSelect: 'none',
        }}
      >
        THE FILM
      </div>
    </section>
  )
}
