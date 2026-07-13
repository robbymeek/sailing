import { useState, useRef, useLayoutEffect } from 'react'
import useFocusTrap from '../hooks/useFocusTrap'
import DonateLockup from './DonateLockup'
import { SponsorRect, SPONSOR_PAIRS, DESKTOP_BANNER_H, panelShadow } from './HomeSponsorStrip'
import homeChrome from '../lib/homeChrome'

// DesktopBanner — the site-wide desktop nav banner + its fullscreen menu overlay.
//
// ONE App-level instance covers every desktop route (App gates it on !isMobile and
// keys it to navPath, the DISPLAYED route, so it persists un-blinking across route
// swaps). Children, left to right: sponsor lockup (the banner is EXACTLY its height —
// zero vertical padding, flush at the pinned top-left corner) · Donate and Support
// CTA · hamburger/Menu. Colour model mirrors the mobile sticky bar in App.jsx:
// per-route MOBILE_BAR_BG at BAR_MAX_ALPHA + backdrop blur, --fg tinting the CTA,
// hamburger lines and Menu label.
//
// HOME: at rest the banner sits at the old absolute top bar's insets (HOME_TOP /
// HOME_SIDE, transparent) — pixel-matching the pre-banner look — then rides up and
// pins to top:0 on scroll while the side insets collapse and the frosted background
// fades in. Pure closed form of scrollY (reverse scroll replays exactly). The intro
// reveal + orb-morph fade arrive via the homeChrome module signal (written by
// MainView), applied by a continuous rAF loop since the morph is time-driven.
// INNER ROUTES: pinned from the start (t = 1), like the mobile bar.

// Shared bright cool-white for the home's on-page text — the blurb, scroll cue, CTA
// and menu all match so the controls read as one crisp set over the rest photo.
// (Moved here from MainView, which imports it back.)
export const HOME_FG = 'rgba(236,242,255,0.92)'
// Width of each sponsor lockup (banner + the home's bottom-left column). Shrinks on
// narrow windows so the banner keeps fitting on one line down to the 700px cutover.
export const HOME_SPONSOR_W = 'clamp(178px, 22vw, 330px)'

// Frosted-bar colour model, shared with App's mobile sticky bar (App imports these).
export const withAlpha = (rgb, a) => rgb.replace('rgb(', 'rgba(').replace(')', `, ${a})`)
export const BAR_MAX_ALPHA = 0.5
export const BAR_MAX_BLUR = 12

// px forms of the old HOME_TOP / HOME_SIDE clamps (MainView's desktop layout insets):
// clamp(28px, 4vh, 48px) and clamp(24px, 4vw, 56px). The banner's rest pose on home
// must land exactly where the old absolute top bar sat.
const homeTopPx = () => Math.min(48, Math.max(28, 0.04 * window.innerHeight))
const homeSidePx = () => Math.min(56, Math.max(24, 0.04 * window.innerWidth))
// Pinned right-edge inset — mirrors the mobile bar's 18px edge inset. The left side
// collapses to 0 so the sponsor lockup lands flush in the corner (no padding around it).
const PIN_RIGHT_PAD = 18

// Top-right cluster sizing — house clamp() idiom, floors = the old fixed sizes so the
// one-line row still fits down to the 700px mobile cutover (moved from MainView).
const HOME_CTA_SUPPORT = 'clamp(15px, 1.45vw, 22px)' // "SUPPORT" word (drives the chevron width)
const HOME_CTA_CURSIVE = 'clamp(13px, 1.25vw, 19px)' // cursive "Donate / and"
const HOME_CTA_ARROW = 'clamp(7px, 0.62vw, 10px)'    // chevron band height
const HOME_MENU_SIZE = 'clamp(14px, 1.15vw, 18px)'   // "MENU" label
const HOME_MENU_LINE_W = 'clamp(30px, 2.2vw, 44px)'  // hamburger line width (X-cross math is width-independent)

const MENU_HOVER = '#1E40FF' // campaign accent — hover/focus on any menu link

// The menu overlay's numbered index (each entry is both the label and the go()
// route name). Home leads; Support is NOT listed — the banner's Donate and Support
// CTA owns it (and dims when you're already there). App derives the mobile
// overlay's COMPACT_PAGES from this list so the two menus can't drift.
export const MENU_PAGES = ['Home', 'Biography', 'The Team', 'The Road', 'Contact']

// The sponsor lockup's box as it pins: a plain white sticker (sd 0) melting away entirely
// (sd 1) so the white marks sit directly on the frosted glass bar. Background alpha and
// drop shadow fade out together — a lingering shadow around a transparent box would paint
// a ghost rectangle.
const sponsorBg = (sd) => `rgba(255, 255, 255, ${1 - sd})`
const sponsorShadow = (sd) => panelShadow(1 - sd)

