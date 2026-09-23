// ============================================================================
//  whereNow — WHERE Robby is today, for the home "Currently here" card.
// ============================================================================
//  Resolves ONE place (plus its stop context) from The Road
//  (../data/campaignStops.js) by date, with the owner's overrides from
//  ../data/station.js on top. Rules, first match wins:
//    1. OVERRIDE  the first LOCATION_OVERRIDES entry that is active, valid and
//                 whose from..until window (inclusive local dates) covers today.
//    2. STOP      a stop in progress today. Overlaps resolve regatta over
//                 training, then the later start (the newer commitment), then
//                 the shorter window, then STOPS order.
//    3. NEXT      in a gap between stops: the earliest upcoming start (tie:
//                 regatta, then STOPS order), with a day count.
//    4. LAST      after the final stop: the one that ended last (tie: regatta).
//  A multi-city block has no per-city dates, so it shows ONE city for its whole
//  window: the one BLOCK_START_POINT names, else its first point.
//
//  Day-level only, like ./campaignSchedule (whose date helpers this reuses, so
//  the two can never disagree about "today"). The hook re-derives when the
//  local calendar day changes, never faster.
//
//  DEV-only URL params (dead code in production builds):
//    ?now=YYYY-MM-DD   resolve as if it were that local date
//    ?override=0       ignore LOCATION_OVERRIDES
//    ?where=<placeKey> preview any place (mode 'override', no stop, no focus)

import { useEffect, useMemo, useState } from 'react'
import STOPS from '../data/campaignStops'
import { CAMPAIGN_EVENTS, parseLocalDate, eventStatus, daysUntilStart } from './campaignSchedule'
import { LOCATION_OVERRIDES, BLOCK_START_POINT, WORKING_ON, PLACE_TZ, US_STATE, CITY_DISPLAY } from '../data/station'
import { placesFromStops, stopPlaces, slugify } from './places'
import { formatPosition } from './chartMath'

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/
const DASH_RE = /—| – / // em dash, or an en dash with spaces around it
const FOCUS_MAX = 90
const EPOCH = '1970-01-01' // an override with no `from` is live from the start of time

const KICKER = { override: 'Currently here', stop: 'Currently here', next: 'Next stop', last: 'Last stop' }

// Every place the card can show (stop venues, block cities, free overrides),
// keyed by city slug with its chart alias. The chart bake reads the same list.
export const STATION_PLACES = placesFromStops(STOPS, LOCATION_OVERRIDES)

// Stops that carry a dated window, with their STOPS index and schedule entry
// (kind + ISO start/end), in STOPS order.
const EVENT_BY_ID = new Map(CAMPAIGN_EVENTS.map((e) => [e.id, e]))
const DATED = STOPS
  .map((s, i) => ({ s, i, ev: EVENT_BY_ID.get(s.id) }))
  .filter((x) => x.ev)

const pad2 = (n) => String(n).padStart(2, '0')

// 'YYYY-MM-DD' from a Date's LOCAL calendar fields (never toISOString, which
// is UTC and would roll the day early/late off the viewer's offset).
export function localISODate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// A real calendar date in 'YYYY-MM-DD' form ('2026-02-30' is not).
const isISODate = (s) => typeof s === 'string' && ISO_RE.test(s) && localISODate(parseLocalDate(s)) === s

const kindRank = (x) => (x.ev.kind === 'regatta' ? 0 : 1)
const nonEmpty = (s) => (typeof s === 'string' && s.trim() ? s.trim() : null)
const findStop = (id) => STOPS.findIndex((s) => s.id === id)

