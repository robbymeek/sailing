// ============================================================================
//  HomeHelmSection — the helm panel's scroll entrance on the home page.
// ============================================================================
//  Owner's choreography (Jul 2026, card-over-pinned-hero direction): the
//  hero stays FIXED in the viewport (MainView is sticky) and BRIGHTENS to
//  the raw photograph (scrim lifts, chrome fades); this section — the panel
//  as a SOLO floating card, like the cards on rolex.com — rides up OVER it
//  inside HomeShell's z45 scroll layer, pulling the rest of the site up
//  behind it. The section is TRANSPARENT: the full-brightness photo shows
//  around the rising card. The card occupies ~2/3 of the viewport, so the
//  white overview peeks in underneath it and the scroll affordance is
//  obvious.
//
//  Zero scroll JS here — no listeners: plain document flow, so reverse
//  scrolling replays exactly and the banner/bar pin math (closed forms of
//  window.scrollY) stays untouched.
import HelmPanel from './HelmPanel'
import { DESKTOP_BANNER_H } from './HomeSponsorStrip'

export default function HomeHelmSection({ isMobile = false }) {
  return (
    <section
      aria-label="Helm station"
      style={{
        // transparent — the pinned hero (brightening to the raw photo)
        // shows through around the rising card
        padding: isMobile
          ? '68px 14px 44px' // 52px pinned menu bar + air, card margins, bottom air before the peek
          : `calc(${DESKTOP_BANNER_H} + 26px) clamp(20px, 3vw, 56px) clamp(30px, 6vh, 72px)`,
      }}
    >
      <div
        style={{
          // ~2/3 of the viewport: tall enough to read as the page's second
          // beat, short enough that the white overview peeks in below it.
          // svh on mobile so the collapsing URL bar can't jump the card.
          height: isMobile ? '66svh' : '66dvh',
          minHeight: 340,
          maxWidth: 1600,
          margin: '0 auto',
        }}
      >
        <HelmPanel />
      </div>
    </section>
  )
}
