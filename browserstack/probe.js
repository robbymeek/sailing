// ============================================================================
//  IN-PAGE CAPABILITY PROBE  —  runs INSIDE the remote browser via executeScript
// ============================================================================
//  This function is serialized and executed on the real device. It must be
//  fully self-contained (no closure references, no imports). It answers the
//  exact questions Phase 0 left as INFERRED:
//    - Does a REAL high-performance WebGL context actually create here?
//    - Is ImageDecoder (the boat-animation API) present?
//    - Which alpha video formats can this browser play? (drives the boat fix)
//    - Is the LIVE orb canvas on screen, or did the page fall back to the boat?
//  It also reads window.__ORB_DEBUG__ if the app exposes it (?debug=1 build).
// ============================================================================

export function pageProbe() {
  function canCtx(type) {
    try { var c = document.createElement('canvas'); return !!c.getContext(type) } catch (e) { return false }
  }
  var real = false, realReason = '', renderer = '', vendor = ''
  try {
    var c = document.createElement('canvas')
    var g = c.getContext('webgl2', { powerPreference: 'high-performance' })
    if (!g) g = c.getContext('webgl', { powerPreference: 'high-performance' })
    real = !!g
    if (g) {
      var ext = g.getExtension('WEBGL_debug_renderer_info')
      renderer = ext ? g.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '(renderer hidden)'
      vendor = ext ? g.getParameter(ext.UNMASKED_VENDOR_WEBGL) : ''
    } else {
      realReason = 'getContext(webgl2|webgl, {powerPreference:high-performance}) returned null'
    }
  } catch (e) { real = false; realReason = String((e && e.message) || e) }

  function vc(t) { try { return document.createElement('video').canPlayType(t) || '(no)' } catch (e) { return 'err' } }

  var orb = document.getElementById('orb-overlay')
  var mm = function (q) { try { return window.matchMedia(q).matches } catch (e) { return null } }

  return {
    href: location.href,
    ua: navigator.userAgent,
    webgl2: canCtx('webgl2'),
    webgl1: canCtx('webgl'),
    realHighPerfContext: real,
    realContextReason: realReason,
    renderer: renderer,
    vendor: vendor,
    imageDecoder: ('ImageDecoder' in window),
    devicePixelRatio: window.devicePixelRatio,
    reducedMotion: mm('(prefers-reduced-motion: reduce)'),
    pointerFine: mm('(pointer: fine)'),
    pointerCoarse: mm('(pointer: coarse)'),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    canPlay: {
      webmVp9Alpha: vc('video/webm; codecs="vp9"'),
      webmVp8: vc('video/webm; codecs="vp8"'),
      mp4H264: vc('video/mp4; codecs="avc1.42E01E"'),
      hevcAlpha: vc('video/mp4; codecs="hvc1"'),
    },
    orbCanvasPresent: !!orb,
    orbCanvasOpacity: orb ? window.getComputedStyle(orb).opacity : null,
    flatBoatButton: !!document.querySelector('button[aria-label^="The Road"]'),
    orbDebug: window.__ORB_DEBUG__ || null,
  }
}

// Classify what the user actually sees, from a probe result.
export function classify(p) {
  if (!p) return 'ERROR'
  if (p.orbCanvasPresent && parseFloat(p.orbCanvasOpacity || '0') > 0.01) return 'LIVE_ORB'
  // A visible flat-boat button means the user is on the fallback even if an
  // orphan orb canvas lingers at opacity 0 (e.g. the scene threw after the
  // body-level canvas was appended — the WebGL2-mismatch fallback path).
  if (p.flatBoatButton) return 'FLAT_BOAT'
  if (p.orbCanvasPresent) return 'ORB_CANVAS_HIDDEN' // mounted but not faded in (mid-intro)
  return 'UNKNOWN'
}
