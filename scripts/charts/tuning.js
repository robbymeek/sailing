// ============================================================================
//  tuning — per-chart framing for the nautical chart bake (bake.mjs).
// ============================================================================
//  Keyed by chartKey (the city slug from src/utils/places.js; an alias such as
//  Takapuna rides on its twin's key, auckland). Anything missing falls back to
//  DEFAULTS below.
//
//    nm    visible span of the MINOR stage axis, nautical miles. Also picks the
//          tile zoom (chartMath.zoomForSpan: ≤16 → z12, ≤40 → z11, else z10).
//    look  [eastNm, northNm] offset of the sheet/window centre from the fix,
//          so the harbour and the recognisable coastline sit in frame while
//          the fix itself stays the place's real lat/lng.
//    d1    inner shoal band, NM of water hugging the coast (darker tint)
//    d2    outer shoal band, NM (lighter tint, superset of d1)
//
//  The home card reads nm + look from the generated manifest, so a change here
//  only takes effect after a re-bake: npm --prefix scripts/charts run bake
// ============================================================================

export const DEFAULTS = { nm: 12, look: [0, 0], d1: 0.12, d2: 0.35 }

export default {
  annapolis: { nm: 9, look: [1.5, 0] },
  'new-york-city': { nm: 8, look: [-1, -2.5] },
  'san-pedro': { nm: 10, look: [2, 1.5] },
  'long-beach': { nm: 10 },
  'san-francisco': { nm: 9, look: [-1.2, 0.3] },
  'dun-laoghaire': { nm: 9, look: [1.5, 0] },
  adelaide: { nm: 16, look: [-3, 0] },
  fremantle: { nm: 14, look: [-3, 0] },
  sydney: { nm: 9, look: [1.5, 0] },
  melbourne: { nm: 18, look: [-4, -1] },
  auckland: { nm: 12, look: [-1, -1.5] },
  vilamoura: { nm: 12 },
  miami: { nm: 11, look: [2, 0.5] },
  'fort-lauderdale': { nm: 11, look: [2.5, 0] },
  fortaleza: { nm: 12 },
  palma: { nm: 12 },
  hyeres: { nm: 14, look: [0, -1] },
  'los-alcazares': { nm: 12 },
}
