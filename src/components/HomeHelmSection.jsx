// ============================================================================
//  HomeHelmSection — the helm panel's scroll entrance on the home page.
// ============================================================================
//  Owner's choreography (Jul 2026): on scroll, the background blacks out from
//  the TOP of the page (MainView's exit veil, a top-down gradient) while ONE
//  picture-frame panel in a nautical casing scrolls up from the BOTTOM. It
//  seats with black bars on all sides — top padding clears the pinned nav
//  banner — holds for a beat (the page "becomes" the control panel), then
//  releases into normal scrolling toward the white overview below.
//
//  Implementation is pure document flow — NO scroll listener, NO transforms:
//  an in-flow black section right after the 100dvh hero, containing a sticky
//  full-viewport stage. Riding up from below IS the entrance; the sticky pin
//  IS the seat; the extra DWELL_VH of section height IS the hold. Reverse
//  scrolling replays it exactly by construction, and the banner/bar pin math
//  (closed forms of window.scrollY) stays untouched.
import HelmPanel from './HelmPanel'
import { DESKTOP_BANNER_H } from './HomeSponsorStrip'

// How long the seated panel holds (in vh of scroll) before releasing into
// the overview. Short enough to feel like a detent, not a stop.
const DWELL_VH = 60

export default function HomeHelmSection({ isMobile = false }) {
  // 100svh on mobile so the collapsing URL bar can't clip the seated panel
  // (Team's pinned timeline uses the same unit); any dvh−svh sliver below the
  // stage shows the section's own black — indistinguishable from the bars.
  const stageH = isMobile ? '100svh' : '100dvh'
  const pad = isMobile
    ? '64px 14px 16px' // 52px pinned menu bar + breathing room
    : `calc(${DESKTOP_BANNER_H} + 14px) clamp(18px, 2.8vw, 44px) clamp(16px, 2.8vh, 36px)`
  return (
    <section
      aria-label="Helm station"
      style={{
        position: 'relative',
        height: `calc(${stageH} + ${DWELL_VH}vh)`,
        background: '#000', // the void the panel floats in — matches the hero's blacked-out exit
      }}
    >
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: stageH,
          overflow: 'hidden',
          boxSizing: 'border-box',
          padding: pad,
          display: 'flex',
        }}
      >
        <HelmPanel />
      </div>
    </section>
  )
}
