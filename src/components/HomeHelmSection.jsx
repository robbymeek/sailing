// ============================================================================
//  HomeHelmSection — the helm panel's scroll entrance on the home page.
// ============================================================================
//  Owner's choreography (Jul 11 2026, card direction — supersedes the earlier
//  full-viewport seat-and-hold): the panel is a SOLO OBJECT, like the cards
//  on rolex.com — a floating cased card that scrolls up in normal document
//  flow while the hero blacks out top-down behind it (MainView's exit veil),
//  onto a page with a solid black background. It occupies ~2/3 of the
//  viewport, so the section below peeks in underneath the card and the
//  scroll affordance is obvious.
//
//  Still zero scroll JS — no sticky, no dwell, no listeners: the section is
//  plain flow, so reverse scrolling replays exactly and the banner/bar pin
//  math (closed forms of window.scrollY) stays untouched.
import HelmPanel from './HelmPanel'
import { DESKTOP_BANNER_H } from './HomeSponsorStrip'

export default function HomeHelmSection({ isMobile = false }) {
  return (
    <section
      aria-label="Helm station"
      style={{
        background: '#000', // the page the card floats on — matches the hero's blacked-out exit
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
