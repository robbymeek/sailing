// ============================================================================
//  NowChart — the "Currently here" tile: a monochrome nautical chart.
// ============================================================================
//  The chart geometry is BAKED at authoring time (scripts/charts/bake.mjs →
//  public/charts/<place>.json, © OpenStreetMap contributors, ODbL) and fetched
//  from our own origin on idle, so there's no map library, no tile host and
//  no second WebGL context on the home page. Everything else is drawn here:
//
//    · the neat line with alternating minute bars + degree/minute labels,
//      and a faint graticule (real positions — the window's lat/lng bounds)
//    · graded shallows (baked as geographic offsets from the coast) under a
//      darker land tint and a hairline coastline
//    · water names in italic, land names in spaced caps (chart convention)
//    · a hairline compass rose, a small world locator, the map credit
//    · the navigator's FIX (dot in a ring, blue = live) at Robby's position
//    · the title block: a cartouche over the chart on roomy tiles, a strip
//      under it on narrow ones
//
//  Framing is pure math shared with the bake (../utils/chartMath.js): the
//  frame + fix paint on the first frame from the manifest; the land fades in
//  when its JSON lands. A missing chart falls back to the world view with the
//  fix — never a blank sheet.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import manifest from '../data/chartManifest'
import { ROUTE_WAYPOINTS } from '../data/routeStats'
import {
  fitWindow, windowBounds, project, tickSteps, minuteTicks, fmtTick, worldXY, WORLD,
} from '../utils/chartMath'

const BASE = import.meta.env.BASE_URL
const B = 6 // neat-line (border) width, css px

// One fetch per file per page load; resolves null on any failure (never throws).
const jsonCache = new Map()
function loadJSON(file, hash) {
  const url = `${BASE}charts/${file}?v=${hash}`
  if (!jsonCache.has(url)) {
    jsonCache.set(
      url,
      fetch(url, { credentials: 'omit' })
        .then((r) => (r.ok && (r.headers.get('content-type') || '').includes('json') ? r.json() : null))
        .catch(() => null),
    )
  }
  return jsonCache.get(url)
}
const validChart = (j) => j && j.v === 1 && typeof j.land === 'string' && j.sheet && Number.isFinite(j.q)
const validWorld = (j) => j && j.v === 1 && typeof j.land === 'string'

function onIdle(fn) {
  if (typeof window === 'undefined') return () => {}
  if ('requestIdleCallback' in window) {
    const id = window.requestIdleCallback(fn, { timeout: 1200 })
    return () => window.cancelIdleCallback(id)
  }
  const id = setTimeout(fn, 600)
  return () => clearTimeout(id)
}

// Integer css-px size of an element, rAF-throttled.
function useSize(ref) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    let raf = 0
    const read = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const w = Math.round(r.width)
      const h = Math.round(r.height)
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }))
    }
    read()
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => { if (!raf) raf = requestAnimationFrame(read) })
    ro.observe(el)
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf) }
  }, [ref])
  return size
}

const hit = (a, b) => a && b && a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y

// 'SEP 2026' → 'Sep 2026', 'OCT–NOV 2026' → 'Oct–Nov 2026'
const niceDates = (s) => (s || '').replace(/[A-Z]{3}/g, (m) => m[0] + m.slice(1).toLowerCase())
// 'Training Camp' → 'Training camp' (sentence case for the italic event line);
// proper regatta names keep their capitals.
const niceEvent = (e) => (e === 'Training Camp' || e === 'Training Block' ? e.replace(/ ([A-Z])/, (m, c) => ' ' + c.toLowerCase()) : e || '')

