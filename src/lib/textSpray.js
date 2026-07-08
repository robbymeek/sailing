// ============================================================================
//  textSpray — the LA 2028 "sea-spray dissolve"
// ============================================================================
//  Replaces the old sticky banners: the headline is never pinned. The DOM h1
//  scrolls naturally and the viewport clips it at the top edge like any other
//  content; this module draws GPU spray for the letterform rows that have
//  crossed y=0, so the letters atomize into wind-blown spume at the moment of
//  contact. A particle at age 0 sits exactly on the clip line, so the seam
//  between crisp DOM text (below the edge) and spray (at it) is continuous by
//  construction. THE RELEASE LINE MUST STAY AT/ABOVE THE EDGE — the h1 is
//  never masked, so releasing below the edge would paint the same row twice.
//
//  Motion is a CLOSED FORM of scroll position (agePx = how far a row has
//  scrolled past its release line): no integration, no per-frame CPU particle
//  work, and reverse scrolling retraces every particle exactly — scroll back
//  down and the letters reassemble. The only time-based terms are cosmetic
//  and reassembly-safe: a zero-mean wobble whose amplitude vanishes at the
//  seam, and a global "staleness" evaporation that touches alpha only (a
//  cloud left hanging mid-air dissipates after ~2s of standstill and reforms
//  the instant you scroll).
//
//  One small WebGL2 context on a fixed top-band canvas (~300px tall, NOT the
//  full viewport — compositing bandwidth is the real cost, especially on the
//  The Road page where the globe context is also live). The canvas lives
//  inside the page's own stacking context (`container`) so route fades apply
//  and page modals can layer above it. Callers gate on hasWebGL2() +
//  prefers-reduced-motion + Save-Data (see hooks/useTextSpray) and wrap in
//  try/catch: any failure degrades to the plain un-sticky scroll-away.

import * as THREE from 'three'

// .chrome-text gradient from index.css — keep in sync. Baked into a 256x1
// texture premultiplied over black (the banner background), so an alpha-1
// particle at the seam matches the DOM glyph pixel exactly.
const CHROME_STOPS = [
  [0.00, 180, 200, 255, 0.9],
  [0.12, 255, 255, 255, 1.0],
  [0.24, 100, 160, 255, 0.8],
  [0.36, 200, 220, 255, 0.95],
  [0.48, 60, 120, 220, 0.7],
  [0.60, 255, 255, 255, 1.0],
  [0.72, 140, 180, 255, 0.85],
  [0.84, 220, 235, 255, 0.95],
  [0.96, 80, 140, 240, 0.8],
  [1.00, 180, 200, 255, 0.9],
]

// tail: px of scroll a particle lives; peak: how deep the hanging cloud
// bulges below the top edge; exit: upward overshoot that carries it off the
// top of the screen; spread: lateral half-reach of the symmetric fan.
// tail sized so the spray is fully spent BEFORE the HIGHLIGHTS dropdown scrolls
// to the top: the RESULTS h1 (~95px tall) sits ~280px above that header, so the
// last-released row (life = tail*1.3) must clear inside ~145px of scroll →
// tail ≈ 110 (owner: "up and out of the way by the highlights drop down").
const TUNE_DESKTOP = { grid: 2, tail: 110, peak: 41, exit: 280, spread: 90, curlAmp: 18, size: 2.2, band: 320, dprCap: 2 }
const TUNE_MOBILE = { grid: 3, tail: 110, peak: 26, exit: 190, spread: 48, curlAmp: 12, size: 1.6, band: 240, dprCap: 1.5 }

// Start the loop a little before the release line so the first released rows
// never pop in late; stop once the whole cloud (text + tail) is spent.
const ACTIVE_TOP = 200

