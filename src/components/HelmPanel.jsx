// ============================================================================
//  HelmPanel — the nautical control console the home page becomes on scroll.
// ============================================================================
//  A dark navy instrument panel in a bolted steel casing (see the owner's
//  reference: black bezels, phosphor-green screens, ember LED readouts,
//  white-needle gauges, knobs and toggles under a cold top light). Purely
//  presentational — HomeHelmSection owns the scroll entrance.
//
//  Every readout is REAL campaign data, so the owner tweaks content, not
//  plumbing:
//    · radar blips     = upcoming 2026 venues by true bearing/distance from
//                        San Pedro (the next-event venue)
//    · voyage plan     = the whole 2026→2028 route from campaignStops
//    · T-MINUS         = the shared LA 2028 countdown (site format)
//    · ROUTE NM        = great-circle length of the campaign route
//    · NEXT EVENT      = San Pedro OCR (same hardcode as Biography's chrome)
//
//  All motion is cosmetic CSS animation (helmPanel.css) — no rAF, no WebGL.
//  The seven-segment digits are real SVG segments, not a font.
import useCountdown from '../hooks/useCountdown'
import STOPS from '../data/campaignStops'
import { TOUR_STATS } from '../data/tourChapters'
import { ROUTE_NM, ROUTE_WAYPOINTS, distanceNm, bearingDeg } from '../data/routeStats'
import './helmPanel.css'

// --------------------------------------------------------------------------
// Color themes — the owner is comparing three consoles. Resolved ONCE at
// module scope from ?helm=photo|blend (dev-only, same idiom as the orb's
// ?key= TUNE overrides in glassOrbScene); prod always renders classic.
// CSS surfaces theme via the .hp-root--<variant> token blocks in
// helmPanel.css; the values here cover SVG presentation attributes, which
// cannot read var(). Instrument colors stay classic in "photo" per the
// owner (green phosphor, ember LEDs, red horn); "blend" wears the site's
// electric blue with white T-MINUS digits.
// --------------------------------------------------------------------------
const VARIANT = (() => {
  if (import.meta.env.DEV && typeof location !== 'undefined') {
    const v = new URLSearchParams(location.search).get('helm')
    if (v === 'photo' || v === 'blend') return v
  }
  return 'classic'
})()

const THEMES = {
  classic: {
    phos: 'rgba(77, 230, 144,',
    grid: 'rgba(77, 230, 144,', // scope rings / chart graticule ride the phosphor
    bone: 'rgba(233, 239, 248,',
    gaugeFace: '#0a0f16',
    gaugeBezel: '#05090f',
    gaugeRim: 'rgba(147,162,184,0.22)',
    segDays: null, // css ember defaults
    segNm: { color: 'var(--hp-phos)', glow: 'rgba(77, 230, 144, 0.5)' },
    heel: null, // css ember defaults
  },
  photo: {
    phos: 'rgba(77, 230, 144,',
    grid: 'rgba(77, 230, 144,',
    bone: 'rgba(242, 239, 231,', // warm cream, from the sail/spray
    gaugeFace: '#0e1112',
    gaugeBezel: '#08090b',
    gaugeRim: 'rgba(147,162,184,0.22)',
    segDays: null,
    segNm: { color: 'var(--hp-phos)', glow: 'rgba(77, 230, 144, 0.5)' },
    heel: null,
  },
  // v2 "editorial sheet": white card, ink structure, ONE electric-blue accent
  // carrying the live data (sweep, route, countdown). Glows die on white —
  // helmPanel.css kills them; 'transparent' keeps the inline vars inert.
  blend: {
    phos: 'rgba(10, 85, 235,',
    grid: 'rgba(20, 28, 54,', // ink hairline structure on white
    bone: 'rgba(20, 28, 54,',
    gaugeFace: '#ffffff',
    gaugeBezel: '#ffffff',
    gaugeRim: 'rgba(20, 28, 54, 0.25)',
    segDays: { color: 'rgb(10, 85, 235)', glow: 'transparent' },
    segNm: { color: 'rgba(20, 28, 54, 0.9)', glow: 'transparent' },
    heel: { color: 'rgb(10, 85, 235)', glow: 'transparent' },
  },
}
const T = THEMES[VARIANT]

const PHOS = T.phos
const GRID = T.grid
const BONE = T.bone

