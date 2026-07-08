import * as THREE from 'three'
// Camera primitives AND the earth itself are shared with the The Road globe
// (buildEarth) so the orb and the globe frame/render identically — the basis of
// the seamless orb→globe morph.
import { FOV, SUN_WORLD, fitCameraZ, quaternionForPoint, buildEarth } from './buildEarth'

// ============================================================================
//  GLASS ORB  —  the home-page hero lens
//  A glass sphere that refracts the live page sitting behind it.
// ============================================================================
//
//  WHAT IT IS
//    A WebGL sphere drawn on a transparent, full-screen <canvas> layered on top
//    of the home page. Where the sphere is, you see the page behind it bent like
//    a real glass ball — true Snell refraction + chromatic dispersion + a
//    3D-shaded glassy form (fresnel rim + specular glint). Everywhere else the
//    canvas is transparent, so the normal page shows through unchanged.
//
//  HOW IT WORKS — three pieces (each is a labelled section below):
//    1. PAGE COMPOSITE — WebGL can't read the live DOM, so every frame we redraw
//       "the page" into a 2D canvas (`compCv`): the cover-fit PHOTO + the SPINNING
//       BOAT's current GIF frame. That canvas is uploaded as a texture (`pageTex`).
//    2. REFRACTION SHADER (`ORB_FRAG`) — per orb pixel it bends the camera ray
//       through the glass (Snell) and samples `pageTex` ALONG the bent ray, keyed
//       to the pixel's own SCREEN position (gl_FragCoord). Sampling by screen
//       position is the important bit: the orb refracts whatever is behind WHERE
//       IT IS, so moving the orb makes the background "morph" under it for free.
//    3. SCENE — one perspective sphere, scaled to a fixed on-screen diameter,
//       gently tilting toward the cursor, fading in once the page is at rest.
//
//  HOW TO EXTEND — read this before changing it:
//    • Move the orb:     scene.setPosition(fracX, fracY)   // viewport fraction
//        (0.5, 0.5) = centre. The refraction follows automatically (screen-space),
//        so the page behind the new position is what gets bent — no other change.
//    • Re-tune the glass: edit the TUNE block below (also live via ?key=value URL
//        params in dev, e.g. ?strength=0.12&reveal=0.55).
//    • Swap the photo / boat: pass `photoUrl` / `boatUrl` into the factory.
//    • The BOAT is page content drawn at the composite's CENTRE. The orb is a lens
//        OVER the page — move it off-centre and it simply shows the photo there
//        (no boat), exactly like a real lens. To make the boat ride WITH the orb,
//        draw it at the orb's screen centre inside composite() (the same NDC→px
//        geometry setPosition() uses).
//    • A SECOND orb: this factory makes ONE sphere in ONE WebGLRenderer/scene/RAF
//        loop on ONE full-screen canvas. There is no addOrb() — for N orbs, call
//        createGlassOrbScene() N times on N stacked canvases and setPosition() each.
//        Cost scales with N (N contexts + N page-composites + N GIF decodes, and N
//        counts against the browser's per-page WebGL-context cap), so prefer 1–2.
//
//  PUBLIC API (returned by createGlassOrbScene) is documented at the bottom.
// ============================================================================

// FOV + fitCameraZ are imported from ./buildEarth (shared with the globe).

// ---------- tunables (live-tune via URL in dev, then bake the winners) ----------
const TUNE = {
  ior: 1.5, // glass index of refraction — drives the true per-pixel refraction
  strength: 0.1, // how far behind the page sits → magnification + distortion amount
  boatZoom: 1.0, // boat drawn at the scene's natural scale → distorts like the background
  dispersion: 0.06, // chromatic split of the refraction (the prismatic rim speckle)
  reveal: 0.9, // how bright the page reads inside the orb (lower = darker orb) — the
  //              canonical/rest value used by the morph; the INTERACTIVE reveal below
  //              overrides this every frame between revealRest and revealPeak.
  parallax: 0.05, // subtle cursor-lean tilt (rad)
  parallaxEase: 0.06,
  shadeMin: 0.42, // shadowed-side darkness (form shading)
  rimDark: 0.22, // limb darkening (lower = darker rim)
  fresnel: 0.4, // cool fresnel rim wash
  glint: 1.3, // specular highlight strength
  // ---- cursor-proximity growth + reveal (all live-tunable via ?key=) ----
  reach: 0.5, // approach range = corner→orb distance (½ the diagonal for the centered orb),
  //             so t=0 when the cursor is in a far corner and t=1 when it's on the orb
  proxExp: 1.3, // growth curve t^k: ~10% closer from a corner → ~5% of the growth, and the
  //              rate keeps accelerating toward the orb (faster the closer the cursor gets)
  restScale: 0.82, // orb size (× base) at rest / cursor in a far corner (smallest)
  peakScale: 1.23, // orb size (× base) when the cursor is right on it (largest)
  revealRest: 0.85, // interior brightness at rest (≈ today; a hair darker)
  revealPeak: 1.2, // interior brightness at closest approach (brighter → reveals more)
  nearStrength: 0.03, // refraction strength at closest approach: flattens the lens so
  //                     the interior (and the in-orb HUD) resolve clearly on approach
  hudAlpha: 1.0, // peak HUD strength at full hover — 1.0 = the most contrasted (pure b/w)
  hudRevealStart: 0.9, // orb scale (hoverScale) where the whole HUD BEGINS to fade in
  hudRevealFull: 0.95, // HUD reaches full clarity at this fraction of peakScale (0.95 × max)
  hudSize: 0.115, // title (LA 2028 / OLYMPICS) type size, as a fraction of orb diameter
  hudTimerRatio: 0.7, // countdown size relative to the title (< 1 → title reads larger)
  hudTitleGap: 1.02, // gap between the two title lines LA 2028 / OLYMPICS (× title font size)
  hudLineGap: 1.25, // gap from OLYMPICS down to the countdown (× title font size)
  hudTrack: 0.12, // title letter-spacing as a fraction of its font size
  hudWarp: 3.0, // extra glass warp on the HUD while it emerges (× the page warp), eases to 1 settled
  boatGrow: 1.0, // boat grows 1:1 with the orb (stays proportionally orb-filling)
  boatMaxScale: 1.23, // hard cap on the boat's size (× its base) — matches peakScale
  // ---- idle breathing pulse (ambient life at rest; mirrored on the mobile baked
  //      orb in BakedOrb.jsx so the phone and desktop breathe on the same rhythm) ----
  pulseScale: 0.015, // peak swell of the idle breath (× rest) — near-subliminal
  pulseGlow: 0.06, // interior brightening at the breath peak (added to uReveal)
  pulsePeriod: 6000, // ms for one full breath (swell out + relax back)
  inhaleScale: 0.03, // extra one-shot swell the instant the page reaches rest
  inhaleGlow: 0.1, // extra brightening on that first 'inhale'
  inhaleMs: 2200, // duration of the one-shot inhale envelope
}
const FRESNEL_COLOR = new THREE.Color(0.62, 0.72, 0.86)
const LIGHT_DIR = new THREE.Vector3(-0.5, 0.7, 0.6).normalize()
const FADE_IN_MS = 1200
const CLICK_PX = 6
const CLICK_MS = 350
const COMP_MAX_W = 1600 // cap the composite resolution for performance

