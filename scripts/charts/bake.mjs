// ============================================================================
//  bake — the authoring-time NAUTICAL CHART bake for the home station card.
// ============================================================================
//  One chart sheet per sailing place on The Road (src/utils/places.js), cut
//  from OpenStreetMap water polygons (OpenMapTiles schema, served by
//  OpenFreeMap) and written as tiny SVG path JSON the browser paints with no
//  map library, no tile server and no API key at runtime:
//
//    public/charts/<chartKey>.json   land + two shoal bands + a few names
//    public/charts/_world.json       Natural Earth land for the world locator
//    src/data/chartManifest.js       GENERATED index (file, content hash,
//                                    framing) for EVERY place key
//
//  Run from anywhere (its own deps live in scripts/charts/node_modules):
//    npm --prefix scripts/charts install                   once
//    npm --prefix scripts/charts run bake                  bake what changed
//    npm --prefix scripts/charts run bake -- annapolis     re-bake named keys
//    npm --prefix scripts/charts run bake -- --force       re-bake every sheet
//
//  A sheet whose framing (sheet rect, nm, look, bands) matches the file on
//  disk is kept as is, so a routine bake after adding a place only touches the
//  new one and re-bakes diff cleanly. Tiles are cached per planet version
//  under .cache/charts-tiles/ (gitignored).
//
//  Per sheet:
//    1. every z tile covering sheet + SHEET_MARGIN, layer 'water' (real water
//       areas only), each clipped to its own tile square so neighbours abut
//    2. UNION all of it: no tile seams, no buffer overlaps, no false coast
//    3. generalise: fill water narrower than 2 × OPEN_PX (canals, slips) and
//       drop small inland water bodies that never reach the sheet edge
//    4. clip to the sheet + margin; land = rect minus water
//    5. simplify land (Douglas-Peucker) onto the ×q integer grid, then derive
//       water and the shoal bands (water within d NM of land) FROM that land,
//       so band and coast share exact vertices and never gap
//    6. encode each as one compact evenodd SVG path; over the gzip budget the
//       tolerance steps up ×1.5 (3 tries)
//  Framing math is src/utils/chartMath.js, the same module the card uses.
// ============================================================================

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'
import { VectorTile, classifyRings } from '@mapbox/vector-tile'
import Pbf from 'pbf'
import ClipperLib from 'clipper-lib'
import topojson from 'topojson-client'
import TUNING, { DEFAULTS } from './tuning.js'
import { SHEET_MARGIN, TILE, WORLD, project, pxPerNm, sheetFor, worldXY, zoomForSpan } from '../../src/utils/chartMath.js'
import { placesFromStops } from '../../src/utils/places.js'
import { LOCATION_OVERRIDES } from '../../src/data/station.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../..')
const OUT_DIR = join(ROOT, 'public/charts')
const MANIFEST = join(ROOT, 'src/data/chartManifest.js')
const CACHE = join(ROOT, '.cache/charts-tiles')

const TILEJSON = 'https://tiles.openfreemap.org/planet'
const UA = 'robbysailing-chart-bake (+https://robbysailing.com)'
const CONCURRENCY = 6

const Q = 2 // output grid: sheet-local world px × Q, integers
const S = 8 // extra Clipper precision below the output grid until simplify
const K = Q * S
const SIMPLIFY_PX = 0.6 // Douglas-Peucker tolerance, world px
const MIN_AREA_PX = 12 // rings smaller than this (world px²) are dropped
const ARC_TOL = 0.5 * Q // shoal band round-join smoothness, grid units
// Chart generalisation, world px: water narrower than 2 × OPEN_PX (drainage
// canals, marina slips) fills in as land, and a water body that doesn't reach
// the sheet edge (so isn't the sea or a river out to it) must cover this share
// of the sheet to stay (inland ponds and quarry lakes are clutter here)
const OPEN_PX = 1
const LAKE_MIN_SHARE = 0.002
const GZ_BUDGET = 40 * 1024
const WORLD_GZ_BUDGET = 6 * 1024

