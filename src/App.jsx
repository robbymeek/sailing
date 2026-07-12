import { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import DesktopBanner, { DesktopMenuOverlay, MENU_PAGES, withAlpha, BAR_MAX_ALPHA, BAR_MAX_BLUR } from './components/DesktopBanner'
import orbOverlay from './lib/orbOverlay'
import blackBridge from './lib/blackBridge'

// Pages shown in the mobile overlay nav: the desktop menu's list plus Support
// (which the desktop banner's Donate CTA owns) — derived so the two can't drift.
const COMPACT_PAGES = [...MENU_PAGES, 'Support']
import MainView from './pages/MainView'
import HomeHelmSection from './components/HomeHelmSection'
import HomeOverview from './components/HomeOverview'
import Biography from './pages/Biography'
import Contact from './pages/Contact'
import ErrorBoundary from './components/ErrorBoundary'
import { applyRouteMeta } from './lib/seo'
import { mobileBannerHeightPx } from './components/HomeSponsorStrip'
import useCountdown from './hooks/useCountdown'
import DonateLockup from './components/DonateLockup'

// Retry a dynamic import once (after a short beat) before giving up — smooths
// over a transient network blip; a persistent failure (a stale chunk hash
// after a redeploy) then bubbles to the top-level ErrorBoundary, which reloads
// once to pick up the fresh index.html + current hashes.
const lazyWithRetry = (factory) =>
  lazy(() =>
    factory().catch(
      (err) =>
        new Promise((resolve, reject) =>
          setTimeout(() => factory().then(resolve, () => reject(err)), 400),
        ),
    ),
  )

// Lazy: The Road carries three.js (~150KB gz) — keep it out of the main
// bundle. Do NOT add it to the offscreen preload div below; that would boot
// a hidden WebGL context permanently.
const TheRoad = lazyWithRetry(() => import('./pages/TheRoad'))
// Team + Support never render on Home and carry their own weight — split them
// out of the entry bundle too. The Suspense fallbacks below match each page's
// background so a cold navigation can't flash a different colour. (Do NOT lazy
// Biography — the always-on offscreen preload would re-fetch its chunk anyway.)
const Team = lazyWithRetry(() => import('./pages/Team'))
const Support = lazyWithRetry(() => import('./pages/Support'))

// Old URLs → new homes. Resolved BEFORE the route-transition machine ever
// sees them (see the displayLocation initializer + redirect effect below), so
// a stale link never fades toward a blank page and never consumes the
// one-shot orb hand-off flag mid-hop.
const REDIRECTS = {
  '/coming-soon': '/the-road',
  '/event-calendar': '/biography',
  '/path': '/team',
}
// The router matched the retired routes case-insensitively with optional
// trailing slashes — give the redirect map the same tolerance, or links like
// /coming-soon/ and /Coming-Soon strand visitors on a blank page.
const redirectFor = (pathname) =>
  REDIRECTS[pathname.toLowerCase().replace(/\/+$/, '') || '/']

const INNER_BG = {
  '/biography': 'rgb(230,235,240)',
  '/team': 'rgb(12,14,18)',
  '/contact': 'rgb(255,255,255)',
  '/support': 'rgb(240,240,240)',
  '/the-road': 'rgb(0,0,0)',
}

const VARIANT_MAP = {
  '/': 'dark',
  '/biography': 'dark', // white nav text — it floats over the dark video hero
  '/team': 'dark',
  '/contact': 'light',
  '/support': 'light',
  '/the-road': 'dark',
}

// Solid backgrounds for the mobile sticky menu bar, matched to each page's TOP hero
// (NOT getBg — /biography's body is light but its top is the dark video hero). The bar
// fades from transparent to this as it pins on scroll.
const MOBILE_BAR_BG = {
  '/': 'rgb(0,0,0)',
  '/biography': 'rgb(14,16,20)',
  '/team': 'rgb(12,14,18)',
  '/the-road': 'rgb(0,0,0)',
  '/contact': 'rgb(255,255,255)',
  '/support': 'rgb(240,240,240)',
}
// withAlpha / BAR_MAX_ALPHA / BAR_MAX_BLUR live in DesktopBanner.jsx now — one frosted
// colour model shared by the mobile bar and the desktop banner (imported above).
// Mobile menu-bar geometry as a closed form of scroll: on home it rests just below the
// sponsor banner (restOffset) and pins to top:0 on scroll; on inner pages it's pinned
// (restOffset 0). `t` runs 0 (floating over the orb) → 1 (pinned): the bar fades to a
// translucent frosted panel as it pins. Reversible — scrolling to the top of home restores
// the clean float.
function computeMobileBar(navPath, barBg, fgPinned) {
  if (typeof window === 'undefined') {
    return { topPx: 0, bg: withAlpha(barBg, BAR_MAX_ALPHA), fg: fgPinned, blur: BAR_MAX_BLUR }
  }
  const restOffset = navPath === '/' ? mobileBannerHeightPx() : 0
  const y = window.scrollY
  const topPx = Math.max(0, restOffset - y)
  const t = restOffset > 0 ? Math.max(0, Math.min(1, y / restOffset)) : 1
  const floating = restOffset > 0 && t < 0.5
  return {
    topPx,
    bg: withAlpha(barBg, t * BAR_MAX_ALPHA),
    fg: floating ? 'rgba(255,255,255,0.92)' : fgPinned,
    blur: t * BAR_MAX_BLUR,
  }
}

const CURRENT_MAP = {
  '/': 'Home',
  '/biography': 'Biography',
  '/team': 'The Team',
  '/contact': 'Contact',
  '/support': 'Support',
  '/the-road': 'The Road',
}

// Home route (both layouts): the cinematic MainView frame; then the helm
// station — on scroll, MainView's exit veil blacks the frame out from the
// top down while the nautical control panel scrolls up from the bottom as
// a solo floating card onto the black page, sized ~2/3 of the viewport so
// the overview peeks in below it (HomeHelmSection); then the white
// editorial overview. The live orb still morphs → The Road
// on click. MainView is KEYED to the layout mode: `embedded` gates
// mount-time state (the useOrb lazy init, the orbOverlay attach effect) that
// a prop flip alone would not rebuild — the key forces the same full remount
// the old MobileHome/DesktopHome type-swap produced during the ~250ms window
// before App's home breakpoint-cross reload (below) lands.
function HomeShell({ onNavigate, isMobile }) {
  return (
    <div>
      <MainView key={isMobile ? 'mobile' : 'desktop'} onNavigate={onNavigate} embedded={isMobile} />
      <HomeHelmSection isMobile={isMobile} />
      <HomeOverview onNavigate={onNavigate} isMobile={isMobile} />
    </div>
  )
}

// LA 2028 countdown, shown FADED in the centre of the mobile sticky bar (home only, a child
// of the bar so it pins). Absolutely centred so MENU (left) + Donate (right) don't shift it.
// Colour tracks --fg like MENU; non-interactive.
const OLYMPICS_TARGET = Date.parse('2028-07-14T00:00:00')
function BarCountdown() {
  const { days, hrs, mins, secs } = useCountdown(OLYMPICS_TARGET)
  const timer = `${days} : ${String(hrs).padStart(2, '0')} : ${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`
  return (
    <span aria-hidden="true" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      lineHeight: 1.2, whiteSpace: 'nowrap', pointerEvents: 'none',
      color: 'var(--fg)', opacity: 0.5,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px' }}>LA 2028</span>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px' }}>OLYMPICS</span>
      <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.2px', fontVariantNumeric: 'tabular-nums' }}>{timer}</span>
    </span>
  )
}

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  function getBg(pathname) {
    if (pathname === '/') return 'rgb(0,0,0)' // pure black for the cinematic home
    return INNER_BG[pathname] || 'rgb(19,23,31)'
  }

  const go = (page, state) => {
    // On the home route (one long scrollable page on BOTH layouts), "Home" scrolls to top
    if (page === 'Home' && location.pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    const routes = {
      'Home': '/',
      'Biography': '/biography',
      'The Team': '/team',
      'The Road': '/the-road',
      'Contact': '/contact',
      'Support': '/support',
    }
    navigate(routes[page] || '/', { state })
  }

  // Exit/enter animation state. The initializer resolves redirects so a cold
  // load at an old URL paints the target page on the very first frame — no
  // fade, no blank flash, no extra history entry beyond the replace below.
  const [displayLocation, setDisplayLocation] = useState(() =>
    redirectFor(location.pathname)
      ? { ...location, pathname: redirectFor(location.pathname) }
      : location
  )
  const [transitionStage, setTransitionStage] = useState('entered')

  // Redirect BEFORE the transition machine (layout effects run in declaration
  // order). replace keeps the dead URL out of history; forwarding state
  // preserves fromOrb / from:'Biography' through the hop.
  const redirectTo = redirectFor(location.pathname)
  useLayoutEffect(() => {
    if (!redirectTo) return
    // Kill the browser's saved-scroll restore for the dead URL's entry — the
    // offset belongs to the deleted page, not the redirect target. 'manual'
    // is required (a bare scrollTo(0,0) gets overridden when the browser
    // retries its deferred restoration after the SPA's content grows).
    try { history.scrollRestoration = 'manual' } catch { /* older browsers */ }
    window.scrollTo(0, 0)
    navigate(redirectTo, { replace: true, state: location.state })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redirectTo])

  // Per-route <title>/description/canonical (the SPA ships one index.html).
  // Keyed on the displayed route so the tab title tracks the visible page.
  useEffect(() => {
    applyRouteMeta(displayLocation.pathname)
  }, [displayLocation.pathname])

  // fromOrb: the home orb→globe morph is mid-handoff. The body-level orb overlay
  // is showing the finished globe; swap routes SYNCHRONOUSLY with NO fade-to-black
  // (the overlay hides the swap), land at scroll 0 (= the globe's hero pose), and
  // let The Road boot underneath. The overlay dissolves once its globe is ready.
  const fromOrb = location.state?.fromOrb || orbOverlay.pendingFromOrb
  useLayoutEffect(() => {
    // Never start a transition toward a redirect source — the redirect effect
    // above is about to replace it, and consuming pendingFromOrb here would
    // replay the orb hand-off as a curtainless fade after the hop.
    if (redirectTo) return
    if (location.pathname === displayLocation.pathname) return
    if (fromOrb) {
      try { history.scrollRestoration = 'manual' } catch { /* older browsers */ }
      window.scrollTo(0, 0)
      setDisplayLocation(location) // pre-paint swap
      setTransitionStage('entered')
      // Consume the one-shot hand-off flag AFTER the swap render commits (macro
      // task), so The Road's first render still sees seamless=true. Without
      // this, a back/forward re-entry would replay the seamless choreography
      // (scroll lock, held-back hero) with no curtain on screen.
      setTimeout(() => { orbOverlay.pendingFromOrb = false }, 0)
      return undefined
    }
    setTransitionStage('exiting')
    // Leaving home via a normal nav: fade the body-level orb overlay out WITH
    // the page's exit fade so it doesn't stay at full opacity and "pop" while
    // everything else fades. The orb→globe morph (fromOrb, above) is exempt —
    // it holds the overlay across the swap.
    if (displayLocation.pathname === '/' && !orbOverlay.holding) orbOverlay.fadeOut(110)
    const t = setTimeout(() => {
      setDisplayLocation(location)
      setTransitionStage('entered')
      window.scrollTo(0, 0)
    }, 130)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location])

  // Safety net: if The Road's globe never signals ready (texture error →
  // StaticTimeline), dissolve the overlay anyway so it can't get stuck on screen.
  useEffect(() => {
    if (displayLocation.pathname !== '/the-road' || !orbOverlay.holding) return undefined
    const t = setTimeout(() => orbOverlay.crossfadeOut(250), 1800)
    return () => clearTimeout(t)
  }, [displayLocation.pathname])

  // Leaving (or never reaching) /the-road clears the hand-off curtain — a
  // no-op when none is up. Covers the user backing out mid-hold (browser
  // back/edge-swipe bypasses the curtain), which otherwise strands the home
  // under a tap-swallowing black layer until the curtain's safety timer.
  // (The /coming-soon redirect source is exempt: it forwards to /the-road.)
  useEffect(() => {
    if (location.pathname !== '/the-road' && !redirectFor(location.pathname)) blackBridge.fadeOut(300)
  }, [location.pathname])

  function handleExitComplete(e) {
    if (e.target !== e.currentTarget) return
    if (transitionStage === 'exiting') {
      setDisplayLocation(location)
      setTransitionStage('entered')
      window.scrollTo(0, 0)
    }
  }

  // Background color management
  useEffect(() => {
    const bg = getBg(location.pathname)
    document.body.style.background = bg
    document.body.style.transition = 'background 0.4s ease'
    // Also sync <html>: the index.html cold-load script paints documentElement
    // once, but on client-side navigation only <body> was updated — so an
    // overscroll/bounce could reveal a stale colour (e.g. arriving at /contact
    // from a dark page). Keeping <html> in step makes the bounce match the page.
    document.documentElement.style.background = bg
  }, [location.pathname])

  // Idle-prefetch the lazy The Road chunk so the 350ms route transition
  // never waits on the network.
  useEffect(() => {
    // Skip the speculative ~143KB (TheRoad + three.js) pull for data-saver
    // users — they opt out of background downloads. The orb→Road path stays
    // warm regardless via warmTheRoad() (MainView) on orb tap.
    if (navigator.connection?.saveData) return
    const t = setTimeout(() => { import('./pages/TheRoad') }, 2500)
    return () => clearTimeout(t)
  }, [])

  const isExiting = transitionStage === 'exiting'
  const navPath = isExiting ? displayLocation.pathname : location.pathname

  // Mobile detection for combined home+biography and compact nav
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 700
  )
  useEffect(() => {
    // Snapshot the layout mode the page LOADED in. On the HOME route, crossing the
    // 700px threshold swaps the whole tree (live WebGL orb ↔ baked video). Rebuilding
    // the body-level orb scene in place is flaky — it re-fetches/re-decodes the boat GIF
    // and photo, which garbles the refraction and the in-orb HUD (LA 2028 / countdown).
    // So on home we do ONE clean reload after the drag settles; other routes relayout
    // fine on their own and just flip the state. Debounced → exactly one reload per real
    // crossing, and after the reload `loadedMobile` matches the width so it never loops.
    const loadedMobile = window.innerWidth < 700
    let reloadTimer = 0
    const onResize = () => {
      const nowMobile = window.innerWidth < 700
      setIsMobile(nowMobile)
      clearTimeout(reloadTimer)
      if (nowMobile !== loadedMobile && window.location.pathname === '/') {
        reloadTimer = setTimeout(() => {
          if ((window.innerWidth < 700) !== loadedMobile && window.location.pathname === '/') {
            window.location.reload()
          }
        }, 250)
      }
    }
    window.addEventListener('resize', onResize)
    return () => { window.removeEventListener('resize', onResize); clearTimeout(reloadTimer) }
  }, [])

  // Menu overlay open state — shared by the mobile bar's hamburger and the desktop
  // banner's (the two never render together).
  const [navMenuOpen, setNavMenuOpen] = useState(false)

  // Close the overlay on route change and on Escape.
  useEffect(() => {
    setNavMenuOpen(false)
  }, [location.pathname])
  useEffect(() => {
    if (!navMenuOpen) return
    const onKey = (e) => { if (e.key === 'Escape') setNavMenuOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navMenuOpen])

  // Keyed to navPath (the DISPLAYED route) not location.pathname: during the
  // leave-home exit fade the home tree is still on screen while location has already
  // flipped, so an immediate check would briefly swap the bars over it.
  const homeShown = navPath === '/'

  // Mobile sticky menu bar: fixed bar carrying the hamburger + "Menu". Driven by a
  // single rAF scroll loop writing to barRef so the app root never re-renders on
  // scroll. Deterministic per-route color (no luminance sampling): --fg tints the
  // bars and the label, the background fades in as it pins. barBg/barFgPinned also
  // feed the desktop banner (same colour model).
  const barRef = useRef(null)
  const barBg = MOBILE_BAR_BG[navPath] || 'rgb(0,0,0)'
  const barFgPinned = VARIANT_MAP[navPath] === 'light' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.92)'
  const initialBar = computeMobileBar(navPath, barBg, barFgPinned)

  useEffect(() => {
    if (!isMobile) return undefined
    const apply = () => {
      const el = barRef.current
      if (!el) return
      const { topPx, bg, fg, blur } = computeMobileBar(navPath, barBg, barFgPinned)
      const filt = blur > 0.1 ? `blur(${blur}px)` : 'none'
      el.style.top = `${topPx}px`
      el.style.background = bg
      el.style.backdropFilter = filt
      el.style.setProperty('-webkit-backdrop-filter', filt)
      el.style.setProperty('--fg', fg)
    }
    apply()
    let rafId = null
    const onScroll = () => {
      if (rafId != null) return
      rafId = requestAnimationFrame(() => { rafId = null; apply() })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', apply)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', apply)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [isMobile, navPath, barBg, barFgPinned])

  return (
    <div>
      {/* Desktop sticky nav banner: sponsor lockup · Donate and Support CTA · hamburger/
          Menu, on EVERY desktop route. On home it rests at the old top-bar insets and
          rides up/pins to top:0 on scroll (frosting in — the mobile bar's closed-form
          pattern); on inner pages it's pinned from the start. Keyed to navPath (the
          DISPLAYED route) and living outside the route-fade wrapper, so it persists
          un-blinking across route swaps; z80 keeps its hamburger-X above the menu
          overlay (z70). */}
      {!isMobile && (
        <DesktopBanner
          navPath={navPath}
          barBg={barBg}
          fgPinned={barFgPinned}
          menuOpen={navMenuOpen}
          onMenuToggle={() => setNavMenuOpen((o) => !o)}
          onNavigate={go}
        />
      )}
      {/* Desktop menu overlay — numbered index of the five pages, current one dimmed.
          No 'Home' fallback for unknown paths: on an unmapped URL nothing is current,
          so every link (especially Home, the recovery path) stays live. */}
      {!isMobile && (
        <DesktopMenuOverlay
          open={navMenuOpen}
          currentPage={CURRENT_MAP[navPath]}
          onNavigate={go}
          onClose={() => setNavMenuOpen(false)}
        />
      )}

      {/* Mobile sticky menu bar: a slim bar carrying the hamburger + "Menu". On the home
          route it rests just below the sponsor banner and pins to the top on scroll; on
          inner pages it's pinned from the start. Positioned/coloured by the rAF loop above
          (writes top/background/--fg to barRef) — --fg tints both the bars and the label.
          Lives outside any transform/opacity wrapper so it stays put; z80 keeps it above
          the overlay (z70) so the X still closes the menu. */}
      {isMobile && (
        <div
          ref={barRef}
          style={{
            position: 'fixed', left: 0, right: 0, top: initialBar.topPx,
            height: 52, zIndex: 80,
            background: initialBar.bg,
            backdropFilter: initialBar.blur > 0.1 ? `blur(${initialBar.blur}px)` : undefined,
            WebkitBackdropFilter: initialBar.blur > 0.1 ? `blur(${initialBar.blur}px)` : undefined,
            display: 'flex', alignItems: 'center',
            pointerEvents: navMenuOpen ? 'none' : 'auto',
            ['--fg']: initialBar.fg,
          }}
        >
          <button
            onClick={() => setNavMenuOpen((o) => !o)}
            aria-label={navMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={navMenuOpen}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10, marginLeft: 18,
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
              pointerEvents: 'auto',
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <span style={{
                display: 'block', width: 26, height: 2.5, borderRadius: 2, background: 'var(--fg)',
                transition: 'transform 0.3s ease, background 0.3s ease',
                transform: navMenuOpen ? 'translateY(5.25px) rotate(45deg)' : 'none',
                transformOrigin: 'center',
              }} />
              <span style={{
                display: 'block', width: 26, height: 2.5, borderRadius: 2, background: 'var(--fg)',
                transition: 'transform 0.3s ease, background 0.3s ease',
                transform: navMenuOpen ? 'translateY(-5.25px) rotate(-45deg)' : 'none',
                transformOrigin: 'center',
              }} />
            </span>
            <span aria-hidden="true" style={{
              color: 'var(--fg)', fontSize: 13, fontWeight: 600, letterSpacing: '2.2px',
              textTransform: 'uppercase', fontFamily: 'inherit', whiteSpace: 'nowrap',
              opacity: navMenuOpen ? 0 : 1, transition: 'opacity 0.2s ease, color 0.3s ease',
            }}>Menu</span>
          </button>
          {homeShown && (
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center', minWidth: 0 }}>
              <BarCountdown />
            </div>
          )}
          {/* Donate lockup — right side of the home bar (pins with it, home only). Colour
              tracks --fg like MENU; hidden while the menu is open. */}
          {homeShown && (
            <DonateLockup
              onClick={() => go('Support')}
              style={{
                marginRight: 18, // mirror the MENU hamburger's edge inset (18 + 12px pad)
                opacity: navMenuOpen ? 0 : 1,
                pointerEvents: navMenuOpen ? 'none' : 'auto',
                transition: 'opacity 0.2s ease, color 0.3s ease',
              }}
            />
          )}
        </div>
      )}

      {/* Mobile menu overlay: full-viewport backdrop + vertical stack. */}
      {isMobile && (
        <div
          onClick={() => setNavMenuOpen(false)}
          role="dialog"
          aria-hidden={!navMenuOpen}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(12,14,20,0.94)',
            zIndex: 70,
            opacity: navMenuOpen ? 1 : 0,
            pointerEvents: navMenuOpen ? 'auto' : 'none',
            transition: 'opacity 0.3s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{
            display: 'flex', flexDirection: 'column',
            gap: 28, alignItems: 'center',
          }}>
            {COMPACT_PAGES.map((item) => {
              const isSupport = item === 'Support'
              return (
                <button
                  key={item}
                  onClick={(e) => {
                    e.stopPropagation()
                    go(item)
                    setNavMenuOpen(false)
                  }}
                  className={isSupport ? 'chrome-text' : undefined}
                  style={{
                    background: isSupport ? undefined : 'none',
                    border: 'none', cursor: 'pointer',
                    color: isSupport ? undefined : 'rgba(255,255,255,0.75)',
                    fontSize: 24, fontWeight: isSupport ? 500 : 400,
                    letterSpacing: '-0.6px', padding: '8px 14px',
                  }}
                >
                  {item === 'Support' ? 'Donate and Support' : item}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div
        style={{
          opacity: isExiting ? 0 : 1,
          transition: 'opacity 0.11s ease',
        }}
        onTransitionEnd={handleExitComplete}
      >
        <Routes location={displayLocation}>
          <Route path="/" element={<HomeShell onNavigate={go} isMobile={isMobile} />} />
          <Route path="/biography" element={<Biography onNavigate={go} />} />
          <Route path="/team" element={
            <Suspense fallback={<div style={{ height: '100dvh', background: 'rgb(12,14,18)' }} />}>
              <Team onNavigate={go} />
            </Suspense>
          } />
          <Route path="/contact" element={<Contact onNavigate={go} />} />
          <Route path="/support" element={
            <Suspense fallback={<div style={{ height: '100dvh', background: 'rgb(240,240,240)' }} />}>
              <Support onNavigate={go} />
            </Suspense>
          } />
          <Route path="/the-road" element={
            <Suspense fallback={<div style={{ height: '100dvh', background: 'rgb(0,0,0)' }} />}>
              <TheRoad
                onNavigate={go}
                seamless={fromOrb}
                fromBiography={location.state?.from === 'Biography'}
                onGlobeReady={() => { if (orbOverlay.holding) orbOverlay.crossfadeOut(250); blackBridge.fadeOut(500) }}
              />
            </Suspense>
          } />
        </Routes>
      </div>

      {/* Preload Biography off-screen for snappier page transitions */}
      <div aria-hidden="true" style={{
        position: 'fixed', top: '-200vh', left: '-200vw',
        width: '100vw', height: '100vh',
        visibility: 'hidden', pointerEvents: 'none', overflow: 'hidden',
        zIndex: -1,
      }}>
        {displayLocation.pathname !== '/biography' && (
          <ErrorBoundary silent>
            <Biography onNavigate={() => {}} preload />
          </ErrorBoundary>
        )}
      </div>
    </div>
  )
}
