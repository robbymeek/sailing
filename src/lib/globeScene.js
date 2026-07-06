import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
// Camera primitives + the earth itself come from buildEarth so this globe and
// the home orb→globe morph are identical (seamless transition between them).
import { FOV, SUN_WORLD, fitCameraZ, latLngToVector3, quaternionForPoint, buildEarth } from './buildEarth'

// Plain-JS three.js scene for the The Road globe tour. No React in here:
// the page hands us a flat list of frames (one orientation per waypoint), the
// chapter-tour SEGMENTS table (typed segments with plain-data pose
// descriptors, resolved to quaternions ONCE here), and a getProgress()
// callback; we run one rAF loop that reads scroll progress every frame.
// Everything rendered is a pure function of that progress struct — scrubbing
// backwards replays chapter pops, ripples, the recap spin and the route pulse
// in reverse. No per-frame allocations in the loop.

const ARC_SAMPLES = 128

// scratch objects for the render loop (never allocate in frame())
const _yawQ = new THREE.Quaternion()
const _v = new THREE.Vector3()
const _va = new THREE.Vector3()
const Y_AXIS = new THREE.Vector3(0, 1, 0)
const Z_AXIS = new THREE.Vector3(0, 0, 1)

// pin looks: GHOST = future stop (the journey ahead reads faintly on the globe),
// ACTIVE = current chapter, VISITED = landed (warm-tinted, arcs lit behind it)
const PIN_GHOST = { scale: 0.55, glow: 0.12, core: 0.35 }
const PIN_ACTIVE = { scale: 1.0, glow: 0.55, core: 1.0 }
const PIN_VISITED = { scale: 0.8, glow: 0.4, core: 0.9 }
const C_PIN_BLUE = new THREE.Color(0x3a66ff)
const C_PIN_WARM = new THREE.Color(0xffc9a0)

// ---------- math ---------- (globe-specific helpers; the shared earth/camera
// math lives in ./buildEarth)

function slerpVec(a, b, t) {
  const omega = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
  if (omega < 1e-6) return a.clone()
  const so = Math.sin(omega)
  return a
    .clone()
    .multiplyScalar(Math.sin((1 - t) * omega) / so)
    .add(b.clone().multiplyScalar(Math.sin(t * omega) / so))
    .normalize()
}

function easeInOut(t) {
  return t * t * (3 - 2 * t)
}

function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Soft radial-gradient sprite texture for pin glows.
function makeGlowTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

