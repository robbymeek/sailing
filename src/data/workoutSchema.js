// ============================================================================
//  workoutSchema — the ONE shape of public/data/last-workout.json.
// ============================================================================
//  The home card shows Robby's last Strava workout as "Bike ride · 1h 12m".
//  A scheduled GitHub Action (scripts/fetch-last-workout.mjs) asks Strava for
//  the latest activities, picks one with pickEligible, trims it to this
//  whitelist with fromStravaActivity, and the deploy writes it next to the
//  site. The browser (src/utils/lastWorkout.js) reads it back through
//  sanitizeWorkoutPayload. Every writer AND every reader goes through this
//  file, so nothing Strava sends beyond these five fields can ever reach the
//  published JSON:
//
//    { "v": 1, "source": "strava", "fetchedAt": "2026-09-23T15:17:04Z" | null,
//      "activity": { "id": "15938271650", "sportType": "Ride",
//                    "movingTimeS": 4310, "elapsedTimeS": 4622,
//                    "startDay": "2026-09-23" } | null }
//
//  Deliberately NOT carried: the activity name, map/polyline, start/end
//  latlng, heart rate, power, distance, speed, gear, device, the athlete, the
//  start TIME (only the local calendar day). Privacy fails closed: an activity
//  is only eligible when Strava says it is visible to Everyone; a missing
//  visibility field means NOT eligible.
//
//  Plain module (Node + browser, no import.meta).

import { formatDuration, pickDurationS } from './sportTypes.js'

const MAX_DURATION_S = 604800 // one week; anything longer is a recording glitch

const ID_RE = /^\d{1,20}$/
const SPORT_RE = /^[A-Za-z]{2,40}$/
const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const STAMP_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/

const isDuration = (n) => Number.isInteger(n) && n >= 0 && n <= MAX_DURATION_S

function isDay(s) {
  const m = typeof s === 'string' && DAY_RE.exec(s)
  if (!m) return false
  const mo = Number(m[2])
  const d = Number(m[3])
  return mo >= 1 && mo <= 12 && d >= 1 && d <= 31
}

// The strict gate. → a fresh object carrying ONLY the whitelisted keys, or
// null when anything required is missing or out of range. Unknown keys are
// dropped, never copied. A bad fetchedAt degrades to null (it's only a label).
export function sanitizeWorkoutPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  if (raw.v !== 1 || raw.source !== 'strava') return null

  const fetchedAt = typeof raw.fetchedAt === 'string' && STAMP_RE.test(raw.fetchedAt) ? raw.fetchedAt : null

  let activity = null
  if (raw.activity !== null && raw.activity !== undefined) {
    const a = raw.activity
    if (!a || typeof a !== 'object' || Array.isArray(a)) return null
    if (typeof a.id !== 'string' || !ID_RE.test(a.id)) return null
    if (typeof a.sportType !== 'string' || !SPORT_RE.test(a.sportType)) return null
    if (!isDuration(a.movingTimeS) || !isDuration(a.elapsedTimeS)) return null
    if (!isDay(a.startDay)) return null
    activity = {
      id: a.id,
      sportType: a.sportType,
      movingTimeS: a.movingTimeS,
      elapsedTimeS: a.elapsedTimeS,
      startDay: a.startDay,
    }
  }

  return { v: 1, source: 'strava', fetchedAt, activity }
}

// Date | ISO string | null → 'YYYY-MM-DDTHH:MM:SSZ' | null (no milliseconds).
function toStamp(t) {
  if (t === null || t === undefined) return null
  const d = t instanceof Date ? t : new Date(t)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

// Strava's integer seconds, rounded defensively (never trust a float).
const secs = (n) => (typeof n === 'number' && Number.isFinite(n) ? Math.round(n) : NaN)

// One Strava SummaryActivity (or null) → the published payload (or null if
// the activity can't be represented). Copies five fields and nothing else.
export function fromStravaActivity(a, fetchedAt = null) {
  let activity = null
  if (a) {
    const id = typeof a.id === 'number' && Number.isSafeInteger(a.id) && a.id >= 0 ? String(a.id)
      : (typeof a.id === 'string' ? a.id : '')
    activity = {
      id,
      // sport_type is the modern field; `type` is Strava's deprecated fallback.
      sportType: typeof a.sport_type === 'string' && a.sport_type ? a.sport_type : a.type,
      movingTimeS: secs(a.moving_time),
      elapsedTimeS: secs(a.elapsed_time),
      startDay: typeof a.start_date_local === 'string' ? a.start_date_local.slice(0, 10) : '',
    }
  }
  return sanitizeWorkoutPayload({ v: 1, source: 'strava', fetchedAt: toStamp(fetchedAt), activity })
}

const startMs = (a) => {
  const t = typeof a.start_date === 'string' ? Date.parse(a.start_date) : NaN
  return Number.isNaN(t) ? -Infinity : t
}

// Is this Strava activity OK to show on the public site? Public (visible to
// Everyone, not private), not a commute, long enough to count, and
// representable by the whitelist.
function isEligible(a, { minDurationS, excludeCommutes }) {
  if (!a || typeof a !== 'object') return false
  if (a.private) return false
  if (a.visibility !== 'everyone') return false // missing field → excluded
  if (excludeCommutes && a.commute) return false
  const longest = Math.max(Number(a.moving_time) || 0, Number(a.elapsed_time) || 0)
  if (!(longest >= minDurationS)) return false
  return fromStravaActivity(a)?.activity != null
}

// The newest eligible activity from Strava's list (any order), or null.
// Never mutates the input.
export function pickEligible(list, { minDurationS = 300, excludeCommutes = true } = {}) {
  if (!Array.isArray(list)) return null
  const newestFirst = (x, y) => {
    const d = startMs(y) - startMs(x)
    return Number.isNaN(d) ? 0 : d // two undated items (-Infinity - -Infinity)
  }
  const sorted = list.filter((a) => a && typeof a === 'object').sort(newestFirst)
  return sorted.find((a) => isEligible(a, { minDurationS, excludeCommutes })) || null
}

// Same published activity? Takes two payload.activity values (or null). Every
// field counts, so an edit on Strava (sport type fixed, time trimmed) is news.
export function sameActivity(a, b) {
  if (!a || !b) return !a && !b
  return a.id === b.id &&
    a.sportType === b.sportType &&
    a.movingTimeS === b.movingTimeS &&
    a.elapsedTimeS === b.elapsedTimeS &&
    a.startDay === b.startDay
}

// One log-safe line for the Action logs (public repo): sport, duration and the
// last 4 digits of the id. 'Ride 1h 12m id …1650' / 'no eligible activity'.
export function summarizeActivity(activity) {
  if (!activity) return 'no eligible activity'
  const dur = formatDuration(pickDurationS(activity) ?? 0)
  return `${activity.sportType} ${dur} id \u2026${String(activity.id).slice(-4)}`
}