// ---------------------------------------------------------------------------
// validateOverride — null when a LOCATION_OVERRIDES entry is usable, else the
// reason it isn't. Pure: never depends on today's date (the build check runs
// it on every entry, expired or not).
// ---------------------------------------------------------------------------
export function validateOverride(o) {
  if (!o || typeof o !== 'object' || Array.isArray(o)) return 'must be an object'
  if (typeof o.active !== 'boolean') return '`active` must be true or false'
  if (!isISODate(o.until)) return '`until` must be a real YYYY-MM-DD date'
  if (o.from != null) {
    if (!isISODate(o.from)) return '`from` must be a real YYYY-MM-DD date'
    if (o.from > o.until) return `\`from\` ${o.from} is after \`until\` ${o.until}`
  }
  for (const f of ['place', 'area', 'noc', 'chartId']) {
    if (o[f] == null) continue
    if (typeof o[f] !== 'string' || !o[f].trim()) return `\`${f}\` must be a non-empty string`
    if (DASH_RE.test(o[f])) return `\`${f}\` has an em dash or a spaced en dash`
  }
  const hasCoords = o.lat != null || o.lng != null
  if (hasCoords && !(Number.isFinite(o.lat) && Number.isFinite(o.lng) && Math.abs(o.lat) <= 90 && Math.abs(o.lng) <= 180)) {
    return '`lat` and `lng` must both be finite degrees'
  }
  if (o.place != null && !hasCoords) return '`place` needs its own `lat` and `lng` (use `point` to pick a city inside a stop)'
  if (hasCoords && o.place == null) return '`lat`/`lng` belong to a `place` (use `point` to pick a city inside a stop)'
  if (o.stopId != null) {
    const i = findStop(o.stopId)
    if (i < 0) return `unknown stopId "${o.stopId}"`
    if (o.point != null) {
      const labels = (STOPS[i].points || []).map((p) => p.label)
      if (!labels.includes(o.point)) {
        return `point "${o.point}" is not a point of ${o.stopId}${labels.length ? ` (${labels.join(', ')})` : ' (it has none)'}`
      }
    }
  } else {
    if (o.point != null) return '`point` needs a `stopId`'
    if (o.place == null) return 'needs a `stopId`, or a `place` with `lat` and `lng`'
  }
  if (o.focus != null) {
    if (typeof o.focus !== 'string') return '`focus` must be a string'
    if (DASH_RE.test(o.focus)) return '`focus` has an em dash or a spaced en dash'
    if (o.focus.length > FOCUS_MAX) return `\`focus\` is ${o.focus.length} characters (max ${FOCUS_MAX})`
  }
  return null
}

// The first active, valid override whose window covers `now`. In DEV a broken
// entry throws (loud, like campaignStops' asserts); in production it is skipped.
function activeOverride(list, now) {
  if (!Array.isArray(list)) return null
  let hit = null
  for (let i = 0; i < list.length; i++) {
    const o = list[i]
    const bad = validateOverride(o)
    if (bad) {
      if (import.meta.env.DEV) throw new Error(`station.js LOCATION_OVERRIDES[${i}]: ${bad}`)
      continue
    }
    if (!hit && o.active === true && eventStatus({ start: o.from || EPOCH, end: o.until }, now) === 'in-progress') hit = o
  }
  return hit
}

// The city a stop shows: an explicit point label, else BLOCK_START_POINT (if it
// names a real point), else the first place (= points[0] = the stop's lat/lng).
function stopPoint(stop, label) {
  const pts = stopPlaces(stop)
  const want = label ?? BLOCK_START_POINT[stop.id]
  return pts.find((p) => p.city === want) || pts[0]
}

// Place view-model. `src` = { city, noc, lat, lng, key?, area? }.
function placeView(src, places) {
  const key = src.key || slugify(src.city)
  const known = places.find((p) => p.key === key)
  const area = src.area || (src.noc === 'USA' && US_STATE[src.city]) || src.noc || ''
  const cityDisplay = CITY_DISPLAY[src.city] || src.city
  return {
    key,
    chartKey: known ? known.chartKey : key,
    city: src.city,
    cityDisplay,
    area,
    title: area ? `${cityDisplay}, ${area}` : cityDisplay,
    lat: src.lat,
    lng: src.lng,
    tz: PLACE_TZ[key] || null,
    position: formatPosition({ lat: src.lat, lng: src.lng }),
  }
}

function stopView(stop) {
  const ev = EVENT_BY_ID.get(stop.id)
  const kind = ev ? ev.kind : /^Training /.test(stop.event) ? 'training' : 'regatta'
  return { id: stop.id, event: stop.event, kind, dates: stop.dates }
}

// "Working on" line: the point line beats the block line; '' / missing = none.
function stopFocus(stop, pointLabel) {
  const byPoint = stop.points?.length ? WORKING_ON[`${stop.id}--${pointLabel}`] : null
  return nonEmpty(byPoint) || nonEmpty(WORKING_ON[stop.id]) || null
}

// Neighbouring Road stops (first point of each) for the world locator.
function neighbours(index) {
  const at = (i) => {
    const s = STOPS[i]
    if (!s) return null
    const p = stopPlaces(s)[0]
    return { lat: p.lat, lng: p.lng }
  }
  return index < 0 ? { prev: null, next: null } : { prev: at(index - 1), next: at(index + 1) }
}

function here(mode, dayKey, { place, stop = null, focus = null, daysUntil = null, index = -1 }) {
  const { prev, next } = neighbours(stop ? index : -1)
  return {
    mode,
    kicker: KICKER[mode],
    dayKey,
    daysUntil: mode === 'next' ? daysUntil : null,
    place,
    stop,
    focus: mode === 'override' || mode === 'stop' ? focus : null,
    prev,
    next,
  }
}