// ---------- factory ----------
// frames: [{ lat, lng, isFinale, chapter, keyArrival }] (one per waypoint, in tour order)
// tour:   { segments, chapterPoses, landY } — the page's choreography table
export default function createGlobeScene(canvas, frames, { isMobile, baseUrl, onReady, getProgress, seamless = false, tour }) {
  // Prefer the discrete GPU, but retry with the default adapter if a config
  // refuses 'high-performance' (mirrors glassOrbScene), so a refusal degrades to a
  // working globe rather than the static timeline.
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true })
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2))
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

  // anchor carries the screen-position offset (globe sits left of the content
  // on desktop, above it on mobile); the inner globe group carries the
  // scroll-driven rotation so the atmosphere doesn't need to rotate.
  //
  // ENTRY_OFFSET is the orb morph's END pose and MUST stay byte-identical to
  // glassOrbScene's baseOffset, or the seamless orb→globe hand-off pops. The
  // globe boots here (full size) so the crossfade lands matched, then eases to
  // its confined RESTING pose — pushed hard left (desktop) / high (mobile) and
  // shrunk via anchor.scale (globe-only: leaves the shared camera fit and the
  // home orb untouched) so page text never overlaps it. The ease is time-based
  // (see frame()), never encoded in scrollY, so direct loads / reverse-scrub
  // rest at the confined pose instantly.
  const anchor = new THREE.Group()
  const ENTRY_OFFSET = isMobile ? new THREE.Vector3(0, 0.4, 0) : new THREE.Vector3(-0.55, 0, 0)
  const restOffset = isMobile ? new THREE.Vector3(0, 1.05, 0) : new THREE.Vector3(-0.95, 0, 0)
  const REST_SCALE = isMobile ? 0.6 : 0.56
  anchor.position.copy(ENTRY_OFFSET)
  scene.add(anchor)

  const globe = new THREE.Group()
  anchor.add(globe)

  // ---------- earth + atmosphere + lights ---------- (shared with the home orb
  // morph via buildEarth, so the two globes render identically). The earth spins
  // inside `globe`; the atmosphere stays put on `anchor`.
  const { earth, atmosphere, atmosMat, uSunDirView, manager, sun, ambient } = buildEarth(
    renderer,
    { baseUrl, isMobile }
  )
  scene.add(sun)
  scene.add(ambient)
  globe.add(earth)
  anchor.add(atmosphere)

  // ---------- starfield ----------
  const starCount = isMobile ? 900 : 1500
  const starPositions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount; i++) {
    // uniform direction via normalized gaussian-ish sampling
    const v = new THREE.Vector3(
      Math.random() * 2 - 1,
      Math.random() * 2 - 1,
      Math.random() * 2 - 1
    )
    if (v.lengthSq() < 1e-4) v.set(0, 0, 1)
    v.normalize().multiplyScalar(40 + Math.random() * 20)
    starPositions.set([v.x, v.y, v.z], i * 3)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  })
  scene.add(new THREE.Points(starGeo, starMat))

  // ---------- pins ---------- (one per frame/waypoint)
  const glowTex = makeGlowTexture()
  const pinGeo = new THREE.SphereGeometry(0.011, 16, 16)
  const pins = frames.map((fr) => {
    const isFinale = !!fr.isFinale
    const core = new THREE.Mesh(
      pinGeo,
      // transparent so the seamless intro can fade the pins in after the globe
      new THREE.MeshBasicMaterial({ color: isFinale ? 0xffe9b0 : 0xeaf0ff, transparent: true })
    )
    core.position.copy(latLngToVector3(fr.lat, fr.lng, 1.004))

    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: isFinale ? 0xffd87a : 0x3a66ff,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.5,
      })
    )
    glow.position.copy(latLngToVector3(fr.lat, fr.lng, 1.02))
    const glowScale = isFinale ? 0.11 : 0.075
    glow.scale.setScalar(glowScale)

    globe.add(core)
    globe.add(glow)
    return { core, glow, glowScale }
  })

  // ---------- arcs ---------- (great-circle hop between consecutive frames)
  // Line2 gives real, resolution-aware thickness (plain GL lines are 1px on
  // most platforms). One shared material; each arc draws on progressively by
  // limiting its instanced segment count.
  const arcMaterial = new LineMaterial({
    color: 0x2f6bff,
    linewidth: 2.6, // screen-space pixels
    transparent: true,
    opacity: 0.92,
  })
  arcMaterial.resolution.set(canvas.clientWidth, Math.max(1, canvas.clientHeight))
  const arcs = []
  for (let i = 0; i < frames.length - 1; i++) {
    const a = latLngToVector3(frames[i].lat, frames[i].lng, 1).normalize()
    const b = latLngToVector3(frames[i + 1].lat, frames[i + 1].lng, 1).normalize()
    const angle = Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1))
    const positions = []
    for (let k = 0; k <= ARC_SAMPLES; k++) {
      const t = k / ARC_SAMPLES
      const altitude = 1 + 0.16 * Math.sin(Math.PI * t) * (angle / Math.PI + 0.3)
      const p = slerpVec(a, b, t).multiplyScalar(altitude)
      positions.push(p.x, p.y, p.z)
    }
    const geo = new LineGeometry()
    geo.setPositions(positions)
    geo.instanceCount = 0
    const line = new Line2(geo, arcMaterial)
    line.frustumCulled = false
    globe.add(line)
    arcs.push({ line, geo, segCount: ARC_SAMPLES, a, b, angle })
  }

  // exact point on arc i at parameter t (same altitude profile as the line),
  // written into `out` — the loop calls this up to 7×/frame (dot + wake)
  function arcPointInto(i, t, out) {
    const m = arcs[i]
    const altitude = 1 + 0.16 * Math.sin(Math.PI * t) * (m.angle / Math.PI + 0.3)
    if (m.angle < 1e-6) return out.copy(m.a).multiplyScalar(altitude)
    const so = Math.sin(m.angle)
    out.copy(m.a).multiplyScalar(Math.sin((1 - t) * m.angle) / so)
    _va.copy(m.b).multiplyScalar(Math.sin(t * m.angle) / so)
    return out.add(_va).normalize().multiplyScalar(altitude)
  }

  // ---------- recap route pulse ---------- one Line2 concatenating every arc,
  // dashed with a single bright dash (gap = whole route) whose offset sweeps the
  // full path during the recap — a light running the entire two-year route.
  const routePts = []
  for (let i = 0; i < arcs.length; i++) {
    for (let k = i === 0 ? 0 : 1; k <= ARC_SAMPLES; k++) {
      const t = k / ARC_SAMPLES
      const altitude = 1 + 0.16 * Math.sin(Math.PI * t) * (arcs[i].angle / Math.PI + 0.3)
      routePts.push(slerpVec(arcs[i].a, arcs[i].b, t).multiplyScalar(altitude))
    }
  }
  let routeLen = 0
  for (let k = 1; k < routePts.length; k++) routeLen += routePts[k].distanceTo(routePts[k - 1])
  const routeGeo = new LineGeometry()
  routeGeo.setPositions(routePts.flatMap((p) => [p.x, p.y, p.z]))
  const routePulseMat = new LineMaterial({
    color: 0x9db9ff,
    linewidth: 3.4,
    transparent: true,
    opacity: 0.95,
    dashed: true,
    dashSize: 0.5,
    gapSize: Math.max(1, routeLen), // exactly one dash exists on the whole route
    depthWrite: false,
  })
  routePulseMat.blending = THREE.AdditiveBlending
  routePulseMat.resolution.set(canvas.clientWidth, Math.max(1, canvas.clientHeight))
  const routePulse = new Line2(routeGeo, routePulseMat)
  routePulse.computeLineDistances()
  routePulse.frustumCulled = false
  routePulse.visible = false
  globe.add(routePulse)

  // ---------- traveling dot ---------- (rides the current arc between stops)
  const travelDot = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: glowTex,
      color: 0xdfeaff,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    })
  )
  globe.add(travelDot)
  const travelCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.006, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
  )
  globe.add(travelCore)

  // ---------- travel-dot wake ---------- short fading trail sampled behind the
  // dot along the current arc (stateless — a pure function of arcT).
  const wake = Array.from({ length: 5 }, () => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color: 0x9fc0ff,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0,
      })
    )
    s.scale.setScalar(0.03)
    globe.add(s)
    return s
  })

  // ---------- arrival ripples ---------- pooled expanding rings on the globe
  // surface. Timing is a closed form of absolute scroll (landY per frame), so a
  // reverse scrub plays each ripple backwards. Pool of 6: consecutive landings
  // can overlap, but pool index (frame % 6) never collides within a window.
  const rippleGeo = new THREE.RingGeometry(0.9, 1.0, 48)
  const ripplePool = Array.from({ length: 6 }, () => {
    const m = new THREE.Mesh(
      rippleGeo,
      new THREE.MeshBasicMaterial({
        color: 0x8fb4ff,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    m.visible = false
    globe.add(m)
    return m
  })
  const pinPos = frames.map((fr) => latLngToVector3(fr.lat, fr.lng, 1.006))
  const pinNorm = frames.map((fr) => {
    const n = latLngToVector3(fr.lat, fr.lng, 1).normalize()
    return new THREE.Quaternion().setFromUnitVectors(Z_AXIS, n)
  })
  function showRipple(i, r) {
    const ring = ripplePool[i % ripplePool.length]
    ring.visible = true
    ring.position.copy(pinPos[i])
    ring.quaternion.copy(pinNorm[i])
    ring.scale.setScalar(0.02 + 0.12 * (1 - (1 - r) * (1 - r)))
    ring.material.opacity = 0.85 * (1 - r) * smoothstep(0, 0.15, r)
  }

  // ---------- per-frame orientations + segment pose table ----------
  const quats = frames.map((f) => quaternionForPoint(f.lat, f.lng))
  // Opening view: mid-Pacific, so the hero scroll sweeps east into frame 0.
  const heroQuat = quaternionForPoint(10, -170)
  globe.quaternion.copy(heroQuat)

  // Resolve the page's plain-data pose descriptors to quaternions ONCE — the
  // loop then just slerps segQFrom[k] → segQTo[k] by the segment's own ease.
  const segments = tour ? tour.segments : []
  const landY = tour ? tour.landY : null
  const chapterQuats = (tour ? tour.chapterPoses : []).map((cp) => quaternionForPoint(cp.lat, cp.lng))
  const resolvePose = (d) => (d.k === 'hero' ? heroQuat : d.k === 'chapter' ? chapterQuats[d.c] : quats[d.i])
  const segQFrom = segments.map((s) => resolvePose(s.poseFrom))
  const segQTo = segments.map((s) => resolvePose(s.poseTo))

  // chapter membership (constellation pop order during the interstitials)
  const chapterCounts = []
  const chapterFrames = []
  const frameChapterOrder = frames.map((fr, i) => {
    const c = fr.chapter || 0
    const order = chapterCounts[c] || 0
    chapterCounts[c] = order + 1
    ;(chapterFrames[c] = chapterFrames[c] || []).push(i)
    return order
  })

  // ---------- render loop ----------
  const last = frames.length - 1
  let rafId = 0
  let running = false
  let disposed = false
  let startedAt = 0 // seconds at first start() — anchors the seamless pin fade-in
  const t0 = performance.now()

  function frame() {
    rafId = requestAnimationFrame(frame)
    const p = getProgress()
    const seg = segments[p.segIndex]
    const travel = p.mode === 'leg' || p.mode === 'hop' || p.mode === 'finale-leg'
    const lit = p.mode === 'recap' || p.mode === 'finale' // whole journey lit

    // orientation: slerp the active segment's pose endpoints. Chapter intros
    // settle early (the overview holds while the pins pop); travel segments ride
    // the eased arc progress; the recap holds its pose and adds a full-turn yaw
    // about screen-vertical (premultiply = world space, so north stays up —
    // spinT is exactly 0/1 at the recap edges, keeping both boundaries seamless).
    const orientT =
      p.mode === 'hero' ? easeInOut(p.segT)
        : p.mode === 'chapter' ? smoothstep(0, 0.4, p.segT)
          : p.mode === 'recap' || p.mode === 'finale' ? 1
            : p.arcT
    globe.quaternion.slerpQuaternions(segQFrom[p.segIndex], segQTo[p.segIndex], orientT)
    if (p.spinT > 0) {
      _yawQ.setFromAxisAngle(Y_AXIS, Math.PI * 2 * p.spinT)
      globe.quaternion.premultiply(_yawQ)
    }

    // arcs: behind the frontier fully drawn, the current hop animating in
    // (instanced segment count = progressive draw for Line2). During the recap
    // arcIdx = F-2, so the whole travelled route is lit and only the final
    // (untravelled) leg to LA stays dark until the finale-leg draws it.
    for (let i = 0; i < arcs.length; i++) {
      arcs[i].geo.instanceCount =
        p.arcIdx > i ? arcs[i].segCount : p.arcIdx === i ? Math.floor(p.arcT * arcs[i].segCount) : 0
    }

    // recap route pulse: one bright dash sweeping the entire route
    const pulseOn = p.mode === 'recap' && p.pulseT > 0.005 && p.pulseT < 0.995
    routePulse.visible = pulseOn
    if (pulseOn) routePulseMat.dashOffset = -routeLen * p.pulseT

    // ---------- pins: GHOST (future) / ACTIVE (current chapter) / VISITED ----------
    const t = (performance.now() - t0) / 1000
    // seamless intro: hold the dots invisible, then fade them in ~0.45s AFTER the
    // globe has settled (so the orb→globe handoff lands on a clean globe first).
    const pinIntro = seamless
      ? smoothstep(startedAt + 0.45, startedAt + 1.15, performance.now() / 1000)
      : 1
    // the destination pin lights early, as the dot nears it (~0.75)
    const active = p.mode === 'finale' ? last : travel && p.arcT >= 0.75 ? p.arcIdx + 1 : -1
    for (let i = 0; i < pins.length; i++) {
      const fr = frames[i]
      const pin = pins[i]
      const v = Math.min(1, Math.max(0, p.frontier + 1 - i)) // visited-ness
      let scale
      let glowOp
      let coreOp
      let warm = 0
      if (v > 0) {
        scale = PIN_ACTIVE.scale + (PIN_VISITED.scale - PIN_ACTIVE.scale) * v
        glowOp = PIN_ACTIVE.glow + (PIN_VISITED.glow - PIN_ACTIVE.glow) * v
        coreOp = PIN_ACTIVE.core + (PIN_VISITED.core - PIN_ACTIVE.core) * v
        warm = 0.35 * v
      } else if (fr.chapter === p.chapterIdx) {
        if (p.mode === 'chapter' && fr.chapter === seg.c) {
          // constellation pop: staggered, overshooting, fully reversible
          const n = chapterCounts[seg.c]
          const s0 = 0.35 + 0.45 * (n > 1 ? frameChapterOrder[i] / (n - 1) : 0)
          const popT = smoothstep(s0, s0 + 0.18, p.chapterCardT)
          const pop = popT * (1 + 0.3 * Math.sin(Math.PI * popT))
          scale = PIN_GHOST.scale + (PIN_ACTIVE.scale - PIN_GHOST.scale) * pop
          glowOp = PIN_GHOST.glow + (PIN_ACTIVE.glow - PIN_GHOST.glow) * popT
          coreOp = PIN_GHOST.core + (PIN_ACTIVE.core - PIN_GHOST.core) * popT
        } else {
          scale = PIN_ACTIVE.scale
          glowOp = PIN_ACTIVE.glow
          coreOp = PIN_ACTIVE.core
        }
      } else {
        scale = PIN_GHOST.scale
        glowOp = PIN_GHOST.glow
        coreOp = PIN_GHOST.core
      }
      if (lit) {
        // the "totally travelled place": every pin bright for the recap + finale
        glowOp = Math.max(glowOp, 0.5)
        coreOp = Math.max(coreOp, 0.9)
        scale = Math.max(scale, PIN_VISITED.scale)
      }
      const isActive = i === active
      const pulse = isActive
        ? 1.35 + 0.25 * Math.sin(t * 3.5)
        : fr.isFinale && p.mode === 'recap'
          ? 1.15 + 0.15 * Math.sin(t * 2.2) // LA beacons through the recap
          : 1
      if (isActive) glowOp = 0.95
      const keyMul = fr.keyArrival ? 1.18 : 1
      pin.glow.scale.setScalar(pin.glowScale * scale * keyMul * pulse)
      pin.core.scale.setScalar(scale * keyMul)
      pin.glow.material.opacity = glowOp * pinIntro
      pin.core.material.opacity = coreOp * pinIntro
      // visited pins warm from circuit blue toward harbor amber (finale stays gold)
      if (!fr.isFinale) pin.glow.material.color.lerpColors(C_PIN_BLUE, C_PIN_WARM, warm)
    }

    // ---------- arrival ripples ---------- (closed form of absolute scroll)
    for (let i = 0; i < ripplePool.length; i++) ripplePool[i].visible = false
    if (landY) {
      if (p.mode === 'chapter') {
        // constellation pops ring the surface as each pin lands in the overview
        const members = chapterFrames[seg.c] || []
        for (let k = 0; k < members.length; k++) {
          const i = members[k]
          if (p.frontier + 1 - i > 0) continue // already visited — no pop ripple
          const n = chapterCounts[seg.c]
          const s0 = 0.35 + 0.45 * (n > 1 ? frameChapterOrder[i] / (n - 1) : 0)
          const rT = (p.chapterCardT - s0) / 0.25
          if (rT > 0 && rT < 1) showRipple(i, rT)
        }
      } else {
        // landing ripples around the frontier: expand + fade over 0.38 vh-units
        const lo = Math.max(0, p.arcIdx - 1)
        const hi = Math.min(frames.length - 1, p.arcIdx + 2)
        for (let d = lo; d <= hi; d++) {
          const r = (p.y - (landY[d] - 0.1)) / 0.38
          if (r > 0 && r < 1) showRipple(d, r)
        }
      }
    }

    // ---------- traveling dot + wake ----------
    let dotOp = 0
    if (travel && p.arcIdx >= 0) {
      const m = arcs[p.arcIdx]
      if (m && m.angle > 0.012) {
        arcPointInto(p.arcIdx, p.arcT, _v)
        travelDot.position.copy(_v)
        travelCore.position.copy(_v)
        dotOp = Math.min(smoothstep(0.03, 0.12, p.arcT), 1 - smoothstep(0.88, 0.99, p.arcT))
      }
    }
    travelDot.material.opacity = dotOp
    travelCore.material.opacity = dotOp
    travelDot.scale.setScalar(0.05 + 0.012 * Math.sin(t * 6))
    for (let k = 0; k < wake.length; k++) {
      const w = wake[k]
      const tk = p.arcT - (k + 1) * 0.035
      if (dotOp > 0 && tk > 0) {
        arcPointInto(p.arcIdx, tk, _v)
        w.position.copy(_v)
        w.material.opacity = dotOp * 0.5 * (1 - (k + 1) / (wake.length + 1))
        w.scale.setScalar(0.045 * (1 - (k + 1) / (wake.length + 2)))
      } else {
        w.material.opacity = 0
      }
    }

    // ---------- camera: per-segment zoom × finale dolly; recentre + confine ----------
    const f = easeInOut(p.finaleT)
    camera.position.z = baseZ * (p.zoom || 1) * (1 - 0.27 * f)
    const c = Math.max(p.center || 0, f)
    // Confined resting pose (small + hard left/high), eased in from the orb's
    // morph-end pose only on a seamless arrival — the tween is time-based off
    // startedAt (never in scrollY), so reverse-scrub and direct loads sit at
    // rest with entryT=1. As the recap/finale recentre (c→1) the globe grows
    // back to full + centred so the LA 2028 climax fills the frame.
    const entryT = seamless
      ? smoothstep(startedAt + 0.35, startedAt + 1.25, performance.now() / 1000)
      : 1
    const restX = restOffset.x * (1 - c)
    const restY = restOffset.y * (1 - c)
    anchor.position.set(
      ENTRY_OFFSET.x + (restX - ENTRY_OFFSET.x) * entryT,
      ENTRY_OFFSET.y + (restY - ENTRY_OFFSET.y) * entryT,
      0
    )
    const restScaleNow = REST_SCALE + (1 - REST_SCALE) * c
    anchor.scale.setScalar(1 + (restScaleNow - 1) * entryT)
    atmosMat.uniforms.uIntensity.value =
      1 + 1.2 * p.finaleT + (p.mode === 'recap' ? 0.3 * Math.sin(Math.PI * p.recapT) : 0)

    // night-lights mask needs the sun direction in view space
    camera.updateMatrixWorld()
    uSunDirView.value.copy(SUN_WORLD).transformDirection(camera.matrixWorldInverse)

    renderer.render(scene, camera)
  }

  function start() {
    if (running || disposed) return
    if (!startedAt) startedAt = performance.now() / 1000
    running = true
    rafId = requestAnimationFrame(frame)
  }

  function stop() {
    running = false
    cancelAnimationFrame(rafId)
  }

  const onVisibility = () => {
    if (document.hidden) stop()
    else if (texturesReady) start()
  }
  document.addEventListener('visibilitychange', onVisibility)

  let texturesReady = false
  manager.onLoad = () => {
    if (disposed) return
    texturesReady = true
    if (onReady) onReady()
    start()
  }

  // WebGL context loss/restore (iOS Safari drops contexts under memory pressure):
  // preventDefault to allow restoration, pause the loop while gone, resume on return.
  const onContextLost = (e) => { e.preventDefault(); stop() }
  const onContextRestored = () => { if (texturesReady && !disposed && !document.hidden) start() }
  canvas.addEventListener('webglcontextlost', onContextLost, false)
  canvas.addEventListener('webglcontextrestored', onContextRestored, false)

  function resize() {
    const w = canvas.clientWidth
    const h = Math.max(1, canvas.clientHeight)
    camera.aspect = w / h
    baseZ = fitCameraZ(camera.aspect)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    arcMaterial.resolution.set(w, h)
    routePulseMat.resolution.set(w, h)
  }

  function dispose() {
    disposed = true
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
    canvas.removeEventListener('webglcontextlost', onContextLost)
    canvas.removeEventListener('webglcontextrestored', onContextRestored)
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose()
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
        for (const m of mats) {
          for (const key of ['map', 'bumpMap', 'specularMap', 'emissiveMap']) {
            if (m[key]) m[key].dispose()
          }
          m.dispose()
        }
      }
    })
    glowTex.dispose()
    // No forceContextLoss() here: React StrictMode re-runs the mount effect
    // on the SAME canvas in dev, and a force-lost context can't be recreated
    // on that element. dispose() frees the GPU resources; the context itself
    // is reclaimed with the canvas node on unmount.
    renderer.dispose()
  }

  return { resize, dispose }
}
