// ============================================================================
//  chartMath — the nautical chart's projection + framing math.
// ============================================================================
//  PURE and dependency-free on purpose: the authoring-time chart bake
//  (scripts/charts/bake.mjs, plain Node) and the home card (NowChart.jsx)
//  import this SAME module, so the sheet the bake cuts and the window the
//  browser frames can never disagree. No import.meta, no DOM.
//
//  Units:
//    · "world px" = Web Mercator pixels at zoom z with 256 px tiles
//      (the OpenMapTiles/OpenFreeMap tiling the bake reads).
//    · A chart SHEET is an axis-aligned rect in world px (x0, y0, w, h).
//      Baked path data is sheet-local world px × q, rounded to integers.
//    · A WINDOW is the part of the sheet a stage shows (sheet-local world px).

export const TILE = 256
const D2R = Math.PI / 180

// lat/lng → world px at zoom z
export function project(lat, lng, z) {
  const s = TILE * 2 ** z
  const sin = Math.sin(lat * D2R)
  const x = ((lng + 180) / 360) * s
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * s
  return [x, y]
}

// world px at zoom z → [lat, lng]
export function unproject(x, y, z) {
  const s = TILE * 2 ** z
  const lng = (x / s) * 360 - 180
  const n = Math.PI - (2 * Math.PI * y) / s
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n))
  return [lat, lng]
}

// world px per nautical mile at a latitude (Mercator scale grows with 1/cos φ)
export function pxPerNm(lat, z) {
  const metersPerPx = (156543.03392 * Math.cos(lat * D2R)) / 2 ** z
  return 1852 / metersPerPx
}

// Zoom the bake reads for a given visible span (NM across the minor axis).
// Tiles top out at z14; z12 keeps harbour detail without megabyte sheets.
export function zoomForSpan(nm) {
  if (nm <= 16) return 12
  if (nm <= 40) return 11
  return 10
}

// The sheet is this many × the minor visible span, centred on fix + look, so a
// stage of any aspect from ~0.5 (phone portrait) to ~2.8 (ultrawide strip) can
// cover-crop it at full scale without exposing an edge. SHEET_MARGIN (world
// px) is extra geometry baked beyond the sheet so coast strokes along the clip
// rect never land inside a window.
export const SHEET_W = 2.8
export const SHEET_H = 2.0
export const SHEET_MARGIN = 64

// look = [eastNm, northNm] offset of the sheet/window centre from the fix
export function lookPx(lat, z, look = [0, 0]) {
  const k = pxPerNm(lat, z)
  return [look[0] * k, -look[1] * k]
}

// The baked sheet for a place: { x0, y0, w, h } in world px at zoom z.
export function sheetFor({ lat, lng }, { nm, z = zoomForSpan(nm), look = [0, 0] }) {
  const [fx, fy] = project(lat, lng, z)
  const [lx, ly] = lookPx(lat, z, look)
  const minor = nm * pxPerNm(lat, z)
  const w = Math.round(minor * SHEET_W)
  const h = Math.round(minor * SHEET_H)
  const x0 = Math.round(fx + lx - w / 2)
  const y0 = Math.round(fy + ly - h / 2)
  return { x0, y0, w, h, z }
}

// Frame a stage (W × H css px) onto the sheet.
//   · the minor visible axis spans `nm` nautical miles
//   · if the stage's aspect needs more sheet than exists, zoom IN (never
//     expose an edge)
//   · centre = fix + look + biasX·window width (the title cartouche pushes the
//     fix right), clamped inside the sheet
// Returns the window { x, y, w, h } in sheet-local world px, plus the fix's
// position inside it as fractions (fx, fy ∈ 0..1).
export function fitWindow(sheet, { lat, lng }, stageW, stageH, { nm, look = [0, 0], biasX = 0 }) {
  const z = sheet.z
  const aspect = Math.max(0.05, stageW / Math.max(1, stageH))
  const minor = nm * pxPerNm(lat, z)
  let w, h
  if (aspect >= 1) { h = minor; w = h * aspect } else { w = minor; h = w / aspect }
  const k = Math.min(1, sheet.w / w, sheet.h / h)
  w *= k
  h *= k
  const [px, py] = project(lat, lng, z)
  const fixX = px - sheet.x0
  const fixY = py - sheet.y0
  const [lx, ly] = lookPx(lat, z, look)
  let cx = fixX + lx - biasX * w
  let cy = fixY + ly
  cx = Math.min(Math.max(cx, w / 2), sheet.w - w / 2)
  cy = Math.min(Math.max(cy, h / 2), sheet.h - h / 2)
  const x = cx - w / 2
  const y = cy - h / 2
  return { x, y, w, h, fx: (fixX - x) / w, fy: (fixY - y) / h }
}

