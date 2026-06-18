// ============================================================================
//  BAKE HARNESS  —  records the REAL orb + morph to video (dev only).
// ============================================================================
//  Mounts the actual glassOrbScene (same shader the desktop home uses) at a fixed
//  phone-portrait size on an OPAQUE BLACK field, then uses MediaRecorder to capture
//  two clips that BakedOrb plays on phones:
//     • orb-rest.webm   — one boat cycle of the idle orb (BakedOrb loops it)
//     • orb-morph.webm  — the full orb→globe morph, ending on the globe hero pose
//  Encode them to mp4/webm/posters with `npm run bake:encode` (scripts/encode-orb.mjs).
//
//  Because we record the genuine GPU frames, the phone clip is pixel-identical to
//  the desktop orb. Opaque-on-black means we ship plain H.264 (no fragile alpha
//  video), matching the desktop morph (which blacks the page out anyway).
//
//  IMPORTANT while recording:
//   • Use CHROME (it has ImageDecoder, so the boat actually spins in the capture).
//   • KEEP THIS TAB FOCUSED + FRONTMOST for the whole recording — glassOrbScene
//     pauses its render loop when the tab is hidden, which would freeze a half-
//     finished frame into the clip. The harness warns you if it detects this.
//   • Don't record the MORPH until the "globe ready" status appears (the earth's
//     textures must be decoded or the final globe frame bakes out black).
//
//  Served by Vite in dev at /bake.html (CHROME). This file is only referenced by
//  bake.html, which is excluded from the production build. See BAKE.md.
// ============================================================================
import createGlassOrbScene from '../lib/glassOrbScene.js'
import hikingBg from '../assets/home-intro/img-5957.jpg'

// ---- tune these, then keep them in sync with BakedOrb's object-fit framing ----
const W = 1080 // capture width  (phone portrait; cover-cropped on device)
const H = 1920 // capture height
const FPS = 60 // 60 for a silky morph; the rest loop can be re-encoded lower later
const BOAT_CYCLE_MS = 8360 // the boat GIF is ~8.36s; one cycle ≈ a clean loop (BakedOrb cross-fades any residual seam)
const MORPH_MS = 3200 // must match MORPH_MS in glassOrbScene.js
const MORPH_TAIL_MS = 400 // a beat of hold on the final globe frame
const EARTH_READY_MS = 5000 // gate the MORPH button until the globe textures have decoded

const statusEl = document.getElementById('status')
const controlsEl = document.getElementById('controls')
const out = /** @type {HTMLCanvasElement} */ (document.getElementById('out'))
out.width = W
out.height = H
out.style.width = Math.round(W * 0.32) + 'px'
const octx = out.getContext('2d', { alpha: false })

const setStatus = (m) => { statusEl.textContent = m }

// The orb renders onto its own (transparent) canvas, sized in CSS px so the scene
// fits itself to W×H. We keep it offscreen and copy it onto the opaque black `out`
// canvas every frame — that black-composited canvas is what we capture.
const orbCanvas = document.createElement('canvas')
Object.assign(orbCanvas.style, {
  position: 'fixed', left: '-99999px', top: '0',
  width: W + 'px', height: H + 'px', pointerEvents: 'none',
})
document.body.appendChild(orbCanvas)

// Boat fallback <img> (used if ImageDecoder is unavailable — but record in Chrome,
// which has it, so the boat actually spins in the capture).
const boatImg = new Image()
boatImg.src = `${import.meta.env.BASE_URL}[0001-0250].gif`

let bootedAt = 0
const scene = createGlassOrbScene(orbCanvas, {
  isMobile: true, // phone framing: the morph slides UP to the hero offset
  photoUrl: hikingBg,
  boatUrl: `${import.meta.env.BASE_URL}[0001-0250].gif`,
  boatImg,
  boatSize: 200,
  orbDiameterPx: 260,
  baseUrl: import.meta.env.BASE_URL,
  prefersReducedMotion: false, // no cursor-lean during bake (deterministic, loopable)
  onReady: () => { bootedAt = performance.now(); setStatus('Orb ready — globe preloading…') },
})

// Continuously composite the orb over black → the stream source.
function copyFrame() {
  octx.fillStyle = '#000'
  octx.fillRect(0, 0, W, H)
  octx.drawImage(orbCanvas, 0, 0, W, H)
  requestAnimationFrame(copyFrame)
}
copyFrame()

const stream = out.captureStream(FPS)

function pickMime() {
  const prefs = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
  return prefs.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || 'video/webm'
}

function download(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}

function record(durationMs, filename, onDone) {
  const rec = new MediaRecorder(stream, { mimeType: pickMime(), videoBitsPerSecond: 12_000_000 })
  const chunks = []
  // If the tab is hidden mid-capture, glassOrbScene pauses → frozen frames bake in.
  let lostFocus = false
  const onHide = () => { if (document.visibilityState === 'hidden') lostFocus = true }
  document.addEventListener('visibilitychange', onHide)
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
  rec.onstop = () => {
    document.removeEventListener('visibilitychange', onHide)
    download(new Blob(chunks, { type: 'video/webm' }), filename)
    if (lostFocus) {
      setStatus(`⚠ ${filename}: the tab lost focus mid-capture — the orb pauses when hidden, so this clip is likely frozen. RE-RECORD with the tab frontmost.`)
    } else {
      setStatus(`Saved ${filename}. Move it into bake-recordings/ then run: npm run bake:encode`)
    }
    if (onDone) onDone()
  }
  rec.start()
  setTimeout(() => rec.stop(), durationMs)
}

function button(label, onClick) {
  const b = document.createElement('button')
  b.textContent = label
  b.onclick = () => { setBusy(true); onClick(() => setBusy(false)) }
  controlsEl.appendChild(b)
  return b
}
function setBusy(v) {
  controlsEl.querySelectorAll('button').forEach((b) => { b.disabled = v })
  if (!v && bootedAt && performance.now() - bootedAt <= EARTH_READY_MS) morphBtn.disabled = true
}

button('● Record REST loop (8.4s)', (done) => {
  setStatus('Recording rest loop… keep this tab focused & frontmost.')
  record(BOAT_CYCLE_MS, 'orb-rest.webm', done)
})

const morphBtn = button('● Record MORPH', (done) => {
  setStatus('Recording morph… keep this tab focused & frontmost.')
  setTimeout(() => scene.startMorph(), 120) // let the recorder start before frame 0
  record(120 + MORPH_MS + MORPH_TAIL_MS, 'orb-morph.webm', done)
})
morphBtn.disabled = true

// Enable the MORPH button only once the globe's textures have had time to decode,
// so the final globe frame (and the poster bridge) is never baked out black.
const readyPoll = setInterval(() => {
  if (bootedAt && performance.now() - bootedAt > EARTH_READY_MS) {
    morphBtn.disabled = false
    setStatus('Ready — record the REST loop and the MORPH. Keep this tab focused.')
    clearInterval(readyPoll)
  }
}, 500)

setStatus('Booting orb…')
