// ============================================================================
//  stage-last-workout — put the right last-workout.json into dist/ (deploy).
// ============================================================================
//  Runs in .github/workflows/deploy.yml right after `npm run build`. Every
//  deploy REPLACES the whole Pages site, so without this step an ordinary code
//  push would wipe the workout the Strava workflow published. Source order:
//
//    1. WORKOUT_B64 — the fresh file the Strava workflow dispatched this
//       deploy with (base64 JSON),
//    2. the file robbysailing.com is serving right now (LIVE_URL, cache-busted,
//       10 s timeout) — production is the last-known-good copy,
//    3. whatever Vite copied from public/data/ (the empty placeholder).
//
//  Whatever wins goes through sanitizeWorkoutPayload and ONLY the whitelist
//  is written. It never fails a deploy: every problem is a ::warning:: and
//  exit 0 (the worst case is the tile hiding until the next Strava run, which
//  sees the placeholder live and redeploys within ~30 minutes). A broken
//  import below would crash before any of that runs, so deploy.yml also marks
//  the step continue-on-error (dist/ then keeps Vite's placeholder copy), and
//  CI's build job runs --self-test so a rename fails the PR instead.
//
//  `node scripts/stage-last-workout.mjs --self-test` checks the pipeline's
//  guarantees offline (placeholder valid, every sport mapped, private fields
//  trimmed, private activities in/out per INCLUDE_PRIVATE, duration basis per sport).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  fromStravaActivity,
  pickEligible,
  sanitizeWorkoutPayload,
  summarizeActivity,
} from '../src/data/workoutSchema.js'
import { SPORT_ICON_KEYS, SPORT_TYPES, describeSport, formatDuration, pickDurationS } from '../src/data/sportTypes.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TARGET = join(ROOT, 'dist', 'data', 'last-workout.json')
const PLACEHOLDER_SRC = join(ROOT, 'public', 'data', 'last-workout.json')
const DEFAULT_LIVE_URL = 'https://robbysailing.com/data/last-workout.json'
const EMPTY = { v: 1, source: 'strava', fetchedAt: null, activity: null }

const log = (line) => process.stdout.write(`${line}\n`)
const warning = (msg) => log(`::warning::${msg}`)

function readJsonFile(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'))
  } catch {
    return null
  }
}

function fromB64(b64) {
  try {
    return sanitizeWorkoutPayload(JSON.parse(Buffer.from(b64, 'base64').toString('utf8')))
  } catch {
    return null
  }
}

