// ============================================================================
//  Liquid metal — the sponsor roll call rendered as living, refracting chrome.
//
//  A self-contained raw-WebGL2 port of the paper-design "liquid-logo" effect
//  (~/Code/reference-repos/liquid-logo). ONE fragment shader on a
//  fullscreen quad reads a beveled depth field (red channel): `edge` is 1.0 at
//  a glyph boundary AND outside the glyphs, ramping to 0.0 deep inside, so the
//  metal fills the letters and everything else stays transparent — the names
//  BECOME the metal (the owner-chosen "names as liquid metal" look, not a
//  cut-out plate).
//
//  Kept raw WebGL2 on purpose: the /team route loads no three.js today, and
//  this is a single quad + one shader — no reason to pull the ~492KB three
//  chunk onto the route. The lifecycle (gated rAF, visibility pause, DPR cap,
//  context-loss handling, deterministic dispose) mirrors the site's three-based
//  scenes (glassOrbScene.js / textSpray.js).
//
//  The reference builds its depth field with a 300-iteration Poisson solve
//  (seconds in JS). We replace that with a two-pass Felzenszwalb Euclidean
//  Distance Transform built from the live DOM name layout — O(n), a few ms, and
//  pixel-aligned to where the white DOM names sit so the crossfade registers.
// ============================================================================

export const LIQUID_METAL_DEFAULTS = {
  // Ported from liquid-logo/src/hero/params.ts defaults, tuned for text.
  refraction: 0.015,
  edge: 0.4,
  patternBlur: 0.005,
  liquid: 0.07,
  speed: 0.3,
  patternScale: 2,
}

// ---- Shaders (ported verbatim from liquid-logo, vertex + liquid-frag) -------

const VERT_SRC = `#version 300 es
precision mediump float;
in vec2 a_position;
out vec2 vUv;
void main() {
  vUv = .5 * (a_position + 1.);
  gl_Position = vec4(a_position, 0.0, 1.0);
}`