// Module label wording — the blend sheet trades spec-plate jargon for the
// site's tasteful editorial voice; classic/photo keep the instrument plates.
// COMPACT is a page-load constant (App reloads on a 700px breakpoint cross),
// trimming the two labels that share a row on phones.
const COMPACT = typeof window !== 'undefined' && window.innerWidth < 700
const LABELS =
  VARIANT === 'blend'
    ? {
        radar: 'RADAR · THE 2026 SEASON · 8000 NM',
        chart: 'VOYAGE PLAN · 2026-2028',
        wind: 'APPARENT WIND · KNOTS',
        hdg: 'HEADING · MAGNETIC',
        days: COMPACT ? 'COUNTDOWN' : 'COUNTDOWN · LA 2028',
        nm: COMPACT ? 'THE ROUTE · NM' : 'THE ROUTE · NAUTICAL MILES',
        heel: 'HEEL · DEGREES',
        next: 'NEXT EVENT',
      }
    : {
        radar: 'RADAR · RANGE 8000 NM · RINGS 2000',
        chart: 'VOYAGE PLAN · 2026-2028',
        wind: 'APPARENT WIND · KN',
        hdg: 'HEADING · DEG',
        days: 'T-MINUS · LA 2028',
        nm: 'CAMPAIGN ROUTE · NM',
        heel: 'HEEL · DEG',
        next: 'COMMS',
      }

// Same literal as App.jsx / MainView.jsx / TheRoad.jsx — local midnight.
const LA_TARGET = Date.parse('2028-07-14T00:00:00')
// Same hardcode as Biography's "Next Event" chrome line.
const NEXT_EVENT = { name: 'SAN PEDRO OCR', where: 'LOS ANGELES', when: 'JUL 20 2026', ms: Date.parse('2026-07-20T00:00:00') }

// --------------------------------------------------------------------------
// Radar picture — the upcoming 2026 venues as targets, plotted by true
// initial bearing / great-circle distance from San Pedro (33.7088,-118.2836).
// --------------------------------------------------------------------------
const RADAR_BASE = { lat: 33.7088, lng: -118.2836 }
const RADAR_RANGE_NM = 8000 // outer ring; rings every 2000 NM
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

// Course/next-leg numbers shared by the chart, the HDG gauge and the scope's
// course line: San Pedro → the first waypoint out (NYC training).
const NEXT_WPT = { name: 'NEW YORK', ...{ lat: 40.7128, lng: -74.006 } }
const COG = Math.round(bearingDeg(RADAR_BASE, NEXT_WPT))
const NEXT_WPT_NM = Math.round(distanceNm(RADAR_BASE, NEXT_WPT) / 10) * 10

// Fixed sea clutter near the scope centre (deterministic — no runtime random).
const CLUTTER = [
  [38, 0.24], [102, 0.18], [155, 0.11], [201, 0.2], [248, 0.14], [297, 0.22], [334, 0.12],
].map(([brg, rf], i) => ({ brg, rf: 0.1 + rf, o: 0.1 + (i % 3) * 0.04 }))

const rad = (d) => (d * Math.PI) / 180
const polar = (cx, cy, r, deg) => [cx + r * Math.sin(rad(deg)), cy - r * Math.cos(rad(deg))]
const p2 = (n) => String(n).padStart(2, '0')
const p3 = (n) => String(n).padStart(3, '0')

// Decimal degrees → mariner's degrees-and-minutes ("33°42.5'N").
function toDM(v, pos, neg) {
  const hemi = v >= 0 ? pos : neg
  const a = Math.abs(v)
  const d = Math.floor(a)
  const m = (a - d) * 60
  return `${d}°${m.toFixed(1)}'${hemi}`
}
const POS_LINE = `POS ${toDM(RADAR_BASE.lat, 'N', 'S')} ${toDM(RADAR_BASE.lng, 'E', 'W')}`

// --------------------------------------------------------------------------
// Seven-segment renderer — real segment polygons (unlit segments ghosted),
// not a font. Digit cell: 40×80 units, advance 50; colon advance 26.
// --------------------------------------------------------------------------
const segH = (x, y) =>
  `${x + 1.5},${y + 4} ${x + 5},${y} ${x + 27},${y} ${x + 30.5},${y + 4} ${x + 27},${y + 8} ${x + 5},${y + 8}`
const segV = (x, y) =>
  `${x + 4},${y + 1.5} ${x + 8},${y + 5} ${x + 8},${y + 27} ${x + 4},${y + 30.5} ${x},${y + 27} ${x},${y + 5}`