// Lat/lng bounds of a window (for the neat-line ticks + graticule).
export function windowBounds(sheet, win) {
  const [north, west] = unproject(sheet.x0 + win.x, sheet.y0 + win.y, sheet.z)
  const [south, east] = unproject(sheet.x0 + win.x + win.w, sheet.y0 + win.y + win.h, sheet.z)
  return { north, south, east, west }
}

// Minute-bar spacing for a chart border: the smallest "nice" step (in
// minutes of arc) whose bars are at least minBarPx wide, and the label step
// (a multiple of the bar step) at least minLabelPx apart.
const NICE_MIN = [0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
export function tickSteps(pxPerMinute, minBarPx = 6, minLabelPx = 56) {
  const bar = NICE_MIN.find((m) => m * pxPerMinute >= minBarPx) ?? 600
  const label = NICE_MIN.find((m) => m >= bar && m * pxPerMinute >= minLabelPx && (m / bar) % 1 === 0) ?? 600
  return { bar, label }
}

// All multiples of `stepMin` minutes inside [lo, hi] degrees.
export function minuteTicks(lo, hi, stepMin) {
  const a = Math.ceil((lo * 60) / stepMin - 1e-9)
  const b = Math.floor((hi * 60) / stepMin + 1e-9)
  const out = []
  for (let i = a; i <= b && out.length < 400; i++) out.push((i * stepMin) / 60)
  return out
}

// "38°55′N" / "76°29.5′W" chart border label for a tick value.
export function fmtTick(v, pos, neg) {
  const hemi = v >= 0 ? pos : neg
  const t = Math.round(Math.abs(v) * 600) // tenths of a minute
  const d = Math.floor(t / 600)
  const m = (t % 600) / 10
  const mm = Number.isInteger(m) ? String(m).padStart(2, '0') : m.toFixed(1).padStart(4, '0')
  return m === 0 ? `${d}°${hemi}` : `${d}°${mm}′${hemi}`
}

// Decimal degrees → mariner's degrees-and-minutes ("38°58.5′N"). Rounds to
// tenths of a minute FIRST so 59.96′ carries into the degree (no "38°60.0′").
export function toDM(v, pos, neg) {
  const hemi = v >= 0 ? pos : neg
  const t = Math.round(Math.abs(v) * 600)
  const d = Math.floor(t / 600)
  const m = (t % 600) / 10
  return `${d}°${m.toFixed(1)}′${hemi}`
}
export const formatPosition = ({ lat, lng }) => `${toDM(lat, 'N', 'S')} ${toDM(lng, 'E', 'W')}`

// ---------------------------------------------------------------------------
// World locator projection (equirectangular, clipped to the sailing latitudes)
// — shared with the bake that writes public/charts/_world.json.
// ---------------------------------------------------------------------------
export const WORLD = { w: 1000, latTop: 78, latBottom: -58 }
WORLD.h = Math.round((WORLD.w * (WORLD.latTop - WORLD.latBottom)) / 360)
export function worldXY(lat, lng) {
  const x = ((lng + 180) / 360) * WORLD.w
  const y = ((WORLD.latTop - lat) / (WORLD.latTop - WORLD.latBottom)) * WORLD.h
  return [x, y]
}