// OpenMapTiles water classes that are real water areas (not swimming pools)
const WATER_CLASSES = new Set(['ocean', 'lake', 'river', 'pond', 'dock'])
const WATER_NAME_RANK = { ocean: 0, sea: 0, bay: 1, strait: 2, lake: 3 }
const PLACE_RANK = { city: 0, town: 1, village: 2 }
const NAMES_PER_KIND = 3
// a water name only labels a water body at least this share of the sheet (so
// an inland reservoir never outranks the bay)
const NAME_MIN_WATER_SHARE = 0.02

const ATTR = '© OpenStreetMap contributors · OpenMapTiles · OpenFreeMap'
const LICENSE = 'ODbL-1.0'

const { Clipper, ClipperOffset, ClipType, PolyType, PolyFillType, JoinType, EndType } = ClipperLib

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

// campaignStops.js reads import.meta.env.DEV at the top level, so a plain Node
// import throws. Vite's runnerImport transforms it the way the app sees it.
async function loadStops() {
  let vite
  try {
    vite = await import('vite')
  } catch {
    vite = await import(pathToFileURL(join(ROOT, 'node_modules/vite/dist/node/index.js')).href)
  }
  const { module } = await vite.runnerImport(join(ROOT, 'src/data/campaignStops.js'), {
    configFile: false,
    root: ROOT,
    logLevel: 'silent',
  })
  return module.default
}

function parseArgs(argv) {
  const force = argv.includes('--force')
  const keys = argv.filter((a) => !a.startsWith('--'))
  return { force, keys }
}

function tuningFor(chartKey) {
  const t = { ...DEFAULTS, ...(TUNING[chartKey] || {}) }
  return { nm: t.nm, look: [t.look[0], t.look[1]], d1: t.d1, d2: t.d2 }
}

// ---------------------------------------------------------------------------
// Tiles
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function tileSource() {
  const r = await fetch(TILEJSON, { headers: { 'User-Agent': UA } })
  if (!r.ok) throw new Error(`TileJSON ${TILEJSON}: HTTP ${r.status}`)
  const tj = await r.json()
  const tmpl = tj.tiles?.[0]
  if (!tmpl) throw new Error('TileJSON has no tiles[] template')
  const version = tmpl.match(/\/planet\/([^/]+)\//)?.[1] || createHash('sha1').update(tmpl).digest('hex').slice(0, 12)
  return { tmpl, version, maxzoom: tj.maxzoom ?? 14 }
}

async function getTile(src, z, x, y) {
  const file = join(CACHE, src.version, String(z), String(x), `${y}.pbf`)
  if (existsSync(file)) return readFileSync(file)
  const url = src.tmpl.replace('{z}', z).replace('{x}', x).replace('{y}', y)
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA } })
      let buf
      if (r.status === 204 || r.status === 404) buf = Buffer.alloc(0)
      else if (!r.ok) throw new Error(`HTTP ${r.status}`)
      else buf = Buffer.from(await r.arrayBuffer())
      // Node's fetch decodes Content-Encoding; a body that is STILL gzip was
      // served as an opaque gzipped file
      if (buf.length > 2 && buf[0] === 0x1f && buf[1] === 0x8b) buf = gunzipSync(buf)
      if (!buf.length) console.warn(`  ! empty tile ${z}/${x}/${y}`)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, buf)
      return buf
    } catch (err) {
      if (attempt >= 3) throw new Error(`tile ${url}: ${err.message}`)
      await sleep(600 * 2 ** attempt)
    }
  }
}

async function pool(items, n, fn) {
  const out = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      out[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, worker))
  return out
}