const SEG_POINTS = {
  A: segH(4, 0), B: segV(32, 4), C: segV(32, 44), D: segH(4, 72), E: segV(0, 44), F: segV(0, 4), G: segH(4, 36),
}
const DIGIT_SEGS = {
  0: 'ABCDEF', 1: 'BC', 2: 'ABGED', 3: 'ABGCD', 4: 'FGBC',
  5: 'AFGCD', 6: 'AFGEDC', 7: 'ABC', 8: 'ABCDEFG', 9: 'ABCFGD', '-': 'G', ' ': '',
}

// text: digits / colons / spaces / '-'. labels: [{text, from, to}] under the
// glyphs spanning glyph indices — used for the DAYS·HRS·MIN·SEC captions.
function SegDisplay({ text, color = 'var(--hp-ember)', glow = 'rgba(255, 122, 47, 0.55)', labels = null, style }) {
  const glyphs = []
  let x = 6
  for (const ch of text) {
    if (ch === ':') {
      glyphs.push({ type: 'colon', x })
      x += 26
    } else {
      glyphs.push({ type: 'digit', ch, x })
      x += 50
    }
  }
  // +2 covers the group's translate(8,3) so the last digit's skewed corner
  // is never clipped at the right edge of the viewBox.
  const w = x + 2
  const h = labels ? 100 : 86
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="hp-seg"
      style={{ width: '100%', height: '100%', '--seg-color': color, '--seg-glow': glow, ...style }}
    >
      <g transform="skewX(-4) translate(8, 3)">
        {glyphs.map((g, i) => {
          if (g.type === 'colon') {
            return (
              <g key={i}>
                <rect className="hp-seg-on" x={g.x + 5} y={22} width={7} height={7} />
                <rect className="hp-seg-on" x={g.x + 5} y={52} width={7} height={7} />
              </g>
            )
          }
          const lit = DIGIT_SEGS[g.ch] ?? ''
          return (
            <g key={i} transform={`translate(${g.x}, 0)`}>
              {Object.entries(SEG_POINTS).map(([name, pts]) => (
                <polygon key={name} className={lit.includes(name) ? 'hp-seg-on' : 'hp-seg-off'} points={pts} />
              ))}
            </g>
          )
        })}
        {labels &&
          labels.map((l) => {
            const a = glyphs[l.from]
            const b = glyphs[l.to]
            if (!a || !b) return null // a label span outside the glyphs is a bug upstream — never throw in render
            const cx = (a.x + b.x + 40) / 2
            return (
              <text
                key={l.text}
                x={cx}
                y={95}
                textAnchor="middle"
                fontSize="9"
                letterSpacing="2"
                style={{ fontFamily: 'var(--hp-mono)' }}
                fill={BONE + '0.45)'}
              >
                {l.text}
              </text>
            )
          })}
      </g>
    </svg>
  )
}

// The ticking T-MINUS clock, isolated so the 1s tick re-renders only this.
// Days are padded to 3 digits so the glyph count never changes — the label
// spans below index into the glyph list, and a 12→11 glyph shift at the
// 100-day mark would misalign them (a bare '099' also reads instrument-true).
function CountdownSeg() {
  const { days, hrs, mins, secs } = useCountdown(LA_TARGET)
  return (
    <SegDisplay
      text={`${p3(days)}:${p2(hrs)}:${p2(mins)}:${p2(secs)}`}
      {...(T.segDays ?? {})}
      labels={[
        { text: 'DAYS', from: 0, to: 2 },
        { text: 'HRS', from: 4, to: 5 },
        { text: 'MIN', from: 7, to: 8 },
        { text: 'SEC', from: 10, to: 11 },
      ]}
    />
  )
}