// Banner geometry/colour as a closed form of scroll (mirrors computeMobileBar).
// t runs 0 (floating at the home rest insets) → 1 (pinned, frosted). `dark` (the four dark
// routes) also drives the sponsor box: sponsorDark = dark ? t : 0, so the box only melts
// away on the dark pages and stays white on the light ones (contact/support) even when pinned.
function computeDesktopBar(navPath, barBg, fgPinned, dark) {
  if (typeof window === 'undefined') {
    const sd = dark ? 1 : 0
    return {
      topPx: 0, padL: 0, padR: PIN_RIGHT_PAD,
      bg: withAlpha(barBg, BAR_MAX_ALPHA), blur: BAR_MAX_BLUR, fg: fgPinned, fade: 1,
      sponsorDark: sd, sponsorBoxBg: sponsorBg(sd), sponsorBoxShadow: sponsorShadow(sd),
    }
  }
  const restTop = navPath === '/' ? homeTopPx() : 0
  const y = window.scrollY
  const topPx = Math.max(0, restTop - y)
  const t = restTop > 0 ? Math.max(0, Math.min(1, y / restTop)) : 1
  const floating = restTop > 0 && t < 0.5
  const side = homeSidePx()
  const sponsorDark = dark ? t : 0
  return {
    topPx,
    padL: side * (1 - t),
    padR: side * (1 - t) + PIN_RIGHT_PAD * t,
    bg: withAlpha(barBg, t * BAR_MAX_ALPHA),
    blur: t * BAR_MAX_BLUR,
    fg: floating ? HOME_FG : fgPinned,
    fade: navPath === '/' ? homeChrome.fade : 1,
    sponsorDark,
    sponsorBoxBg: sponsorBg(sponsorDark),
    sponsorBoxShadow: sponsorShadow(sponsorDark),
  }
}