function fromOverride(o, dayKey, places) {
  const index = o.stopId != null ? findStop(o.stopId) : -1
  const stop = index >= 0 ? STOPS[index] : null
  const pt = stop ? stopPoint(stop, o.point) : null
  const src = pt ? { city: pt.city, noc: pt.noc, lat: pt.lat, lng: pt.lng } : { city: o.place, noc: '', lat: o.lat, lng: o.lng }
  if (o.place) {
    src.city = o.place
    if (o.chartId) src.key = o.chartId
  }
  if (o.noc) src.noc = o.noc
  if (o.area) src.area = o.area
  if (Number.isFinite(o.lat) && Number.isFinite(o.lng)) {
    src.lat = o.lat
    src.lng = o.lng
  }
  return here('override', dayKey, {
    place: placeView(src, places),
    stop: stop ? stopView(stop) : null,
    focus: nonEmpty(o.focus) || (stop ? stopFocus(stop, pt.city) : null),
    index,
  })
}

function fromStop(mode, x, dayKey, places, daysUntil = null) {
  const pt = stopPoint(x.s)
  return here(mode, dayKey, {
    place: placeView(pt, places),
    stop: stopView(x.s),
    focus: stopFocus(x.s, pt.city),
    daysUntil,
    index: x.i,
  })
}

// ---------------------------------------------------------------------------
// resolveWhereNow — the Here view-model for a moment (day-level), or null when
// there is nothing to show (no dated stops and no live override).
// ---------------------------------------------------------------------------
export function resolveWhereNow(now = new Date(), { overrides = LOCATION_OVERRIDES, useOverrides = true } = {}) {
  const dayKey = localISODate(now)
  const places = overrides === LOCATION_OVERRIDES ? STATION_PLACES : placesFromStops(STOPS, Array.isArray(overrides) ? overrides : [])

  if (useOverrides) {
    const o = activeOverride(overrides, now)
    if (o) return fromOverride(o, dayKey, places)
  }

  const live = DATED.filter((x) => eventStatus(x.ev, now) === 'in-progress')
  if (live.length) {
    live.sort((a, b) =>
      kindRank(a) - kindRank(b)
      || b.ev.start.localeCompare(a.ev.start) // later start first
      || a.ev.end.localeCompare(b.ev.end) // same start: shorter window first
      || a.i - b.i)
    return fromStop('stop', live[0], dayKey, places)
  }

  const upcoming = DATED.filter((x) => eventStatus(x.ev, now) === 'upcoming')
  if (upcoming.length) {
    upcoming.sort((a, b) => a.ev.start.localeCompare(b.ev.start) || kindRank(a) - kindRank(b) || a.i - b.i)
    return fromStop('next', upcoming[0], dayKey, places, daysUntilStart(upcoming[0].ev, now))
  }

  if (!DATED.length) return null
  const done = [...DATED].sort((a, b) => b.ev.end.localeCompare(a.ev.end) || kindRank(a) - kindRank(b) || a.i - b.i)
  return fromStop('last', done[0], dayKey, places)
}

// DEV: a bare place preview for ?where=<placeKey>.
function previewHere(key, dayKey) {
  const p = STATION_PLACES.find((x) => x.key === key)
  if (!p) {
    console.warn(`whereNow: ?where=${key} is not a place key (${STATION_PLACES.map((x) => x.key).join(', ')})`)
    return null
  }
  return here('override', dayKey, { place: placeView(p, STATION_PLACES) })
}

function readDevParams() {
  try {
    const q = new URLSearchParams(window.location.search)
    const now = q.get('now')
    return {
      now: now && isISODate(now) ? now : null,
      useOverrides: q.get('override') !== '0',
      where: q.get('where') || null,
    }
  } catch {
    return { now: null, useOverrides: true, where: null }
  }
}

// ---------------------------------------------------------------------------
// useWhereNow — live Here for the card. Ticks once a minute (and when the tab
// comes back) but only re-resolves when the local date string changes: the
// setState with an identical string bails out, so a long-lived tab rolls over
// at midnight without re-rendering the other 1439 minutes.
// ---------------------------------------------------------------------------
export function useWhereNow() {
  const [dayKey, setDayKey] = useState(() => localISODate(new Date()))

  useEffect(() => {
    const tick = () => setDayKey(localISODate(new Date()))
    const timer = setInterval(tick, 60000)
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return useMemo(() => {
    if (import.meta.env.DEV) {
      const dev = readDevParams()
      const day = dev.now || dayKey
      if (dev.where) {
        const preview = previewHere(dev.where, day)
        if (preview) return preview
      }
      return resolveWhereNow(parseLocalDate(day), { useOverrides: dev.useOverrides })
    }
    return resolveWhereNow(parseLocalDate(dayKey))
  }, [dayKey])
}
