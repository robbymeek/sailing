// ============================================================================
//  HomeHelmSection — the home card's scroll entrance.
// ============================================================================
//  Owner's choreography (Jul 2026, card-over-pinned-hero direction): the
//  hero stays FIXED in the viewport (MainView is sticky) and BRIGHTENS to
//  the raw photograph (scrim lifts, chrome fades); this section — the card
//  as a SOLO floating sheet, like the cards on rolex.com — rides up OVER it
//  inside HomeShell's z45 scroll layer, pulling the rest of the site up
//  behind it. The section is TRANSPARENT: the full-brightness photo shows
//  around the rising card. The card occupies ~2/3 of the viewport, so the
//  white overview peeks in underneath it and the scroll affordance is
//  obvious.
//
//  The card itself (Sep 2026) is HomeNowCard — where Robby is training now,
//  the conditions there, and his last workout. (It replaced the Helm Station
//  instrument panel; the file keeps its name so App.jsx is untouched.)
//
//  Zero scroll JS here — no listeners: plain document flow, so reverse
//  scrolling replays exactly and the banner/bar pin math (closed forms of
//  window.scrollY) stays untouched.
import { lazy, Suspense } from 'react'
import { DESKTOP_BANNER_H } from './HomeSponsorStrip'

// The card sits below the fold, so it ships as its own chunk (its chart
// renderer, weather + workout clients stay out of the entry bundle). It starts
// loading as soon as this section mounts. Same retry-once idiom as App.jsx's
// lazy routes: a transient blip retries; a persistent failure (a stale chunk
// hash after a redeploy) bubbles to the top-level ErrorBoundary, which reloads.
const HomeNowCard = lazy(() =>
  import('./HomeNowCard').catch(
    (err) =>
      new Promise((resolve, reject) =>
        setTimeout(() => import('./HomeNowCard').then(resolve, () => reject(err)), 400),
      ),
  ),
)
// While the chunk lands: the bare white sheet, same box — no layout shift.
const CARD_PLACEHOLDER = <div style={{ width: '100%', height: '100%', background: '#fff' }} />

export default function HomeHelmSection({ isMobile = false, onNavigate }) {
  return (
    <section
      aria-label="Where Robby is now"
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
          // svh on mobile so the collapsing URL bar can't jump the card. The
          // floor never exceeds what fits under the pinned bar, so a short
          // landscape window still shows the whole card.
          height: isMobile ? '66svh' : '66dvh',
          minHeight: isMobile
            ? 'min(340px, calc(100svh - 52px - 16px))'
            : `min(340px, calc(100dvh - ${DESKTOP_BANNER_H} - 16px))`,
          maxWidth: 1600,
          margin: '0 auto',
        }}
      >
        <Suspense fallback={CARD_PLACEHOLDER}>
          <HomeNowCard onNavigate={onNavigate} />
        </Suspense>
      </div>
    </section>
  )
}
