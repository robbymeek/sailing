// ============================================================================
//  WebGL capability gate  —  shared by the home orb (MainView) and the Coming
//  Soon globe (ComingSoon), which previously each carried their own weaker copy.
// ============================================================================
//  Three.js 0.180 REQUIRES a WebGL2 context (it dropped WebGL1 support), so both
//  scenes must gate on real WebGL2 availability. A naive `webgl2 || webgl` probe
//  passes on a WebGL1-only browser (old / blocklisted / software drivers — e.g.
//  some remote-desktop Windows and legacy mobile), and then the real
//  THREE.WebGLRenderer constructor throws, which silently drops the page to its
//  flat fallback *after* a visible flash + an orphan canvas. Gating on WebGL2 up
//  front avoids that.
//
//  This is still a cheap throwaway-context probe: it can pass on a machine that
//  later refuses a real high-performance context, so every scene mount also stays
//  wrapped in try/catch (renderer retry) + a ready-timeout safety net.
export function hasWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    return !!canvas.getContext('webgl2')
  } catch {
    return false
  }
}