async function fromLive(url) {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:' && !(u.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(u.hostname))) return null
    const res = await fetch(`${url}${url.includes('?') ? '&' : '?'}cb=${Date.now()}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok || !(res.headers.get('content-type') || '').includes('json')) return null
    return sanitizeWorkoutPayload(await res.json())
  } catch {
    return null
  }
}

async function stage() {
  let payload = null
  let from = ''

  const b64 = (process.env.WORKOUT_B64 || '').trim()
  if (b64) {
    payload = fromB64(b64)
    if (payload) from = 'the Strava workflow (WORKOUT_B64)'
    else warning('WORKOUT_B64 was not a valid workout payload; falling back to the live file.')
  }

  if (!payload) {
    payload = await fromLive(process.env.LIVE_URL || DEFAULT_LIVE_URL)
    if (payload) from = 'the live site (last-known-good)'
    else warning('Could not read a valid live last-workout.json; keeping the placeholder.')
  }

  if (!payload) {
    payload = sanitizeWorkoutPayload(readJsonFile(TARGET)) ||
      sanitizeWorkoutPayload(readJsonFile(PLACEHOLDER_SRC)) ||
      EMPTY
    from = 'the placeholder'
  }

  mkdirSync(dirname(TARGET), { recursive: true })
  writeFileSync(TARGET, `${JSON.stringify(payload)}\n`)
  log(`Staged dist/data/last-workout.json from ${from}: ${summarizeActivity(payload.activity)}`)
}

// ---------------------------------------------------------------------------
// --self-test (offline)
// ---------------------------------------------------------------------------
function selfTest() {
  let failed = 0
  const check = (name, ok) => {
    log(`${ok ? 'ok  ' : 'FAIL'}  ${name}`)
    if (!ok) failed++
  }
  const keys = (o) => Object.keys(o || {}).sort().join(',')

  // The placeholder shipped in public/ is itself a valid payload.
  const placeholder = readJsonFile(PLACEHOLDER_SRC)
  const ph = sanitizeWorkoutPayload(placeholder)
  check('placeholder validates', Boolean(ph) && ph.activity === null)
  check('placeholder carries only whitelisted keys', keys(placeholder) === 'activity,fetchedAt,source,v')

  // Every known SportType maps to an icon the UI draws, with a short label.
  const badSport = SPORT_TYPES.filter((t) => {
    const d = describeSport(t)
    return !SPORT_ICON_KEYS.includes(d.icon) || !d.label || d.label.length > 16 || !['moving', 'elapsed'].includes(d.basis)
  })
  check(`every SportType (${SPORT_TYPES.length}) maps to a known icon + short label`, badSport.length === 0)
  const unknown = describeSport('UnderwaterBasketWeaving')
  check('an unknown SportType reads as sentence case + generic', unknown.label === 'Underwater basket weaving' && unknown.icon === 'generic')

  // A realistic Strava list with everything we must NOT publish.
  const base = {
    resource_state: 2,
    athlete: { id: 123456, resource_state: 1 },
    name: 'Morning spin round the harbour',
    distance: 40210.5,
    map: { id: 'a1', summary_polyline: 'abc123', resource_state: 2 },
    start_latlng: [38.97, -76.48],
    end_latlng: [38.98, -76.49],
    average_heartrate: 141.2,
    max_heartrate: 176,
    average_watts: 201.3,
    device_name: 'Garmin Edge',
    gear_id: 'b999',
    timezone: '(GMT-05:00) America/New_York',
    private: false,
    commute: false,
  }
  const list = [
    { ...base, id: 1001, sport_type: 'Ride', type: 'Ride', start_date: '2026-09-23T13:00:00Z', start_date_local: '2026-09-23T09:00:00Z', moving_time: 4310, elapsed_time: 4622, visibility: 'followers_only' },
    { ...base, id: 1002, sport_type: 'Run', start_date: '2026-09-23T12:00:00Z', start_date_local: '2026-09-23T08:00:00Z', moving_time: 120, elapsed_time: 130, visibility: 'everyone' },
    { ...base, id: 1003, sport_type: 'Ride', start_date: '2026-09-23T11:00:00Z', start_date_local: '2026-09-23T07:00:00Z', moving_time: 1500, elapsed_time: 1600, visibility: 'everyone', commute: true },
    { ...base, id: 1004, sport_type: 'Walk', start_date: '2026-09-23T10:30:00Z', start_date_local: '2026-09-23T06:30:00Z', moving_time: 1500, elapsed_time: 1600 }, // no visibility field
    { ...base, id: 1005, sport_type: 'Swim', start_date: '2026-09-23T10:00:00Z', start_date_local: '2026-09-23T06:00:00Z', moving_time: 1800, elapsed_time: 2000, visibility: 'everyone', private: true },
    { ...base, id: 1006, sport_type: 'Sail', start_date: '2026-09-22T14:00:00Z', start_date_local: '2026-09-22T10:00:00Z', moving_time: 5400, elapsed_time: 12600, visibility: 'everyone' },
    { ...base, id: 1007, sport_type: 'WeightTraining', start_date: '2026-09-21T14:00:00Z', start_date_local: '2026-09-21T10:00:00Z', moving_time: 2400, elapsed_time: 3600, visibility: 'everyone' },
  ]
  const shuffled = [list[5], list[0], list[6], list[2], list[4], list[1], list[3]]
  // Default (INCLUDE_PRIVATE): Robby's "Only You" workouts count; commutes and
  // accidental starts still don't.
  check('by default private + followers-only count; commute and <5 min are excluded', pickEligible(shuffled)?.id === 1001)
  check('by default a private or no-visibility activity is eligible', pickEligible([list[4]])?.id === 1005 && pickEligible([list[3]])?.id === 1004)
  check('by default a commute and a 2-minute start are still excluded', pickEligible([list[2], list[1]]) === null)
  // Public-only mode (INCLUDE_PRIVATE = false) fails closed.
  const pick = pickEligible(shuffled, { includePrivate: false })
  check('public-only: followers_only, private, commute, <5 min and no-visibility activities are excluded', pick?.id === 1006)
  check('public-only: an activity missing `visibility` is never eligible', pickEligible([list[3]], { includePrivate: false }) === null)
  check('pickEligible does not mutate its input', shuffled[0].id === 1006 && shuffled[1].id === 1001)

  const payload = fromStravaActivity(pick, new Date('2026-09-23T15:17:04.123Z'))
  check('payload keys are exactly the whitelist', keys(payload) === 'activity,fetchedAt,source,v')
  check('activity keys are exactly the whitelist', keys(payload?.activity) === 'elapsedTimeS,id,movingTimeS,sportType,startDay')
  const text = JSON.stringify(payload)
  const leaks = ['Morning spin', 'polyline', 'abc123', '38.97', '-76.48', 'heartrate', '141', '123456', 'Garmin', 'b999', 'America/New_York', 'visibility', 'T10:00']
    .filter((s) => text.includes(s))
  check('no name, map, latlng, heart rate, athlete, device, gear, timezone or start time leaks', leaks.length === 0)
  check('id is a string, startDay is the local day, fetchedAt has no millis',
    payload?.activity?.id === '1006' && payload.activity.startDay === '2026-09-22' && payload.fetchedAt === '2026-09-23T15:17:04Z')

  // Duration basis per sport.
  check('Sail reads ELAPSED time (12600 s → 3h 30m)', pickDurationS(payload.activity) === 12600 && formatDuration(12600) === '3h 30m')
  check('Ride reads MOVING time', pickDurationS({ sportType: 'Ride', movingTimeS: 4310, elapsedTimeS: 4622 }) === 4310)
  check('WeightTraining reads ELAPSED time', pickDurationS({ sportType: 'WeightTraining', movingTimeS: 2400, elapsedTimeS: 3600 }) === 3600)
  check('a missing basis clock falls back to the other one', pickDurationS({ sportType: 'Ride', movingTimeS: 0, elapsedTimeS: 900 }) === 900)
  check('no duration at all → null', pickDurationS({ sportType: 'Sail', movingTimeS: 0, elapsedTimeS: 0 }) === null)
  check('formatDuration wording', formatDuration(2880) === '48 min' && formatDuration(4310) === '1h 12m' &&
    formatDuration(3900) === '1h 5m' && formatDuration(7200) === '2h' && formatDuration(3590) === '1h' && formatDuration(3570) === '1h')

  // The strict gate on the way back in.
  const dirty = { ...payload, name: 'x', activity: { ...payload.activity, map: { summary_polyline: 'abc' }, name: 'x' }, extra: 1 }
  const clean = sanitizeWorkoutPayload(dirty)
  check('sanitize drops unknown keys at both levels', keys(clean) === 'activity,fetchedAt,source,v' && keys(clean?.activity) === 'elapsedTimeS,id,movingTimeS,sportType,startDay')
  check('sanitize rejects a bad id / sport / duration / day / version', [
    { ...payload, v: 2 },
    { ...payload, source: 'garmin' },
    { ...payload, activity: { ...payload.activity, id: '12ab' } },
    { ...payload, activity: { ...payload.activity, sportType: '<img>' } },
    { ...payload, activity: { ...payload.activity, movingTimeS: 1.5 } },
    { ...payload, activity: { ...payload.activity, elapsedTimeS: 604801 } },
    { ...payload, activity: { ...payload.activity, startDay: '2026-9-22' } },
  ].every((p) => sanitizeWorkoutPayload(p) === null))
  check('base64 round trip', JSON.stringify(fromB64(Buffer.from(text).toString('base64'))) === text)

  log(failed ? `\n${failed} check(s) FAILED` : '\nall checks passed')
  return failed ? 1 : 0
}

if (process.argv.includes('--self-test')) {
  process.exitCode = selfTest()
} else {
  stage().catch(() => {
    // Last resort: never fail the deploy.
    warning('stage-last-workout hit an unexpected error; the placeholder stays in place.')
    process.exitCode = 0
  })
}
