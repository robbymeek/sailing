import * as THREE from 'three'
import { Line2 } from 'three/addons/lines/Line2.js'
import { LineGeometry } from 'three/addons/lines/LineGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'

// Plain-JS three.js scene for the Coming Soon globe tour. No React in here:
// the page hands us a flat list of frames (one orientation per waypoint) plus
// a getProgress() callback, and we run one rAF loop that reads scroll
// progress every frame. A "stop" with several waypoints (e.g. an Australia
// training block hopping Adelaide → Perth → Sydney) is just several frames.

const SUN_WORLD = new THREE.Vector3(-2, 0.6, 1.5).normalize()
const ARC_SAMPLES = 128
const FOV = 38

// ---------- math ----------

// Matches SphereGeometry's default UV layout: equirectangular seam at
// lng ±180, texture left edge = -180.
function latLngToVector3(lat, lng, radius = 1) {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Globe orientation that puts the waypoint dead-center facing the camera (+Z)
// with north up. Built from an explicit basis so there's no roll, which a
// naive setFromUnitVectors would introduce.
function quaternionForPoint(lat, lng) {
  const f = latLngToVector3(lat, lng, 1).normalize()
  const north = new THREE.Vector3(0, 1, 0)
  const u = north.clone().addScaledVector(f, -north.dot(f)).normalize()
  const r = new THREE.Vector3().crossVectors(u, f)
  const m = new THREE.Matrix4().makeBasis(r, u, f)
  return new THREE.Quaternion().setFromRotationMatrix(m).invert()
}

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

// Camera distance so a radius-1 sphere fits the narrower viewport axis
// with some margin (sphere silhouette: sin(halfAngle) = r / d).
function fitCameraZ(aspect) {
  const halfV = THREE.MathUtils.degToRad(FOV / 2)
  const halfH = Math.atan(Math.tan(halfV) * aspect)
  return 1.06 / Math.sin(Math.min(halfV, halfH))
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
export default function createGlobeScene(canvas, frames, { isMobile, baseUrl, onReady, getProgress }) {
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

  // Lights: a fixed "sun" so the terminator stays put while the globe spins
  // underneath it — night side (with city lights) is always camera-right.
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.copy(SUN_WORLD).multiplyScalar(10)
  scene.add(sun)
  scene.add(new THREE.AmbientLight(0xffffff, 0.08))

  // ---------- earth ----------
  const manager = new THREE.LoadingManager()
  const loader = new THREE.TextureLoader(manager)
  const texSuffix = isMobile ? '-2k' : ''
  const dayTex = loader.load(`${baseUrl}earth/earth-blue-marble${texSuffix}.jpg`)
  const nightTex = loader.load(`${baseUrl}earth/earth-night${texSuffix}.jpg`)
  const topoTex = loader.load(`${baseUrl}earth/earth-topology.png`)
  const waterTex = loader.load(`${baseUrl}earth/earth-water.png`)

  const maxAniso = renderer.capabilities.getMaxAnisotropy()
  // sRGB on the color maps — without this the globe renders washed out.
  for (const t of [dayTex, nightTex]) {
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = maxAniso
  }
  topoTex.anisotropy = maxAniso

  const uSunDirView = { value: new THREE.Vector3() }
  const earthMat = new THREE.MeshPhongMaterial({
    map: dayTex,
    bumpMap: topoTex,
    bumpScale: 0.5,
    specularMap: waterTex,
    specular: new THREE.Color(0x223355),
    shininess: 14,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: nightTex,
    emissiveIntensity: 1.0,
  })
  // City lights only on the night side: mask the emissive term by the
  // view-space sun direction (smoothstep spans the terminator).
  earthMat.onBeforeCompile = (shader) => {
    shader.uniforms.uSunDirView = uSunDirView
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uSunDirView;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance *= smoothstep(0.08, -0.18, dot(normal, uSunDirView));`
      )
  }

  const earth = new THREE.Mesh(new THREE.SphereGeometry(1, 96, 96), earthMat)
  globe.add(earth)

  // ---------- atmosphere ----------
  const atmosMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x3a66ff) },
      uIntensity: { value: 1.0 },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying vec3 vNormal;
      void main() {
        float glow = pow(max(0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 5.0);
        gl_FragColor = vec4(uColor, 1.0) * glow * uIntensity;
      }`,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  })
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.12, 64, 64), atmosMat)
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
      new THREE.MeshBasicMaterial({ color: isFinale ? 0xffe9b0 : 0xeaf0ff })
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
    return { glow, glowScale }
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
    const active =
      p.heroT < 1 ? -1 : p.fi >= last ? last : p.moveT < 0.75 ? p.fi : p.fi + 1
    for (let i = 0; i < pins.length; i++) {
      const isActive = i === active
      const pulse = isActive ? 1.35 + 0.25 * Math.sin(t * 3.5) : 1
      pins[i].glow.scale.setScalar(pins[i].glowScale * pulse)
      pins[i].glow.material.opacity = isActive ? 0.95 : 0.45
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