const VERT = /* glsl */ `
  attribute float aSeed;

  uniform vec2  uViewport;   // canvas band size, CSS px (w, bandH)
  uniform float uTextTop;    // viewport-relative top of the h1 box, CSS px
  uniform float uTextLeft;
  uniform float uTextWidth;
  uniform float uDpr;
  uniform float uTime;       // seconds — cosmetic terms only
  uniform float uStaleness;  // seconds of standstill (global, alpha-only)
  uniform float uVelBoost;   // 0..1 fast-flick response
  uniform float uTail;
  uniform float uPeak;
  uniform float uExit;
  uniform float uSpread;
  uniform float uCurlAmp;
  uniform float uSize;

  varying float vAlpha;
  varying float vAge01;
  varying float vFx;
  varying float vSeed;

  float hash1(float n) { return fract(sin(n) * 43758.5453123); }

  void main() {
    // Ragged crest: each column releases a few px INTO the clipped region
    // (never below the edge — see the file header invariant).
    float jitter = 8.0 * hash1(floor(position.x / 6.0) * 12.9898);
    float rowY = uTextTop + position.y;      // viewport y if still attached
    float agePx = max(0.0, -jitter - rowY);  // px of scroll since release

    if (agePx <= 0.0) {
      // Unreleased: the DOM glyphs own these pixels. Cull off-screen.
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 1.0;
      vAlpha = 0.0; vAge01 = 0.0; vFx = 0.0; vSeed = aSeed;
      return;
    }

    // Closed-form motion — a pure function of scroll, so reverse scrolling
    // retraces every particle exactly. Forward: an explosion pointed DOWN —
    // burst below the edge into a hanging jumbled cloud, then rocket up and
    // out through the top of the screen. Reversed by scroll-back, that reads
    // as: pixels drop in from the top, gather into the jumbled oval, and
    // settle back into the letters. Every term is zero at agePx=0 so the
    // seam stays exact.
    float r1 = hash1(aSeed * 17.31);
    float r2 = hash1(aSeed * 29.7);
    float life = uTail * (0.7 + 0.6 * aSeed); // per-particle lifespan
    float t01 = clamp(agePx / life, 0.0, 1.0);

    float peak = uPeak * (0.55 + 0.9 * r1);
    float dy = peak * sin(3.14159 * min(t01 / 0.85, 1.0))
             - uExit * pow(smoothstep(0.55, 1.0, t01), 2.0);

    // Symmetric fan about the text centre plus per-particle scatter: the
    // burst spreads outward both ways, fast at first, then hangs.
    float centreOff = (position.x - uTextWidth * 0.5) / max(uTextWidth * 0.5, 1.0);
    float dir = centreOff * 0.7 + (r2 * 2.0 - 1.0) * 0.9;
    float dx = dir * uSpread * (1.0 - pow(1.0 - t01, 2.0));

    // Cloudy turbulence: spatially coherent swirls (neighbours billow
    // together) with a per-particle jitter octave, ramping in off the seam.
    float cr = smoothstep(0.0, 30.0, agePx) * uCurlAmp * (0.6 + t01);
    float phA = agePx * 0.045;
    vec2 g = position.xy * 0.04;
    vec2 swirl = vec2(
      sin(g.y * 5.0 + phA + 0.8 * sin(g.x * 3.0 + phA * 0.7)),
      cos(g.x * 4.2 - phA * 0.9 + 0.8 * sin(g.y * 3.4 + phA * 0.6))
    );
    vec2 jit = vec2(sin(agePx * 0.09 + aSeed * 40.0), cos(agePx * 0.075 + aSeed * 80.0));
    vec2 curl = cr * (0.75 * swirl + 0.45 * jit);

    // Anti-freeze wobble: zero-mean, amplitude gated by age so the seam
    // (age → 0) stays exact and scroll-back reassembly is unaffected.
    float wAmp = smoothstep(0.0, 60.0, agePx) * 1.5;
    float wFrq = (0.5 + 0.7 * aSeed) * 6.28318;
    vec2 wobble = wAmp * vec2(
      sin(uTime * wFrq + aSeed * 6.28318),
      cos(uTime * wFrq * 0.83 + aSeed * 12.566)
    );

    vec2 p = vec2(
      uTextLeft + position.x + dx + curl.x + wobble.x,
      rowY + agePx + dy + curl.y + wobble.y
    );

    // Alpha: quick ramp-in at the seam; hold through the burst so the vanish
    // reads as flying out the top rather than fading in place; the global
    // evaporation stays alpha-only and zero at the seam.
    float aIn = smoothstep(0.0, 2.0, agePx);
    float aOut = 1.0 - smoothstep(0.72, 1.0, t01);
    float evap = exp(-(uStaleness / 1.2) * clamp(agePx / 100.0, 0.0, 1.0));
    float aVel = 1.0 - 0.3 * uVelBoost;

  #ifdef HALO
    float sizeCss = 11.0 * (0.8 + 0.4 * aSeed) * (1.0 + 0.9 * uVelBoost);
  #else
    float sizeCss = uSize * (0.6 + 0.8 * aSeed) * (1.0 + 0.9 * uVelBoost);
  #endif
    float sizeDev = max(2.0, sizeCss * uDpr);
    float comp = (sizeCss * uDpr) / sizeDev; // dim sprites clamped up to 2px

  #ifdef HALO
    // Soft crest glow: young particles only, drawn big and very faint.
    vAlpha = aIn * (1.0 - smoothstep(0.0, 60.0, agePx)) * evap * aVel * 0.07;
  #else
    vAlpha = aIn * aOut * evap * aVel * comp * comp;
  #endif
    vAge01 = t01;
    vFx = clamp(position.x / max(uTextWidth, 1.0), 0.0, 1.0);
    vSeed = aSeed;

    gl_PointSize = sizeDev;
    gl_Position = vec4(p.x / uViewport.x * 2.0 - 1.0, 1.0 - p.y / uViewport.y * 2.0, 0.0, 1.0);
  }
`

