// Real great-circle length of the 2026 → 2028 campaign route, in nautical
// miles — the "CAMPAIGN ROUTE · NM" readout on the home helm panel. Computed
// from the same source of truth The Road uses (campaignStops), mirroring
// TheRoad.jsx's math (centralAngle + the 3440.065 NM/rad radius and the same
// stop→waypoint flattening) so the home figure matches The Road's world.
//
// Kept dependency-free ON PURPOSE: The Road's copy of this math lives inside
// a module that statically imports three.js/the globe, so importing it here
// would drag the whole globe into the home bundle. This imports only the data.
import STOPS from './campaignStops'

const DEG = Math.PI / 180
const NM_PER_RAD = 3440.065 // Earth mean radius in nautical miles (matches TheRoad)

// Great-circle central angle (radians, 0..π) between two {lat,lng} points.
export function centralAngle(a, b) {
  const la1 = a.lat * DEG
  const la2 = b.lat * DEG
  const dLa = (b.lat - a.lat) * DEG
  const dLn = (b.lng - a.lng) * DEG
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLn / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// Great-circle distance in whole nautical miles.
export function distanceNm(a, b) {
  return centralAngle(a, b) * NM_PER_RAD
}

// Initial great-circle bearing from a to b, degrees true 0..360.
export function bearingDeg(a, b) {
  const la1 = a.lat * DEG
  const la2 = b.lat * DEG
  const dLn = (b.lng - a.lng) * DEG
  const y = Math.sin(dLn) * Math.cos(la2)
  const x = Math.cos(la1) * Math.sin(la2) - Math.sin(la1) * Math.cos(la2) * Math.cos(dLn)
  return (Math.atan2(y, x) / DEG + 360) % 360
}

// Flatten the stops into ordered waypoints exactly like TheRoad's buildFrames:
// a stop's `points` (a multi-city block) or, failing that, its own lat/lng.
export const ROUTE_WAYPOINTS = STOPS.flatMap((s) =>
  s.points && s.points.length ? s.points.map((p) => ({ lat: p.lat, lng: p.lng })) : [{ lat: s.lat, lng: s.lng }]
)

// Whole-route length, rounded to the nearest 10 NM (instrument-plausible).
export const ROUTE_NM = (() => {
  let nm = 0
  for (let i = 1; i < ROUTE_WAYPOINTS.length; i++) {
    nm += distanceNm(ROUTE_WAYPOINTS[i - 1], ROUTE_WAYPOINTS[i])
  }
  return Math.round(nm / 10) * 10
})()
