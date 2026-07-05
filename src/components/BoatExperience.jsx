import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import computeBoatScroll, { P, setViewport, ACT, C6, T6, KEEL_Y } from '../lib/boatScroll'
import { makeChromeSweepMaterial, chromeUniforms } from '../lib/chromeSweepMaterial'
import { makeBoatParticles } from '../lib/boatParticles'

// The /boat WebGL layer. One useFrame reads boatScroll's P struct and writes
// every camera/boat/light/uniform channel — React never sits in the per-frame
// path. All pointer response is cosmetic and additive AFTER the closed-form
// pose (and zeroed under the window.__boatDet determinism hook).

const BOAT_URL = `${import.meta.env.BASE_URL}boat/sailboat.glb`
const DEG = Math.PI / 180
const HALF_FOV = 19 * DEG // vertical FOV 38 (buildEarth's house camera)
const GLYPH_D = 3.1 // glyph plane distance in front of the Act 6-8 camera
const UP = new THREE.Vector3(0, 1, 0)
const _tgt = new THREE.Vector3()

function makeGlowTexture() {
  const size = 128
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.3, 'rgba(220,232,255,0.6)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(c)
}

// Act 3 spec plates — text drawn once to a CanvasTexture (system-ui, matching
// the site's inline-style typography; no font tech added)
function makeTextPlate(big, small) {
  const W = 1024
  const H = 300
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  ctx.textAlign = 'left'
  ctx.fillStyle = 'rgba(244,247,255,0.96)'
  ctx.font = '800 118px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.fillText(big, 12, 128)
  ctx.fillStyle = 'rgba(190,205,235,0.9)'
  ctx.font = '500 34px system-ui, -apple-system, "Segoe UI", sans-serif'
  try {
    ctx.letterSpacing = '6px'
  } catch {
    /* older engines: plain tracking */
  }
  ctx.fillText(small, 14, 218)
  const tex = new THREE.CanvasTexture(c)
  tex.anisotropy = 4
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.34, (0.34 * H) / W),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false })
  )
  mesh.visible = false
  return mesh
}

function ContextGuard() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    const el = gl.domElement
    const onLost = (e) => e.preventDefault() // allow restore; r3f resumes drawing
    el.addEventListener('webglcontextlost', onLost, false)
    return () => el.removeEventListener('webglcontextlost', onLost)
  }, [gl])
  return null
}