// ---------- cursor-proximity scale + reveal ----------
// The orb (and the boat inside it) grow as the cursor approaches, and ease back to
// rest as it moves away — but the influence now spans the WHOLE page: a far cursor
// gives a tiny response, and the growth accelerates the closer it gets (TUNE.reach
// = reach as a fraction of the viewport diagonal, TUNE.proxExp = steepness,
// TUNE.peakScale = size at closest approach). The same smoothed proximity also
// drives the interior reveal (brightness + clarity) and the in-orb HUD — see the
// render loop. Pure feel — tune live via ?reach=&proxExp=&peakScale=&revealPeak=…
const HOVER_EASE = 0.12 // per-frame easing toward the target scale (springiness)

// ---------- morph (glass orb → The Road globe) ----------
const MORPH_MS = 3200
const HERO_LAT = 10
const HERO_LNG = -170 // the globe's opening orientation on The Road
const IDENTITY_Q = new THREE.Quaternion()
const clamp01 = (x) => Math.min(1, Math.max(0, x))
const win = (a, b, x) => clamp01((x - a) / (b - a)) // 0→1 ramp across [a,b]
const smooth = (a, b, x) => { const t = win(a, b, x); return t * t * (3 - 2 * t) }
const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3)

const ORB_VERT = /* glsl */ `
  varying vec3 vNV;       // view-space normal → refraction, shading, fresnel (the only thing the fragment needs)
  void main() {
    vNV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const ORB_FRAG = /* glsl */ `
  uniform sampler2D uPage;     // the live composite of the page behind the orb
  uniform vec2 uResolution;    // drawing-buffer size (for gl_FragCoord → screen uv)
  uniform float uAspect, uIor, uStrength, uDispersion, uReveal, uFadeIn;
  uniform float uShadeMin, uRimDark, uFresnel, uGlint;
  uniform vec3 uLightDir, uFresnelColor;
  uniform sampler2D uTextMask; // in-orb HUD glyph coverage (in .a), warped with the page
  uniform float uHudStrength;  // 0 (rest/far) → 1 (fully hovered): eases the HUD in
  uniform float uHudWarp;      // extra refraction on the HUD (× the page's): high while emerging → 1 settled
  varying vec3 vNV;

  void main() {
    vec3 nv = normalize(vNV);
    float vf = max(nv.z, 0.0);

    // where this orb pixel sits on screen → where it samples the page behind
    vec2 screenUV = gl_FragCoord.xy / uResolution;

    // TRUE refraction: bend the camera ray through the glass sphere (Snell), then
    // sample the page along the refracted ray. The bend is ~0 at the centre and
    // grows sharply toward the rim, so the page (and the boat) genuinely warp —
    // not a flat zoom. R/G/B refract at slightly different indices (dispersion).
    vec3 I = vec3(0.0, 0.0, -1.0);
    float eta = 1.0 / uIor;
    vec3 Rr = refract(I, nv, eta * (1.0 + uDispersion));
    vec3 Rg = refract(I, nv, eta);
    vec3 Rb = refract(I, nv, eta * (1.0 - uDispersion));
    vec2 asp = vec2(1.0 / uAspect, 1.0);
    vec2 oR = Rr.xy / max(0.06, -Rr.z) * uStrength * asp;
    vec2 oG = Rg.xy / max(0.06, -Rg.z) * uStrength * asp;
    vec2 oB = Rb.xy / max(0.06, -Rb.z) * uStrength * asp;
    vec3 col = vec3(
      texture2D(uPage, screenUV + oR).r,
      texture2D(uPage, screenUV + oG).g,
      texture2D(uPage, screenUV + oB).b
    );

    // the lens gathers light → the page reads brighter inside than the dark surround
    col *= uReveal;

    // FORM SHADING — a fixed key light gives the ball a lit + shadowed side
    float lambert = dot(nv, normalize(uLightDir));
    col *= mix(uShadeMin, 1.12, smoothstep(-0.25, 0.85, lambert));

    // fresnel rim + limb darkening
    float fres = pow(1.0 - vf, 3.0);
    col = mix(col, uFresnelColor, fres * uFresnel);
    col *= (uRimDark + (1.0 - uRimDark) * smoothstep(0.0, 0.30, vf));

    // specular glint
    vec3 refl = reflect(vec3(0.0, 0.0, -1.0), nv);
    float spec = pow(max(dot(refl, normalize(uLightDir)), 0.0), 90.0);
    col += vec3(1.0) * spec * uGlint;

    // IN-ORB HUD — sampled along the SAME refracted ray as the page (screenUV + oG),
    // so the text warps with the glass. Where a glyph covers this pixel, drive it to
    // the MOST-CONTRASTING monochrome of what's behind it: white over dark, black over
    // light (near-binary threshold on the final luminance). uHudStrength eases the
    // whole effect in with proximity — faint far, full contrast when fully hovered.
    float hudMask = texture2D(uTextMask, screenUV + oG * uHudWarp).a;
    if (hudMask > 0.001 && uHudStrength > 0.001) {
      float lum = dot(clamp(col, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
      vec3 ink = mix(vec3(1.0), vec3(0.0), smoothstep(0.42, 0.58, lum));
      col = mix(col, ink, hudMask * uHudStrength);
    }

    gl_FragColor = vec4(col, uFadeIn);
  }
`

// ---------- factory ----------
// createGlassOrbScene(canvas, options) → { resize, setPosition, dispose }
//   canvas               the full-screen <canvas> the orb renders onto
//   options.photoUrl     background photo (drawn cover-fit into the page composite)
//   options.boatUrl      spinning boat GIF (decoded with WebCodecs; preferred path)
//   options.boatImg      fallback <img> frame source if ImageDecoder is missing
//   options.boatSize     boat draw size in CSS px (page-composite, centred)
//   options.orbDiameterPx on-screen diameter of the orb (default ≈130% of boatSize)
//   options.isMobile     caps pixel ratio
//   options.prefersReducedMotion  starts fully shown, no cursor-lean
//   options.baseUrl      import.meta.env.BASE_URL — MUST match the globe's, so the
//                        pre-built earth's textures hit the same HTTP cache
//   options.onReady      called once the photo is decoded and the orb is live
//   options.onClick      called on a clean click ON the orb + halo (starts the morph)
//   options.clickHaloPx  extra clickable ring beyond the orb's rest radius
//   options.onMorph      called every morph frame with progress m∈[0,1]. MainView
//                        watches this to drive the staged hand-off to The Road.
//   options.countdownTarget  ms timestamp (Date.parse). Drawn as a live countdown
//                        inside the orb, revealed as the cursor approaches.
export default function createGlassOrbScene(
  canvas,
  {
    isMobile,
    photoUrl,
    boatUrl,
    boatImg, // fallback frame source if ImageDecoder is unavailable
    boatSize = 200,
    orbDiameterPx = 260, // on-screen size of the orb (≈130% of the boat)
    clickHaloPx = 52, // clickable ring beyond the rest radius (see hitsOrbZone)
    baseUrl = '/',
    prefersReducedMotion = false,
    countdownTarget = 0, // ms timestamp; the orb draws a live countdown to it in-glass
    onReady,
    onClick,
    onMorph,
  }
) {
  // Prefer the discrete GPU, but some configs (dual-GPU laptops, blocklisted or
  // remote Windows drivers) refuse 'high-performance' and throw. Retry with the
  // browser's default adapter before giving up, so a refusal degrades to a working
  // orb rather than the flat boat. A genuine no-WebGL2 browser still throws here →
  // caught by orbOverlay.attach → MainView flips to the flat boat.
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  }
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)
  renderer.setPixelRatio(dpr)
  renderer.setSize(canvas.clientWidth, canvas.clientHeight, false)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(
    FOV,
    canvas.clientWidth / Math.max(1, canvas.clientHeight),
    0.1,
    120
  )
  let baseZ = fitCameraZ(camera.aspect)
  camera.position.set(0, 0, baseZ)

  // dev URL overrides, e.g. ?strength=0.12&reveal=0.55&dispersion=0.1
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search)
    for (const k of Object.keys(TUNE)) if (q.has(k)) TUNE[k] = parseFloat(q.get(k))
  }

  // ---------- the page composite (photo + boat) → texture ----------
  const photoImg = new Image()
  let photoReady = false
  photoImg.onload = () => { photoReady = true; drawBase() }
  photoImg.src = photoUrl

  // base canvas holds the cover-fit photo (only redrawn on resize); the comp
  // canvas = base + the boat's current frame, rebuilt every frame.
  const baseCv = document.createElement('canvas')
  const baseCtx = baseCv.getContext('2d')
  const compCv = document.createElement('canvas')
  const compCtx = compCv.getContext('2d')
  // Separate canvas for the in-orb HUD text (glyph COVERAGE only). Kept out of the
  // page composite so the shader can recolour it to max contrast per pixel; sampled
  // along the same refracted ray as the page so it warps identically with the glass.
  const textCv = document.createElement('canvas')
  const textCtx = textCv.getContext('2d')

  function sizeComposite() {
    const cssW = canvas.clientWidth
    const cssH = Math.max(1, canvas.clientHeight)
    const w = Math.min(COMP_MAX_W, Math.round(cssW))
    const h = Math.round((w * cssH) / cssW)
    baseCv.width = compCv.width = w
    baseCv.height = compCv.height = h
    textCv.width = w
    textCv.height = h
    drawBase()
  }

  function drawBase() {
    const w = baseCv.width
    const h = baseCv.height
    baseCtx.clearRect(0, 0, w, h)
    if (!photoReady) return
    // cover-fit the photo
    const s = Math.max(w / photoImg.width, h / photoImg.height)
    const dw = photoImg.width * s
    const dh = photoImg.height * s
    baseCtx.drawImage(photoImg, (w - dw) / 2, (h - dh) / 2, dw, dh)
  }

  // ---------- spinning boat ---------- (decode the GIF's frames ourselves with
  // WebCodecs and advance them on a timer — relying on the browser to animate a
  // hidden <img> is unreliable: Chrome pauses GIFs that aren't actually painted,
  // which is why a sampled opacity:0 <img> stays on frame 0.)
  let boatDecoder = null
  let boatFrame = null // current decoded VideoFrame
  let boatCount = 1
  let boatIdx = 0
  let boatFrameDurMs = 40
  let boatLastAdvance = 0
  let boatDecoding = false
  let useDecoder = false

  async function setupBoat() {
    if (!boatUrl || typeof window === 'undefined' || !('ImageDecoder' in window)) return
    try {
      const data = await (await fetch(boatUrl)).arrayBuffer()
      if (disposed) return
      boatDecoder = new ImageDecoder({ data, type: 'image/gif' })
      await boatDecoder.tracks.ready
      if (disposed) return
      boatCount = boatDecoder.tracks.selectedTrack.frameCount || 1
      const first = await boatDecoder.decode({ frameIndex: 0 })
      if (disposed) { first.image.close?.(); return }
      boatFrame = first.image
      if (first.image.duration) boatFrameDurMs = Math.max(20, first.image.duration / 1000)
      useDecoder = true
    } catch {
      useDecoder = false // fall back to the <img> sampling path
    }
  }
  setupBoat()

  function advanceBoat(now) {
    if (!useDecoder || boatCount <= 1 || boatDecoding) return
    if (now - boatLastAdvance < boatFrameDurMs) return
    boatLastAdvance = now
    boatIdx = (boatIdx + 1) % boatCount
    boatDecoding = true
    boatDecoder
      .decode({ frameIndex: boatIdx })
      .then(({ image }) => {
        if (disposed) { image.close?.(); return }
        if (boatFrame && boatFrame.close) boatFrame.close()
        boatFrame = image
        boatDecoding = false
      })
      .catch(() => { boatDecoding = false })
  }

  // ---------- in-orb HUD (LA 2028 OLYMPICS + live countdown) ----------
  // Drawn INTO the page composite (so it refracts through the glass), revealed only
  // as the orb grows toward the cursor. The countdown string is rebuilt at most once
  // per second; drawHud() early-returns while invisible, and is never called mid-morph.
  let hudStr = '' // cached "d : hh : mm : ss"
  let hudSecs = -1 // last whole-second bucket, so the string only rebuilds on change
  function updateCountdown(nowMs) {
    if (!countdownTarget) return
    const totalSecs = Math.max(0, Math.floor((countdownTarget - nowMs) / 1000))
    if (totalSecs === hudSecs) return
    hudSecs = totalSecs
    const days = Math.floor(totalSecs / 86400)
    const hrs = Math.floor((totalSecs % 86400) / 3600)
    const mins = Math.floor((totalSecs % 3600) / 60)
    const secs = totalSecs % 60
    const p2 = (n) => String(n).padStart(2, '0')
    hudStr = `${days} : ${p2(hrs)} : ${p2(mins)} : ${p2(secs)}`
  }

  const HUD_FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  let hudDrawn = false // whether textCv currently holds glyphs (so we clear it once on exit)
  // Draw the HUD glyphs (COVERAGE only, flat white) into textCv at the orb's current
  // on-screen size/position — three centred lines (LA 2028 / OLYMPICS / countdown).
  // Colour + contrast are decided in the shader; `reveal` (one alpha for all three) is
  // baked into the mask here, so the whole HUD fades in as one while the shader keeps
  // ONE on/off strength.
  function drawHudMask(w, h, reveal) {
    const scale = w / Math.max(1, canvas.clientWidth)
    const cx = orbFracX * w
    const cy = orbFracY * h
    const orbDia = orbDiameterPx * hoverScale * scale
    const labelSize = TUNE.hudSize * orbDia
    const timerSize = TUNE.hudSize * orbDia * TUNE.hudTimerRatio
    // Three centred lines — LA 2028 / OLYMPICS / countdown — the block centred on cy.
    const gapTitle = labelSize * TUNE.hudTitleGap // between the two title lines
    const gapTimer = labelSize * TUNE.hudLineGap // OLYMPICS → countdown
    const y1 = cy - (gapTitle + gapTimer) / 2 // LA 2028
    const y2 = y1 + gapTitle // OLYMPICS
    const y3 = y2 + gapTimer // countdown
    textCtx.clearRect(0, 0, w, h)
    textCtx.save()
    textCtx.textAlign = 'center'
    textCtx.textBaseline = 'middle'
    textCtx.fillStyle = '#ffffff' // coverage only — the shader picks black/white per pixel
    textCtx.globalAlpha = reveal
    // title — two lines, tracked, at full size (no grow-in)
    textCtx.font = `500 ${labelSize}px ${HUD_FONT}`
    if ('letterSpacing' in textCtx) textCtx.letterSpacing = `${TUNE.hudTrack * labelSize}px`
    textCtx.fillText('LA 2028', cx, y1)
    textCtx.fillText('OLYMPICS', cx, y2)
    // the live countdown — same fade, smaller, untracked
    if (hudStr) {
      if ('letterSpacing' in textCtx) textCtx.letterSpacing = '0px'
      textCtx.font = `600 ${timerSize}px ${HUD_FONT}`
      textCtx.fillText(hudStr, cx, y3)
    }
    textCtx.restore()
  }

  // Per-frame HUD update: stage the two lines off the SMOOTHED growth (headline in
  // first, timer with the boat's rise), force everything off during the morph so it
  // never bleeds into the forming globe, and only redraw/upload the mask while it's
  // actually showing so rest frames pay nothing.
  function updateHud(w, h) {
    const clearIfDrawn = () => {
      orbMat.uniforms.uHudStrength.value = 0
      if (hudDrawn) { textCtx.clearRect(0, 0, w, h); textTex.needsUpdate = true; hudDrawn = false }
    }
    if (morphing) { clearIfDrawn(); return }
    // The WHOLE HUD (LA 2028 / OLYMPICS / countdown) fades in together on ONE curve tied
    // to the orb's SIZE: it begins at hudRevealStart and reaches full clarity at
    // hudRevealFull × peakScale. It also warps harder while faint and clarifies as it
    // settles (uHudWarp), so all three lines form inside the glass as one.
    const dev = smooth(TUNE.hudRevealStart, TUNE.hudRevealFull * TUNE.peakScale, hoverScale)
    const reveal = dev * TUNE.hudAlpha
    orbMat.uniforms.uHudWarp.value = 1 + (TUNE.hudWarp - 1) * (1 - dev)
    if (reveal < 0.01) { clearIfDrawn(); return }
    orbMat.uniforms.uHudStrength.value = 1
    drawHudMask(w, h, reveal)
    textTex.needsUpdate = true
    hudDrawn = true
  }

  function composite() {
    const w = compCv.width
    const h = compCv.height
    compCtx.clearRect(0, 0, w, h)
    compCtx.drawImage(baseCv, 0, 0)
    // the spinning boat's current frame, scaled into the composite
    const src = boatFrame || (boatImg && boatImg.complete && boatImg.naturalWidth ? boatImg : null)
    if (src) {
      const scale = w / Math.max(1, canvas.clientWidth)
      if (morphing) {
        // boat grows + slides WITH the orb: track the orb's projected screen
        // centre + diameter so the gif stays locked under the lens as it morphs.
        const aspect = camera.aspect
        const cx = ((anchor.position.x / (baseZ * tanHalfV * aspect)) * 0.5 + 0.5) * canvas.clientWidth
        const cy = (0.5 - 0.5 * (anchor.position.y / (baseZ * tanHalfV))) * canvas.clientHeight
        const orbDiaPx = (orb.scale.x * canvas.clientHeight) / (baseZ * tanHalfV)
        // Ease the boat back to the canonical centred, orb-filling look across the
        // GROW beat. damp≈1 now that the boat grows 1:1 with the orb — it only engages
        // if the size cap binds — so the morph never pops taking over from the hover.
        const gm = smooth(0, 0.22, morphM)
        const startHoverScale = startScale / orbBaseScale
        const boatScaleAtClick = Math.min(TUNE.boatMaxScale, 1 + (startHoverScale - 1) * TUNE.boatGrow)
        const damp0 = boatScaleAtClick / Math.max(1e-3, startHoverScale)
        const damp = damp0 + (1 - damp0) * gm
        const bs = orbDiaPx * boatFrac * TUNE.boatZoom * scale * damp
        compCtx.drawImage(src, cx * scale - bs / 2, cy * scale - bs / 2, bs, bs)
      } else {
        // boat grows 1:1 with the orb (boatGrow), capped at boatMaxScale, and stays
        // centred the whole time — the HUD sits centered over it (see drawHudMask).
        const boatScale = Math.min(TUNE.boatMaxScale, 1 + (hoverScale - 1) * TUNE.boatGrow)
        const bs = boatSize * boatScale * TUNE.boatZoom * scale
        compCtx.drawImage(src, (w - bs) / 2, (h - bs) / 2, bs, bs)
      }
    }
    // In-orb HUD — refresh its coverage mask + reveal strength (the shader recolours
    // it to max contrast and warps it with the glass; updateHud forces strength to 0
    // during the morph, so nothing bleeds into the forming globe).
    updateHud(w, h)
    pageTex.needsUpdate = true
  }

  const pageTex = new THREE.CanvasTexture(compCv)
  pageTex.colorSpace = THREE.SRGBColorSpace
  pageTex.minFilter = THREE.LinearFilter
  pageTex.magFilter = THREE.LinearFilter
  pageTex.generateMipmaps = false

  const textTex = new THREE.CanvasTexture(textCv)
  textTex.colorSpace = THREE.SRGBColorSpace
  textTex.minFilter = THREE.LinearFilter
  textTex.magFilter = THREE.LinearFilter
  textTex.generateMipmaps = false

  // ---------- orb ----------
  const anchor = new THREE.Group() // cursor-lean tilt
  scene.add(anchor)

  const orbMat = new THREE.ShaderMaterial({
    uniforms: {
      uPage: { value: pageTex },
      uTextMask: { value: textTex },
      uHudStrength: { value: 0 },
      uHudWarp: { value: 1 },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uAspect: { value: camera.aspect },
      uIor: { value: TUNE.ior },
      uStrength: { value: TUNE.strength },
      uDispersion: { value: TUNE.dispersion },
      uReveal: { value: TUNE.reveal },
      uFadeIn: { value: prefersReducedMotion ? 1 : 0 },
      uShadeMin: { value: TUNE.shadeMin },
      uRimDark: { value: TUNE.rimDark },
      uFresnel: { value: TUNE.fresnel },
      uGlint: { value: TUNE.glint },
      uLightDir: { value: LIGHT_DIR.clone() },
      uFresnelColor: { value: FRESNEL_COLOR.clone() },
    },
    vertexShader: ORB_VERT,
    fragmentShader: ORB_FRAG,
    transparent: true,
    depthWrite: false,
  })
  const orb = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), orbMat)
  anchor.add(orb)

  // ---------- orb SIZE ----------
  // Scale the radius-1 sphere so its on-screen diameter is exactly orbDiameterPx
  // (so the orb frames the boat instead of filling the viewport). Derived from
  // the perspective projection at the sphere's depth; recomputed on resize.
  // orbBaseScale = the rest size from the perspective fit; hoverScale eases
  // 1→TUNE.peakScale with cursor proximity and is applied on top every frame
  // (see the render loop). Split so a resize recomputes the base without losing hover.
  let orbBaseScale = 1
  let hoverScale = 1
  function applyOrbScale() {
    const h = Math.max(1, canvas.clientHeight)
    const halfV = THREE.MathUtils.degToRad(FOV / 2)
    orbBaseScale = (orbDiameterPx * baseZ * Math.tan(halfV)) / h
    orb.scale.setScalar(orbBaseScale * hoverScale)
  }
  applyOrbScale()

  // ---------- orb POSITION ----------
  // Where the orb sits on screen, as a viewport fraction (0,0 = top-left,
  // 1,1 = bottom-right, 0.5,0.5 = centre). The orb lives on `anchor`; we move the
  // anchor in world space to land it at the requested screen point. The shader
  // samples the page by SCREEN position, so the refraction follows the orb here
  // automatically — moving it makes the page behind the new spot bend under it.
  // (`anchor` also carries the per-frame cursor-lean *rotation*; position is set
  // here, rotation in the render loop, so the two never fight.)
  // Clip-safe range: keep each fraction ≥ orbDiameterPx/(2·viewportDim) from the
  // edge (≈0.1–0.15 at the default 260px orb) or the sphere is cut off at the
  // canvas edge. The ?orbx=&orby= dev hook (below) lets you eyeball it.
  let orbFracX = 0.5
  let orbFracY = 0.5
  function applyOrbPosition() {
    const halfH = baseZ * Math.tan(THREE.MathUtils.degToRad(FOV / 2)) // world half-height at z=0
    const ndcX = orbFracX * 2 - 1
    const ndcY = 1 - orbFracY * 2 // screen y is down, world y is up
    anchor.position.set(ndcX * halfH * camera.aspect, ndcY * halfH, 0)
  }
  applyOrbPosition()

  function syncResolution() {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2())
    orbMat.uniforms.uResolution.value.copy(size)
    orbMat.uniforms.uAspect.value = camera.aspect
  }
  syncResolution()

  // ============================================================================
  //  MORPH  —  glass orb → The Road globe
  // ============================================================================
  //  Pre-builds the SAME earth the The Road page uses (shared buildEarth),
  //  invisible, NOW — so its textures decode on home load and the reveal is
  //  instant on click. startMorph() plays one timeline that: grows the orb to
  //  globe size (the boat grows inside it), slides it to the globe's hero
  //  position, dissolves the glass into a solid dark sphere, then resolves the
  //  earth texture + atmosphere at the globe's exact opening pose — holding on
  //  that finished frame. MainView drives the hand-off from there (fade bg to
  //  black → navigate); the body-level overlay (orbOverlay.js) then cross-fades
  //  this finished frame out over the real The Road globe booted underneath.
  const globe = new THREE.Group() // carries the earth's orientation, like globeScene
  anchor.add(globe)
  const baseOffset = isMobile ? new THREE.Vector3(0, 0.4, 0) : new THREE.Vector3(-0.55, 0, 0)
  const heroQuat = quaternionForPoint(HERO_LAT, HERO_LNG)
  const boatFrac = boatSize / orbDiameterPx // boat ≈ 0.77 of the orb diameter
  const tanHalfV = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  let startScale = 1
  const startPos = new THREE.Vector3()

  // The "solid orb" beat and the textured globe are the SAME opaque earth (kept
  // exactly as globeScene builds it — depthWrite true so the additive atmosphere
  // is occluded correctly). The reveal ramps the earth's own colour (dark→full),
  // emissive (city lights) and atmosphere up, so it reads as a dark solid sphere
  // first, then the texture/colours resolve.
  let earthBuilt = false
  let earthReady = false
  let earthParts = null
  function buildGlobe() {
    if (earthBuilt || disposed) return
    earthBuilt = true
    earthParts = buildEarth(renderer, { baseUrl, isMobile })
    const { earth, atmosphere, atmosMat, sun, ambient, manager } = earthParts
    earth.visible = false // shown at the solidify; opaque like globeScene's
    globe.add(earth)
    atmosphere.visible = false
    atmosMat.uniforms.uIntensity.value = 0
    atmosphere.renderOrder = 1 // additive, drawn after the glass
    anchor.add(atmosphere)
    scene.add(sun)
    scene.add(ambient)
    manager.onLoad = () => { if (!disposed) earthReady = true }
  }

  let morphing = false
  let morphStart = 0
  let morphFrozen = false
  let morphM = 0 // latest morph progress 0→1 (updateMorph → composite, for boat easing)

  // Begin the one-shot morph (idempotent). Build the globe lazily here too, in
  // case the home-load prebuild was skipped.
  function startMorph() {
    if (morphing || disposed) return
    buildGlobe()
    morphing = true
    morphFrozen = false
    morphStart = performance.now()
    startScale = orb.scale.x
    startPos.copy(anchor.position)
    state.tx = 0
    state.ty = 0
    // The morph never rewrites uReveal/uStrength, and a click only fires at high
    // proximity — so without this they'd freeze at their near-cursor values (bright
    // + low-distortion) for the whole morph and diverge from the baked mobile clip.
    // Reset to the canonical glass look the morph timeline was authored against.
    orbMat.uniforms.uReveal.value = TUNE.reveal
    orbMat.uniforms.uStrength.value = TUNE.strength
    orbMat.uniforms.uHudStrength.value = 0 // HUD off for the whole morph
    start()
  }

  function updateMorph(now) {
    const m = clamp01((now - morphStart) / MORPH_MS)
    morphM = m
    if (onMorph) onMorph(m)

    // The timeline is deliberately staged so each beat reads on its own:
    //   GROW     0.00–0.22  orb enlarges in place
    //   MOVE     0.22–0.44  slides left to the globe's hero offset (still clear glass)
    //   (pause)  0.44–0.52  holds at the left, fully clear — the brief breath
    //   SOLIDIFY 0.52–0.70  glass slowly dissolves into the dark solid sphere
    //   REVEAL   0.70–0.90  dark sphere slowly resolves into the textured globe

    // GROW: glass orb scale (rest → 1 = globe size)
    orb.scale.setScalar(startScale + (1 - startScale) * easeOutCubic(win(0, 0.22, m)))
    // MOVE: centre → the globe's hero offset
    anchor.position.lerpVectors(startPos, baseOffset, smooth(0.22, 0.44, m))
    anchor.rotation.set(0, 0, 0) // freeze cursor-lean while morphing

    // SOLIDIFY: after the clear pause at the left, the glass slowly dissolves out,
    // revealing the (dark) solid earth under it
    const solid = smooth(0.52, 0.7, m)
    orbMat.uniforms.uFadeIn.value = 1 - solid

    if (earthParts) {
      earthParts.earth.visible = solid > 0.001
      // ORIENT to the globe's opening pose (dark/featureless here → no spin pop)
      globe.quaternion.slerpQuaternions(IDENTITY_Q, heroQuat, smooth(0.54, 0.8, m))
      // REVEAL: dark solid sphere → textured globe. The earth's colour multiplies
      // its day map, so dark colour = a dark sphere; ramp to full white = texture.
      const reveal = smooth(0.7, 0.9, m)
      earthParts.earthMat.color.setScalar(0.05 + 0.95 * reveal)
      earthParts.earthMat.emissiveIntensity = reveal // city-lights come on
      earthParts.atmosphere.visible = reveal > 0.001
      earthParts.atmosMat.uniforms.uIntensity.value = reveal // → 1.0 (globe hero)
      camera.updateMatrixWorld()
      earthParts.uSunDirView.value.copy(SUN_WORLD).transformDirection(camera.matrixWorldInverse)
    }

    // NOTE: the route swap is NOT fired here. The morph just reaches the finished
    // globe and holds; MainView watches onMorph(m) and, once the globe has formed,
    // fades the page background to black and THEN navigates — so the swap is a
    // black→black no-op (no abrupt photo cut).

    // HOLD: freeze on the finished frame (overlay stays; no per-frame WebGL cost)
    if (m >= 1) morphFrozen = true
  }

  // ---------- interaction ---------- (a fixed centered lens: subtle cursor lean
  // + click; spinning a symmetric lens over a screen-fixed page does nothing, so
  // there's no drag-spin — the motion is the boat refracting behind it)
  const state = { px: 0, py: 0, tx: 0, ty: 0, cx: -1e6, cy: -1e6, downX: 0, downY: 0, downT: 0, moved: 0, down: false }
  // Clickable zone: a screen-space circle of the orb's REST radius + clickHaloPx.
  // Static on purpose — it always contains the hover-grown sphere (so clickHaloPx
  // must be ≥ rest radius × (TUNE.peakScale − 1)) and it exactly matches the
  // grab-cursor circle MainView draws over the orb, so the cursor never lies
  // about where a click will land.
  const clickRadiusPx = orbDiameterPx / 2 + clickHaloPx
  function hitsOrbZone(e) {
    const ocx = orbFracX * canvas.clientWidth
    const ocy = orbFracY * Math.max(1, canvas.clientHeight)
    return Math.hypot(e.clientX - ocx, e.clientY - ocy) <= clickRadiusPx
  }
  const onMove = (e) => {
    if (prefersReducedMotion) return
    const rect = canvas.getBoundingClientRect()
    state.tx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    state.ty = ((e.clientY - rect.top) / rect.height) * 2 - 1
    state.cx = e.clientX // raw cursor px → proximity scale (render loop)
    state.cy = e.clientY
    if (state.down) state.moved += Math.abs(e.clientX - state.downX) + Math.abs(e.clientY - state.downY)
  }
  const onDown = (e) => { state.down = true; state.downX = e.clientX; state.downY = e.clientY; state.downT = performance.now(); state.moved = 0 }
  const onUp = (e) => {
    if (!state.down) return
    state.down = false
    if (performance.now() - state.downT < CLICK_MS && state.moved < CLICK_PX && onClick && hitsOrbZone(e)) onClick()
  }
  const onLeave = () => { state.tx = 0; state.ty = 0; state.cx = -1e6; state.cy = -1e6 } // park cursor far → orb eases back to rest
  // Listen on WINDOW, not the canvas: the canvas is a full-screen overlay set to
  // pointerEvents:none (so it never blocks the nav/links beneath it). The click
  // only acts inside the orb's clickable circle (orb + halo, hitsOrbZone); every
  // other click is dead space and passes straight through to the DOM below.
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerdown', onDown)
  window.addEventListener('pointerup', onUp)
  window.addEventListener('blur', onLeave)

  // ---------- render loop ----------
  let rafId = 0
  let running = false
  let disposed = false
  let started = false
  let readyAt = 0
  let preloadTimer = 0
  let inhaleStart = 0 // performance.now() when the one-shot wake fired; 0 = idle

  function frame() {
    rafId = requestAnimationFrame(frame)
    const now = performance.now()

    if (morphing) {
      updateMorph(now) // owns scale / position / materials for the whole morph
    } else {
      state.px += (state.tx - state.px) * TUNE.parallaxEase
      state.py += (state.ty - state.py) * TUNE.parallaxEase
      anchor.rotation.set(-state.py * TUNE.parallax, state.px * TUNE.parallax, 0)
      if (!prefersReducedMotion) {
        // PROXIMITY: distance from the cursor to the orb's screen centre, now over
        // the WHOLE page. `t` ramps 0 (far corner) → 1 (on the orb) across `reach`,
        // and p = t^proxExp makes the response tiny far away and steepest near the
        // orb — so it grows FASTER the closer the cursor gets. Eased per frame
        // (spring) so it never snaps. The boat tracks hoverScale in composite() so
        // the whole lens magnifies as one piece.
        const ocx = orbFracX * canvas.clientWidth
        const cH = Math.max(1, canvas.clientHeight)
        const ocy = orbFracY * cH
        const d = Math.hypot(state.cx - ocx, state.cy - ocy)
        const reach = Math.max(1, TUNE.reach * Math.hypot(canvas.clientWidth, cH))
        const t = THREE.MathUtils.clamp((reach - d) / reach, 0, 1)
        const p = Math.pow(t, TUNE.proxExp)
        const targetScale = TUNE.restScale + (TUNE.peakScale - TUNE.restScale) * p
        hoverScale += (targetScale - hoverScale) * HOVER_EASE

        // prox = 0 at rest (looks like before) → 1 at closest approach. Shared with
        // composite() (the in-orb HUD alpha) via the same recovered term, and it
        // GATES the idle breath below so the resting-orb pulse yields entirely to
        // the proximity growth (at full hover the geometry is exactly as designed).
        const prox = THREE.MathUtils.clamp((hoverScale - TUNE.restScale) / Math.max(1e-3, TUNE.peakScale - TUNE.restScale), 0, 1)

        // IDLE BREATH: a slow, near-subliminal swell + interior glow so the orb is
        // visibly the one living thing in the dead space — plus one deeper one-shot
        // 'inhale' the instant the page reaches rest (cued via wake() from MainView,
        // gated there so SPA re-entry never replays it). Pure functions of time,
        // folded ON TOP of the hover scale so they never fight the click zone; eased
        // in with the fade-in and faded out by (1 − prox) as the cursor engages.
        // Mirrored on the mobile baked orb (BakedOrb.jsx) via CSS on the same rhythm.
        const breathT = 0.5 - 0.5 * Math.cos((now / TUNE.pulsePeriod) * Math.PI * 2)
        let swell = TUNE.pulseScale * breathT
        let glow = TUNE.pulseGlow * breathT
        if (inhaleStart) {
          const u = (now - inhaleStart) / TUNE.inhaleMs
          if (u >= 1) inhaleStart = 0
          else {
            const env = u < 0.3 ? smooth(0, 0.3, u) : 1 - smooth(0.3, 1, u)
            swell += TUNE.inhaleScale * env
            glow += TUNE.inhaleGlow * env
          }
        }
        const breathGate = (1 - prox) * orbMat.uniforms.uFadeIn.value
        swell *= breathGate
        glow *= breathGate
        orb.scale.setScalar(orbBaseScale * hoverScale * (1 + swell))

        // REVEAL: drive brightness + clarity off the SMOOTHED growth (not raw p) so
        // the interior resolves in lock-step with the size instead of leading it.
        orbMat.uniforms.uReveal.value = TUNE.revealRest + (TUNE.revealPeak - TUNE.revealRest) * prox + glow
        orbMat.uniforms.uStrength.value = TUNE.strength + (TUNE.nearStrength - TUNE.strength) * prox

        const f = THREE.MathUtils.clamp((now - readyAt) / FADE_IN_MS, 0, 1)
        orbMat.uniforms.uFadeIn.value = f * f * (3 - 2 * f)
      }
    }

    updateCountdown(Date.now())
    advanceBoat(now)
    composite()
    renderer.render(scene, camera)

    if (morphFrozen) stop() // hold the finished globe frame; stop burning frames
  }

  function start() {
    if (running || disposed) return
    running = true
    rafId = requestAnimationFrame(frame)
  }
  function stop() {
    running = false
    cancelAnimationFrame(rafId)
  }

  const onVisibility = () => {
    if (document.hidden) stop()
    else if (started) start()
  }
  document.addEventListener('visibilitychange', onVisibility)

  // ---------- WebGL context loss / restore ----------
  // iOS Safari aggressively drops WebGL contexts under memory pressure or tab
  // backgrounding; without this the orb canvas goes permanently blank. preventDefault
  // lets the browser restore the context; we pause the loop while it's gone and
  // re-upload the dynamic page texture + re-run the fade-in once it returns.
  const onContextLost = (e) => { e.preventDefault(); stop() }
  const onContextRestored = () => {
    pageTex.needsUpdate = true
    textTex.needsUpdate = true
    drawBase()
    readyAt = performance.now()
    if (started && !disposed && !document.hidden && !morphFrozen) start()
  }
  canvas.addEventListener('webglcontextlost', onContextLost, false)
  canvas.addEventListener('webglcontextrestored', onContextRestored, false)

  // boot once the photo is decoded (the boat GIF streams in independently)
  function boot() {
    if (disposed || started) return
    started = true
    sizeComposite()
    readyAt = performance.now()
    if (onReady) onReady()
    start()
    // PRELOAD the globe on home load: build the shared earth (invisible) a beat
    // later so its 4 textures decode in the background while the orb settles —
    // by the time the user clicks, the morph's reveal is instant, not a load.
    preloadTimer = setTimeout(buildGlobe, 1200)
  }
  if (photoReady) boot()
  else photoImg.addEventListener('load', boot, { once: true })

  function resize() {
    const w = canvas.clientWidth
    const h = Math.max(1, canvas.clientHeight)
    camera.aspect = w / h
    baseZ = fitCameraZ(camera.aspect)
    camera.position.z = baseZ
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    sizeComposite()
    syncResolution()
    applyOrbScale()
    applyOrbPosition()
  }

  // Move the orb's centre across the page. fracX/fracY are viewport fractions
  // (0..1; 0.5,0.5 = centre). The refraction is screen-space, so the page behind
  // the new position is what bends under the orb — no other call needed.
  function setPosition(fracX, fracY) {
    orbFracX = fracX
    orbFracY = fracY
    applyOrbPosition()
  }

  function dispose() {
    disposed = true
    stop()
    clearTimeout(preloadTimer)
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.removeEventListener('webglcontextrestored', onContextRestored)
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerdown', onDown)
    window.removeEventListener('pointerup', onUp)
    window.removeEventListener('blur', onLeave)
    if (boatFrame && boatFrame.close) boatFrame.close()
    if (boatDecoder && boatDecoder.close) boatDecoder.close()
    orb.geometry.dispose()
    orbMat.dispose()
    pageTex.dispose()
    textTex.dispose()
    if (earthParts) {
      earthParts.earth.geometry.dispose()
      earthParts.atmosphere.geometry.dispose()
      for (const key of ['map', 'bumpMap', 'specularMap', 'emissiveMap']) {
        if (earthParts.earthMat[key]) earthParts.earthMat[key].dispose()
      }
      earthParts.earthMat.dispose()
      earthParts.atmosMat.dispose()
    }
    renderer.dispose()
  }

  // dev-only: preview a moved orb, e.g. ?orbx=0.7&orby=0.4 (refraction follows it)
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const q = new URLSearchParams(location.search)
    if (q.has('orbx') || q.has('orby')) {
      setPosition(parseFloat(q.get('orbx') ?? '0.5'), parseFloat(q.get('orby') ?? '0.5'))
    }
  }

  // One-shot "inhale": a single deeper breath, fired by MainView the instant the
  // page reaches rest so a first-timer's eye lands on the orb as it wakes. Pure
  // envelope over the idle breath (see the render loop); no-op under reduced motion.
  function wake() {
    if (prefersReducedMotion || disposed || morphing) return
    inhaleStart = performance.now()
  }

  // ---------- PUBLIC API ----------
  return {
    resize, // re-fit to the current canvas size — call on window 'resize'
    setPosition, // setPosition(fracX, fracY): move the orb's centre (0..1 of the
    // viewport; 0.5,0.5 = middle). Refraction follows it; the background morphs.
    startMorph, // play the one-shot glass-orb → The Road globe transition
    wake, // fire the one-shot idle 'inhale' when the page settles at rest
    dispose, // tear down: WebGL context, listeners, GIF decoder, GPU resources
  }
}