const FRAG_SRC = /* glsl */ `#version 300 es
precision mediump float;

in vec2 vUv;
out vec4 fragColor;

uniform sampler2D u_image_texture;
uniform float u_time;
uniform float u_ratio;
uniform float u_img_ratio;
uniform float u_patternScale;
uniform float u_refraction;
uniform float u_edge;
uniform float u_patternBlur;
uniform float u_liquid;

#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846

vec3 mod289(vec3 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec2 mod289(vec2 x) { return x - floor(x * (1. / 289.)) * 289.; }
vec3 permute(vec3 x) { return mod289(((x*34.)+1.)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1., 0.) : vec2(0., 1.);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0., i1.y, 1.)) + i.x + vec3(0., i1.x, 1.));
    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.);
    m = m*m;
    m = m*m;
    vec3 x = 2. * fract(p * C.www) - 1.;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130. * dot(m, g);
}

vec2 get_img_uv() {
    vec2 img_uv = vUv;
    img_uv -= .5;
    if (u_ratio > u_img_ratio) {
        img_uv.x = img_uv.x * u_ratio / u_img_ratio;
    } else {
        img_uv.y = img_uv.y * u_img_ratio / u_ratio;
    }
    float scale_factor = 1.;
    img_uv *= scale_factor;
    img_uv += .5;
    img_uv.y = 1. - img_uv.y;
    return img_uv;
}
vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
float get_color_channel(float c1, float c2, float stripe_p, vec3 w, float extra_blur, float b) {
    float ch = c2;
    float border = 0.;
    float blur = u_patternBlur + extra_blur;
    ch = mix(ch, c1, smoothstep(.0, blur, stripe_p));
    border = w[0];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    b = smoothstep(.2, .8, b);
    border = w[0] + .4 * (1. - b) * w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + .5 * (1. - b) * w[1];
    ch = mix(ch, c2, smoothstep(border - blur, border + blur, stripe_p));
    border = w[0] + w[1];
    ch = mix(ch, c1, smoothstep(border - blur, border + blur, stripe_p));
    float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
    float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
    ch = mix(ch, gradient, smoothstep(border - blur, border + blur, stripe_p));
    return ch;
}

float get_img_frame_alpha(vec2 uv, float img_frame_width) {
    float img_frame_alpha = smoothstep(0., img_frame_width, uv.x) * smoothstep(1., 1. - img_frame_width, uv.x);
    img_frame_alpha *= smoothstep(0., img_frame_width, uv.y) * smoothstep(1., 1. - img_frame_width, uv.y);
    return img_frame_alpha;
}

void main() {
    vec2 uv = vUv;
    uv.y = 1. - uv.y;
    uv.x *= u_ratio;

    float diagonal = uv.x - uv.y;
    float t = .001 * u_time;

    vec2 img_uv = get_img_uv();
    vec4 img = texture(u_image_texture, img_uv);

    vec3 color = vec3(0.);
    float opacity = 1.;

    vec3 color1 = vec3(.98, 0.98, 1.);
    vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, uv.x + uv.y));

    float edge = img.r;

    vec2 grad_uv = uv;
    grad_uv -= .5;
    float dist = length(grad_uv + vec2(0., .2 * diagonal));
    grad_uv = rotate(grad_uv, (.25 - .2 * diagonal) * PI);

    float bulge = pow(1.8 * dist, 1.2);
    bulge = 1. - bulge;
    bulge *= pow(uv.y, .3);

    float cycle_width = u_patternScale;
    float thin_strip_1_ratio = .12 / cycle_width * (1. - .4 * bulge);
    float thin_strip_2_ratio = .07 / cycle_width * (1. + .4 * bulge);
    float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

    float thin_strip_1_width = cycle_width * thin_strip_1_ratio;
    float thin_strip_2_width = cycle_width * thin_strip_2_ratio;

    // Opacity comes from glyph COVERAGE (green channel), not the bevel depth —
    // thin letter strokes never reach a deep "interior" the way a chunky logo
    // does, so a depth-derived alpha would leave them invisible. The beveled
    // red channel is used only for the chrome shading below.
    float cover = img.g;
    opacity = cover;
    opacity *= get_img_frame_alpha(img_uv, 0.01);

    float noise = snoise(uv - t);
    edge += (1. - edge) * u_liquid * noise;

    float refr = 0.;
    refr += (1. - bulge);
    refr = clamp(refr, 0., 1.);

    float dir = grad_uv.x;
    dir += diagonal;
    dir -= 2. * noise * diagonal * (smoothstep(0., 1., edge) * smoothstep(1., 0., edge));

    bulge *= clamp(pow(uv.y, .1), .3, 1.);
    dir *= (.1 + (1.1 - edge) * bulge);
    dir *= smoothstep(1., .7, edge);
    dir += .18 * (smoothstep(.1, .2, uv.y) * smoothstep(.4, .2, uv.y));
    dir += .03 * (smoothstep(.1, .2, 1. - uv.y) * smoothstep(.4, .2, 1. - uv.y));
    dir *= (.5 + .5 * pow(uv.y, 2.));
    dir *= cycle_width;
    dir -= t;

    float refr_r = refr;
    refr_r += .03 * bulge * noise;
    float refr_b = 1.3 * refr;

    refr_r += 5. * (smoothstep(-.1, .2, uv.y) * smoothstep(.5, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(1., .4, bulge));
    refr_r -= diagonal;
    refr_b += (smoothstep(0., .4, uv.y) * smoothstep(.8, .1, uv.y)) * (smoothstep(.4, .6, bulge) * smoothstep(.8, .4, bulge));
    refr_b -= .2 * edge;

    refr_r *= u_refraction;
    refr_b *= u_refraction;

    vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
    w[1] -= .02 * smoothstep(.0, 1., edge + bulge);
    float stripe_r = mod(dir + refr_r, 1.);
    float r = get_color_channel(color1.r, color2.r, stripe_r, w, 0.02 + .03 * u_refraction * bulge, bulge);
    float stripe_g = mod(dir, 1.);
    float g = get_color_channel(color1.g, color2.g, stripe_g, w, 0.01 / (1. - diagonal), bulge);
    float stripe_b = mod(dir - refr_b, 1.);
    float b = get_color_channel(color1.b, color2.b, stripe_b, w, .01, bulge);

    color = vec3(r, g, b);
    color *= opacity;

    fragColor = vec4(color, opacity);
}`

// ---- Distance transform (Felzenszwalb 1D, 2 passes = exact Euclidean) -------

const INF = 1e20

// 1D squared-distance transform of a sampled function f (length n).
// Scratch arrays d/v/z are reused across calls to avoid per-row allocations.
function dt1d(f, n, d, v, z) {
  let k = 0
  v[0] = 0
  z[0] = -INF
  z[1] = INF
  for (let q = 1; q < n; q++) {
    let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    while (s <= z[k]) {
      k--
      s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k])
    }
    k++
    v[k] = q
    z[k] = s
    z[k + 1] = INF
  }
  k = 0
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++
    const dq = q - v[k]
    d[q] = dq * dq + f[v[k]]
  }
}

