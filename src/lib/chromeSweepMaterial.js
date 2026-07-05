import * as THREE from 'three'

// The /boat black->liquid-chrome sweep. One MeshPhysicalMaterial shared by the
// Hull and Sail, patched via onBeforeCompile (same pattern as buildEarth's
// night-lights patch). A horizontal front at world/object height uLineY divides
// the boat: below = mirror chrome, above = matte black. The front edge creeps
// with simplex noise (the "liquid" trick borrowed from the liquid-logo shader)
// and carries an HDR emissive band — that band is the only thing on the page
// bright enough to cross the bloom luminance threshold, so the meniscus glows.
//
// uErode drives Act 6: fragments discard bow-first along the same noise field
// the particle system uses for take-off, so the surface vanishes exactly where
// the spray is born (boatParticles.js mirrors seedFor() below in JS).
//
// uTime is COSMETIC ONLY (zero-mean boundary wobble + reflection shimmer); the
// dev determinism hook (window.__boatDet) freezes it, and every canonical pose
// is a pure function of scroll via the uniforms written from boatScroll's P.

export const chromeUniforms = {
  uLineY: { value: -10 },
  uEdge: { value: 0.016 },
  uLiquid: { value: 0.4 },
  uErode: { value: 0 },
  uTime: { value: 0 },
  uEdgeColor: { value: new THREE.Color(0.62, 0.73, 1.0) },
}

// 2D simplex noise (Ashima/IQ standard, same family liquid-logo uses)
const SNOISE = /* glsl */ `
vec3 permute_(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute_(permute_(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`

// Per-fragment erode threshold: bow-first along the boat's length + noise.
// boatParticles.seedFor() must stay in sync with this formula.
const ERODE_AND_SWEEP = /* glsl */ `
  float _nz = clamp(0.5 - vObjPos.z / 1.2, 0.0, 1.0);
  float _th = _nz * 0.72 + (snoise(vObjPos.xy * 7.0) * 0.5 + 0.5) * 0.28;
  if (uErode * 1.05 > _th) discard;
  float _ly = uLineY + snoise(vObjPos.xz * 6.0 + uTime * 0.12) * 0.05 * uLiquid;
  float _sweep = 1.0 - smoothstep(_ly - uEdge, _ly + uEdge, vObjPos.y);
  // liquid edge-crawl: chrome tendrils creep a little past the front
  // (liquid-logo's edge trick); zero once the fragment is >0.09 above the line
  float _above = vObjPos.y - _ly;
  float _crawl = max(0.0, snoise(vObjPos.xz * 14.0 - uTime * 0.07)) * uLiquid;
  _sweep = max(_sweep, _crawl * (1.0 - smoothstep(0.0, 0.09, _above)) * step(0.0, _above) * 0.9);
  float _band = 1.0 - smoothstep(0.0, uEdge * 3.0, abs(_above));
`

export function makeChromeSweepMaterial() {
  const mat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0c,
    roughness: 0.45,
    metalness: 0.0,
    clearcoat: 0.6,
    clearcoatRoughness: 0.25,
  })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, chromeUniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
         varying vec3 vObjPos;
         uniform float uLineY, uEdge, uLiquid, uErode, uTime;
         uniform vec3 uEdgeColor;
         ${SNOISE}`
      )
      // _sweep/_band are main()-scope locals: computed once here, reused by the
      // roughness/metalness/emissive chunks that run later in main().
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         ${ERODE_AND_SWEEP}
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), _sweep);`
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         roughnessFactor = mix(roughnessFactor, 0.05, _sweep);`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
         metalnessFactor = mix(metalnessFactor, 1.0, _sweep);`
      )
      // liquid shimmer: tiny time-animated normal wobble inside the chrome zone
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         normal = normalize(normal + vec3(
           snoise(vObjPos.zy * 9.0 + uTime * 0.2),
           0.0,
           snoise(vObjPos.xy * 9.0 - uTime * 0.16)
         ) * 0.045 * _sweep);`
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
         totalEmissiveRadiance += uEdgeColor * _band * 5.0;`
      )
  }
  // uniforms are shared module-scope; distinguish compiled variants anyway
  mat.customProgramCacheKey = () => 'chromeSweep1'
  return mat
}
