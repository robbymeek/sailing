// ============================================================================
//  Radar — the campaign radar scope (home overview's Road row).
// ============================================================================
//  Extracted verbatim from the retired Helm Station panel. A polar grid SVG
//  under a CSS conic-gradient beam; blips are the upcoming 2026 venues by true
//  initial bearing / great-circle distance from San Pedro, timed to flash as
//  the beam passes (delay = bearing/360 × period).
//
//  Host contract (see HomeOverview's Road row): give the scope a
//  `container-type: size` wrapper (it inscribes via min(100cqw, 100cqh)) that
//  provides the CSS vars the classed elements consume — --hp-phos[-rgb],
//  --hp-phos-hi-rgb, --hp-scope-*, --hp-sweep-s, --hp-mono — and pass `colors`
//  for the SVG presentation attributes (they cannot read var()).
import STOPS from '../data/campaignStops'
import { distanceNm, bearingDeg } from '../data/routeStats'
import './radar.css'

// Default SVG colours = the old helm panel's white-sheet palette; the Road row
// passes its own blue-on-black set.
const DEFAULT_COLORS = { phos: 'rgba(10, 85, 235,', grid: 'rgba(20, 28, 54,', bone: 'rgba(20, 28, 54,' }

const RADAR_BASE = { lat: 33.7088, lng: -118.2836 }
const RADAR_RANGE_NM = 8000 // outer ring; rings every 2000 NM
const SWEEP_S = 4.4 // beam period; must match --hp-sweep-s on the host
const RADAR_BLIPS = [
  // Annapolis is skipped — at this range it sits on top of NYC (one target).
  ['nyc-training', 'NYC'],
  ['dun-laoghaire-worlds', 'DUB'],
  ['miami-jan-27', 'MIA'],
  ['australia-breeze-26', 'ADL'],
  ['vilamoura-26', 'VIL'],
].map(([id, label]) => {
  const s = STOPS.find((t) => t.id === id)
  return { label, brg: bearingDeg(RADAR_BASE, s), nm: distanceNm(RADAR_BASE, s) }
})

// ring caption ("2k", "4.5k") for a scope radius given in NM
const fmtK = (nm) => (nm >= 1000 ? `${(nm / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(Math.round(nm)))

// Course line: San Pedro → the first waypoint out (NYC training).
const NEXT_WPT = { lat: 40.7128, lng: -74.006 }
const COG = Math.round(bearingDeg(RADAR_BASE, NEXT_WPT))

// Fixed sea clutter near the scope centre (deterministic — no runtime random).
const CLUTTER = [
  [38, 0.24], [102, 0.18], [155, 0.11], [201, 0.2], [248, 0.14], [297, 0.22], [334, 0.12],
].map(([brg, rf], i) => ({ brg, rf: 0.1 + rf, o: 0.1 + (i % 3) * 0.04 }))

const rad = (d) => (d * Math.PI) / 180
const polar = (cx, cy, r, deg) => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))]
const p3 = (n) => String(n).padStart(3, '0')

export default function Radar({ colors } = {}) {
  const { phos, grid, bone } = { ...DEFAULT_COLORS, ...colors }
  const range = RADAR_RANGE_NM
  const rings = [22, 44, 66, 88]
  const spokes = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <div className="hp-scope-wrap">
      <div className="hp-scope">
        <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {rings.map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={grid + '0.22)'} strokeWidth="0.7" />
          ))}
          {spokes.map((a) => {
            const [x1, y1] = polar(100, 100, 10, a)
            const [x2, y2] = polar(100, 100, 94, a)
            return (
              <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={grid + (a % 90 === 0 ? '0.2)' : '0.12)')} strokeWidth="0.6" />
            )
          })}
          {/* bearing ring labels */}
          {spokes.map((a) => {
            const [x, y] = polar(100, 100, 80, a)
            return (
              <text key={a} x={x} y={y + 2} textAnchor="middle" fontSize="6" fill={grid + '0.42)'} style={{ fontFamily: 'var(--hp-mono)' }}>
                {p3(a)}
              </text>
            )
          })}
          {/* range labels along the SW diagonal */}
          {rings.map((r, i) => {
            const [x, y] = polar(100, 100, r, 225)
            return (
              <text key={r} x={x - 2} y={y + 4} textAnchor="end" fontSize="5.5" fill={grid + '0.34)'} style={{ fontFamily: 'var(--hp-mono)' }}>
                {fmtK((range * (i + 1)) / 4)}
              </text>
            )
          })}
          {/* course line toward the next waypoint */}
          {(() => {
            const [x2, y2] = polar(100, 100, 88, COG)
            return <line x1="100" y1="100" x2={x2} y2={y2} stroke={bone + '0.3)'} strokeWidth="0.8" strokeDasharray="2 3" />
          })()}
          {/* fixed sea clutter */}
          {CLUTTER.map((c, i) => {
            const [x, y] = polar(100, 100, c.rf * 88, c.brg)
            return <circle key={i} cx={x} cy={y} r={0.9 + (i % 2) * 0.5} fill={phos + `${c.o})`} />
          })}
          {/* own ship */}
          <circle cx="100" cy="100" r="2" fill={bone + '0.9)'} />
          <circle cx="100" cy="100" r="4.5" fill="none" stroke={phos + '0.4)'} strokeWidth="0.6" />
        </svg>
        <div className="hp-sweep" aria-hidden="true" />
        {RADAR_BLIPS.map((b) => {
          const rr = (Math.min(b.nm, range * 0.94) / range) * 44
          const left = 50 + rr * Math.sin(rad(b.brg))
          const top = 50 - rr * Math.cos(rad(b.brg))
          return (
            <div
              key={b.label}
              className="hp-blip"
              style={{ left: `${left}%`, top: `${top}%`, '--blip-delay': `${((b.brg / 360) * SWEEP_S).toFixed(2)}s` }}
            >
              <span className="hp-blip-tag">{b.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