function tilesFor(sheet) {
  const lo = (v) => Math.floor((v - SHEET_MARGIN) / TILE)
  const hi = (v) => Math.floor((v + SHEET_MARGIN - 1e-9) / TILE)
  const out = []
  for (let y = lo(sheet.y0); y <= hi(sheet.y0 + sheet.h); y++) {
    for (let x = lo(sheet.x0); x <= hi(sheet.x0 + sheet.w); x++) out.push([x, y])
  }
  return out
}

// ---------------------------------------------------------------------------
// Geometry helpers (Clipper paths: [{ X, Y }] integers)
// ---------------------------------------------------------------------------

const rect = (x0, y0, x1, y1) => [[{ X: x0, Y: y0 }, { X: x1, Y: y0 }, { X: x1, Y: y1 }, { X: x0, Y: y1 }]]

function clip(subj, clipPaths, type, fill = PolyFillType.pftNonZero) {
  const c = new Clipper()
  c.AddPaths(subj, PolyType.ptSubject, true)
  if (clipPaths?.length) c.AddPaths(clipPaths, PolyType.ptClip, true)
  const out = []
  c.Execute(type, out, fill, fill)
  return out
}

function grow(paths, delta, arcTol = ARC_TOL) {
  const co = new ClipperOffset(2, arcTol)
  co.AddPaths(paths, JoinType.jtRound, EndType.etClosedPolygon)
  const out = []
  co.Execute(out, delta)
  return out
}

// Douglas-Peucker on a closed ring: split at the vertex farthest from the
// first, simplify both halves as open polylines.
function dpOpen(pts, tol2, a, b, keep) {
  let maxD = 0
  let idx = -1
  const ax = pts[a].X
  const ay = pts[a].Y
  const dx = pts[b].X - ax
  const dy = pts[b].Y - ay
  const len2 = dx * dx + dy * dy
  for (let i = a + 1; i < b; i++) {
    let ex = pts[i].X - ax
    let ey = pts[i].Y - ay
    if (len2 > 0) {
      const t = Math.max(0, Math.min(1, (ex * dx + ey * dy) / len2))
      ex -= t * dx
      ey -= t * dy
    }
    const d = ex * ex + ey * ey
    if (d > maxD) { maxD = d; idx = i }
  }
  if (maxD > tol2 && idx > 0) {
    keep[idx] = 1
    dpOpen(pts, tol2, a, idx, keep)
    dpOpen(pts, tol2, idx, b, keep)
  }
}

function dpRing(ring, tol) {
  const n = ring.length
  if (n <= 4 || tol <= 0) return ring
  let far = 0
  let farD = -1
  for (let i = 1; i < n; i++) {
    const d = (ring[i].X - ring[0].X) ** 2 + (ring[i].Y - ring[0].Y) ** 2
    if (d > farD) { farD = d; far = i }
  }
  const pts = ring.concat([ring[0]])
  const keep = new Uint8Array(pts.length)
  keep[0] = keep[far] = keep[n] = 1
  dpOpen(pts, tol * tol, 0, far, keep)
  dpOpen(pts, tol * tol, far, n, keep)
  const out = []
  for (let i = 0; i < n; i++) if (keep[i]) out.push(ring[i])
  return out
}

// K-space paths → simplified, valid, integer ×Q grid paths
function simplifyToGrid(paths, tolPx) {
  const tol = tolPx * K
  const out = []
  for (const ring of paths) {
    const s = dpRing(ring, tol)
    const g = []
    for (const p of s) {
      const X = Math.round(p.X / S)
      const Y = Math.round(p.Y / S)
      const last = g[g.length - 1]
      if (!last || last.X !== X || last.Y !== Y) g.push({ X, Y })
    }
    closeRing(g)
    if (g.length > 2) out.push(g)
  }
  // rounding can pinch rings into self-intersections; Positive fill keeps a
  // hole that slipped outside its shell from turning into land
  return dropSmall(Clipper.CleanPolygons(clip(out, null, ClipType.ctUnion, PolyFillType.pftPositive), 1), MIN_AREA_PX * Q * Q)
}

