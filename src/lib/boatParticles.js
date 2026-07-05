import * as THREE from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'
import { CHROME_STOPS } from './textSpray'

// Act 6 "transmutation": the boat's surface is sampled once into a Points
// cloud whose every particle carries three homes — its birth vertex on the
// boat, a scatter offset (the spray comet), and a pixel inside the letterforms
// of "LA 2028". Position is a pure function of (uDissolve, uMorph): reverse
// scrubbing re-condenses the headline into a sailboat by construction. uTime
// only feeds zero-mean mid-flight wobble (gated to 0 at both seams) and a
// brightness shimmer — frozen by the window.__boatDet determinism hook.

function mulberry32(a) {
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// JS twin of the GLSL snoise in chromeSweepMaterial.js — seedFor() must give
// the same threshold the mesh's erode discard uses, so particles take flight
// exactly where the surface vanishes.
function snoise2(vx, vy) {
  const C = [0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439]
  const mod289 = (x) => x - Math.floor(x / 289) * 289
  const permute = (x) => mod289((x * 34 + 1) * x)
  let ix = Math.floor(vx + (vx + vy) * C[1])
  let iy = Math.floor(vy + (vx + vy) * C[1])
  const x0x = vx - ix + (ix + iy) * C[0]
  const x0y = vy - iy + (ix + iy) * C[0]
  const i1x = x0x > x0y ? 1 : 0
  const i1y = 1 - i1x
  const x1x = x0x + C[0] - i1x
  const x1y = x0y + C[0] - i1y
  const x2x = x0x + C[2]
  const x2y = x0y + C[2]
  ix = mod289(ix)
  iy = mod289(iy)
  const g = []
  for (const [ox, oy] of [[0, 0], [i1x, i1y], [1, 1]]) {
    const p = permute(permute(iy + oy) + ix + ox)
    const xf = 2 * ((p * C[3]) % 1) - 1
    const h = Math.abs(xf) - 0.5
    const oxr = Math.floor(xf + 0.5)
    const a0 = xf - oxr
    const xx = ox === 0 && oy === 0 ? x0x : ox === 1 && oy === 1 ? x2x : x1x
    const yy = ox === 0 && oy === 0 ? x0y : ox === 1 && oy === 1 ? x2y : x1y
    let m = Math.max(0.5 - (xx * xx + yy * yy), 0)
    m *= m
    m *= m
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h)
    g.push(m * (a0 * xx + h * yy))
  }
  return 130 * (g[0] + g[1] + g[2])
}

export function seedFor(x, y, z) {
  const nz = Math.min(1, Math.max(0, 0.5 - z / 1.2))
  return nz * 0.72 + (snoise2(x * 7, y * 7) * 0.5 + 0.5) * 0.28
}

// "LA 2028" glyph pixels in plane-local units (y in [-0.5, 0.5], x scaled by aspect)
function rasterGlyphPoints(text) {
  const W = 1024
  const H = 256
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.font = '900 180px system-ui, -apple-system, "Segoe UI", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#fff'
  ctx.fillText(text, W / 2, H / 2)
  const data = ctx.getImageData(0, 0, W, H).data
  const pts = []
  const step = 2
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      if (data[(y * W + x) * 4 + 3] > 128) {
        pts.push([((x / W) - 0.5) * (W / H), 0.5 - y / H])
      }
    }
  }
  return pts
}

function chromeColorAt(f) {
  // sample the shared .chrome-text gradient (premultiplied over black, like textSpray)
  let i = 1
  while (i < CHROME_STOPS.length - 1 && CHROME_STOPS[i][0] < f) i++
  const a = CHROME_STOPS[i - 1]
  const b = CHROME_STOPS[i]
  const x = Math.min(1, Math.max(0, (f - a[0]) / Math.max(1e-6, b[0] - a[0])))
  const mix = (u, v) => (u + (v - u) * x) / 255
  const alpha = a[4] + (b[4] - a[4]) * x
  return [mix(a[1], b[1]) * alpha, mix(a[2], b[2]) * alpha, mix(a[3], b[3]) * alpha]
}

