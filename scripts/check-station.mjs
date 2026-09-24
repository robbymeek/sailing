// ============================================================================
//  check-station — build guard for the home "Currently here" card.
// ============================================================================
//  Runs before `vite build` (see package.json) and fails the build LOUDLY when
//  the owner-editable station data can't resolve cleanly:
//    · a LOCATION_OVERRIDES entry that is malformed (same rules the browser
//      resolver uses: validateOverride in src/utils/whereNow.js)
//    · a WORKING_ON line keyed to a stop / block city that doesn't exist, or
//      whose copy breaks the dash rule or runs past 90 characters
//    · a BLOCK_START_POINT that isn't one of that block's cities
//    · a place (every stop venue, block city and free override) with no valid
//      IANA time zone in PLACE_TZ, no "City, ST" state for a US venue, or no
//      baked chart in src/data/chartManifest.js (file on disk, its sha1-8
//      cache-bust hash current, sheet matching chartMath.sheetFor, aliases
//      sharing their twin's file)
//  Deterministic: nothing here reads today's date, so a build that passes
//  today passes tomorrow (an expired override is still a VALID override).
//
//  `node scripts/check-station.mjs --self-test` breaks each rule in memory and
//  proves it fires; nothing on disk is touched.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { runnerImport } from 'vite'
import * as STATION from '../src/data/station.js'
import { placesFromStops } from '../src/utils/places.js'
import { sheetFor } from '../src/utils/chartMath.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const CHARTS_DIR = join(ROOT, 'public', 'charts')
const MANIFEST = join(ROOT, 'src', 'data', 'chartManifest.js')
const BAKE_HINT = 'run `npm --prefix scripts/charts run bake`'
const DASH_RE = /—| – /
const FOCUS_MAX = 90

const validZone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz })
    return true
  } catch {
    return false
  }
}

const sameSheet = (a, b) => !!a && !!b && ['x0', 'y0', 'w', 'h', 'z'].every((k) => a[k] === b[k])
const fmtSheet = (s) => (s ? `{x0:${s.x0}, y0:${s.y0}, w:${s.w}, h:${s.h}, z:${s.z}}` : String(s))