function BoatScene({ isMobile }) {
  const gltf = useGLTF(BOAT_URL)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const viewport = useThree((s) => s.viewport)

  const boatRef = useRef()
  const sailRef = useRef()
  const rim1 = useRef()
  const rim2 = useRef()
  const key = useRef()

  const rig = useMemo(() => {
    const hull = gltf.scene.getObjectByName('Hull')
    const sail = gltf.scene.getObjectByName('Sail')
    const mat = makeChromeSweepMaterial()
    hull.material = mat
    sail.material = mat
    // exact sail-tip position for the final ignition glint
    const pa = sail.geometry.getAttribute('position')
    const tip = new THREE.Vector3(0, -1, 0)
    for (let i = 0; i < pa.count; i++) {
      if (pa.getY(i) > tip.y) tip.set(pa.getX(i), pa.getY(i), pa.getZ(i))
    }
    const particles = makeBoatParticles(hull, sail, { count: isMobile ? 5000 : 16000 })
    const glowTex = makeGlowTexture()
    const mkGlint = (scale) => {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: glowTex,
          color: new THREE.Color(2.4, 3.0, 5.0), // HDR — feeds the bloom pass
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          transparent: true,
          opacity: 0,
        })
      )
      s.scale.setScalar(scale)
      s.visible = false
      return s
    }
    const line = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 0.006),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(2.2, 3.0, 6.0), // HDR blue-white hairline
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      })
    )
    line.visible = false
    return {
      hull,
      sail,
      mat,
      particles,
      tip,
      line,
      contactGlint: mkGlint(0.07),
      tipGlint: mkGlint(0.1),
      plate1: makeTextPlate('7.06 m²', 'EVERY ONE OF THEM IS YOUR PROBLEM'),
      plate2: makeTextPlate('59 kg', "THE SAME 59 AS EVERYONE ELSE'S"),
    }
  }, [gltf, isMobile])

  // Act 6-8 camera-space frame: glyph plane pose, one-vh world unit, mini-
  // silhouette anchor. Recomputed on resize (aspect changes P.am).
  const pose = useMemo(() => {
    setViewport(size.width, size.height, isMobile)
    const cam = new THREE.Vector3(C6[0] * P.am, C6[1], C6[2] * P.am)
    const fwd = new THREE.Vector3(...T6).sub(cam).normalize()
    const right = new THREE.Vector3().crossVectors(fwd, UP).normalize()
    const up = new THREE.Vector3().crossVectors(right, fwd)
    const vhWorld = 2 * GLYPH_D * Math.tan(HALF_FOV) // 1 viewport-height at the plane
    return {
      right,
      up,
      origin0: cam.clone().addScaledVector(fwd, GLYPH_D),
      vhWorld,
      // matched to the DOM headline: 12vh font ≈ 8.6vh cap height; the raster's
      // glyphs fill ~0.507 of its local unit → 0.086/0.507 ≈ 0.17 (see Boat.jsx)
      glyphSize: 0.17 * vhWorld,
      silPos: cam
        .clone()
        .addScaledVector(fwd, 2.3)
        .addScaledVector(up, -0.37 * 2 * 2.3 * Math.tan(HALF_FOV)),
    }
  }, [size.width, size.height, isMobile])

  // cosmetic pointer garnish (damped; zero on touch / under __boatDet)
  const ptr = useRef({ x: 0, y: 0, tx: 0, ty: 0 })
  useEffect(() => {
    if (isMobile) return undefined
    const onMove = (e) => {
      ptr.current.tx = (e.clientX / window.innerWidth) * 2 - 1
      ptr.current.ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [isMobile])

  useFrame((state, delta) => {
    const det = window.__boatDet
    computeBoatScroll()
    const dt = Math.min(0.05, delta)
    if (!det) {
      chromeUniforms.uTime.value += dt
      rig.particles.uniforms.uTime.value += dt
    }
    const pr = ptr.current
    const damp = Math.min(1, dt * 5)
    pr.x += (pr.tx - pr.x) * damp
    pr.y += (pr.ty - pr.y) * damp
    const gx = det || isMobile ? 0 : pr.x
    const gy = det || isMobile ? 0 : pr.y

    // ---- camera: closed-form pose, then additive cosmetic parallax ----
    camera.position.set(P.camX, P.camY, P.camZ)
    _tgt.set(P.tgtX, P.tgtY, P.tgtZ)
    camera.lookAt(_tgt)
    if (P.t > ACT.A3) {
      camera.rotation.y -= gx * 0.026
      camera.rotation.x -= gy * 0.018
    }

    // ---- boat rig ----
    const boat = boatRef.current
    if (P.t >= 0.845) {
      boat.position.copy(pose.silPos)
      boat.scale.setScalar(P.boatScale)
    } else {
      boat.position.set(0, P.boatRise, 0)
      boat.scale.setScalar(1)
    }
    boat.rotation.y = P.boatYaw
    boat.visible = P.boatVisible
    sailRef.current.position.y = P.sailLift
    rig.hull.rotation.y = P.hullYaw
    boat.updateMatrixWorld(true)

    // ---- chrome sweep + environment ----
    chromeUniforms.uLineY.value = P.lineY
    chromeUniforms.uErode.value = P.dissolveT
    rig.mat.envMapIntensity = P.envI
    if (scene.environmentRotation) {
      scene.environmentRotation.y = P.t > 0.39 && P.t < ACT.A6 ? gx * 0.17 : 0
    }

    // ---- lights (rim azimuths follow the camera; pointer swings them in A1-2) ----
    const camAz = Math.atan2(P.camX, P.camZ)
    const rimGarnish = P.t < ACT.A3 ? gx * 0.35 : 0
    const a1 = camAz + 110 * DEG + rimGarnish
    const a2 = camAz - 110 * DEG - rimGarnish * 0.5
    rim1.current.position.set(Math.sin(a1) * 4, 1.5, Math.cos(a1) * 4)
    rim2.current.position.set(Math.sin(a2) * 4, 1.1, Math.cos(a2) * 4)
    const pulse = 1 + 2.5 * P.pulse
    rim1.current.intensity = P.rim1 * 2.4 * pulse
    rim2.current.intensity = P.rim2 * 1.8 * pulse
    key.current.intensity = P.key * 1.2
    key.current.position.set(P.camX, P.camY + 1.2, P.camZ)

    // ---- waterline hairline + ignition glints ----
    rig.line.position.y = P.lineY
    rig.line.rotation.y = camAz
    rig.line.material.opacity = P.lineGlow * 0.9
    rig.line.visible = P.lineGlow > 0.003
    rig.contactGlint.position.set(0.05, KEEL_Y + 0.01, 0.3)
    rig.contactGlint.material.opacity = P.contactGlint
    rig.contactGlint.visible = P.contactGlint > 0.01
    rig.tipGlint.position.copy(rig.tip)
    rig.tipGlint.material.opacity = P.tipGlint
    rig.tipGlint.visible = P.tipGlint > 0.01

    // ---- Act 3 spec plates (billboard toward the fly-through camera) ----
    rig.plate1.material.opacity = P.plate1
    rig.plate1.visible = P.plate1 > 0.01
    rig.plate2.material.opacity = P.plate2
    rig.plate2.visible = P.plate2 > 0.01
    if (rig.plate1.visible) rig.plate1.lookAt(camera.position)
    if (rig.plate2.visible) rig.plate2.lookAt(camera.position)

    // ---- transmutation particles ----
    const u = rig.particles.uniforms
    u.uDissolve.value = P.dissolveT
    u.uMorph.value = P.morphT
    u.uFade.value = P.particleFade
    u.uPR.value = (viewport.dpr * size.height) / (2 * Math.tan(HALF_FOV))
    u.uBoatMat.value.copy(boat.matrixWorld)
    u.uGlyphOrigin.value.copy(pose.origin0).addScaledVector(pose.up, -P.glyphShift * pose.vhWorld)
    u.uGlyphRight.value.copy(pose.right)
    u.uGlyphUp.value.copy(pose.up)
    u.uGlyphSize.value = pose.glyphSize
    rig.particles.points.visible = P.dissolveT > 0.001 && P.particleFade > 0.001
  })

  return (
    <>
      <group ref={boatRef}>
        <primitive object={rig.hull} />
        <group ref={sailRef}>
          <primitive object={rig.sail} />
        </group>
      </group>
      <primitive object={rig.particles.points} />
      <primitive object={rig.line} />
      <primitive object={rig.contactGlint} />
      <primitive object={rig.tipGlint} />
      <primitive object={rig.plate1} position={[-0.35, 0.92, 0.05]} />
      <primitive object={rig.plate2} position={[-1.05, 0.35, -0.75]} />
      <directionalLight ref={rim1} intensity={2.4} color="#cfdcff" />
      <directionalLight ref={rim2} intensity={0} color="#9fb8ff" />
      <directionalLight ref={key} intensity={0} color="#dbe6ff" />
      <ambientLight intensity={0.06} />
      {/* procedural chrome studio, rendered once: wide vertical strips + a
          horizon band — the high-contrast gradients that make liquid metal read */}
      <Environment resolution={isMobile ? 128 : 256} frames={1}>
        <color attach="background" args={['#02030a']} />
        {/* broad soft panels so a FLAT mirror face always reflects something */}
        {[0, 90, 180, 270].map((a) => (
          <Lightformer
            key={`panel${a}`}
            form="rect"
            intensity={0.55}
            color="#2c4a80"
            position={[Math.sin(a * DEG) * 5.5, 1.6, Math.cos(a * DEG) * 5.5]}
            scale={[12, 8, 1]}
            target={[0, 0, 0]}
          />
        ))}
        <Lightformer form="rect" intensity={6} color="#ffffff" position={[3.5, 1.8, 2.2]} scale={[1.8, 8, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={3.5} color="#cfe0ff" position={[-4, 1.2, 1.5]} scale={[2.2, 7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={2.8} color="#8fb4ff" position={[0.5, 2, -4.5]} scale={[3, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.7} color="#b8ccff" position={[0, 0.15, 5]} scale={[14, 0.7, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.3} color="#7d9dff" position={[0, 0.1, -5]} scale={[14, 0.5, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[0, 6, 0]} scale={5} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}

export default function BoatExperience({ isMobile, frameloop = 'always' }) {
  return (
    <Canvas
      dpr={[1, isMobile ? 1.5 : 2]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      camera={{ fov: 38, near: 0.02, far: 60, position: [0.55, 0.98, 0.42] }}
      frameloop={frameloop}
      style={{ width: '100%', height: '100%' }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <ContextGuard />
      <Suspense fallback={null}>
        <BoatScene isMobile={isMobile} />
      </Suspense>
      {!isMobile && (
        <EffectComposer multisampling={0}>
          <Bloom mipmapBlur intensity={0.9} luminanceThreshold={1.0} luminanceSmoothing={0.15} />
        </EffectComposer>
      )}
    </Canvas>
  )
}

useGLTF.preload(BOAT_URL)
