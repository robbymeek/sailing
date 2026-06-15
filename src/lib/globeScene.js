import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
// Camera primitives + the earth itself come from buildEarth so this globe and
// the home orb→globe morph are identical (seamless transition between them).
import { FOV, SUN_WORLD, fitCameraZ, latLngToVector3, quaternionForPoint, buildEarth } from './buildEarth'

// Plain-JS three.js scene for the Coming Soon globe tour. No React in here:
// the page hands us a flat list of frames (one orientation per waypoint) plus
// a getProgress() callback, and we run one rAF loop that reads scroll
// progress every frame. A "stop" with several waypoints (e.g. an Australia
// training block hopping Adelaide → Perth → Sydney) is just several frames.

const ARC_SAMPLES = 128

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
// frames: [{ lat, lng, isFinale }]  (one per waypoint, in tour order)
export default function createGlobeScene(canvas, frames, { isMobile, baseUrl, onReady, getProgress, seamless = false }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  })
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

  // anchor carries the screen-position offset (globe sits left of the cards
  // on desktop, above the card on mobile); the inner globe group carries the
  // scroll-driven rotation so the atmosphere doesn't need to rotate.
  const anchor = new THREE.Group()
  const baseOffset = isMobile ? new THREE.Vector3(0, 0.4, 0) : new THREE.Vector3(-0.55, 0, 0)
  anchor.position.copy(baseOffset)
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

  // exact point on arc i at parameter t (same altitude profile as the line)
  function arcPoint(i, t) {
    const m = arcs[i]
    const altitude = 1 + 0.16 * Math.sin(Math.PI * t) * (m.angle / Math.PI + 0.3)
    return slerpVec(m.a, m.b, t).multiplyScalar(altitude)
  }

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

  // ---------- per-frame orientations ----------
  const quats = frames.map((f) => quaternionForPoint(f.lat, f.lng))
  // Opening view: mid-Pacific, so the hero scroll sweeps east into frame 0.
  const heroQuat = quaternionForPoint(10, -170)
  globe.quaternion.copy(heroQuat)

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

    // orientation
    if (p.heroT < 1) {
      globe.quaternion.slerpQuaternions(heroQuat, quats[0], easeInOut(p.heroT))
    } else if (p.fi >= last) {
      globe.quaternion.copy(quats[last])
    } else {
      globe.quaternion.slerpQuaternions(quats[p.fi], quats[p.fi + 1], p.moveT)
    }

    // arcs: behind us fully drawn, the current hop animating in (instanced
    // segment count = progressive draw for Line2)
    for (let i = 0; i < arcs.length; i++) {
      arcs[i].geo.instanceCount =
        p.fi > i ? arcs[i].segCount : p.fi === i ? Math.floor(p.moveT * arcs[i].segCount) : 0
    }

    // pins: the destination only lights up as the dot nears it (~0.75), so the
    // glow "arrives" with the dot rather than at the travel midpoint.
    const t = (performance.now() - t0) / 1000
    // seamless intro: hold the dots invisible, then fade them in ~0.45s AFTER the
    // globe has settled (so the orb→globe handoff lands on a clean globe first).
    const pinIntro = seamless
      ? smoothstep(startedAt + 0.45, startedAt + 1.15, performance.now() / 1000)
      : 1
    const active =
      p.heroT < 1 ? -1 : p.fi >= last ? last : p.moveT < 0.75 ? p.fi : p.fi + 1
    for (let i = 0; i < pins.length; i++) {
      const isActive = i === active
      const pulse = isActive ? 1.35 + 0.25 * Math.sin(t * 3.5) : 1
      pins[i].glow.scale.setScalar(pins[i].glowScale * pulse)
      pins[i].glow.material.opacity = (isActive ? 0.95 : 0.45) * pinIntro
      pins[i].core.material.opacity = pinIntro
    }

    // traveling dot: rides arc `fi` from the current stop toward the next,
    // fading out right as it reaches the destination pin.
    let dotOp = 0
    if (p.heroT >= 1 && p.fi < last) {
      const m = arcs[p.fi]
      if (m && m.angle > 0.012) {
        const pos = arcPoint(p.fi, p.moveT)
        travelDot.position.copy(pos)
        travelCore.position.copy(pos)
        dotOp = Math.min(smoothstep(0.03, 0.12, p.moveT), 1 - smoothstep(0.88, 0.99, p.moveT))
      }
    }
    travelDot.material.opacity = dotOp
    travelCore.material.opacity = dotOp
    travelDot.scale.setScalar(0.05 + 0.012 * Math.sin(t * 6))

    // finale: zoom in, recenter, brighten the atmosphere
    const f = easeInOut(p.finaleT)
    camera.position.z = baseZ * (1 - 0.27 * f)
    anchor.position.set(baseOffset.x * (1 - f), baseOffset.y * (1 - f), 0)
    atmosMat.uniforms.uIntensity.value = 1 + 1.2 * p.finaleT

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

  function resize() {
    const w = canvas.clientWidth
    const h = Math.max(1, canvas.clientHeight)
    camera.aspect = w / h
    baseZ = fitCameraZ(camera.aspect)
    camera.updateProjectionMatrix()
    renderer.setSize(w, h, false)
    arcMaterial.resolution.set(w, h)
  }

  function dispose() {
    disposed = true
    stop()
    document.removeEventListener('visibilitychange', onVisibility)
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