const FRAG = /* glsl */ `
  uniform sampler2D uGrad;
  uniform float uShimmer; // animated background-position of .chrome-text, 0..1

  varying float vAlpha;
  varying float vAge01;
  varying float vFx;
  varying float vSeed;

  void main() {
    vec2 q = gl_PointCoord - 0.5;
    float d2 = dot(q, q) * 4.0;               // 0 centre → 1 rim
    float fall = exp(-d2 * 3.0) - exp(-3.0);  // gaussian, zero at the rim
    if (fall <= 0.0) discard;
    float a = vAlpha * fall * 1.052;          // renormalize the rim subtraction
  #ifdef CHROME
    // Reproduce .chrome-text: a 300%-wide gradient whose position animates;
    // (fx + 2·phase) / 3 is the slice the DOM shows at this instant.
    vec3 col = texture2D(uGrad, vec2((vFx + 2.0 * uShimmer) / 3.0, 0.5)).rgb;
    col *= 0.85 + 0.3 * fract(vSeed * 7.31);  // per-droplet glint
  #else
    // White spume cooling toward the site royal blue over the last 40% of life.
    vec3 col = mix(vec3(1.0), vec3(0.118, 0.251, 1.0), smoothstep(0.6, 1.0, vAge01));
  #endif
    gl_FragColor = vec4(col, a);
  }
`

// CSS 'ease' = cubic-bezier(0.25, 0.1, 0.25, 1): solve y(x) so the particle
// shimmer tracks the DOM keyframe animation frame-accurately.
function cssEase(x) {
  const cx = 0.75, bx = -0.75, ax = 1
  const cy = 0.3, by = 2.4, ay = -1.7
  let t = x
  for (let i = 0; i < 5; i++) {
    const err = ((ax * t + bx) * t + cx) * t - x
    const slope = (3 * ax * t + 2 * bx) * t + cx
    if (Math.abs(slope) < 1e-6) break
    t = Math.min(1, Math.max(0, t - err / slope))
  }
  return ((ay * t + by) * t + cy) * t
}

function buildGradTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 1
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000' // premultiply the sub-1 alpha stops over the black band
  ctx.fillRect(0, 0, 256, 1)
  const g = ctx.createLinearGradient(0, 0, 256, 0)
  for (const [p, r, gr, b, a] of CHROME_STOPS) g.addColorStop(p, `rgba(${r},${gr},${b},${a})`)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 256, 1)
  const tex = new THREE.CanvasTexture(c)
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.wrapS = THREE.ClampToEdgeWrapping
  return tex
}