export default function DesktopBanner({
  navPath, barBg, fgPinned, dark, menuOpen, onMenuToggle, onNavigate,
}) {
  const isSupport = navPath === '/support' // faded Donate CTA = "you are here"
  const barRef = useRef(null)
  const clusterRef = useRef(null)
  const mountedRef = useRef(false)
  const lastKeyRef = useRef(null)
  // Mount-time snapshot only — the drive effect below owns every dynamic style
  // before first paint and on every change, so re-renders (menu toggles, App
  // state) never churn the banner's inline styles.
  const initialRef = useRef(null)
  if (initialRef.current === null) initialRef.current = computeDesktopBar(navPath, barBg, fgPinned, dark)
  const initial = initialRef.current

  // Drive loop: writes styles straight to the refs so the app root never re-renders
  // on scroll (mobile-bar pattern). Skips the writes entirely while nothing changed
  // (the common idle case on home, where the rAF loop runs continuously).
  useLayoutEffect(() => {
    const apply = () => {
      const el = barRef.current
      if (!el) return
      const { topPx, padL, padR, bg, blur, fg, fade, sponsorDark, sponsorBoxBg, sponsorBoxShadow } = computeDesktopBar(navPath, barBg, fgPinned, dark)
      const key = `${topPx}|${padL}|${padR}|${bg}|${blur}|${fg}|${fade}|${sponsorDark}`
      if (key === lastKeyRef.current) return
      lastKeyRef.current = key
      const filt = blur > 0.1 ? `blur(${blur}px)` : 'none'
      el.style.top = `${topPx}px`
      el.style.paddingLeft = `${padL}px`
      el.style.paddingRight = `${padR}px`
      el.style.background = bg
      el.style.backdropFilter = filt
      el.style.setProperty('-webkit-backdrop-filter', filt)
      el.style.setProperty('--fg', fg)
      el.style.setProperty('--sponsor-dark', sponsorDark)
      el.style.setProperty('--sponsor-box-bg', sponsorBoxBg)
      el.style.setProperty('--sponsor-box-shadow', sponsorBoxShadow)
      el.style.opacity = fade
      // Interactive ONLY at (near) full visibility — mirrors the old top bar's
      // pointerEvents: uiVisible && textOut < 0.05 gate, so the cluster goes inert
      // the moment the orb morph starts, not when it's almost gone. `inert` also
      // drops the invisible Donate/hamburger from the keyboard tab order (a Tab +
      // Enter mid-morph would otherwise race the morph's own navigation).
      const cluster = clusterRef.current
      if (cluster) {
        const interactive = fade > 0.95
        cluster.style.pointerEvents = interactive ? 'auto' : 'none'
        if ('inert' in cluster) cluster.inert = !interactive
      }
    }
    lastKeyRef.current = null // effect re-run (route change): force one write-through
    // First MOUNT paints without transitions so a cold load on / starts hidden with
    // no fade-in artifact (MainView writes homeChrome.fade = 0 during the intro's
    // first renders). Route changes keep transitions so bg shifts smoothly.
    const el = barRef.current
    if (!mountedRef.current && el) {
      mountedRef.current = true
      const prior = el.style.transition
      el.style.transition = 'none'
      apply()
      void el.offsetHeight // flush the untransitioned write
      el.style.transition = prior
    } else {
      apply()
    }
    if (navPath === '/') {
      // Home: continuous loop — the homeChrome fade is time-driven (morph/intro),
      // not scroll-driven. Same pattern as MainView's exit-veil rAF; the key
      // compare above makes idle frames free.
      let rafId = requestAnimationFrame(function loop() {
        apply()
        rafId = requestAnimationFrame(loop)
      })
      return () => cancelAnimationFrame(rafId)
    }
    // Inner routes: every output is a constant (pinned, t = 1, fade 1) — one
    // write-through above suffices; no scroll/resize listeners needed.
    return undefined
  }, [navPath, barBg, fgPinned, dark])

  return (
    <nav
      ref={barRef}
      aria-label="Primary"
      data-sticky-bar
      style={{
        position: 'fixed', left: 0, right: 0, top: initial.topPx,
        // The banner IS the sponsor lockup's height — no vertical padding around it.
        height: DESKTOP_BANNER_H, boxSizing: 'border-box',
        paddingLeft: initial.padL, paddingRight: initial.padR,
        zIndex: 80, // above the menu overlay (z70) so the hamburger-X stays clickable
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 'clamp(12px, 1.6vw, 30px)',
        background: initial.bg,
        backdropFilter: initial.blur > 0.1 ? `blur(${initial.blur}px)` : undefined,
        WebkitBackdropFilter: initial.blur > 0.1 ? `blur(${initial.blur}px)` : undefined,
        opacity: initial.fade,
        // Home: opacity only (bg tracks scroll per-frame, must not lag). Inner routes:
        // bg/blur only change on route swaps — ease them so the banner glides between
        // page tints instead of snapping.
        transition: navPath === '/'
          ? 'opacity 0.6s ease'
          : 'opacity 0.6s ease, background 0.3s ease, backdrop-filter 0.3s ease',
        // The bar itself never eats clicks (the wide middle floats over page content);
        // only the right cluster is interactive.
        pointerEvents: 'none',
        ['--fg']: initial.fg,
        ['--sponsor-dark']: initial.sponsorDark,
        ['--sponsor-box-bg']: initial.sponsorBoxBg,
        ['--sponsor-box-shadow']: initial.sponsorBoxShadow,
      }}
    >
      <SponsorRect
        pair={SPONSOR_PAIRS[0]}
        darkAware
        style={{ width: HOME_SPONSOR_W, flexShrink: 0, alignSelf: 'stretch' }}
      />
      <div
        ref={clusterRef}
        style={{
          display: 'flex', alignItems: 'center', gap: 'clamp(14px, 1.75vw, 28px)',
          flexShrink: 0, pointerEvents: initial.fade > 0.95 ? 'auto' : 'none',
        }}
      >
        {/* No color prop — the lockup tracks var(--fg) so it tints per route like the
            hamburger. On /support it dims: the faded CTA is the "you are here" mark
            (the menu overlay deliberately has no Support entry). Stays visible while
            the menu is open — it is the only path to /support. */}
        <DonateLockup
          onClick={isSupport ? undefined : () => onNavigate('Support')}
          disabled={isSupport}
          supportSize={HOME_CTA_SUPPORT}
          cursiveSize={HOME_CTA_CURSIVE}
          arrowH={HOME_CTA_ARROW}
          gap="clamp(9px, 0.95vw, 14px)"
          padding="clamp(6px, 0.7vw, 10px) clamp(10px, 1.05vw, 18px)"
          style={isSupport ? { opacity: 0.35, pointerEvents: 'none', cursor: 'default' } : undefined}
        />
        <BannerHamburger open={menuOpen} onToggle={onMenuToggle} />
      </div>
    </nav>
  )
}

