import * as THREE from 'three'

// ============================================================================
//  SHARED EARTH  —  the single source of truth for the 3D globe.
// ============================================================================
//  Both the Coming Soon page (globeScene.js) and the home orb→globe MORPH
//  (glassOrbScene.js) build their earth from HERE, so the two globes are
//  byte-identical. That identity is what lets the home→Coming Soon transition
//  cross the route boundary with NO pop: the orb scene's last frame and the
//  Coming Soon globe's first frame render the same pixels.
//
//  Exports the camera primitives (shared so the framing matches too) plus
//  buildEarth(), which creates the meshes/materials/lights and returns them for
//  the caller to add to its scene and drive per frame.
// ============================================================================

export const FOV = 38 // vertical field of view (deg) — same camera for orb + globe
export const SUN_WORLD = new THREE.Vector3(-2, 0.6, 1.5).normalize() // fixed "sun"

// Camera distance so a radius-1 sphere fits the narrower viewport axis with a
// little margin (silhouette: sin(halfAngle) = r / d).
export function fitCameraZ(aspect) {
  const halfV = THREE.MathUtils.degToRad(FOV / 2)
  const halfH = Math.atan(Math.tan(halfV) * aspect)
  return 1.06 / Math.sin(Math.min(halfV, halfH))
}

// Matches SphereGeometry's default UV layout: equirectangular seam at lng ±180.
export function latLngToVector3(lat, lng, radius = 1) {
  const phi = ((90 - lat) * Math.PI) / 180
  const theta = ((lng + 180) * Math.PI) / 180
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  )
}

// Globe orientation that puts a waypoint dead-centre facing the camera (+Z) with
// north up. Built from an explicit basis so there's no roll.
export function quaternionForPoint(lat, lng) {
  const f = latLngToVector3(lat, lng, 1).normalize()
  const north = new THREE.Vector3(0, 1, 0)
  const u = north.clone().addScaledVector(f, -north.dot(f)).normalize()
  const r = new THREE.Vector3().crossVectors(u, f)
  const m = new THREE.Matrix4().makeBasis(r, u, f)
  return new THREE.Quaternion().setFromRotationMatrix(m).invert()
}

// ----------------------------------------------------------------------------
//  buildEarth(renderer, { baseUrl, isMobile })
//    Creates the blue-marble earth (radius 1) + the atmosphere shell (radius
//    1.12) + the sun/ambient lights the phong earth needs. Adds NOTHING to a
//    scene — the caller positions/parents the meshes and lights and, every
//    frame, refreshes uSunDirView (the sun direction in view space, which masks
//    the city-lights to the night side).
//
//    Returns: { earth, atmosphere, earthMat, atmosMat, uSunDirView, manager,
//               sun, ambient }
//      manager.onLoad fires when the four earth textures have decoded.
// ----------------------------------------------------------------------------
export function buildEarth(renderer, { baseUrl, isMobile }) {
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
  // City lights only on the night side: mask the emissive term by the view-space
  // sun direction (smoothstep spans the terminator).
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

  // Lights the phong earth needs — a fixed "sun" (terminator stays put while the
  // globe spins) + a touch of ambient. Returned for the caller to add.
  const sun = new THREE.DirectionalLight(0xffffff, 2.2)
  sun.position.copy(SUN_WORLD).multiplyScalar(10)
  const ambient = new THREE.AmbientLight(0xffffff, 0.08)

  return { earth, atmosphere, earthMat, atmosMat, uSunDirView, manager, sun, ambient }
}
