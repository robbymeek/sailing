// ============================================================================
//  BLACK BRIDGE — a body-level black curtain for the mobile orb→Coming Soon hand-off.
// ============================================================================
//  After the phone morph (BakedOrb) ends on the globe, fade this layer IN over the
//  home, swap routes underneath, then fade it OUT once Coming Soon signals ready —
//  so the user sees:  morph → home fades to black → (load) → fade in Coming Soon.
//  Pass { image: globePoster } to KEEP THE GLOBE on screen while everything else
//  fades to black: the curtain shows the globe-on-black poster (the morph's last
//  frame), so the globe persists across the route swap until Coming Soon's own globe
//  is ready underneath. It lives on document.body so it survives the route change,
//  the same way the desktop orb overlay does.
//
//  Desktop is unaffected: it bridges the swap with the live orb canvas (orbOverlay),
//  never calls fadeIn, and fadeOut() no-ops when there's no curtain.
//
//    fadeIn(ms, { image }) — show the curtain (0→1). With an image it's globe-on-
//                  black (the globe stays); without, pure black. Arms a safety
//                  auto-fadeOut so a device that never signals ready can't stick.
//    fadeOut(ms) — fade black away + remove the node, honoring a minimum on-screen
//                  hold so an instant ready can't flash.

const Z = 95            // above page content + home/app nav during the hand-off
const MIN_HOLD_MS = 600 // never lift sooner than this after fading in
// Hard backstop if nothing ever calls fadeOut. Generous on purpose: every real
// path signals ready (globe onReady, the static fallback, and scene-fail all call
// fadeOut) — this only catches pathological hangs, and lifting early onto a
// half-loaded page looks worse than holding the globe poster a little longer.
const SAFETY_OUT_MS = 9000
// If the hold runs long (cold cache on a slow connection), fade in a small
// chrome-shimmer title so the wait reads as intentional, not frozen.
const CAPTION_DELAY_MS = 1400
const CAPTION_TEXT = 'The Road to LA 2028'

let el = null
let shownAt = 0
let safetyTimer = 0
let captionTimer = 0

function fadeIn(ms = 450, { image } = {}) {
  if (typeof document === 'undefined') return
  if (!el) {
    el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, {
      position: 'fixed', inset: '0',
      zIndex: String(Z), opacity: '0', pointerEvents: 'none',
    })
    document.body.appendChild(el)
  }
  const d = el
  // Pure black, OR the globe-on-black poster so the globe stays put while the rest of
  // the home fades to black (and persists across the swap until Coming Soon is ready).
  d.style.background = image ? `#000 url("${image}") center / cover no-repeat` : '#000'
  d.style.transition = `opacity ${ms}ms ease`
  d.style.pointerEvents = 'auto' // swallow stray taps during the hand-off
  void d.offsetWidth // force reflow so the 0→1 transition actually runs
  d.style.opacity = '1'
  shownAt = performance.now()
  clearTimeout(safetyTimer)
  safetyTimer = setTimeout(() => fadeOut(), SAFETY_OUT_MS)

  // Slow-load caption under the globe poster (chrome-text is global CSS).
  if (image) {
    const cap = document.createElement('span')
    cap.className = 'chrome-text'
    cap.textContent = CAPTION_TEXT
    Object.assign(cap.style, {
      position: 'absolute', left: '0', right: '0', bottom: '12%',
      textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: '15px', fontWeight: '700', letterSpacing: '0.4px',
      opacity: '0', transition: 'opacity 600ms ease', pointerEvents: 'none',
    })
    d.replaceChildren(cap)
    clearTimeout(captionTimer)
    captionTimer = setTimeout(() => { cap.style.opacity = '1' }, CAPTION_DELAY_MS)
  } else {
    d.replaceChildren()
  }
}

function fadeOut(ms = 500) {
  if (!el) return
  clearTimeout(safetyTimer)
  clearTimeout(captionTimer) // a caption that hasn't appeared yet stays hidden
  const wait = Math.max(0, MIN_HOLD_MS - (performance.now() - shownAt))
  setTimeout(() => {
    const d = el
    if (!d) return
    el = null // free the slot now so a new fadeIn can't race the removal
    d.style.transition = `opacity ${ms}ms ease`
    d.style.opacity = '0'
    setTimeout(() => { if (d.parentNode) d.parentNode.removeChild(d) }, ms + 80)
  }, wait)
}

export default { fadeIn, fadeOut }