function closeRing(g) {
  const a = g[0]
  const b = g[g.length - 1]
  if (g.length > 1 && a.X === b.X && a.Y === b.Y) g.pop()
}

function dropSmall(paths, minArea) {
  return paths.filter((p) => p.length > 2 && Math.abs(Clipper.Area(p)) >= minArea)
}

// Clip water to the rect as a PolyTree and keep each water body (with its
// holes) that reaches the rect edge or is big enough; nested bodies inside a
// kept body's islands are judged on their own.
function dropLakes(water, clipRect, minArea) {
  const c = new Clipper()
  c.AddPaths(water, PolyType.ptSubject, true)
  c.AddPaths(clipRect, PolyType.ptClip, true)
  const tree = new ClipperLib.PolyTree()
  c.Execute(ClipType.ctIntersection, tree, PolyFillType.pftNonZero, PolyFillType.pftNonZero)
  const [{ X: x0, Y: y0 }, { X: x1 }, { Y: y1 }] = [clipRect[0][0], clipRect[0][1], clipRect[0][2]]
  const onEdge = (ring) => ring.some((p) => p.X <= x0 || p.X >= x1 || p.Y <= y0 || p.Y >= y1)
  const out = []
  const walk = (node) => {
    for (const shell of node.Childs()) {
      const ring = shell.Contour()
      const keep = onEdge(ring) || Math.abs(Clipper.Area(ring)) >= minArea
      if (keep) out.push(ring)
      for (const hole of shell.Childs()) {
        if (keep) out.push(hole.Contour())
        walk(hole)
      }
    }
  }
  walk(tree)
  return out
}

function vertexCount(paths) {
  return paths.reduce((n, p) => n + p.length, 0)
}

// evenodd point-in-region over a path set
function inside(paths, pt) {
  let n = 0
  for (const p of paths) if (Clipper.PointInPolygon(pt, p) !== 0) n++
  return n % 2 === 1
}

// One compact SVG path: absolute M per ring, relative l deltas, Z per ring.
function num(v, first) {
  return first || v < 0 ? String(v) : ` ${v}`
}
function encodePath(paths) {
  let s = ''
  for (const ring of paths) {
    let { X: px, Y: py } = ring[0]
    s += `M${px}${num(py)}l`
    for (let i = 1; i < ring.length; i++) {
      const { X, Y } = ring[i]
      s += num(X - px, i === 1) + num(Y - py)
      px = X
      py = Y
    }
    s += 'Z'
  }
  return s
}

// ---------------------------------------------------------------------------
// Tile decode
// ---------------------------------------------------------------------------

// Water polygons of one tile in K space, clipped to the tile's own square.
function tileWater(vt, tx, ty, sheet) {
  const layer = vt?.layers.water
  if (!layer) return []
  const ext = layer.extent
  const toX = (gx) => Math.round(((tx + gx / ext) * TILE - sheet.x0) * K)
  const toY = (gy) => Math.round(((ty + gy / ext) * TILE - sheet.y0) * K)
  const paths = []
  for (let i = 0; i < layer.length; i++) {
    const f = layer.feature(i)
    const p = f.properties
    if (f.type !== 3 || p.intermittent === 1 || p.brunnel === 'tunnel' || !WATER_CLASSES.has(p.class)) continue
    for (const poly of classifyRings(f.loadGeometry())) {
      poly.forEach((ring, j) => {
        const path = ring.map((pt) => ({ X: toX(pt.x), Y: toY(pt.y) }))
        const a = Clipper.Area(path)
        if (a === 0) return
        if ((j === 0) !== (a > 0)) path.reverse() // shells positive, holes negative
        paths.push(path)
      })
    }
  }
  if (!paths.length) return []
  return clip(paths, rect(toX(0), toY(0), toX(ext), toY(ext)), ClipType.ctIntersection, PolyFillType.pftPositive)
}