// The banner's hamburger — two lines that cross into an X when the menu is open
// (port of MainView's HomeHamburger, recoloured to var(--fg) for per-route tint).
// Only the line WIDTH scales; height (2.5) and inter-line gap (8) stay fixed so the
// open-state cross offset stays exactly (2.5 + 8) / 2 = 5.25px.
function BannerHamburger({ open, onToggle }) {
  const line = {
    display: 'block', width: HOME_MENU_LINE_W, height: 2.5,
    background: 'var(--fg)', borderRadius: 2,
    transition: 'transform 0.3s ease, background 0.3s ease',
  }
  return (
    <button
      onClick={onToggle}
      aria-label={open ? 'Close menu' : 'Open menu'}
      aria-expanded={open}
      aria-controls="desktop-menu"
      style={{
        background: 'none', border: 'none', cursor: 'pointer', padding: 'clamp(6px, 0.6vw, 10px)',
        display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 'clamp(9px, 0.9vw, 14px)', flexShrink: 0,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: HOME_MENU_LINE_W }}>
        <span style={{ ...line, transform: open ? 'translateY(5.25px) rotate(45deg)' : 'none' }} />
        <span style={{ ...line, transform: open ? 'translateY(-5.25px) rotate(-45deg)' : 'none' }} />
      </span>
      <span aria-hidden="true" style={{
        color: 'var(--fg)', fontSize: HOME_MENU_SIZE, fontWeight: 600, letterSpacing: 'clamp(2px, 0.16vw, 3px)',
        textTransform: 'uppercase', fontFamily: 'inherit', whiteSpace: 'nowrap',
        opacity: open ? 0 : 1, transition: 'opacity 0.2s ease, color 0.3s ease',
      }}>Menu</span>
    </button>
  )
}

// Fullscreen menu overlay — the classy LEFT-aligned numbered index (ported from
// MainView), now site-wide. Sits UNDER the banner (z70 < z80) so the crossed-X
// hamburger stays clickable; clicking anywhere but the words closes it. Kept
// mounted for the 0.3s fade; `visibility` flips (delayed on close) so the hidden
// items leave the tab order.
export function DesktopMenuOverlay({ open, currentPage, onNavigate, onClose }) {
  // Focus management: move focus in on open, contain Tab/Shift+Tab, Escape to
  // close, restore focus to the hamburger on close. The `visibility` toggle below
  // already drops the hidden links from the tab order, so no inert needed here.
  const ref = useRef(null)
  useFocusTrap(ref, { active: open, onClose })
  return (
    <div
      ref={ref}
      id="desktop-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      aria-hidden={!open}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(9,11,15,0.9)',
        backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)',
        zIndex: 70,
        opacity: open ? 1 : 0,
        visibility: open ? 'visible' : 'hidden',
        pointerEvents: open ? 'auto' : 'none',
        transition: open
          ? 'opacity 0.3s ease, visibility 0s linear 0s'
          : 'opacity 0.3s ease, visibility 0s linear 0.3s',
        display: 'flex', alignItems: 'center',
      }}
    >
      {/* Backdrop dismiss — a real aria-hidden, tab-excluded button behind the
          index, so a click off the links closes without a div-onClick. */}
      <button
        type="button" aria-hidden="true" tabIndex={-1}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'transparent', border: 'none', padding: 0, cursor: 'default' }}
      />
      <div style={{
        position: 'relative',
        display: 'flex', flexDirection: 'column', gap: 'clamp(12px, 2.4vh, 24px)',
        alignItems: 'flex-start', paddingLeft: 'clamp(40px, 9vw, 130px)',
      }}>
        {MENU_PAGES.map((page, i) => (
          <MenuLink
            key={page}
            index={i + 1}
            label={page}
            current={currentPage === page}
            onClick={() => { onClose(); onNavigate(page) }}
          />
        ))}
      </div>
    </div>
  )
}

// A menu overlay link: small muted ordinal + large uppercase label; hover shifts it
// right into the campaign accent. `current` = the page you're on — dimmed and inert
// (a click on it falls through to the backdrop, which just closes the menu).
function MenuLink({ label, onClick, index, current }) {
  const [hover, setHover] = useState(false)
  const lit = hover && !current
  return (
    <button
      className="home-nav-link"
      onClick={(e) => { e.stopPropagation(); onClick() }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      aria-current={current ? 'page' : undefined}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'inline-flex', alignItems: 'baseline', gap: 'clamp(14px, 1.6vw, 22px)',
        padding: '6px 0', textAlign: 'left', fontFamily: 'inherit',
        color: lit ? MENU_HOVER : HOME_FG,
        opacity: current ? 0.35 : 1,
        pointerEvents: current ? 'none' : 'auto',
        transform: lit ? 'translateX(12px)' : 'translateX(0)',
        transition: 'color 0.28s ease, transform 0.28s ease',
      }}
    >
      {index != null && (
        <span aria-hidden="true" style={{
          fontSize: 'clamp(11px, 0.85vw, 13px)', fontWeight: 500,
          letterSpacing: '1.5px', fontVariantNumeric: 'tabular-nums',
          color: lit ? MENU_HOVER : 'rgba(150,166,192,0.55)',
          transition: 'color 0.28s ease',
        }}>{String(index).padStart(2, '0')}</span>
      )}
      <span style={{
        fontSize: 'clamp(26px, 4.4vw, 42px)', fontWeight: 500,
        letterSpacing: '0.5px', textTransform: 'uppercase', lineHeight: 1.04,
        whiteSpace: 'nowrap',
      }}>{label}</span>
    </button>
  )
}
