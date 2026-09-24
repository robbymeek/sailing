// ============================================================================
//  places — the station card's PLACE list, derived from The Road stops.
// ============================================================================
//  A "place" is one sailing venue with one baked chart: every single-venue stop,
//  and every waypoint of a multi-city block, keyed by a city slug so repeat
//  visits (Annapolis 2026 + 2027, San Pedro ×3) share one chart. Venues that
//  sit on the same water (Auckland / Takapuna) alias onto one chart key.
//
//  PURE and dependency-free (no import.meta): the chart bake (plain Node) and
//  the browser resolver both call placesFromStops(STOPS, overrides), passing
//  the stops in, so this file never imports campaignStops itself.

// 'Dún Laoghaire' → 'dun-laoghaire', 'Hyères' → 'hyeres'
export const slugify = (s) =>
  String(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

// Places closer than this (degrees) share one chart.
const SAME_WATER_DEG = 0.001

// The places a stop contributes: its waypoints, else its single venue.
export function stopPlaces(stop) {
  if (stop.points?.length) {
    return stop.points.map((p) => {
      const v = stop.venues?.find((x) => x.city === p.label)
      return { city: p.label, noc: v?.noc || stop.venues?.[0]?.noc || '', lat: p.lat, lng: p.lng }
    })
  }
  const v = stop.venues?.[0] || {}
  return [{ city: v.city || stop.region, noc: v.noc || '', lat: stop.lat, lng: stop.lng }]
}

// One entry per distinct city slug, in first-seen order:
//   { key, chartKey, city, noc, lat, lng }
// chartKey = the key of the FIRST place on the same water (alias target), so
// the bake only cuts one sheet for Auckland + Takapuna.
// `overrides` may add free places ({ place, area, lat, lng, chartId? }).
export function placesFromStops(stops, overrides = []) {
  const out = []
  const byKey = new Map()
  const add = (p) => {
    const key = p.key || slugify(p.city)
    if (!key || byKey.has(key)) return
    const twin = out.find((q) => Math.abs(q.lat - p.lat) < SAME_WATER_DEG && Math.abs(q.lng - p.lng) < SAME_WATER_DEG)
    const entry = { key, chartKey: twin ? twin.chartKey : key, city: p.city, noc: p.noc || '', lat: p.lat, lng: p.lng }
    byKey.set(key, entry)
    out.push(entry)
  }
  for (const s of stops) for (const p of stopPlaces(s)) add(p)
  for (const o of overrides) {
    if (o && o.place && Number.isFinite(o.lat) && Number.isFinite(o.lng)) {
      add({ key: o.chartId || slugify(o.place), city: o.place, noc: o.noc || '', lat: o.lat, lng: o.lng })
    }
  }
  return out
}