const nameOf = (p) => p['name:en'] || p.name_en || p.name || ''

// Candidate labels of one tile, sheet-local ×Q (unrounded).
function tileNames(vt, tx, ty, sheet) {
  const out = []
  for (const [layerId, kind] of [['water_name', 'water'], ['place', 'place']]) {
    const layer = vt?.layers[layerId]
    if (!layer) continue
    const ext = layer.extent
    for (let i = 0; i < layer.length; i++) {
      const f = layer.feature(i)
      const p = f.properties
      const cls = p.class
      if (kind === 'water' && (!(cls in WATER_NAME_RANK) || p.intermittent === 1)) continue
      if (kind === 'place' && !(cls in PLACE_RANK)) continue
      const t = nameOf(p).trim()
      if (!t) continue
      const g = f.loadGeometry()
      let pt
      if (f.type === 1) pt = g[0]?.[0]
      else if (f.type === 2) {
        const line = g.reduce((a, b) => (b.length > a.length ? b : a), [])
        pt = line[Math.floor(line.length / 2)]
      }
      if (!pt) continue
      out.push({
        t: kind === 'place' ? t.toUpperCase() : t,
        k: kind,
        cls,
        rank: Number.isFinite(p.rank) ? p.rank : 99,
        x: ((tx + pt.x / ext) * TILE - sheet.x0) * Q,
        y: ((ty + pt.y / ext) * TILE - sheet.y0) * Q,
      })
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// One sheet
// ---------------------------------------------------------------------------

async function bakeSheet(src, place, tune) {
  const sheet = sheetFor(place, { nm: tune.nm, look: tune.look })
  const { z } = sheet
  if (z > src.maxzoom) throw new Error(`${place.chartKey}: z${z} above the source maxzoom ${src.maxzoom}`)
  const tiles = tilesFor(sheet)
  const bufs = await pool(tiles, CONCURRENCY, ([x, y]) => getTile(src, z, x, y))

  const water = []
  let cands = []
  tiles.forEach(([x, y], i) => {
    const vt = bufs[i].length ? new VectorTile(new Pbf(bufs[i])) : null
    for (const p of tileWater(vt, x, y, sheet)) water.push(p)
    cands = cands.concat(tileNames(vt, x, y, sheet))
  })

  const M = SHEET_MARGIN * K
  const clipK = rect(-M, -M, sheet.w * K + M, sheet.h * K + M)
  let waterK = clip(water, null, ClipType.ctUnion, PolyFillType.pftPositive)
  waterK = grow(grow(waterK, -OPEN_PX * K, ARC_TOL * S), OPEN_PX * K, ARC_TOL * S)
  waterK = dropLakes(waterK, clipK, LAKE_MIN_SHARE * sheet.w * sheet.h * K * K)
  const landK = clip(clipK, waterK, ClipType.ctDifference)

  const Mq = SHEET_MARGIN * Q
  const clipQ = rect(-Mq, -Mq, sheet.w * Q + Mq, sheet.h * Q + Mq)
  const k = pxPerNm(place.lat, z) * Q
  const [fx, fy] = project(place.lat, place.lng, z)
  const fix = { X: Math.round((fx - sheet.x0) * Q), Y: Math.round((fy - sheet.y0) * Q) }

  let tol = SIMPLIFY_PX
  let result
  for (let attempt = 0; attempt <= 3; attempt++) {
    const land = simplifyToGrid(landK, tol)
    const sea = clip(clipQ, land, ClipType.ctDifference)
    // a band hole smaller than a band-width square is either a tiny island
    // (land paints over it anyway) or a sliver of water just past d between
    // two coasts, which reads as a white scratch; both fill in
    const band = (d) => {
      const holeMin = (d * k) ** 2
      return clip(sea, grow(land, d * k), ClipType.ctIntersection).filter((p) => {
        const a = Clipper.Area(p)
        return a > 0 ? a >= MIN_AREA_PX * Q * Q : -a >= holeMin
      })
    }
    const shoal2 = band(tune.d2)
    const shoal1 = band(tune.d1)
    const names = pickNames(cands, sea, sheet, fix)
    const json = JSON.stringify({
      v: 1,
      key: place.chartKey,
      z,
      q: Q,
      sheet,
      nm: tune.nm,
      look: tune.look,
      d1: tune.d1,
      d2: tune.d2,
      land: encodePath(land),
      shoal1: encodePath(shoal1),
      shoal2: encodePath(shoal2),
      names,
      attr: ATTR,
      license: LICENSE,
    })
    const gz = gzipSync(json).length
    result = {
      json,
      gz,
      tol,
      tiles: tiles.length,
      vertices: vertexCount(land) + vertexCount(shoal1) + vertexCount(shoal2),
      fixOnWater: inside(sea, fix),
      fixToWaterM: inside(sea, fix) ? 0 : nearestM(sea, fix, place.lat, z),
      names: names.map((n) => n.t),
    }
    if (gz <= GZ_BUDGET) break
    tol *= 1.5
  }
  if (result.gz > GZ_BUDGET) console.warn(`  ! ${place.chartKey} still over budget at tolerance ${result.tol.toFixed(2)} px`)
  return result
}

// Diagnostic: metres from a point to the nearest water edge (grid units in).
function nearestM(paths, pt, lat, z) {
  let best = Infinity
  for (const ring of paths) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[j]
      const b = ring[i]
      const dx = b.X - a.X
      const dy = b.Y - a.Y
      const len2 = dx * dx + dy * dy
      const t = len2 ? Math.max(0, Math.min(1, ((pt.X - a.X) * dx + (pt.Y - a.Y) * dy) / len2)) : 0
      best = Math.min(best, Math.hypot(pt.X - a.X - t * dx, pt.Y - a.Y - t * dy))
    }
  }
  return (best / Q / pxPerNm(lat, z)) * 1852
}

function pickNames(cands, sea, sheet, fix) {
  const W = sheet.w * Q
  const H = sheet.h * Q
  const inSheet = cands.filter((c) => c.x >= 0 && c.y >= 0 && c.x <= W && c.y <= H)
  const dist = (c) => Math.hypot(c.x - fix.X, c.y - fix.Y)
  const shells = sea.filter((p) => Clipper.Area(p) > 0).map((p) => ({ p, a: Clipper.Area(p) }))
  const minWater = NAME_MIN_WATER_SHARE * W * H
  const onMajorWater = (c) => {
    const pt = { X: Math.round(c.x), Y: Math.round(c.y) }
    if (!inside(sea, pt)) return false
    let best = Infinity
    for (const s of shells) if (s.a < best && Clipper.PointInPolygon(pt, s.p) !== 0) best = s.a
    return best >= minWater && best !== Infinity
  }
  const water = inSheet
    .filter((c) => c.k === 'water' && onMajorWater(c))
    .sort((a, b) => WATER_NAME_RANK[a.cls] - WATER_NAME_RANK[b.cls] || dist(a) - dist(b) || a.t.localeCompare(b.t))
  const places = inSheet
    .filter((c) => c.k === 'place')
    .sort((a, b) => a.rank - b.rank || PLACE_RANK[a.cls] - PLACE_RANK[b.cls] || dist(a) - dist(b) || a.t.localeCompare(b.t))
  const seen = new Set()
  const out = []
  for (const list of [water, places]) {
    let n = 0
    for (const c of list) {
      const id = c.t.toLowerCase()
      if (n >= NAMES_PER_KIND || seen.has(id)) continue
      seen.add(id)
      out.push({ t: c.t, k: c.k, x: Math.round(c.x), y: Math.round(c.y) })
      n++
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// World locator
// ---------------------------------------------------------------------------

function bakeWorld() {
  const require = createRequire(import.meta.url)
  const topo = JSON.parse(readFileSync(require.resolve('world-atlas/land-110m.json'), 'utf8'))
  const geo = topojson.feature(topo, topo.objects.land)
  const WS = 16 // Clipper precision per world-locator px
  const paths = []
  const W = WORLD.w * WS
  const addPoly = (poly) => {
    for (const ring of poly) {
      // Russia and Fiji run across the antimeridian: unwrap the longitudes so
      // the ring is continuous, then add a copy one world-width over so the
      // rect clip keeps both halves (no full-width streak)
      let prev = null
      let shift = 0
      const path = ring.map(([lng, lat]) => {
        if (prev !== null && Math.abs(lng + shift - prev) > 180) shift += lng + shift > prev ? -360 : 360
        prev = lng + shift
        const [x, y] = worldXY(lat, lng + shift)
        return { X: Math.round(x * WS), Y: Math.round(y * WS) }
      })
      if (path.length < 3) continue
      paths.push(path)
      const xs = path.map((p) => p.X)
      if (Math.min(...xs) < 0) paths.push(path.map((p) => ({ X: p.X + W, Y: p.Y })))
      if (Math.max(...xs) > W) paths.push(path.map((p) => ({ X: p.X - W, Y: p.Y })))
    }
  }
  for (const f of geo.features || [geo]) {
    const g = f.geometry
    if (g.type === 'Polygon') addPoly(g.coordinates)
    else if (g.type === 'MultiPolygon') g.coordinates.forEach(addPoly)
  }
  // clip to the sailing latitudes (Antarctica and the high Arctic drop out)
  const clipped = clip(paths, rect(0, 0, W, WORLD.h * WS), ClipType.ctIntersection, PolyFillType.pftEvenOdd)
  let tol = 0.35
  let json
  for (let attempt = 0; attempt <= 4; attempt++) {
    const rings = []
    for (const ring of clipped) {
      const s = dpRing(ring, tol * WS)
      const g = []
      for (const p of s) {
        const X = Math.round(p.X / WS)
        const Y = Math.round(p.Y / WS)
        const last = g[g.length - 1]
        if (!last || last.X !== X || last.Y !== Y) g.push({ X, Y })
      }
      closeRing(g)
      if (g.length > 2) rings.push(g)
    }
    const land = dropSmall(clip(rings, null, ClipType.ctUnion, PolyFillType.pftPositive), 1)
    json = JSON.stringify({
      v: 1,
      w: WORLD.w,
      h: WORLD.h,
      latTop: WORLD.latTop,
      latBottom: WORLD.latBottom,
      land: encodePath(land),
      source: 'Natural Earth 1:110m (public domain)',
    })
    if (gzipSync(json).length <= WORLD_GZ_BUDGET) break
    tol *= 1.5
  }
  return json
}

// ---------------------------------------------------------------------------
// Manifest
// ---------------------------------------------------------------------------

const sha8 = (s) => createHash('sha1').update(s).digest('hex').slice(0, 8)
const jsKey = (k) => (/^[A-Za-z_$][\w$]*$/.test(k) ? k : `'${k}'`)

function writeManifest(places, worldJson) {
  const lines = [
    '// GENERATED by scripts/charts/bake.mjs — do not edit by hand.',
    'export default {',
    `  world: { file: '_world.json', h: '${sha8(worldJson)}' },`,
    '  charts: {',
  ]
  for (const p of places) {
    const file = `${p.chartKey}.json`
    const raw = readFileSync(join(OUT_DIR, file), 'utf8')
    const c = JSON.parse(raw)
    const s = c.sheet
    lines.push(
      `    ${jsKey(p.key)}: { file: '${file}', h: '${sha8(raw)}', z: ${c.z}, nm: ${c.nm}, look: [${c.look[0]}, ${c.look[1]}], ` +
        `sheet: { x0: ${s.x0}, y0: ${s.y0}, w: ${s.w}, h: ${s.h}, z: ${s.z} } },`,
    )
  }
  lines.push('  },', '}', '')
  writeFileSync(MANIFEST, lines.join('\n'))
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const sameFraming = (a, b) => JSON.stringify(a) === JSON.stringify(b)

async function main() {
  const { force, keys } = parseArgs(process.argv.slice(2))
  const STOPS = await loadStops()
  const places = placesFromStops(STOPS, LOCATION_OVERRIDES)
  const byKey = new Map(places.map((p) => [p.key, p]))
  const sheets = places.filter((p) => p.key === p.chartKey)

  const named = new Set()
  for (const k of keys) {
    const p = byKey.get(k)
    if (!p) throw new Error(`unknown place key "${k}" (known: ${places.map((q) => q.key).join(', ')})`)
    named.add(p.chartKey)
  }

  mkdirSync(OUT_DIR, { recursive: true })
  let src = null
  const rows = []
  for (const place of sheets) {
    const tune = tuningFor(place.chartKey)
    const file = join(OUT_DIR, `${place.chartKey}.json`)
    const plan = { z: zoomForSpan(tune.nm), q: Q, sheet: sheetFor(place, { nm: tune.nm, look: tune.look }), ...tune }
    if (!force && !named.has(place.chartKey) && existsSync(file)) {
      const cur = JSON.parse(readFileSync(file, 'utf8'))
      const have = { z: cur.z, q: cur.q, sheet: cur.sheet, nm: cur.nm, look: cur.look, d1: cur.d1, d2: cur.d2 }
      if (sameFraming(have, plan)) {
        const raw = readFileSync(file, 'utf8')
        rows.push({ key: place.chartKey, z: cur.z, tiles: '', vertices: '', raw: raw.length, gz: gzipSync(raw).length, tol: '', fix: '', names: 'kept' })
        continue
      }
    }
    if (!src) {
      src = await tileSource()
      console.log(`OpenFreeMap planet ${src.version}`)
    }
    if (process.stdout.isTTY) process.stdout.write(`  baking ${place.chartKey} …\r`)
    const r = await bakeSheet(src, place, tune)
    if (process.stdout.isTTY) process.stdout.write('\x1b[2K')
    writeFileSync(file, r.json)
    rows.push({
      key: place.chartKey,
      z: plan.z,
      tiles: r.tiles,
      vertices: r.vertices,
      raw: r.json.length,
      gz: r.gz,
      tol: r.tol.toFixed(2),
      fix: r.fixOnWater ? 'water' : `land ${Math.round(r.fixToWaterM)}m`,
      names: r.names.join(' / '),
    })
  }

  const world = bakeWorld()
  writeFileSync(join(OUT_DIR, '_world.json'), world)
  rows.push({ key: '_world', z: '', tiles: '', vertices: '', raw: world.length, gz: gzipSync(world).length, tol: '', fix: '', names: '' })

  writeManifest(places, world)

  const kb = (n) => (n / 1024).toFixed(1)
  const pad = (v, n) => String(v).padEnd(n)
  console.log(`${pad('key', 16)}${pad('z', 4)}${pad('tiles', 7)}${pad('verts', 8)}${pad('raw KB', 8)}${pad('gz KB', 7)}${pad('tol', 6)}${pad('fix', 11)}names`)
  for (const r of rows) {
    console.log(`${pad(r.key, 16)}${pad(r.z, 4)}${pad(r.tiles, 7)}${pad(r.vertices, 8)}${pad(kb(r.raw), 8)}${pad(kb(r.gz), 7)}${pad(r.tol, 6)}${pad(r.fix, 11)}${r.names}`)
  }
  console.log(`manifest: ${places.length} places, ${sheets.length} sheets → ${MANIFEST.slice(ROOT.length + 1)}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
