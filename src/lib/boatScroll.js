// Choreography for the /boat "ONE SAIL" experience. No three import — this is
// the same contract as TheRoad's SEGMENTS table: computeBoatScroll() is a pure
// closed form of window.scrollY that mutates ONE module-level struct P (no
// per-frame allocation). Reverse scrolling replays every act pixel-perfect;
// anything time-based lives in the scene as cosmetic zero-mean garnish only.
//
// The scroll axis is normalized t (0..1 over the whole runway). Act boundaries:
//   A1 THE LINE      0.00  sail-edge close-up resolves into the silhouette
//   A2 THE MACHINE   0.08  gallery orbit, manifesto lines
//   A3 THE ANATOMY   0.20  exploded view + camera fly-through of the gap
//   A4 THE PLATING   0.34  waterline light sweeps the boat black -> chrome
//   A5 THE RECORD    0.50  trophy orbit, résumé stats at depth
//   A6 THE SPRAY     0.66  boat atomizes; particles become "LA 2028"
//   A7 LA 2028       0.80  DOM headline owns the page; mini silhouette returns
//   A8 THE HANDOFF   0.92  CTAs
export const ACT = {
  A2: 0.08, A3: 0.2, A4: 0.34, A5: 0.5, A6: 0.66, A7: 0.8, A8: 0.92,
}

// Geometry constants baked by scripts/export-boat.py (hull length = 1, y0 = waterline).
export const KEEL_Y = -0.011
export const TIP_Y = 1.571
export const DECK_Y = 0.047

// Runway: TOTAL_VH of document height => (TOTAL_VH/100 - 1) viewport-heights of travel.
export function totalVh(isMobile) {
  return isMobile ? 1050 : 1250
}
// Document top (in vh) that puts an element's center at screen center when scroll t = frac.
export function centerVh(frac, isMobile) {
  return frac * (totalVh(isMobile) - 100) + 50
}

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x
}
function seg(t, a, b) {
  return clamp01((t - a) / (b - a))
}
function ss(x) {
  return x * x * (3 - 2 * x)
}
function lerp(a, b, x) {
  return a + (b - a) * x
}
// smooth bump: 0 at both edges, 1 mid — for glints and light pulses
function bump(t, a, b) {
  const x = seg(t, a, b)
  return Math.sin(Math.PI * x) ** 2
}

// Camera keys. Radii get multiplied by P.am (aspect compensation) so the boat
// stays framed on narrow viewports; heights/targets don't need it.
const C1a = [0.55, 0.98, 0.42] // sail-edge close-up
const T1a = [0.02, 0.95, 0.1]
// Whole-boat framing: the sculpture is 1.58 units tall, so full-boat shots
// need ~2.0 units of vertical coverage (FOV 38 → distance ≥ ~2.9) with the
// target near the boat's vertical centre (~0.72), or the sail tip crops.
const R1b = 3.0 // A1 end / A2 orbit radius
const ORBIT_END = (80 * Math.PI) / 180 // A2 sweep
const F0 = [1.7, 0.7, 1.25] // fly-through bezier (desktop only)
const F1 = [0, 0.55, 0]
const F2 = [-1.7, 0.7, -1.25]
const C4a = [3.2, 0.3, 0.65] // waterline framing (low, but whole boat in frame)
const C4b = [2.9, 0.3, 0.5]
const T4 = [0, 0.6, 0]
const C5a = [2.6, 1.5, 2.0] // 3/4 aerial hero
const C5b = [2.45, 1.4, 1.85]
const T5 = [0, 0.7, 0]
export const C6 = [0.7, 1.5, -2.5] // astern-high, holds through A6-A8
export const T6 = [0, 1.0, 0]
const M3 = [2.2, 0.8, 1.3] // mobile fixed 3/4 view for A3 (no fly-through)

export const P = {
  t: 0,
  am: 1, // aspect multiplier for camera radii (set by setViewport)
  isMobile: false,
  // camera
  camX: 0, camY: 0, camZ: 0, tgtX: 0, tgtY: 0, tgtZ: 0,
  // boat rig
  boatYaw: 0, sailLift: 0, hullYaw: 0, boatRise: 0,
  boatScale: 1, boatOpacity: 1, silhouette: 0,
  // plating
  lineY: -10, lineGlow: 0, contactGlint: 0, tipGlint: 0, envI: 0,
  // dissolve / transmutation
  dissolveT: 0, morphT: 0, particleFade: 1, glyphShift: 0,
  // DOM channels (written to element styles by the page's scroll listener)
  headlineFade: 0, bgLift: 0,
  // lights
  rim1: 1, rim2: 0, key: 0, pulse: 0, plate1: 0, plate2: 0,
  boatVisible: true,
}

export function setViewport(w, h, isMobile) {
  // Keep ~1.15 units of horizontal coverage at the reference distance so the
  // boat never crops on narrow aspects (vertical FOV 38deg).
  const aspect = w / Math.max(1, h)
  const needed = 1.67 / aspect / R1b
  P.am = Math.max(1, needed)
  P.isMobile = isMobile
}

