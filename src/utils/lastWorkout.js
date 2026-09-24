// ============================================================================
//  lastWorkout — the home card's "Last workout" tile, read from the site.
// ============================================================================
//  The browser NEVER talks to Strava. A scheduled GitHub Action publishes a
//  tiny whitelisted file (see src/data/workoutSchema.js and STRAVA.md) at
//  /data/last-workout.json, and this hook reads it back:
//
//    const { status, workout } = useLastWorkout()
//    status  'loading' | 'ready' | 'empty' | 'error'
//    workout { sportType, label: 'Bike ride', icon: 'bike', durationS: 4310,
//              durationLabel: '1h 12m', startDay: '2026-09-23' } | null
//
//  'empty' = nothing to show: no public activity yet, the placeholder file,
//  or the last one is more than STALE_AFTER_DAYS old (a months-old ride would
//  read like a broken widget, so the tile just steps aside). The UI should
//  hide the tile on 'empty' and 'error' alike; errors are caught into state,
//  never thrown into render.
//
//  One fetch per page load (a module-level promise, so StrictMode's double
//  mount and several consumers share it), one retry after 2 s on a network
//  error, and a content-type check so a GitHub Pages 404 page (text/html) or
//  Vite's index.html fallback can never be parsed as a workout.
//
//  DEV-only: ?workout=Ride:4310 | Sail:7260 | WeightTraining:3000 | none
//  (synthetic, no network; an optional third part is days ago, so
//  ?workout=Run:2880:30 previews the stale case). Also ?workout=error|loading.

import { useEffect, useState } from 'react'
import { daysUntilStart, parseLocalDate } from './campaignSchedule'
import { describeSport, formatDuration, pickDurationS } from '../data/sportTypes'
import { sanitizeWorkoutPayload } from '../data/workoutSchema'

export { formatDuration }

// A workout older than this many days hides the tile.
export const STALE_AFTER_DAYS = 21

const RETRY_MS = 2000
const LOADING = { status: 'loading', workout: null }
const EMPTY = { status: 'empty', workout: null }
const ERROR = { status: 'error', workout: null }

const pad2 = (n) => String(n).padStart(2, '0')
const localDayKey = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

// Sanitized payload → the hook's state, judged against `now`.
function toState(payload, now = new Date()) {
  const a = payload?.activity
  if (!a) return EMPTY
  if (Number.isNaN(parseLocalDate(a.startDay).getTime())) return EMPTY
  // Days since the workout's LOCAL calendar day. Negative (a workout logged
  // "tomorrow" from a venue ahead of the viewer's timezone) counts as fresh.
  const ageDays = -daysUntilStart({ start: a.startDay }, now)
  if (ageDays > STALE_AFTER_DAYS) return EMPTY
  const durationS = pickDurationS(a)
  if (!durationS) return EMPTY
  const { label, icon } = describeSport(a.sportType)
  return {
    status: 'ready',
    workout: {
      sportType: a.sportType,
      label,
      icon,
      durationS,
      durationLabel: formatDuration(durationS),
      startDay: a.startDay,
    },
  }
}

// ---------------------------------------------------------------------------
// DEV preview switch (stripped from production builds).
// ---------------------------------------------------------------------------
let devOverride = null
if (import.meta.env.DEV && typeof location !== 'undefined') {
  const v = new URLSearchParams(location.search).get('workout')
  if (v === 'none') devOverride = EMPTY
  else if (v === 'error') devOverride = ERROR
  else if (v === 'loading') devOverride = LOADING
  else if (v) {
    const [sportType, secs, ago] = v.split(':')
    const s = Math.max(0, Math.round(Number(secs) || 0))
    const day = new Date()
    day.setDate(day.getDate() - (Number(ago) || 0))
    const payload = sanitizeWorkoutPayload({
      v: 1,
      source: 'strava',
      fetchedAt: null,
      activity: { id: '1', sportType, movingTimeS: s, elapsedTimeS: s, startDay: localDayKey(day) },
    })
    devOverride = payload ? toState(payload) : ERROR
  }
}

// ---------------------------------------------------------------------------
// The one fetch per page load. Resolves to a sanitized payload, or null on
// any failure. Never rejects.
// ---------------------------------------------------------------------------
let loadPromise = null
let settled // undefined until the fetch settles, then payload | null

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchOnce() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/last-workout.json`, {
    cache: 'no-cache',
    credentials: 'omit',
  })
  if (!res.ok) return null
  if (!(res.headers.get('content-type') || '').includes('json')) return null
  try {
    return sanitizeWorkoutPayload(await res.json())
  } catch {
    return null // malformed JSON
  }
}

function loadPayload() {
  if (!loadPromise) {
    loadPromise = fetchOnce()
      .catch(() => wait(RETRY_MS).then(fetchOnce)) // network error: one retry
      .catch(() => null)
      .then((payload) => {
        settled = payload
        return payload
      })
  }
  return loadPromise
}

const stateFromSettled = () => (settled ? toState(settled) : ERROR)

export function useLastWorkout({ enabled = true } = {}) {
  const [state, setState] = useState(() => {
    if (devOverride) return devOverride
    return settled === undefined ? LOADING : stateFromSettled()
  })

  useEffect(() => {
    if (!enabled || devOverride || typeof fetch === 'undefined') return undefined
    let alive = true
    loadPayload().then(() => {
      if (alive) setState(stateFromSettled())
    })
    return () => {
      alive = false
    }
  }, [enabled])

  return state
}