// ---------------------------------------------------------------------------
// The rules. Pure: every input is passed in, so --self-test can feed broken
// copies. Returns { errors: string[], summary: string }.
// ---------------------------------------------------------------------------
function checkStation({
  stops, overrides, workingOn, blockStart, placeTz, usState,
  manifest, manifestError = null, validateOverride, fileExists, fileHash,
}) {
  const errors = []
  const fail = (msg) => errors.push(msg)
  const byId = new Map(stops.map((s) => [s.id, s]))
  const labelsOf = (s) => (s.points || []).map((p) => p.label)
  const overrideList = Array.isArray(overrides) ? overrides : []

  // 1. LOCATION_OVERRIDES
  if (!Array.isArray(overrides)) fail('LOCATION_OVERRIDES must be an array')
  overrideList.forEach((o, i) => {
    const bad = validateOverride(o)
    if (bad) fail(`LOCATION_OVERRIDES[${i}]: ${bad}`)
  })

  // 2. WORKING_ON
  for (const [k, v] of Object.entries(workingOn || {})) {
    const cut = k.indexOf('--')
    const id = cut < 0 ? k : k.slice(0, cut)
    const point = cut < 0 ? null : k.slice(cut + 2)
    const stop = byId.get(id)
    if (!stop) fail(`WORKING_ON["${k}"]: no stop with id "${id}" in campaignStops`)
    else if (point != null && !labelsOf(stop).includes(point)) {
      const labels = labelsOf(stop)
      fail(`WORKING_ON["${k}"]: "${point}" is not a point of ${id} (${labels.length ? labels.join(', ') : 'it has no points'})`)
    }
    if (typeof v !== 'string') fail(`WORKING_ON["${k}"]: must be a string ('' hides the line)`)
    else {
      if (DASH_RE.test(v)) fail(`WORKING_ON["${k}"]: "${v}" has an em dash or a spaced en dash`)
      if (v.length > FOCUS_MAX) fail(`WORKING_ON["${k}"]: ${v.length} characters (max ${FOCUS_MAX})`)
    }
  }

  // 3. BLOCK_START_POINT
  for (const [id, label] of Object.entries(blockStart || {})) {
    const stop = byId.get(id)
    if (!stop) fail(`BLOCK_START_POINT["${id}"]: no stop with that id in campaignStops`)
    else if (!labelsOf(stop).includes(label)) {
      const labels = labelsOf(stop)
      fail(`BLOCK_START_POINT["${id}"]: "${label}" is not a point of that stop (${labels.length ? labels.join(', ') : 'it has no points'})`)
    }
  }

  // 4. Places: time zone, US state, chart
  const places = placesFromStops(stops, overrideList)
  const roadKeys = new Set(placesFromStops(stops).map((p) => p.key))
  const byKey = new Map(places.map((p) => [p.key, p]))
  const charts = manifest?.charts
  if (manifestError) fail(manifestError)
  else if (!charts || typeof charts !== 'object') fail(`src/data/chartManifest.js has no \`charts\` map; ${BAKE_HINT}`)
  else if (!manifest.world?.file || !fileExists(manifest.world.file)) {
    fail(`chartManifest world file "${manifest.world?.file}" is missing from public/charts/; ${BAKE_HINT}`)
  } else if (fileHash(manifest.world.file) !== manifest.world.h) {
    fail(`chartManifest world hash "${manifest.world.h}" != sha1 of public/charts/${manifest.world.file}; ${BAKE_HINT}`)
  }

  for (const p of places) {
    const tz = placeTz?.[p.key]
    if (!tz) fail(`PLACE_TZ["${p.key}"] is missing (${p.city}): every place needs an IANA zone, e.g. 'Europe/Madrid'`)
    else if (!validZone(tz)) fail(`PLACE_TZ["${p.key}"]: "${tz}" is not a valid IANA time zone`)

    if (roadKeys.has(p.key) && p.noc === 'USA' && !usState?.[p.city]) {
      fail(`US_STATE["${p.city}"] is missing: US venues title as "City, ST"`)
    }

    if (manifestError || !charts || typeof charts !== 'object') continue
    const entry = charts[p.key]
    if (!entry) {
      fail(`chartManifest has no chart for place "${p.key}" (${p.city}); ${BAKE_HINT}`)
      continue
    }
    const want = `${p.chartKey}.json`
    if (entry.file !== want) fail(`chartManifest["${p.key}"].file is "${entry.file}", expected "${want}" (chart key ${p.chartKey})`)
    if (!entry.file || !fileExists(entry.file)) fail(`chartManifest["${p.key}"]: public/charts/${entry.file} does not exist; ${BAKE_HINT}`)
    else if (fileHash(entry.file) !== entry.h) {
      fail(`chartManifest["${p.key}"].h "${entry.h}" != sha1 of public/charts/${entry.file} (edited by hand? browsers would keep the old chart); ${BAKE_HINT}`)
    }
    if (p.key === p.chartKey) {
      if (!Number.isFinite(entry.nm) || !Array.isArray(entry.look)) {
        fail(`chartManifest["${p.key}"] lacks nm/look; ${BAKE_HINT}`)
      } else {
        const sheet = sheetFor(byKey.get(p.chartKey), { nm: entry.nm, look: entry.look })
        if (!sameSheet(entry.sheet, sheet)) {
          fail(`chartManifest["${p.key}"].sheet ${fmtSheet(entry.sheet)} != chartMath.sheetFor ${fmtSheet(sheet)} (chartMath or the stop moved); ${BAKE_HINT}`)
        }
      }
    } else if (charts[p.chartKey] && !sameSheet(entry.sheet, charts[p.chartKey].sheet)) {
      fail(`chartManifest["${p.key}"].sheet differs from its alias target "${p.chartKey}"; ${BAKE_HINT}`)
    }
  }

  const active = overrideList.filter((o) => o?.active === true).length
  const chartFiles = new Set(places.map((p) => p.chartKey)).size
  const summary = `check-station: OK · ${stops.length} stops · ${places.length} places / ${chartFiles} charts · `
    + `${overrideList.length} overrides (${active} active) · ${Object.keys(workingOn || {}).length} WORKING_ON · `
    + `${Object.keys(blockStart || {}).length} BLOCK_START_POINT`
  return { errors, summary }
}

// ---------------------------------------------------------------------------
// Loading the real inputs
// ---------------------------------------------------------------------------
async function loadManifest() {
  if (!existsSync(MANIFEST)) {
    return { manifestError: `src/data/chartManifest.js does not exist: the charts have not been baked; ${BAKE_HINT}` }
  }
  try {
    const mod = await import(pathToFileURL(MANIFEST).href)
    return { manifest: mod.default }
  } catch (err) {
    return { manifestError: `src/data/chartManifest.js failed to load (${err.message}); ${BAKE_HINT}` }
  }
}

// campaignStops + whereNow read import.meta.env at module level, so they load
// through Vite's module runner (DEV mode: campaignStops' own copy asserts run
// too), not plain Node.
async function loadViteModules() {
  const opts = { root: ROOT, logLevel: 'error' }
  const [stopsMod, whereMod] = await Promise.all([
    runnerImport(join(ROOT, 'src/data/campaignStops.js'), opts),
    runnerImport(join(ROOT, 'src/utils/whereNow.js'), opts),
  ])
  return { stops: stopsMod.module.default, validateOverride: whereMod.module.validateOverride }
}

