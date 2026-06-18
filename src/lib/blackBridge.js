// ============================================================================
//  BLACK BRIDGE — a body-level black curtain for the mobile orb→Coming Soon hand-off.
// ============================================================================
//  After the phone morph (BakedOrb) ends on the globe, fade this opaque black layer
//  IN over it, swap routes underneath, then fade it OUT once Coming Soon signals
//  ready — so the user sees:  morph → fade to black → (load) → fade in Coming Soon,
//  instead of a hard cut. It lives on document.body, so it survives the route change
//  (the home unmounts beneath it), the same way the desktop orb overlay does.
//
//  Desktop is unaffected: it bridges the swap with the live orb canvas (orbOverlay),
//  never calls fadeIn, and fadeOut() no-ops when there's no curtain.
//
//    fadeIn(ms)  — show black (0→1); arms a safety auto-fadeOut so a device that
//                  never signals ready can't get stuck on black.
//    fadeOut(ms) — fade black away + remove the node, honoring a minimum on-screen
//                  hold so an instant ready can't flash.

const Z = 95            // above page content + home/app nav during the hand-off
const MIN_HOLD_MS = 600 // never lift sooner than this after fading in
const SAFETY_OUT_MS = 3500 // hard backstop if nothing ever calls fadeOut

let el = null
let shownAt = 0
let safetyTimer = 0

function fadeIn(ms = 450) {
  if (typeof document === 'undefined') return
  if (!el) {
    el = document.createElement('div')
    el.setAttribute('aria-hidden', 'true')
    Object.assign(el.style, {
      position: 'fixed', inset: '0', background: '#000',
      zIndex: String(Z), opacity: '0', pointerEvents: 'none',
    })
    document.body.appendChild(el)
  }
  const d = el
  d.style.transition = `opacity ${ms}ms ease`
  d.style.pointerEvents = 'auto' // swallow stray taps during the hand-off
  void d.offsetWidth // force reflow so the 0→1 transition actually runs
  d.style.opacity = '1'
  shownAt = performance.now()
  clearTimeout(safetyTimer)
  safetyTimer = setTimeout(() => fadeOut(), SAFETY_OUT_MS)
}

function fadeOut(ms = 500) {
  if (!el) return
  clearTimeout(safetyTimer)
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