// Rasterize the h1 into particle home positions. Each glyph is measured from
// its own <span> (the -4px letter-spacing and centering come from the DOM, so
// canvas letter-spacing support doesn't matter) and drawn individually.
// Returns null if the canvas rejects the font string — the caller treats that
// as "no effect" (an invalid ctx.font is IGNORED silently, keeping the 10px
// sans-serif default, which would sample garbage).
function rasterize(h1El, grid) {
  const h1Rect = h1El.getBoundingClientRect()
  const spans = h1El.querySelectorAll('span')
  if (!spans.length || h1Rect.width < 4 || h1Rect.height < 4) return null

  const cs = getComputedStyle(h1El)
  const fontPx = parseFloat(cs.fontSize) || 80
  const rDpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.ceil(h1Rect.width)
  const h = Math.ceil(h1Rect.height)
  const os = document.createElement('canvas')
  os.width = Math.ceil(w * rDpr)
  os.height = Math.ceil(h * rDpr)
  const ctx = os.getContext('2d', { willReadFrequently: true })
  ctx.scale(rDpr, rDpr)

  for (const family of [cs.fontFamily, 'sans-serif']) {
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${family}`
    if (ctx.font !== '10px sans-serif') break
  }
  if (ctx.font === '10px sans-serif') return null

  ctx.fillStyle = '#fff'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  const metrics = ctx.measureText('LA 2028')
  const ascent = metrics.fontBoundingBoxAscent || fontPx * 0.78
  for (const span of spans) {
    const sr = span.getBoundingClientRect()
    ctx.fillText(span.textContent, sr.left - h1Rect.left, sr.top - h1Rect.top + ascent)
  }

  const data = ctx.getImageData(0, 0, os.width, os.height).data
  const home = []
  const seed = []
  for (let gy = 0; gy < h; gy += grid) {
    for (let gx = 0; gx < w; gx += grid) {
      const px = Math.min(os.width - 1, Math.round((gx + grid / 2) * rDpr))
      const py = Math.min(os.height - 1, Math.round((gy + grid / 2) * rDpr))
      if (data[(py * os.width + px) * 4 + 3] > 100) {
        // de-grid with a little scatter — baked once, so scrub stays exact
        home.push(gx + (Math.random() - 0.5) * grid * 0.8, gy + (Math.random() - 0.5) * grid * 0.8, 0)
        seed.push(Math.random())
      }
    }
  }
  if (!home.length) return null

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(home), 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(seed), 1))
  return geo
}

export function createTextSpray(h1El, opts = {}) {
  const {
    palette = 'white',
    container = document.body,
    zIndex = 20,
    fadeEls = [],
    isPaused = null,
    halo = true,
  } = opts

  const isMobile = window.innerWidth < 700
  const T = isMobile ? TUNE_MOBILE : TUNE_DESKTOP
  const chrome = palette === 'chrome'

  // ---------- raster → geometry ----------
  let geometry = rasterize(h1El, T.grid)
  if (!geometry) throw new Error('textSpray: rasterization failed')

  // ---------- overlay canvas + renderer ----------
  const canvas = document.createElement('canvas')
  Object.assign(canvas.style, {
    position: 'fixed', top: '0', left: '0', width: '100%', height: `${T.band}px`,
    pointerEvents: 'none', zIndex: String(zIndex), display: 'none',
  })
  // Hard rule line at the clip edge — glows with release activity so the top
  // of the screen reads as the thing shearing the letters apart.
  const rule = document.createElement('div')
  Object.assign(rule.style, {
    position: 'fixed', top: '0', left: '0', right: '0', height: '1px',
    background: '#fff', opacity: '0', pointerEvents: 'none',
    zIndex: String(zIndex + 1), display: 'none',
  })
  container.appendChild(canvas)
  container.appendChild(rule)

  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' })
  } catch {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, depth: false, stencil: false })
  }
  renderer.setClearColor(0x000000, 0)

  const gradTex = chrome ? buildGradTexture() : null
  const uniforms = {
    uViewport: { value: new THREE.Vector2(1, 1) },
    uTextTop: { value: 9999 },
    uTextLeft: { value: 0 },
    uTextWidth: { value: 1 },
    uDpr: { value: 1 },
    uTime: { value: 0 },
    uStaleness: { value: 0 },
    uVelBoost: { value: 0 },
    uTail: { value: T.tail },
    uPeak: { value: T.peak },
    uExit: { value: T.exit },
    uSpread: { value: T.spread },
    uCurlAmp: { value: T.curlAmp },
    uSize: { value: T.size },
    uShimmer: { value: 0 },
    uGrad: { value: gradTex },
  }
  const matOpts = {
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // Additive rgb while dst alpha still accumulates — plain AdditiveBlending
    // leaves rgb > alpha "superluminal" premultiplied pixels that some
    // compositors clamp when the transparent canvas is composited.
    blending: THREE.CustomBlending,
    blendSrc: THREE.SrcAlphaFactor,
    blendDst: THREE.OneFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneFactor,
  }
  const defines = chrome ? { CHROME: 1 } : {}
  const coreMat = new THREE.ShaderMaterial({ ...matOpts, defines: { ...defines } })
  const haloMat = halo ? new THREE.ShaderMaterial({ ...matOpts, defines: { ...defines, HALO: 1 } }) : null

  const scene = new THREE.Scene()
  const camera = new THREE.Camera() // shader emits clip coords directly
  const corePts = new THREE.Points(geometry, coreMat)
  corePts.frustumCulled = false
  scene.add(corePts)
  let haloPts = null
  if (haloMat) {
    haloPts = new THREE.Points(geometry, haloMat)
    haloPts.frustumCulled = false
    scene.add(haloPts)
  }

  // ---------- sizing ----------
  let lastW = 0
  let lastFontSize = ''
  let lastDpr = 0
  function sizeRenderer() {
    lastW = window.innerWidth
    lastFontSize = getComputedStyle(h1El).fontSize
    lastDpr = Math.min(window.devicePixelRatio || 1, T.dprCap)
    renderer.setPixelRatio(lastDpr)
    renderer.setSize(lastW, T.band, false)
    uniforms.uViewport.value.set(lastW, T.band)
    uniforms.uDpr.value = lastDpr
  }
  sizeRenderer()

  // Fade lines (countdown etc.) exhale before the edge instead of clipping
  // flatly under the dissolve. Offsets are cached relative to the h1 so the
  // per-frame loop does a single layout read.
  let fadeOffsets = []
  function measureFades() {
    const top = h1El.getBoundingClientRect().top
    fadeOffsets = fadeEls.filter(Boolean).map((el) => ({ el, dy: el.getBoundingClientRect().top - top }))
  }
  measureFades()

  // ---------- frame loop (runs only while the headline is near the edge) ----------
  let disposed = false
  let running = false
  let raf = 0
  let watchRaf = 0
  let lastNow = 0
  let lastY = 0
  let vSmooth = 0
  let stillFor = 0
  let staleness = 0
  let ruleO = 0
  let shimmerAnim = null

  function shimmerPhase() {
    if (!chrome) return 0
    if (!shimmerAnim && h1El.getAnimations) {
      shimmerAnim = h1El.getAnimations().find((a) => a.animationName === 'chromeShimmer') || null
    }
    const ms = shimmerAnim && shimmerAnim.currentTime != null ? shimmerAnim.currentTime : performance.now()
    const t = ((ms / 1000) % 6) / 6
    return t < 0.5 ? cssEase(t * 2) : 1 - cssEase((t - 0.5) * 2)
  }

  function inBand(top, height) {
    return top < ACTIVE_TOP && top > -(height + T.tail + 300)
  }

  function tick(now) {
    raf = requestAnimationFrame(tick)
    const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000))
    lastNow = now

    const rect = h1El.getBoundingClientRect()
    if (!inBand(rect.top, rect.height)) {
      stopLoop()
      return
    }

    const y = window.scrollY
    const v = (y - lastY) / dt
    lastY = y
    vSmooth += (v - vSmooth) * (1 - Math.exp(-dt * 8))
    if (Math.abs(v) < 20) stillFor += dt
    else stillFor = 0
    if (stillFor > 0.25) staleness = Math.min(6, staleness + dt)
    else staleness *= Math.exp(-dt / 0.15)

    for (const { el, dy } of fadeOffsets) {
      const o = Math.min(1, Math.max(0, (rect.top + dy - 50) / 90))
      el.style.opacity = String(o)
      // A fully faded element must also leave hit-testing and tab order:
      // opacity:0 alone keeps buttons inside it clickable and focusable
      // (an invisible click target parked at the top of the viewport).
      el.style.visibility = o <= 0 ? 'hidden' : ''
    }

    const paused = isPaused && isPaused()
    canvas.style.visibility = paused ? 'hidden' : 'visible'
    rule.style.visibility = paused ? 'hidden' : 'visible'
    if (paused) return

    // Rule line: brightest while rows are actively shearing across the edge.
    const zone = rect.top < 0 && rect.top > -(rect.height + 80)
    const target = zone ? Math.min(1, Math.abs(vSmooth) / 1200) * 0.5 : 0
    ruleO += (target - ruleO) * (1 - Math.exp(-dt * 10))
    rule.style.opacity = ruleO < 0.01 ? '0' : ruleO.toFixed(3)

    uniforms.uTextTop.value = rect.top
    uniforms.uTextLeft.value = rect.left
    uniforms.uTextWidth.value = Math.max(1, rect.width)
    uniforms.uTime.value = now / 1000
    uniforms.uStaleness.value = staleness
    uniforms.uVelBoost.value = Math.min(1, Math.max(0, (Math.abs(vSmooth) - 1500) / 2500))
    uniforms.uShimmer.value = shimmerPhase()
    renderer.render(scene, camera)
  }

  function startLoop() {
    if (running || disposed) return
    running = true
    measureFades()
    lastNow = performance.now()
    lastY = window.scrollY
    vSmooth = 0
    stillFor = 0
    staleness = 0
    canvas.style.display = 'block'
    rule.style.display = 'block'
    raf = requestAnimationFrame(tick)
  }

  function stopLoop() {
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    running = false
    canvas.style.display = 'none'
    rule.style.display = 'none'
    ruleO = 0
    for (const { el } of fadeOffsets) {
      el.style.opacity = ''
      el.style.visibility = ''
    }
  }

  // Idle watcher: a cheap rAF-throttled scroll check restarts the loop when
  // the headline re-enters the band (the loop parks itself when it leaves).
  function onScroll() {
    if (running || watchRaf || disposed) return
    watchRaf = requestAnimationFrame(() => {
      watchRaf = 0
      if (running || disposed || document.hidden) return
      const rect = h1El.getBoundingClientRect()
      if (inBand(rect.top, rect.height)) startLoop()
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })

  function rebuild() {
    const w = window.innerWidth
    const fs = getComputedStyle(h1El).fontSize
    const dpr = Math.min(window.devicePixelRatio || 1, T.dprCap)
    // Height-only resizes (iOS URL bar) change none of these: skip the raster.
    if (w !== lastW || fs !== lastFontSize || dpr !== lastDpr) {
      const geo = rasterize(h1El, T.grid)
      // Element hidden/mid-layout: bail WITHOUT committing the size cache, so
      // the next resize retries instead of leaving stale geometry forever.
      if (!geo) return
      sizeRenderer()
      geometry.dispose()
      geometry = geo
      corePts.geometry = geo
      if (haloPts) haloPts.geometry = geo
      measureFades()
    }
    // A reflow can move the h1 into the band with no scroll event — re-check.
    onScroll()
  }
  let resizeTimer = 0
  function onResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => { if (!disposed) rebuild() }, 150)
  }
  window.addEventListener('resize', onResize)

  function onVisibility() {
    if (document.hidden) stopLoop()
    else onScroll()
  }
  document.addEventListener('visibilitychange', onVisibility)

  // iOS Safari drops WebGL contexts under memory pressure; with the globe
  // context alive on The Road this small cosmetic one is the likely
  // eviction victim. Pause while it's gone, resume when restored (three
  // re-uploads its tracked resources lazily).
  const onContextLost = (e) => { e.preventDefault(); stopLoop() }
  const onContextRestored = () => { onScroll() }
  canvas.addEventListener('webglcontextlost', onContextLost, false)
  canvas.addEventListener('webglcontextrestored', onContextRestored, false)

  onScroll() // may already be in band

  return {
    dispose() {
      disposed = true
      stopLoop()
      if (watchRaf) cancelAnimationFrame(watchRaf)
      clearTimeout(resizeTimer)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('webglcontextlost', onContextLost)
      canvas.removeEventListener('webglcontextrestored', onContextRestored)
      geometry.dispose()
      coreMat.dispose()
      if (haloMat) haloMat.dispose()
      if (gradTex) gradTex.dispose()
      renderer.dispose()
      // Release the GL context deterministically (we own this canvas and it is
      // gone from the DOM; waiting on GC risks stacking contexts toward the
      // browser cap during rapid route hopping). Safe here — the loss handlers
      // were just removed.
      renderer.forceContextLoss()
      canvas.remove()
      rule.remove()
    },
  }
}