function setCam(x, y, z, tx, ty, tz) {
  P.camX = x * P.am
  P.camY = y
  P.camZ = z * P.am
  P.tgtX = tx
  P.tgtY = ty
  P.tgtZ = tz
}

function lerpCam(a, ta, b, tb, x) {
  setCam(
    lerp(a[0], b[0], x), lerp(a[1], b[1], x), lerp(a[2], b[2], x),
    lerp(ta[0], tb[0], x), lerp(ta[1], tb[1], x), lerp(ta[2], tb[2], x)
  )
}

export default function computeBoatScroll() {
  const vh = Math.max(1, window.innerHeight)
  const travel = (totalVh(P.isMobile) / 100 - 1) * vh
  const t = clamp01(window.scrollY / Math.max(1, travel))
  P.t = t

  // ---- defaults each frame (piecewise blocks below override) ----
  P.sailLift = 0
  P.hullYaw = 0
  P.boatRise = 0
  P.boatScale = 1
  P.boatOpacity = 1
  P.silhouette = 0
  P.lineGlow = 0
  P.contactGlint = 0
  P.tipGlint = 0
  P.pulse = 0
  P.plate1 = 0
  P.plate2 = 0
  P.key = 0

  // ---- A1 THE LINE: edge close-up dollies back to the full silhouette ----
  if (t < ACT.A2) {
    const x = ss(seg(t, 0, ACT.A2))
    lerpCam(C1a, T1a, [R1b, 0.6, 0], [0, 0.72, 0], x)
    P.boatYaw = 0
    P.rim1 = 1
    P.rim2 = 0
  } else if (t < ACT.A3) {
    // ---- A2 THE MACHINE: 80deg gallery orbit at deck height ----
    const x = ss(seg(t, ACT.A2, ACT.A3))
    const az = ORBIT_END * x
    setCam(R1b * Math.cos(az), lerp(0.6, 0.8, x), R1b * Math.sin(az), 0, 0.72, 0)
    P.boatYaw = 0
    P.rim1 = 1
    P.rim2 = ss(seg(t, 0.15, 0.185)) // second edge light as the orbit completes
  } else if (t < ACT.A4) {
    // ---- A3 THE ANATOMY: explode, fly the gap, reassemble ----
    P.rim1 = 1
    P.rim2 = 1
    P.key = ss(seg(t, 0.21, 0.24)) * 1.7 // light inside the gap for the fly-through
    // sail lifts 0.20-0.26, holds, reseats 0.30-0.338; hull yaws out and back
    P.sailLift = ss(seg(t, ACT.A3, 0.26)) * (1 - ss(seg(t, 0.3, 0.338)))
    P.hullYaw = P.sailLift * ((15 * Math.PI) / 180)
    // the "clack": rim pulse exactly as the sail seats
    P.pulse = bump(t, 0.335, 0.352)
    // spec plates hang in the gap while it's open
    P.plate1 = ss(seg(t, 0.235, 0.255)) * (1 - ss(seg(t, 0.29, 0.305)))
    P.plate2 = ss(seg(t, 0.25, 0.27)) * (1 - ss(seg(t, 0.295, 0.31)))
    const orbitEndX = R1b * Math.cos(ORBIT_END)
    const orbitEndZ = R1b * Math.sin(ORBIT_END)
    if (P.isMobile) {
      // fixed 3/4 view, no fly-through
      const x = ss(seg(t, ACT.A3, 0.24))
      lerpCam([orbitEndX, 0.8, orbitEndZ], [0, 0.72, 0], M3, [0, 0.75, 0], x)
      if (t >= 0.3) lerpCam(M3, [0, 0.75, 0], C4a, T4, ss(seg(t, 0.3, ACT.A4)))
    } else if (t < 0.24) {
      lerpCam([orbitEndX, 0.8, orbitEndZ], [0, 0.72, 0], F0, [F0[0] - 1.2, F0[1] + 0.7, F0[2] - 0.9], ss(seg(t, ACT.A3, 0.24)))
    } else if (t < 0.3) {
      // quadratic bezier through the hull/sail gap, looking along the tangent
      // with a downward bias so the deck slides past below and the lifted sail
      // fills the top of frame
      const x = ss(seg(t, 0.24, 0.3))
      const u = 1 - x
      const bx = u * u * F0[0] + 2 * u * x * F1[0] + x * x * F2[0]
      const by = u * u * F0[1] + 2 * u * x * F1[1] + x * x * F2[1]
      const bz = u * u * F0[2] + 2 * u * x * F1[2] + x * x * F2[2]
      const dx = 2 * u * (F1[0] - F0[0]) + 2 * x * (F2[0] - F1[0])
      const dy = 2 * u * (F1[1] - F0[1]) + 2 * x * (F2[1] - F1[1])
      const dz = 2 * u * (F1[2] - F0[2]) + 2 * x * (F2[2] - F1[2])
      // head-turn: the gap itself is empty at this FOV — look UP at the lifted
      // sail's inner face through the pass (tangent normalized, or its ~4-unit
      // length dilutes the bias to a few degrees), then TURN BACK toward the
      // boat on the exit half — flowing straight into the reassembly framing.
      const tl = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1
      const back = ss(seg(x, 0.55, 1))
      setCam(
        bx, by, bz,
        lerp(bx + dx / tl, 0, back),
        lerp(by + dy / (tl * 3) + 0.85 - 1.3 * x, 0.5, back),
        lerp(bz + dz / tl, 0, back)
      )
    } else {
      lerpCam(F2, [0, 0.5, 0], C4a, T4, ss(seg(t, 0.3, ACT.A4)))
    }
    P.boatYaw = 0
  } else if (t < ACT.A5) {
    // ---- A4 THE PLATING: the waterline light sweeps black -> chrome ----
    P.boatYaw = 0
    P.rim1 = lerp(1, 0.35, ss(seg(t, 0.39, 0.44)))
    P.rim2 = P.rim1
    P.key = ss(seg(t, 0.44, 0.5)) * 1.1
    if (t < 0.48) {
      lerpCam(C4a, T4, C4b, T4, ss(seg(t, 0.37, 0.46)))
    } else {
      lerpCam(C4b, T4, C5a, T5, ss(seg(t, 0.48, ACT.A5)))
    }
    P.lineGlow = ss(seg(t, 0.365, 0.375)) * (1 - ss(seg(t, 0.465, 0.495)))
    // ignite below the keel -> contact -> flood to past the sail tip
    if (t < 0.39) P.lineY = lerp(-0.22, KEEL_Y, ss(seg(t, 0.37, 0.39)))
    else P.lineY = lerp(KEEL_Y, TIP_Y + 0.08, seg(t, 0.39, 0.462))
    P.contactGlint = bump(t, 0.384, 0.402)
    P.tipGlint = bump(t, 0.455, 0.475)
  } else if (t < ACT.A6) {
    // ---- A5 THE RECORD: trophy orbit, boat yaws 120deg under static strips ----
    const x = seg(t, ACT.A5, ACT.A6)
    lerpCam(C5a, T5, C5b, T5, ss(x))
    P.boatYaw = (120 * Math.PI) / 180 * (x * x * (2.4 - 1.4 * x)) // soft ends, near-linear middle
    P.rim1 = 0.35
    P.rim2 = 0.35
    P.key = 1.1
  } else {
    // ---- A6-A8: exit, transmutation, headline, silhouette ----
    const swing = ss(seg(t, ACT.A6, 0.72))
    lerpCam(C5b, T5, C6, T6, swing)
    P.boatYaw = (120 * Math.PI) / 180
    P.rim1 = lerp(0.35, 0.6, swing) * (1 - ss(seg(t, 0.74, 0.8)))
    P.rim2 = P.rim1 * 0.6
    P.key = 1.1 * (1 - ss(seg(t, 0.7, 0.78)))
    const rise = seg(t, ACT.A6 + 0.02, 0.76)
    P.boatRise = 2.6 * rise * rise // accelerating exit (still a pure f(t))
    P.dissolveT = seg(t, 0.68, 0.78)
    P.morphT = ss(seg(t, 0.72, ACT.A7))
    P.particleFade = 1 - ss(seg(t, 0.815, 0.845))
    P.headlineFade = ss(seg(t, 0.79, 0.815))
    // the glyph cloud rides the scrolling DOM headline (world-units per vh below)
    P.glyphShift = 0
    if (t >= 0.79) {
      const travelVh = totalVh(P.isMobile) - 100
      P.glyphShift = ((t - 0.8) * travelVh) / 100 // in viewport-heights; scene converts
    }
    // A7-A8 mini silhouette returns as a maker's mark (dissolve/erode reset so
    // the mesh renders whole again; the particle cloud is already faded out)
    if (t >= 0.845) {
      P.dissolveT = 0
      P.morphT = 0
      P.silhouette = ss(seg(t, 0.86, 0.9))
      P.boatScale = 0.13
      P.boatOpacity = P.silhouette
      P.boatYaw = (200 * Math.PI) / 180
      P.rim1 = 0.4 * P.silhouette
      P.rim2 = 0
    }
  }

  // chrome state persists once plated (and resets for the silhouette)
  if (t >= ACT.A5 && t < 0.845) P.lineY = TIP_Y + 0.08
  if (t >= 0.845) P.lineY = -10
  // black-on-black needs reflections, not diffuse light: the exploded view gets
  // an "obsidian" sheen (env reflections on the clearcoat) that dies back to
  // matte black just before the plating line ignites
  const obsidian = 0.55 * ss(seg(t, 0.21, 0.24)) * (1 - ss(seg(t, 0.34, 0.375)))
  P.envI = t < 0.39 ? obsidian : lerp(0, 2.2, ss(seg(t, 0.39, 0.46))) * (t >= 0.845 ? 0.15 : 1 - 0.8 * ss(seg(t, 0.74, 0.8)))
  // background lifts to deep blue for the chrome era only
  P.bgLift = ss(seg(t, 0.46, 0.52)) * (1 - ss(seg(t, ACT.A6, 0.74)))
  P.boatVisible = P.dissolveT < 0.999 || t >= 0.845

  return P
}