function realInput({ stops, validateOverride }, manifestPart) {
  return {
    stops,
    overrides: STATION.LOCATION_OVERRIDES,
    workingOn: STATION.WORKING_ON,
    blockStart: STATION.BLOCK_START_POINT,
    placeTz: STATION.PLACE_TZ,
    usState: STATION.US_STATE,
    validateOverride,
    fileExists: (file) => typeof file === 'string' && !file.includes('..') && existsSync(join(CHARTS_DIR, file)),
    fileHash: (file) => createHash('sha1').update(readFileSync(join(CHARTS_DIR, file))).digest('hex').slice(0, 8),
    ...manifestPart,
  }
}

// ---------------------------------------------------------------------------
// --self-test: a synthetic, fully-valid baseline (charts faked from chartMath
// so it passes whether or not the bake has run), then one break per rule.
// ---------------------------------------------------------------------------
function selfTest(loaded) {
  const nm = 9
  const look = [1.5, 0]
  const fakeManifest = (overrides = []) => {
    const charts = {}
    const places = placesFromStops(loaded.stops, overrides)
    const byKey = new Map(places.map((p) => [p.key, p]))
    for (const p of places) {
      const sheet = sheetFor(byKey.get(p.chartKey), { nm, look })
      charts[p.key] = { file: `${p.chartKey}.json`, h: '00000000', z: sheet.z, nm, look, sheet }
    }
    return { world: { file: '_world.json', h: '00000000' }, charts }
  }
  const base = () => ({
    ...realInput(loaded, { manifest: fakeManifest() }),
    overrides: [],
    workingOn: { ...STATION.WORKING_ON },
    blockStart: { ...STATION.BLOCK_START_POINT },
    placeTz: { ...STATION.PLACE_TZ },
    usState: { ...STATION.US_STATE },
    fileExists: () => true,
    fileHash: () => '00000000',
  })
  const withOverride = (o, extra = {}) => ({ overrides: [o], manifest: fakeManifest([o]), ...extra })
  const free = { active: true, until: '2026-12-01', place: 'Valencia', noc: 'ESP', lat: 39.45, lng: -0.32 }

  const cases = [
    ['baseline passes', {}, null],
    ['override: missing until', withOverride({ active: true, stopId: 'annapolis-fall-26' }), 'LOCATION_OVERRIDES[0]: `until`'],
    ['override: impossible date', withOverride({ active: true, until: '2026-02-30', stopId: 'annapolis-fall-26' }), '`until` must be a real'],
    ['override: active not boolean', withOverride({ active: 'yes', until: '2026-10-05', stopId: 'annapolis-fall-26' }), '`active` must be'],
    ['override: from after until', withOverride({ active: true, from: '2026-10-09', until: '2026-10-05', stopId: 'annapolis-fall-26' }), 'is after `until`'],
    ['override: unknown stopId', withOverride({ active: true, until: '2026-10-05', stopId: 'nowhere-26' }), 'unknown stopId'],
    ['override: point not on stop', withOverride({ active: true, until: '2026-10-05', stopId: 'australia-breeze-26', point: 'Perth' }), 'is not a point of australia-breeze-26'],
    ['override: no stop, no place', withOverride({ active: true, until: '2026-10-05' }), 'needs a `stopId`'],
    ['override: lat/lng without place', withOverride({ active: true, until: '2026-10-05', stopId: 'australia-breeze-26', lat: -33.85, lng: 151.22 }), 'belong to a `place`'],
    ['override: place without lat/lng', withOverride({ active: true, until: '2026-10-05', place: 'Valencia' }), 'needs its own `lat`'],
    ['override: focus em dash', withOverride({ active: true, until: '2026-10-05', stopId: 'annapolis-fall-26', focus: 'Starts — and speed' }), '`focus` has an em dash'],
    ['override: focus too long', withOverride({ active: true, until: '2026-10-05', stopId: 'annapolis-fall-26', focus: 'x'.repeat(91) }), '`focus` is 91 characters'],
    ['override: free place, no tz', withOverride(free), 'PLACE_TZ["valencia"] is missing'],
    ['override: free place, no chart', { ...withOverride(free), manifest: fakeManifest(), placeTz: { ...STATION.PLACE_TZ, valencia: 'Europe/Madrid' } }, 'no chart for place "valencia"'],
    ['WORKING_ON: unknown stop', { workingOn: { 'annapolis-fall-2026': 'Fitness' } }, 'WORKING_ON["annapolis-fall-2026"]: no stop'],
    ['WORKING_ON: unknown point', { workingOn: { 'australia-breeze-26--Perth': 'Downwind' } }, '"Perth" is not a point of australia-breeze-26'],
    ['WORKING_ON: point on a single-venue stop', { workingOn: { 'annapolis-fall-26--Annapolis': 'Fitness' } }, 'it has no points'],
    ['WORKING_ON: em dash', { workingOn: { 'annapolis-fall-26': 'Fitness — gym' } }, 'em dash or a spaced en dash'],
    ['WORKING_ON: spaced en dash', { workingOn: { 'annapolis-fall-26': 'Fitness – gym' } }, 'em dash or a spaced en dash'],
    ['WORKING_ON: too long', { workingOn: { 'annapolis-fall-26': 'y'.repeat(91) } }, '91 characters'],
    ['WORKING_ON: not a string', { workingOn: { 'annapolis-fall-26': 42 } }, 'must be a string'],
    ['BLOCK_START_POINT: unknown point', { blockStart: { 'australia-breeze-26': 'Perth' } }, 'BLOCK_START_POINT["australia-breeze-26"]: "Perth"'],
    ['BLOCK_START_POINT: unknown stop', { blockStart: { 'australia-2026': 'Fremantle' } }, 'BLOCK_START_POINT["australia-2026"]: no stop'],
    ['PLACE_TZ: missing', { placeTz: { ...STATION.PLACE_TZ, fremantle: undefined } }, 'PLACE_TZ["fremantle"] is missing'],
    ['PLACE_TZ: invalid zone', { placeTz: { ...STATION.PLACE_TZ, hyeres: 'Europe/Hyeres' } }, '"Europe/Hyeres" is not a valid IANA'],
    ['US_STATE: missing', { usState: { ...STATION.US_STATE, Miami: undefined } }, 'US_STATE["Miami"] is missing'],
    ['manifest: not baked', { manifest: undefined, manifestError: 'src/data/chartManifest.js does not exist: the charts have not been baked; ' + BAKE_HINT }, 'npm --prefix scripts/charts run bake'],
    ['manifest: place missing', (() => { const m = fakeManifest(); delete m.charts.palma; return { manifest: m } })(), 'no chart for place "palma"'],
    ['manifest: file not on disk', { fileExists: (f) => f !== 'sydney.json' }, 'public/charts/sydney.json does not exist'],
    ['manifest: world not on disk', { fileExists: (f) => f !== '_world.json' }, 'world file "_world.json" is missing'],
    ['manifest: stale chart hash', { fileHash: (f) => (f === 'miami.json' ? 'deadbeef' : '00000000') }, 'chartManifest["miami"].h "00000000" != sha1'],
    ['manifest: stale world hash', { fileHash: (f) => (f === '_world.json' ? 'deadbeef' : '00000000') }, 'world hash "00000000" != sha1'],
    ['manifest: alias wrong file', (() => { const m = fakeManifest(); m.charts.takapuna.file = 'takapuna.json'; return { manifest: m } })(), 'expected "auckland.json"'],
    ['manifest: sheet drift', (() => { const m = fakeManifest(); m.charts.annapolis.sheet = { ...m.charts.annapolis.sheet, x0: m.charts.annapolis.sheet.x0 + 1 }; return { manifest: m } })(), '!= chartMath.sheetFor'],
  ]

  let passed = 0
  for (const [name, patch, expect] of cases) {
    const { errors } = checkStation({ ...base(), ...patch })
    const ok = expect == null ? errors.length === 0 : errors.some((e) => e.includes(expect))
    if (ok) passed++
    console.log(`${ok ? '  pass' : '  FAIL'}  ${name}${ok ? '' : `\n        expected ${expect == null ? 'no errors' : `an error containing: ${expect}`}\n        got: ${JSON.stringify(errors, null, 2)}`}`)
  }
  console.log(`check-station self-test: ${passed}/${cases.length} rules fire as expected`)
  return passed === cases.length
}

// ---------------------------------------------------------------------------
async function main() {
  let loaded
  try {
    loaded = await loadViteModules()
  } catch (err) {
    console.error(`\ncheck-station: FAILED to load campaignStops / whereNow:\n  ${err.stack || err.message}\n`)
    return 1
  }

  if (process.argv.includes('--self-test')) return selfTest(loaded) ? 0 : 1

  const { errors, summary } = checkStation(realInput(loaded, await loadManifest()))
  if (errors.length) {
    console.error(`\ncheck-station: ${errors.length} problem${errors.length === 1 ? '' : 's'} in the station data (src/data/station.js, campaignStops, chartManifest):`)
    for (const e of errors) console.error(`  ✗ ${e}`)
    console.error('\nThe home "Currently here" card would break or lie. Fix the above, then build again.\n')
    return 1
  }
  console.log(summary)
  return 0
}

process.exit(await main())
