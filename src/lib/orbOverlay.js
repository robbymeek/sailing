// ============================================================================
//  ORB OVERLAY  —  body-level singleton that owns the glass-orb canvas + scene.
// ============================================================================
//  The home→Coming Soon transition is seamless because the orb canvas NEVER
//  unmounts across the route change. It lives here, appended to document.body
//  (not in any React route), so when App swaps Home → Coming Soon, React never
//  touches it: no remount, no WebGL-context loss, no GIF re-decode, no blank
//  frame. The full earth reveal plays out on this canvas; once the real Coming
//  Soon globe has booted underneath, the overlay cross-fades out over it.
//
//  Lifecycle:
//    attach(opts)      → create the canvas + glassOrbScene (idempotent, async).
//    setVisible(bool)  → fade the overlay in/out (rest-state visibility on home).
//    startMorph()      → play the orb→globe morph (drives opts.onMorph each frame).
//    crossfadeOut(ms)  → after the real globe is ready, dissolve the overlay, then detach.
//    detach()          → dispose everything + remove the canvas (idempotent).
//    pendingFromOrb / holding → flags App + MainView use to keep the overlay alive
//                        across the fromOrb route swap (router state can be lost
//                        under StrictMode, so we mirror it here).

// Above the page content (home nav z20) but below the App nav (z50), so during
// the handoff the overlay covers the booting globe while the nav stays on top.
const CANVAS_Z = 40

let canvasEl = null
let scene = null
let createFn = null
let resizeBound = false
let pendingFromOrb = false
let holding = false
let handlers = {} // current callbacks — updated every attach so the (one) scene
//                   always routes to the LIVE MainView, even after StrictMode swaps it
let pendingDetach = 0

function ensureCanvas() {
  if (canvasEl) return canvasEl
  const c = document.createElement('canvas')
  c.id = 'orb-overlay'
  c.setAttribute('aria-hidden', 'true')
  Object.assign(c.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: String(CANVAS_Z),
    pointerEvents: 'none', // never blocks the page; the orb's click is window-level
    opacity: '0',
    transition: 'opacity 1.2s ease',
  })
  document.body.appendChild(c)
  canvasEl = c
  return c
}

const resize = () => { if (scene) scene.resize() }

// Create the orb scene on the singleton canvas. Idempotent + StrictMode-safe:
// the scene's callbacks are indirected through `handlers` (refreshed on every
// attach), so the one scene always calls the live MainView even after StrictMode
// remounts it. A re-attach also cancels any deferred detach (see requestDetach),
// so the scene is created ONCE, never torn down + rebuilt by the dev double-mount.
async function attach(opts) {
  if (pendingDetach) { clearTimeout(pendingDetach); pendingDetach = 0 }
  const { onReady, onMorph, onClick, ...sceneOpts } = opts
  handlers = { onReady, onMorph, onClick }
  if (scene) return scene
  const c = ensureCanvas()
  if (!createFn) createFn = (await import('./glassOrbScene')).default
  if (canvasEl !== c || scene) return scene // detached/replaced or built meanwhile
  scene = createFn(c, {
    ...sceneOpts,
    onReady: () => handlers.onReady && handlers.onReady(),
    onMorph: (m) => handlers.onMorph && handlers.onMorph(m),
    onClick: () => handlers.onClick && handlers.onClick(),
  })
  if (!resizeBound) {
    window.addEventListener('resize', resize)
    resizeBound = true
  }
  return scene
}

// Deferred teardown — a StrictMode unmount schedules this; the immediate re-mount
// cancels it, so the singleton survives the dev double-mount. A real unmount (no
// re-attach) lets it fire on the next tick.
function requestDetach() {
  if (pendingDetach) return
  pendingDetach = setTimeout(() => { pendingDetach = 0; detach() }, 0)
}

function setVisible(v) {
  if (canvasEl) {
    canvasEl.style.transition = 'opacity 1.2s ease'
    canvasEl.style.opacity = v ? '1' : '0'
  }
}

function startMorph() {
  if (scene && scene.startMorph) scene.startMorph()
}

// Dissolve the overlay out (after the real globe has painted underneath), then
// tear it down. Gated by the caller on the globe's onReady, never a blind timer.
function crossfadeOut(ms = 250) {
  if (!canvasEl) { detach(); return }
  const el = canvasEl
  el.style.transition = `opacity ${ms}ms linear`
  requestAnimationFrame(() => { el.style.opacity = '0' })
  setTimeout(detach, ms + 80)
}

function detach() {
  if (pendingDetach) { clearTimeout(pendingDetach); pendingDetach = 0 }
  holding = false
  pendingFromOrb = false
  if (resizeBound) {
    window.removeEventListener('resize', resize)
    resizeBound = false
  }
  if (scene) {
    try { scene.dispose() } catch { /* already gone */ }
    scene = null
  }
  if (canvasEl) {
    canvasEl.remove()
    canvasEl = null
  }
}

export default {
  attach,
  setVisible,
  startMorph,
  resize,
  crossfadeOut,
  detach,
  requestDetach,
  get pendingFromOrb() { return pendingFromOrb },
  set pendingFromOrb(v) { pendingFromOrb = v },
  get holding() { return holding },
  set holding(v) { holding = v },
}