// In-place 2D squared-EDT: f holds 0 at seed pixels, INF elsewhere; on return
// f[i] = squared distance from pixel i to the nearest seed.
function edt2d(f, w, h) {
  const maxWH = Math.max(w, h)
  const d = new Float64Array(maxWH)
  const v = new Int32Array(maxWH)
  const z = new Float64Array(maxWH + 1)
  const col = new Float64Array(h)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) col[y] = f[y * w + x]
    dt1d(col, h, d, v, z)
    for (let y = 0; y < h; y++) f[y * w + x] = d[y]
  }
  const row = new Float64Array(w)
  for (let y = 0; y < h; y++) {
    const base = y * w
    for (let x = 0; x < w; x++) row[x] = f[base + x]
    dt1d(row, w, d, v, z)
    for (let x = 0; x < w; x++) f[base + x] = d[x]
  }
}

// ---- Field builder: DOM names -> beveled depth field (u_image_texture) ------

// Rasterizes the live name <p> nodes (same getBoundingClientRect + computed
// font the roll-call spray uses), then bevels each glyph via the EDT so the
// shader reads it as raised metal. Returns { data, width, height } sized to the
// padded name block; `cssW/cssH` are the CSS dimensions the canvas must adopt so
// the texture maps 1:1 and the metal glyphs land exactly on the DOM glyphs.
export function buildMetalField({
  nameEls,
  wrapRect,
  pad = 44,
  dpr = 2,
  bevelCss = 2.0,       // bevel ramp width in CSS px (tune vs. glyph stroke)
  maxLongSide = 1200,   // cap the texture's long edge (reference uses 1000)
}) {
  const cssW = Math.max(2, wrapRect.width + pad * 2)
  const cssH = Math.max(2, wrapRect.height + pad * 2)

  let scale = dpr
  const longCss = Math.max(cssW, cssH)
  if (longCss * dpr > maxLongSide) scale = maxLongSide / longCss

  const w = Math.max(2, Math.round(cssW * scale))
  const h = Math.max(2, Math.round(cssH * scale))

  const off = document.createElement('canvas')
  off.width = w
  off.height = h
  const ctx = off.getContext('2d', { willReadFrequently: true })
  ctx.scale(scale, scale)
  ctx.clearRect(0, 0, cssW, cssH)
  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'

  for (const p of nameEls) {
    const r = p.getBoundingClientRect()
    const cs = getComputedStyle(p)
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`
    try { ctx.letterSpacing = cs.letterSpacing } catch { /* older engines */ }
    const yMid = r.top - wrapRect.top + pad + r.height / 2
    const align = cs.textAlign
    if (align === 'right' || align === 'end') {
      ctx.textAlign = 'right'
      ctx.fillText(p.textContent, r.right - wrapRect.left + pad, yMid)
    } else if (align === 'left' || align === 'start') {
      ctx.textAlign = 'left'
      ctx.fillText(p.textContent, r.left - wrapRect.left + pad, yMid)
    } else {
      ctx.textAlign = 'center'
      ctx.fillText(p.textContent, r.left - wrapRect.left + pad + r.width / 2, yMid)
    }
  }

  const alpha = ctx.getImageData(0, 0, w, h).data
  const N = w * h
  const f = new Float64Array(N)
  for (let i = 0; i < N; i++) f[i] = alpha[i * 4 + 3] > 128 ? INF : 0 // glyph=object, bg=seed
  edt2d(f, w, h)

  const bevel = Math.max(1, bevelCss * scale)
  const out = new Uint8ClampedArray(N * 4)
  for (let i = 0; i < N; i++) {
    const cover = alpha[i * 4 + 3] / 255  // anti-aliased glyph coverage -> opacity
    let edge                              // beveled depth -> chrome shading (R/B)
    if (alpha[i * 4 + 3] > 128) {
      const dpx = Math.sqrt(f[i])         // distance to nearest glyph edge
      let e = 1 - dpx / bevel             // 1 at the boundary -> 0 deep inside
      if (e < 0) e = 0
      e = 1 - (1 - e) * (1 - e)           // dome remap -> rounded bevel
      edge = e
    } else {
      edge = 1                            // outside the glyphs
    }
    const px = i * 4
    out[px] = edge * 255                  // R: beveled depth for the chrome shading
    out[px + 1] = cover * 255             // G: coverage -> shader opacity
    out[px + 2] = edge * 255              // B: unused (mirror of R)
    out[px + 3] = 255
  }
  return { data: out, width: w, height: h, cssW, cssH }
}

// ---- WebGL2 scene factory ---------------------------------------------------

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error('liquidMetal shader compile failed: ' + log)
  }
  return sh
}

// createLiquidMetal(canvas, opts) -> { setField, setRunning, resize, dispose }.
// Mirrors the site's scene lifecycle: self-rescheduling rAF guarded by
// running/disposed, visibility pause with a clock reset (so u_time never jumps
// after a background freeze), context-loss handlers, DPR cap, and a
// deterministic dispose that does NOT forceContextLoss (the canvas is a
// React-owned <canvas ref> reused across StrictMode double-mounts).
export function createLiquidMetal(canvas, opts = {}) {
  const params = { ...LIQUID_METAL_DEFAULTS, ...(opts.params || {}) }
  const isMobile = !!opts.isMobile
  const dprCap = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2)

  let gl = null
  let program = null
  let buffer = null
  let texture = null
  let u = {}
  let lastField = null
  let time = 0
  let lastT = 0
  let running = false
  let wantRun = false
  let disposed = false
  let rafId = 0

  function initGL() {
    gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true })
    if (!gl) throw new Error('WebGL2 unavailable')

    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    gl.deleteShader(vs)
    gl.deleteShader(fs)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('liquidMetal link failed: ' + gl.getProgramInfoLog(program))
    }
    gl.useProgram(program)

    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS)
    u = {}
    for (let i = 0; i < count; i++) {
      const name = gl.getActiveUniform(program, i)?.name
      if (name) u[name] = gl.getUniformLocation(program, name)
    }

    buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    if (u.u_edge) gl.uniform1f(u.u_edge, params.edge) // may be optimized out (unused)
    gl.uniform1f(u.u_patternBlur, params.patternBlur)
    gl.uniform1f(u.u_patternScale, params.patternScale)
    gl.uniform1f(u.u_refraction, params.refraction)
    gl.uniform1f(u.u_liquid, params.liquid)
    gl.uniform1i(u.u_image_texture, 0)
  }

  function uploadField(field) {
    if (!gl || !field) return
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, field.width, field.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, field.data)
    const ratio = field.width / field.height
    gl.useProgram(program)
    gl.uniform1f(u.u_ratio, ratio)
    gl.uniform1f(u.u_img_ratio, ratio)
  }

  function setField(field) {
    lastField = field
    uploadField(field)
  }

  function resize() {
    if (!gl) return
    const cssW = canvas.clientWidth
    const cssH = Math.max(1, canvas.clientHeight)
    const bw = Math.max(1, Math.round(cssW * dprCap))
    const bh = Math.max(1, Math.round(cssH * dprCap))
    if (canvas.width !== bw || canvas.height !== bh) {
      canvas.width = bw
      canvas.height = bh
    }
    gl.viewport(0, 0, bw, bh)
  }

  function frame(now) {
    if (disposed) return
    rafId = requestAnimationFrame(frame)
    const dt = now - lastT
    lastT = now
    time += dt * params.speed
    gl.useProgram(program)
    gl.uniform1f(u.u_time, time)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  function start() {
    if (running || disposed || !gl) return
    running = true
    lastT = performance.now()
    rafId = requestAnimationFrame(frame)
  }
  function stop() {
    running = false
    cancelAnimationFrame(rafId)
  }
  function setRunning(r) {
    wantRun = r
    if (r && !document.hidden) start()
    else stop()
  }

  const onVisibility = () => {
    if (document.hidden) stop()
    else if (wantRun) start()
  }
  const onContextLost = (e) => {
    e.preventDefault()
    stop()
  }
  const onContextRestored = () => {
    if (disposed) return
    try {
      initGL()
      resize()
      if (lastField) uploadField(lastField)
      if (wantRun && !document.hidden) start()
    } catch { /* stays dark; caller keeps the DOM fallback visible */ }
  }

  document.addEventListener('visibilitychange', onVisibility)
  canvas.addEventListener('webglcontextlost', onContextLost, false)
  canvas.addEventListener('webglcontextrestored', onContextRestored, false)

  initGL()

  function dispose() {
    disposed = true
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.removeEventListener('webglcontextrestored', onContextRestored)
    if (gl) {
      if (texture) gl.deleteTexture(texture)
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
    }
    // No forceContextLoss(): React reuses this canvas on StrictMode remount.
    gl = null
    texture = null
    buffer = null
    program = null
  }

  return { setField, setRunning, resize, dispose }
}