export default function NowChart({ here, onNavigate, visible = true }) {
  const tileRef = useRef(null)
  const stageRef = useRef(null)
  const cartRef = useRef(null)
  const tile = useSize(tileRef)
  const stage = useSize(stageRef)
  const [cartRect, setCartRect] = useState(null)

  const key = here?.place?.key
  const entry = key ? manifest?.charts?.[key] : null
  const [chart, setChart] = useState(null)
  const [world, setWorld] = useState(null)
  const [chartFailed, setChartFailed] = useState(false)

  // Geometry loads on idle (same-origin, cached): never contends with the hero.
  useEffect(() => {
    let alive = true
    setChart(null)
    setChartFailed(false)
    const cancel = onIdle(() => {
      if (entry) {
        loadJSON(entry.file, entry.h).then((j) => {
          if (!alive) return
          if (validChart(j)) setChart(j)
          else setChartFailed(true)
        })
      }
      if (manifest?.world) {
        loadJSON(manifest.world.file, manifest.world.h).then((j) => { if (alive && validWorld(j)) setWorld(j) })
      }
    })
    return () => { alive = false; cancel() }
  }, [entry])

  // Title block mode: a cartouche over the chart when the tile is roomy, a
  // strip under the chart when it's narrow (phones) or squat.
  const worldMode = !entry || chartFailed
  // If the cartouche's content doesn't fit its box (a long 'working on' line
  // on a squat tile), fall back to the strip rather than clip it. Latched per
  // tile size + content, measured before paint (no flash); the tile's size
  // doesn't depend on the mode, so it can't flap.
  const [cartTooTall, setCartTooTall] = useState(false)
  const fitKey = `${tile.w}x${tile.h}|${key}|${here?.focus ?? ''}|${here?.mode ?? ''}`
  useLayoutEffect(() => { setCartTooTall(false) }, [fitKey])
  // (the world fallback always takes the strip, so the fix is never under it)
  const overlay = !worldMode && !cartTooTall && tile.w >= 560 && tile.h >= 300
  const W = stage.w
  const H = stage.h

  // Measure the cartouche (for label occlusion) after layout.
  useLayoutEffect(() => {
    const el = cartRef.current
    const st = stageRef.current
    if (!overlay || !el || !st) { setCartRect(null); return }
    if (el.scrollHeight > el.clientHeight + 1) { setCartTooTall(true); return }
    const a = el.getBoundingClientRect()
    const s = st.getBoundingClientRect()
    const r = { x: a.left - s.left, y: a.top - s.top, w: a.width, h: a.height }
    setCartRect((p) => (p && p.x === r.x && p.y === r.y && p.w === r.w && p.h === r.h ? p : r))
  }, [overlay, W, H, here, fitKey])

  const frame = useMemo(() => {
    if (!here || worldMode || !W || !H) return null
    const sheet = entry.sheet
    const win = fitWindow(sheet, here.place, W, H, { nm: entry.nm, look: entry.look, biasX: overlay ? 0.16 : 0 })
    return { sheet, win, bounds: windowBounds(sheet, win) }
  }, [here, entry, worldMode, W, H, overlay])

  if (!here) return null
  const { place, stop, focus, mode, kicker, daysUntil } = here
  const live = mode === 'stop' || mode === 'override'
  const kickerText = mode === 'next' && Number.isFinite(daysUntil)
    ? `${kicker}, in ${daysUntil} ${daysUntil === 1 ? 'day' : 'days'}`
    : kicker
  const eventLine = stop ? `${niceEvent(stop.event)}, ${niceDates(stop.dates)}` : null
  const aria = `Nautical chart of ${place.title}. ${live ? "Robby's position" : 'Position'} ${place.position}.`

  const titleBlock = (
    <div ref={cartRef} className={overlay ? 'nc-cart' : `nc-strip${tile.w < 360 ? ' nc-strip--narrow' : ''}`}>
      <p className="nc-kicker">
        <span className={live ? 'nc-live-dot' : 'nc-live-dot nc-live-dot--off'} aria-hidden="true" />
        {kickerText}
      </p>
      <h3 className="nc-title">{place.title}</h3>
      {eventLine && <p className="nc-event">{eventLine}</p>}
      {focus && (
        <p className="nc-focus">
          <span className="nc-focus-lead">Working on</span> {focus}
        </p>
      )}
      <div className="nc-cart-foot">
        {overlay && <span className="nc-pos">{place.position}</span>}
        <button type="button" className="ho-action nc-road" onClick={() => onNavigate?.('The Road')}>
          See the road<span aria-hidden="true"> →</span>
        </button>
      </div>
    </div>
  )

  return (
    <div ref={tileRef} className={`nc-chart${overlay ? ' nc-chart--overlay' : ''}`}>
      <div ref={stageRef} className="nc-stage">
        <div className="nc-map-wrap" role="img" aria-label={aria}>
          {worldMode ? (
            <WorldView world={world} W={W} H={H} />
          ) : (
            frame && (
              <>
                <MapLayer chart={chart} win={frame.win} />
                <Furniture
                  frame={frame}
                  chart={chart}
                  here={here}
                  W={W}
                  H={H}
                  occluders={[cartRect]}
                  world={world}
                  showLocator={overlay && W >= 560 && H >= 330}
                  showRose={W >= 440 && H >= 280}
                />
              </>
            )
          )}
          {(frame || worldMode) && (
            <Fix
              x={worldMode ? worldFix(here.place, W, H).x : frame.win.fx * W}
              y={worldMode ? worldFix(here.place, W, H).y : frame.win.fy * H}
              live={live}
              animate={visible}
            />
          )}
        </div>
        {overlay && titleBlock}
        {!worldMode && (
          <a className="nc-credit" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
            © OpenStreetMap contributors
          </a>
        )}
      </div>
      {!overlay && titleBlock}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Baked geometry: shallows → land → coastline. The window matches the stage
// aspect exactly, so preserveAspectRatio 'none' never distorts.
// ---------------------------------------------------------------------------
function MapLayer({ chart, win }) {
  if (!chart) return <svg className="nc-map" aria-hidden="true" />
  const q = chart.q
  return (
    <svg
      className="nc-map is-loaded"
      viewBox={`${win.x * q} ${win.y * q} ${win.w * q} ${win.h * q}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {chart.shoal2 && <path className="nc-shoal2" d={chart.shoal2} />}
      {chart.shoal1 && <path className="nc-shoal1" d={chart.shoal1} />}
      <path className="nc-land" d={chart.land} />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Chart furniture, in css px: graticule, names, rose, locator, neat line.
// ---------------------------------------------------------------------------
function Furniture({ frame, chart, here, W, H, occluders, world, showLocator, showRose }) {
  const { sheet, win, bounds } = frame
  const z = sheet.z
  const xOfLng = (lng) => ((lng - bounds.west) / (bounds.east - bounds.west)) * W
  const yOfLat = (lat) => ((project(lat, 0, z)[1] - sheet.y0 - win.y) / win.h) * H

  const pxPerMinX = W / ((bounds.east - bounds.west) * 60)
  const pxPerMinY = H / ((bounds.north - bounds.south) * 60)
  const lngStep = tickSteps(pxPerMinX, 7, 78)
  const latStep = tickSteps(pxPerMinY, 7, 46)

  // Reserved rects (css px) that labels must dodge.
  const roseR = Math.round(Math.max(28, Math.min(54, 0.12 * Math.min(W, H))))
  const rose = showRose ? { cx: W - B - 18 - roseR, cy: H - B - 30 - roseR, r: roseR } : null
  const locW = Math.round(Math.max(120, Math.min(176, W * 0.2)))
  const locH = Math.round((locW * WORLD.h) / WORLD.w)
  const loc = showLocator ? { x: B + 14, y: H - B - 14 - locH, w: locW, h: locH } : null
  const creditRect = { x: W - 190, y: H - B - 20, w: 190, h: 20 }
  const blocks = [...occluders.filter(Boolean), creditRect]
  if (rose) blocks.push({ x: rose.cx - rose.r - 8, y: rose.cy - rose.r - 14, w: rose.r * 2 + 16, h: rose.r * 2 + 22 })
  if (loc) blocks.push({ x: loc.x - 4, y: loc.y - 4, w: loc.w + 8, h: loc.h + 8 })
  const fix = { x: win.fx * W - 20, y: win.fy * H - 20, w: 40, h: 40 }

  // Border bars: alternating ink/paper spans anchored to real minutes.
  const bars = []
  const lngBars = minuteTicks(bounds.west - lngStep.bar / 60, bounds.east + lngStep.bar / 60, lngStep.bar)
  lngBars.forEach((v, i) => {
    if (Math.round((v * 60) / lngStep.bar) % 2) return
    const x1 = Math.max(0, xOfLng(v))
    const x2 = Math.min(W, xOfLng(lngBars[i + 1] ?? v + lngStep.bar / 60))
    if (x2 > x1) bars.push(<rect key={`t${i}`} x={x1} y={0} width={x2 - x1} height={B} />, <rect key={`b${i}`} x={x1} y={H - B} width={x2 - x1} height={B} />)
  })
  const latBars = minuteTicks(bounds.south - latStep.bar / 60, bounds.north + latStep.bar / 60, latStep.bar)
  latBars.forEach((v, i) => {
    if (Math.round((v * 60) / latStep.bar) % 2) return
    const ya = yOfLat(latBars[i + 1] ?? v + latStep.bar / 60)
    const yb = yOfLat(v)
    const y1 = Math.max(0, Math.min(ya, yb))
    const y2 = Math.min(H, Math.max(ya, yb))
    if (y2 > y1) bars.push(<rect key={`l${i}`} x={0} y={y1} width={B} height={y2 - y1} />, <rect key={`r${i}`} x={W - B} y={y1} width={B} height={y2 - y1} />)
  })

  // Graticule + edge labels at the label step.
  const grid = []
  const labels = []
  for (const v of minuteTicks(bounds.west, bounds.east, lngStep.label)) {
    const x = xOfLng(v)
    if (x < B + 24 || x > W - B - 24) continue
    grid.push(<line key={`gx${v}`} x1={x} y1={B} x2={x} y2={H - B} />)
    const t = fmtTick(v, 'E', 'W')
    const box = { x: x - t.length * 3.1 - 2, y: B + 3, w: t.length * 6.2 + 4, h: 14 }
    if (!blocks.some((r) => hit(box, r))) labels.push(<text key={`lx${v}`} x={x} y={B + 14} textAnchor="middle">{t}</text>)
  }
  for (const v of minuteTicks(bounds.south, bounds.north, latStep.label)) {
    const y = yOfLat(v)
    if (y < B + 24 || y > H - B - 24) continue
    grid.push(<line key={`gy${v}`} x1={B} y1={y} x2={W - B} y2={y} />)
    const t = fmtTick(v, 'N', 'S')
    const box = { x: B + 3, y: y - t.length * 3.1 - 2, w: 14, h: t.length * 6.2 + 4 }
    if (!blocks.some((r) => hit(box, r))) {
      labels.push(<text key={`ly${v}`} x={B + 14} y={y} textAnchor="middle" transform={`rotate(-90 ${B + 14} ${y})`} dy="-3">{t}</text>)
    }
  }

  // Names from the bake: ≤ 2 water (italic) + ≤ 2 land (spaced caps).
  const names = []
  if (chart?.names) {
    const q = chart.q
    const taken = []
    const counts = { water: 0, place: 0 }
    for (const n of chart.names) {
      if (counts[n.k] >= 2) continue
      const x = ((n.x / q - win.x) / win.w) * W
      const y = ((n.y / q - win.y) / win.h) * H
      const wEst = n.k === 'water' ? n.t.length * 6.6 : n.t.length * 7.4
      const box = { x: x - wEst / 2, y: y - 9, w: wEst, h: 14 }
      if (box.x < B + 26 || box.x + box.w > W - B - 26 || box.y < B + 22 || box.y + box.h > H - B - 22) continue
      if (blocks.some((r) => hit(box, r)) || hit(box, fix) || taken.some((r) => hit(box, r))) continue
      taken.push(box)
      counts[n.k]++
      names.push(
        <text key={`n${n.k}${n.t}`} className={n.k === 'water' ? 'nc-name-water' : 'nc-name-place'} x={x} y={y} textAnchor="middle">
          {n.t}
        </text>,
      )
    }
  }

  return (
    <svg className="nc-furn" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <g className="nc-grat">{grid}</g>
      <g>{names}</g>
      {rose && <Rose {...rose} />}
      {loc && <Locator {...loc} world={world} here={here} />}
      <g className="nc-ticks">{labels}</g>
      <rect className="nc-neat" x={0.5} y={0.5} width={W - 1} height={H - 1} />
      <rect className="nc-neat" x={B - 0.5} y={B - 0.5} width={W - 2 * B + 1} height={H - 2 * B + 1} />
      <g className="nc-bars">{bars}</g>
    </svg>
  )
}

// Hairline compass rose — 10° ticks, a classic half-filled four-point star.
function Rose({ cx, cy, r }) {
  const ticks = []
  for (let a = 0; a < 360; a += 10) {
    const long = a % 30 === 0
    const t = (a * Math.PI) / 180
    const r1 = r * 0.8
    const r2 = r * (long ? 0.94 : 0.87)
    ticks.push(
      <line key={a} className={long ? 'nc-rose-tick nc-rose-tick--30' : 'nc-rose-tick'}
        x1={cx + r1 * Math.sin(t)} y1={cy - r1 * Math.cos(t)} x2={cx + r2 * Math.sin(t)} y2={cy - r2 * Math.cos(t)} />,
    )
  }
  const star = []
  for (const [a, len] of [[0, 0.76], [90, 0.6], [180, 0.6], [270, 0.6]]) {
    const t = (a * Math.PI) / 180
    const tip = [cx + r * len * Math.sin(t), cy - r * len * Math.cos(t)]
    const w = r * 0.13
    const left = [cx + w * Math.sin(t - Math.PI / 2), cy - w * Math.cos(t - Math.PI / 2)]
    const right = [cx + w * Math.sin(t + Math.PI / 2), cy - w * Math.cos(t + Math.PI / 2)]
    star.push(
      <path key={`f${a}`} className="nc-rose-fill" d={`M${cx} ${cy}L${tip[0]} ${tip[1]}L${left[0]} ${left[1]}Z`} />,
      <path key={`o${a}`} className="nc-rose-open" d={`M${cx} ${cy}L${tip[0]} ${tip[1]}L${right[0]} ${right[1]}Z`} />,
    )
  }
  return (
    <g className="nc-rose">
      <circle className="nc-rose-ring" cx={cx} cy={cy} r={r} />
      <circle className="nc-rose-ring nc-rose-ring--in" cx={cx} cy={cy} r={r * 0.8} />
      {ticks}
      {star}
      <text className="nc-rose-n" x={cx} y={cy - r - 5} textAnchor="middle">N</text>
    </g>
  )
}

// Where in the world: the whole Road as dots, the leg in (ink) and the leg
// out (dashed blue) through the current fix.
function Locator({ x, y, w, h, world, here }) {
  const k = w / WORLD.w
  const pt = (p) => { const [px, py] = worldXY(p.lat, p.lng); return [x + px * k, y + py * k] }
  const cur = pt(here.place)
  return (
    <g className="nc-loc">
      <rect className="nc-loc-box" x={x} y={y} width={w} height={h} />
      {world && (
        <g transform={`translate(${x} ${y}) scale(${k})`}>
          <path className="nc-loc-land" d={world.land} />
        </g>
      )}
      {ROUTE_WAYPOINTS.map((p, i) => { const [px, py] = pt(p); return <circle key={i} className="nc-loc-stop" cx={px} cy={py} r={1.1} /> })}
      {here.prev && (() => { const [px, py] = pt(here.prev); return <line className="nc-loc-in" x1={px} y1={py} x2={cur[0]} y2={cur[1]} /> })()}
      {here.next && (() => { const [px, py] = pt(here.next); return <line className="nc-loc-out" x1={cur[0]} y1={cur[1]} x2={px} y2={py} /> })()}
      <circle className="nc-loc-here" cx={cur[0]} cy={cur[1]} r={2.4} />
    </g>
  )
}

// Fallback when a place has no baked chart: the whole world, fix on it.
function worldFix(place, W, H) {
  const { s, ox, oy } = worldFit(W, H)
  const [px, py] = worldXY(place.lat, place.lng)
  return { x: ox + px * s, y: oy + py * s }
}
function worldFit(W, H) {
  const s = Math.min(W / WORLD.w, H / WORLD.h)
  return { s, ox: (W - WORLD.w * s) / 2, oy: (H - WORLD.h * s) / 2 }
}
function WorldView({ world, W, H }) {
  if (!W || !H) return null
  const { s, ox, oy } = worldFit(W, H)
  return (
    <svg className="nc-furn" width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      {world && (
        <g transform={`translate(${ox} ${oy}) scale(${s})`}>
          <path className="nc-land nc-land--world" d={world.land} />
        </g>
      )}
      {ROUTE_WAYPOINTS.map((p, i) => {
        const [px, py] = worldXY(p.lat, p.lng)
        return <circle key={i} className="nc-loc-stop" cx={ox + px * s} cy={oy + py * s} r={2} />
      })}
      <rect className="nc-neat" x={0.5} y={0.5} width={W - 1} height={H - 1} />
    </svg>
  )
}

// The navigator's fix: a dot in a ring. Blue + a slow ping while live; hollow
// when the card is showing the NEXT stop (he isn't there yet).
function Fix({ x, y, live, animate }) {
  return (
    <span
      className={`nc-fix${live ? '' : ' nc-fix--next'}${animate ? ' is-animating' : ''}`}
      style={{ left: `${x}px`, top: `${y}px` }}
      aria-hidden="true"
    >
      <span className="nc-fix-ping" />
      <span className="nc-fix-ring" />
      <span className="nc-fix-dot" />
    </span>
  )
}