// --------------------------------------------------------------------------
// Radar scope — polar grid SVG under a CSS conic-gradient beam; blips are
// timed to flash as the beam passes (delay = bearing/360 × period).
// --------------------------------------------------------------------------
function Radar() {
  const rings = [22, 44, 66, 88]
  const spokes = Array.from({ length: 12 }, (_, i) => i * 30)
  return (
    <div className="hp-scope-wrap">
      <div className="hp-scope">
        <svg viewBox="0 0 200 200" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          {rings.map((r) => (
            <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={GRID + '0.22)'} strokeWidth="0.7" />
          ))}
          {spokes.map((a) => {
            const [x1, y1] = polar(100, 100, 10, a)
            const [x2, y2] = polar(100, 100, 94, a)
            return (
              <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GRID + (a % 90 === 0 ? '0.2)' : '0.12)')} strokeWidth="0.6" />
            )
          })}
          {/* bearing ring labels */}
          {spokes.map((a) => {
            const [x, y] = polar(100, 100, 80, a)
            return (
              <text key={a} x={x} y={y + 2} textAnchor="middle" fontSize="6" fill={GRID + '0.42)'} style={{ fontFamily: 'var(--hp-mono)' }}>
                {p3(a)}
              </text>
            )
          })}
          {/* range labels along the SW diagonal */}
          {rings.map((r, i) => {
            const [x, y] = polar(100, 100, r, 225)
            return (
              <text key={r} x={x - 2} y={y + 4} textAnchor="end" fontSize="5.5" fill={GRID + '0.34)'} style={{ fontFamily: 'var(--hp-mono)' }}>
                {(i + 1) * 2}k
              </text>
            )
          })}
          {/* course line toward the next waypoint */}
          {(() => {
            const [x2, y2] = polar(100, 100, 88, COG)
            return <line x1="100" y1="100" x2={x2} y2={y2} stroke={BONE + '0.3)'} strokeWidth="0.8" strokeDasharray="2 3" />
          })()}
          {/* fixed sea clutter */}
          {CLUTTER.map((c, i) => {
            const [x, y] = polar(100, 100, c.rf * 88, c.brg)
            return <circle key={i} cx={x} cy={y} r={0.9 + (i % 2) * 0.5} fill={PHOS + `${c.o})`} />
          })}
          {/* own ship */}
          <circle cx="100" cy="100" r="2" fill={BONE + '0.9)'} />
          <circle cx="100" cy="100" r="4.5" fill="none" stroke={PHOS + '0.4)'} strokeWidth="0.6" />
        </svg>
        <div className="hp-sweep" aria-hidden="true" />
        {RADAR_BLIPS.map((b) => {
          const rr = (Math.min(b.nm, RADAR_RANGE_NM * 0.94) / RADAR_RANGE_NM) * 44
          const left = 50 + rr * Math.sin(rad(b.brg))
          const top = 50 - rr * Math.cos(rad(b.brg))
          return (
            <div
              key={b.label}
              className="hp-blip"
              style={{ left: `${left}%`, top: `${top}%`, '--blip-delay': `${((b.brg / 360) * 4.4).toFixed(2)}s` }}
            >
              <span className="hp-blip-tag">{b.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Voyage plan — the whole 2026→2028 campaign route on a phosphor chart:
// graticule, bowed great-circle-ish legs, waypoints, own ship, LA 2028 mark.
// --------------------------------------------------------------------------
const CHART = (() => {
  const W = 400
  const H = 240
  const lats = ROUTE_WAYPOINTS.map((p) => p.lat)
  const lngs = ROUTE_WAYPOINTS.map((p) => p.lng)
  const minLat = Math.min(...lats) - 6
  const maxLat = Math.max(...lats) + 8
  const minLng = Math.min(...lngs) - 8
  const maxLng = Math.max(...lngs) + 8
  const px = (lng) => 8 + ((lng - minLng) / (maxLng - minLng)) * (W - 16)
  const py = (lat) => 30 + ((maxLat - lat) / (maxLat - minLat)) * (H - 62)
  const pts = ROUTE_WAYPOINTS.map((p) => [px(p.lng), py(p.lat)])
  const legs = []
  for (let i = 1; i < pts.length; i++) {
    const [x1, y1] = pts[i - 1]
    const [x2, y2] = pts[i]
    const dx = x2 - x1
    const dy = y2 - y1
    const len = Math.hypot(dx, dy) || 1
    // bow each leg gently toward the top of the chart — reads as a route, not a wire
    let nx = -dy / len
    let ny = dx / len
    if (ny > 0) { nx = -nx; ny = -ny }
    const bow = Math.min(9, len * 0.16)
    legs.push({ d: `M ${x1} ${y1} Q ${(x1 + x2) / 2 + nx * bow} ${(y1 + y2) / 2 + ny * bow} ${x2} ${y2}`, active: i === 1 })
  }
  const grat = {
    lngs: [-120, -60, 0, 60, 120].filter((l) => l > minLng && l < maxLng),
    lats: [-30, 0, 30].filter((l) => l > minLat && l < maxLat),
  }
  // A few key venues, labelled like chart soundings (anchor picked per side
  // of the chart so labels sit clear of the route bundle).
  const marks = [
    { name: 'DUBLIN', lat: 53.2956, lng: -6.1306, dx: 4, dy: -4, anchor: 'start' },
    { name: 'FORTALEZA', lat: -3.718, lng: -38.515, dx: 4, dy: 9, anchor: 'start' },
    { name: 'PALMA', lat: 39.5645, lng: 2.6333, dx: 4, dy: -5, anchor: 'start' },
    { name: 'AUCKLAND', lat: -36.78576, lng: 174.77544, dx: -5, dy: 9, anchor: 'end' },
  ].map((m) => ({ ...m, x: px(m.lng), y: py(m.lat) }))
  return { W, H, px, py, pts, legs, grat, marks }
})()

function Chart() {
  const { W, H, px, py, pts, legs, grat, marks } = CHART
  const [ownX, ownY] = pts[0]
  const [laX, laY] = pts[pts.length - 1]
  return (
    <div className="hp-screen">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} preserveAspectRatio="xMidYMid meet">
        {/* graticule */}
        {grat.lngs.map((l) => (
          <line key={`g${l}`} x1={px(l)} y1={24} x2={px(l)} y2={H - 26} stroke={GRID + '0.1)'} strokeWidth="0.6" />
        ))}
        {grat.lats.map((l) => (
          <line key={`t${l}`} x1={8} y1={py(l)} x2={W - 8} y2={py(l)} stroke={GRID + '0.1)'} strokeWidth="0.6" />
        ))}
        {grat.lngs.map((l) => (
          <text key={`gl${l}`} x={px(l) + 2} y={H - 30} fontSize="6" fill={GRID + '0.3)'} style={{ fontFamily: 'var(--hp-mono)' }}>
            {Math.abs(l)}{l < 0 ? 'W' : l > 0 ? 'E' : ''}
          </text>
        ))}
        {/* depth-contour texture, lower corner */}
        <path d={`M 10 ${H - 40} q 30 -14 58 -4 t 52 6`} fill="none" stroke={GRID + '0.16)'} strokeWidth="0.7" strokeDasharray="1 3" />
        <path d={`M 10 ${H - 52} q 26 -12 50 -5 t 46 4`} fill="none" stroke={GRID + '0.11)'} strokeWidth="0.7" strokeDasharray="1 3" />
        {/* the route */}
        {legs.map((l, i) => (
          <path
            key={i}
            d={l.d}
            className={l.active ? 'hp-active-leg' : undefined}
            fill="none"
            stroke={PHOS + (l.active ? '0.9)' : '0.45)')}
            strokeWidth={l.active ? 1.5 : 1}
          />
        ))}
        {pts.map(([x, y], i) => (
          <rect key={i} x={x - 1.4} y={y - 1.4} width="2.8" height="2.8" fill={PHOS + '0.75)'} />
        ))}
        {marks.map((m) => (
          <text key={m.name} x={m.x + m.dx} y={m.y + m.dy} textAnchor={m.anchor} fontSize="6" fill={GRID + '0.5)'} style={{ fontFamily: 'var(--hp-mono)' }}>
            {m.name}
          </text>
        ))}
        {/* own ship at San Pedro, heading out */}
        <g transform={`translate(${ownX}, ${ownY}) rotate(${COG})`}>
          <polygon points="0,-6 4,4 0,2 -4,4" fill={BONE + '0.95)'} />
        </g>
        {/* the finish: LA 2028 */}
        <circle cx={laX} cy={laY} r="6" fill="none" stroke={PHOS + '0.9)'} strokeWidth="1" />
        <circle cx={laX} cy={laY} r="1.8" fill={PHOS + '0.95)'} />
        <text x={laX + 10} y={laY + 3} fontSize="7.5" fontWeight="700" fill={PHOS + '0.9)'} style={{ fontFamily: 'var(--hp-mono)' }} className="hp-lcd-glow">
          LA 2028
        </text>
        {/* status rows */}
        <text x="10" y="13" fontSize="8" fill={PHOS + '0.85)'} style={{ fontFamily: 'var(--hp-mono)' }}>{POS_LINE}</text>
        <text x="10" y="22" fontSize="7" fill={PHOS + '0.6)'} style={{ fontFamily: 'var(--hp-mono)' }}>
          {`COG ${p3(COG)}°T  SOG 6.4 KN`}
        </text>
        <text x={W - 10} y="13" textAnchor="end" fontSize="7" fill={PHOS + '0.55)'} style={{ fontFamily: 'var(--hp-mono)' }}>
          ILCA 7 · VOYAGE PLAN 26-28
        </text>
        <text x="10" y={H - 8} fontSize="8" fill={PHOS + '0.8)'} style={{ fontFamily: 'var(--hp-mono)' }}>
          {`NEXT WPT ${NEXT_WPT.name} · ${NEXT_WPT_NM} NM`}
        </text>
      </svg>
    </div>
  )
}

// --------------------------------------------------------------------------
// Round analog gauge — white ticks/needle on a near-black face. `compass`
// maps 0-360 around the full dial; otherwise min..max spans -120°..+120°.
// --------------------------------------------------------------------------
function RoundGauge({ value, min = 0, max = 40, step = 10, minor = 5, redFrom = null, unit, compass = false, redHub = false, wobbleDelay = '0s' }) {
  const angle = compass ? (v) => v : (v) => -120 + ((v - min) / (max - min)) * 240
  const majors = []
  const minors = []
  if (compass) {
    for (let a = 0; a < 360; a += 30) majors.push(a)
    for (let a = 0; a < 360; a += 10) if (a % 30) minors.push(a)
  } else {
    for (let v = min; v <= max; v += step) majors.push(angle(v))
    for (let v = min; v <= max; v += minor) if ((v - min) % step) minors.push(angle(v))
  }
  const compassLabel = (a) => (a === 0 ? 'N' : a === 90 ? 'E' : a === 180 ? 'S' : a === 270 ? 'W' : String(a))
  const arc = (a1, a2, r) => {
    const [x1, y1] = polar(100, 100, r, a1)
    const [x2, y2] = polar(100, 100, r, a2)
    return `M ${x1} ${y1} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`
  }
  return (
    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
      <circle cx="100" cy="100" r="97" fill={T.gaugeBezel} />
      <circle cx="100" cy="100" r="94" fill={T.gaugeFace} stroke={T.gaugeRim} strokeWidth="1" />
      {redFrom !== null && (
        <path d={arc(angle(redFrom), angle(max), 87)} fill="none" stroke="rgba(255,75,54,0.85)" strokeWidth="4" />
      )}
      {majors.map((a) => {
        const [x1, y1] = polar(100, 100, 80, a)
        const [x2, y2] = polar(100, 100, 92, a)
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={BONE + '0.85)'} strokeWidth="2" />
      })}
      {minors.map((a) => {
        const [x1, y1] = polar(100, 100, 86, a)
        const [x2, y2] = polar(100, 100, 92, a)
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={BONE + '0.4)'} strokeWidth="1" />
      })}
      {(compass ? majors : majors).map((a, i) => {
        const [x, y] = polar(100, 100, 66, a)
        const label = compass ? compassLabel(a) : String(min + i * step)
        return (
          <text key={a} x={x} y={y + 4.5} textAnchor="middle" fontSize={compass ? 12 : 14} fontWeight="600" fill={BONE + '0.78)'}>
            {label}
          </text>
        )
      })}
      <text x="100" y="142" textAnchor="middle" fontSize="10" letterSpacing="2.5" fill={BONE + '0.5)'}>
        {unit}
      </text>
      {/* glass highlight */}
      <ellipse cx="76" cy="62" rx="46" ry="30" fill="rgba(233,239,248,0.045)" />
      <g className="hp-needle" style={{ '--angle': `${angle(value)}deg`, '--wobble-delay': wobbleDelay }}>
        <polygon points="100,24 96.5,110 103.5,110" fill={BONE + '0.96)'} />
        <polygon points="98,110 102,110 101,120 99,120" fill={BONE + '0.6)'} />
      </g>
      <circle cx="100" cy="100" r="8" fill={redHub ? '#a81f16' : '#55606f'} stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
      <circle cx="97" cy="97" r="2.5" fill="rgba(255,255,255,0.35)" />
    </svg>
  )
}

// --------------------------------------------------------------------------
// Heel meter — an ember LED arc, port to starboard, like the reference
// panel's orange display. Lit from centre to the current heel.
// --------------------------------------------------------------------------
function HeelArc({ value = 12, max = 35 }) {
  const N = 22
  const segs = []
  for (let k = 0; k < N; k++) {
    const a0 = -90 + (k * 180) / N + 1.4
    const a1 = -90 + ((k + 1) * 180) / N - 1.4
    const mid = (a0 + a1) / 2
    const heelAt = (mid / 90) * max
    const lit = heelAt >= -0.5 && heelAt <= value
    const [ox1, oy1] = polar(110, 108, 92, a0)
    const [ox2, oy2] = polar(110, 108, 92, a1)
    const [ix2, iy2] = polar(110, 108, 74, a1)
    const [ix1, iy1] = polar(110, 108, 74, a0)
    segs.push({ pts: `${ox1},${oy1} ${ox2},${oy2} ${ix2},${iy2} ${ix1},${iy1}`, lit })
  }
  return (
    <svg
      viewBox="0 0 220 120"
      style={{
        width: '100%',
        height: '100%',
        ...(T.heel ? { '--seg-color': T.heel.color, '--seg-glow': T.heel.glow } : {}),
      }}
    >
      {segs.map((s, i) => (
        <polygon key={i} points={s.pts} className={s.lit ? 'hp-seg-on' : 'hp-seg-off'} />
      ))}
      {[-30, -15, 0, 15, 30].map((v) => {
        const [x, y] = polar(110, 108, 62, (v / max) * 90)
        return (
          <text key={v} x={x} y={y + 3} textAnchor="middle" fontSize="9" fill={BONE + '0.5)'} style={{ fontFamily: 'var(--hp-mono)' }}>
            {Math.abs(v)}
          </text>
        )
      })}
      <text x="24" y="114" fontSize="8" letterSpacing="1.5" fill={BONE + '0.45)'}>PORT</text>
      <text x="196" y="114" textAnchor="end" fontSize="8" letterSpacing="1.5" fill={BONE + '0.45)'}>STBD</text>
      <text x="110" y="112" textAnchor="middle" fontSize="13" fontWeight="700" fill={T.heel ? T.heel.color : 'var(--hp-ember)'} style={{ fontFamily: 'var(--hp-mono)' }} className="hp-lcd-glow">
        {`STBD ${value}°`}
      </text>
    </svg>
  )
}

// --------------------------------------------------------------------------
// Next-event LCD — green mono text block, same fact as Biography's chrome.
// --------------------------------------------------------------------------
function NextEventLCD() {
  // Live via the shared hook (isolated here, so the 1s tick re-renders only
  // this small block) — a mount-time Date.now() would go stale across
  // midnight in a long-lived tab while the T-MINUS clock keeps ticking.
  const { days } = useCountdown(NEXT_EVENT.ms)
  const line = {
    fontFamily: 'var(--hp-mono)',
    color: 'var(--hp-phos)',
    minWidth: 0,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }
  // On the blend sheet the module label already says NEXT EVENT, so the
  // inner kicker drops and the detail rows go ink (the name keeps the blue).
  const blend = VARIANT === 'blend'
  const sub = blend ? { color: 'rgba(20, 28, 54, 0.75)' } : null
  return (
    <div className="hp-screen" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 3, padding: '8px 12px' }}>
      {!blend && <div style={{ ...line, fontSize: 8, opacity: 0.55, letterSpacing: '0.2em' }}>NEXT EVENT</div>}
      <div className="hp-lcd-glow" style={{ ...line, fontSize: 'clamp(11px, 0.95vw, 14px)', fontWeight: 700, letterSpacing: '0.06em' }}>
        {NEXT_EVENT.name}
      </div>
      <div style={{ ...line, ...sub, fontSize: 9, opacity: 0.7 }}>{`${NEXT_EVENT.where} · ${NEXT_EVENT.when}`}</div>
      <div style={{ ...line, ...sub, fontSize: 11, opacity: 0.9 }}>{`T-${days} DAYS`}</div>
    </div>
  )
}

// --------------------------------------------------------------------------
// Small hardware
// --------------------------------------------------------------------------
function Screws({ small = false, inset = 7 }) {
  const cls = small ? 'hp-screw hp-screw--sm' : 'hp-screw'
  return (
    <>
      <span className={cls} aria-hidden="true" style={{ left: inset, top: inset, '--slot': '24deg' }} />
      <span className={cls} aria-hidden="true" style={{ right: inset, top: inset, '--slot': '-52deg' }} />
      <span className={cls} aria-hidden="true" style={{ left: inset, bottom: inset, '--slot': '80deg' }} />
      <span className={cls} aria-hidden="true" style={{ right: inset, bottom: inset, '--slot': '8deg' }} />
    </>
  )
}

function Module({ area, label, screws = false, children }) {
  return (
    <div className={`hp-mod hp-mod--${area}`}>
      {screws && <Screws small inset={5} />}
      <div className="hp-mod-label">{label}</div>
      <div className="hp-mod-body">{children}</div>
    </div>
  )
}

function Knob({ label, angle }) {
  return (
    <div className="hp-knob-unit">
      <div className="hp-knob" style={{ '--knob-angle': `${angle}deg` }} />
      <div className="hp-util-label">{label}</div>
    </div>
  )
}

function Toggle({ label, on = true }) {
  return (
    <div className="hp-toggle-unit">
      <div className={on ? 'hp-toggle' : 'hp-toggle hp-toggle--off'} />
      <div className="hp-util-label">{label}</div>
    </div>
  )
}

function Lamp({ label, tone }) {
  return (
    <div className="hp-lamp-unit">
      <div className={`hp-lamp hp-lamp--${tone}`} />
      <div className="hp-util-label">{label}</div>
    </div>
  )
}

// ============================================================================
export default function HelmPanel() {
  return (
    <div
      className={`hp-root hp-root--${VARIANT}`}
      role="img"
      aria-label="Helm station: campaign instruments. Radar scope sweeping the 2026 venues, the 2026 to 2028 voyage plan, wind and heading gauges, and the countdown to the LA 2028 Olympics."
    >
      <Screws inset={9} />
      <div className="hp-face">
        {VARIANT === 'blend' ? (
          /* editorial masthead — the site's eyebrow + headline + the
             .ho-action-style 2px blue rule as the signature touch */
          <div className="hp-header" style={{ alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '2.2px', textTransform: 'uppercase', color: 'rgb(10, 85, 235)' }}>
                R. Meek · ILCA 7
              </div>
              <div
                style={{
                  display: 'inline-block',
                  fontSize: 'clamp(18px, 1.7vw, 26px)',
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  lineHeight: 1.1,
                  color: 'rgb(20, 28, 54)',
                  paddingBottom: 4,
                  borderBottom: '2px solid rgb(10, 85, 235)',
                }}
              >
                Helm Station
              </div>
            </div>
            <span className="hp-plate--stats" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(20, 28, 54, 0.55)' }}>
              {`${TOUR_STATS.stops} STOPS · ${TOUR_STATS.continents} CONTINENTS`}
            </span>
          </div>
        ) : (
          <div className="hp-header">
            <span className="hp-plate">R. MEEK · ILCA 7 · HELM STATION</span>
            <span className="hp-plate hp-plate--sub hp-plate--stats">
              {`${TOUR_STATS.stops} STOPS · ${TOUR_STATS.continents} CONTINENTS`}
            </span>
          </div>
        )}

        <div className="hp-grid">
          <Module area="radar" label={LABELS.radar} screws>
            <Radar />
          </Module>
          <Module area="chart" label={LABELS.chart} screws>
            <Chart />
          </Module>
          <Module area="wind" label={LABELS.wind}>
            <RoundGauge value={14} min={0} max={40} step={10} minor={5} redFrom={30} unit="KNOTS" redHub />
          </Module>
          <Module area="hdg" label={LABELS.hdg}>
            <RoundGauge value={COG} compass unit="MAG" wobbleDelay="-1.7s" />
          </Module>
          <Module area="days" label={LABELS.days}>
            <CountdownSeg />
          </Module>
          <Module area="nm" label={LABELS.nm}>
            <SegDisplay text={String(ROUTE_NM)} color={T.segNm.color} glow={T.segNm.glow} />
          </Module>
          <Module area="heel" label={LABELS.heel}>
            <HeelArc value={12} />
          </Module>
          <Module area="next" label={LABELS.next}>
            <NextEventLCD />
          </Module>
        </div>

        <div className="hp-utility">
          <div className="hp-util-group">
            <Knob label="RANGE" angle={-35} />
            <Knob label="DIM" angle={10} />
            <Knob label="SQL" angle={-70} />
          </div>
          <div className="hp-util-group hp-util-group--toggles">
            <Toggle label="NAV LTS" on />
            <Toggle label="AIS" on />
            <Toggle label="DSC" on={false} />
          </div>
          <div className="hp-util-group">
            <Lamp label="GPS" tone="green" />
            <Lamp label="AIS" tone="amber" />
            <Lamp label="MOB" tone="red" />
          </div>
          <div className="hp-horn">
            <div className="hp-horn-btn" />
            <div className="hp-horn-plate">START HORN</div>
          </div>
        </div>
      </div>
    </div>
  )
}