export function makeBoatParticles(hullMesh, sailMesh, { count = 16000, glyphText = 'LA 2028' } = {}) {
  const rng = mulberry32(20280714)
  const glyphPts = rasterGlyphPoints(glyphText)

  const aStart = new Float32Array(count * 3)
  const aScatter = new Float32Array(count * 3)
  const aGlyph = new Float32Array(count * 3)
  const aColor = new Float32Array(count * 3)
  const aSeed = new Float32Array(count)
  const aRand = new Float32Array(count)

  const pos = new THREE.Vector3()
  const nor = new THREE.Vector3()
  const samplers = [hullMesh, sailMesh].map((m) => new MeshSurfaceSampler(m).build())
  for (let i = 0; i < count; i++) {
    // sail carries 2/3 of the particles — it's the visual mass
    const s = samplers[i % 3 === 0 ? 0 : 1]
    s.sample(pos, nor)
    aStart.set([pos.x, pos.y, pos.z], i * 3)
    const r = rng()
    // spray comet: off the surface, biased down and astern of the rising boat
    aScatter.set(
      [
        nor.x * (0.2 + 0.7 * r) + (rng() - 0.5) * 0.55,
        nor.y * (0.2 + 0.7 * r) + (rng() - 0.5) * 0.4 - 0.35 * rng(),
        nor.z * (0.2 + 0.7 * r) + (rng() - 0.5) * 0.55 - 0.7 * rng(),
      ],
      i * 3
    )
    const g = glyphPts[(i * 100003) % glyphPts.length]
    aGlyph.set([g[0] + (rng() - 0.5) * 0.012, g[1] + (rng() - 0.5) * 0.012, (rng() - 0.5) * 0.05], i * 3)
    aSeed[i] = seedFor(pos.x, pos.y, pos.z)
    aRand[i] = rng()
    const [cr, cg, cb] = chromeColorAt(rng())
    aColor.set([cr, cg, cb], i * 3)
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(aStart, 3)) // for bounding calc only
  geo.setAttribute('aStart', new THREE.BufferAttribute(aStart, 3))
  geo.setAttribute('aScatter', new THREE.BufferAttribute(aScatter, 3))
  geo.setAttribute('aGlyph', new THREE.BufferAttribute(aGlyph, 3))
  geo.setAttribute('aColor', new THREE.BufferAttribute(aColor, 3))
  geo.setAttribute('aSeed', new THREE.BufferAttribute(aSeed, 1))
  geo.setAttribute('aRand', new THREE.BufferAttribute(aRand, 1))

  const uniforms = {
    uDissolve: { value: 0 },
    uMorph: { value: 0 },
    uFade: { value: 1 },
    uTime: { value: 0 },
    uSize: { value: 0.0085 }, // particle world diameter
    uPR: { value: 1000 }, // canvasPixelHeight / (2 tan(fov/2)) — set per frame
    uBoatMat: { value: new THREE.Matrix4() },
    uGlyphOrigin: { value: new THREE.Vector3() },
    uGlyphRight: { value: new THREE.Vector3(1, 0, 0) },
    uGlyphUp: { value: new THREE.Vector3(0, 1, 0) },
    uGlyphSize: { value: 1 },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      attribute vec3 aStart, aScatter, aGlyph, aColor;
      attribute float aSeed, aRand;
      uniform float uDissolve, uMorph, uFade, uTime, uSize, uPR, uGlyphSize;
      uniform mat4 uBoatMat;
      uniform vec3 uGlyphOrigin, uGlyphRight, uGlyphUp;
      varying vec3 vColor;
      varying float vAlpha;
      float ease(float x) { return x * x * (3.0 - 2.0 * x); }
      void main() {
        // p1 window matches the mesh's erode discard (see chromeSweepMaterial)
        float p1 = smoothstep(aSeed, aSeed + 0.13, uDissolve * 1.05);
        float p2 = smoothstep(aRand * 0.3, aRand * 0.3 + 0.7, uMorph);
        vec3 start = (uBoatMat * vec4(aStart, 1.0)).xyz;
        vec3 scat = start + aScatter;
        vec3 glyph = uGlyphOrigin
          + uGlyphRight * (aGlyph.x * uGlyphSize)
          + uGlyphUp * (aGlyph.y * uGlyphSize)
          + uGlyphRight * aGlyph.z * 0.2;
        float g = p1 * (1.0 - p2); // wobble gate: zero at both seams
        vec3 wob = vec3(
          sin(uTime * 1.3 + aRand * 41.0),
          sin(uTime * 1.7 + aRand * 83.0),
          sin(uTime * 1.1 + aRand * 61.0)
        ) * 0.05 * g;
        vec3 pos = mix(mix(start, scat, ease(p1)), glyph, ease(p2)) + wob;
        vec4 mv = viewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * uPR * (0.6 + 0.9 * aRand) * (1.0 + 1.4 * g) / max(0.1, -mv.z);
        gl_Position = projectionMatrix * mv;
        vColor = aColor * (0.85 + 0.3 * sin(uTime * 2.0 + aRand * 91.0));
        vAlpha = smoothstep(0.0, 0.2, p1) * uFade;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.12, d) * vAlpha;
        if (a < 0.003) discard;
        gl_FragColor = vec4(vColor * a, a);
      }
    `,
  })

  const points = new THREE.Points(geo, material)
  points.frustumCulled = false
  points.matrixAutoUpdate = false // world-space cloud; boat pose rides in via uBoatMat
  points.visible = false
  return { points, uniforms }
}
