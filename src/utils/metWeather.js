// ============================================================================
//  metWeather — live wind + temperature for the home "Currently here" card.
// ============================================================================
//  Reads MET Norway's Locationforecast 2.0 (compact) straight from the browser:
//  free, global, keyless, CC BY 4.0 (credit WEATHER_ATTRIBUTION wherever the
//  numbers show). MET's terms shape everything below:
//    · coordinates carry at most 4 decimals (their cache key)
//    · honour the Expires header: never refetch before it passes
//    · a 429 means back off; 203 means the product is deprecated
//    · NO custom request headers: any header triggers a CORS preflight, which
//      MET does not answer. The browser's own Origin identifies the site.
//  One module-level cache (memory + localStorage 'rs:wx:v1:<lat4>,<lng4>')
//  and ONE shared in-flight request per location, so StrictMode's double
//  mount, two cards on one venue or a remount all cost a single request.
//
//  The stored payload is a trimmed, validated series ({ t, kn, dir, tempF });
//  "now" and the +3/+6/+9/+12 h forecast are derived from it at READ time, so
//  a cached forecast keeps pointing at the right hour until it expires.
//
//  DEV-only URL param (dead code in production builds):
//    ?wx=fixture   canned Annapolis data, no network (ready)
//    ?wx=stale     the same data, reported stale
//    ?wx=loading   stuck loading
//    ?wx=error     failed

import { useEffect, useMemo, useState } from 'react'

export const WEATHER_ATTRIBUTION = { label: 'MET Norway', href: 'https://api.met.no/', license: 'CC BY 4.0' }

const API = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
const STORE_PREFIX = 'rs:wx:v1:'

const MIN = 60000
const HOUR = 60 * MIN
const TIMEOUT_MS = 8000
const RETRY_MS = 3000 // one retry after a network error / 5xx
const BACKOFF_429_MS = 15 * MIN
const FAIL_COOLDOWN_MS = 5 * MIN // after a failed attempt, the 60 s re-check waits this long
const STALE_MAX_MS = 6 * HOUR // expired data still shows (as 'stale') up to this age
const DEFAULT_TTL_MS = 30 * MIN // no/unreadable Expires header
const MIN_TTL_MS = 5 * MIN // floor, so a skewed clock can't turn Expires into a refetch loop
const RECHECK_MS = MIN
const REFRESH_GRACE_MS = 15 * MIN // expired data still reads 'ready' while its routine refresh runs
const FORECAST_HOURS = [3, 6, 9, 12]
const FORECAST_WINDOW_MS = 90 * MIN
const KEEP_BEFORE_MS = 3 * HOUR // series kept around the fetch time (enough for 6 h stale + 12 h ahead)
const KEEP_AFTER_MS = 48 * HOUR

const MS_TO_KN = 1.943844
const MAX_KN = 150

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW']

// Degrees → 16-point compass ('NE'); null for a non-number.
export function compass16(deg) {
  if (!Number.isFinite(deg)) return null
  const d = ((deg % 360) + 360) % 360
  return COMPASS[Math.round(d / 22.5) % 16]
}

const labelFmts = new Map()
const clockFmts = new Map()

// '4 PM' / '4:30 PM' (US 12-hour, to sit with °F) in the venue's zone; the
// viewer's own zone if tz is unknown.
function hhmm(t, tz) {
  const id = tz || ''
  let f = labelFmts.get(id)
  if (!f) {
    const opts = { hour: 'numeric', minute: '2-digit', hour12: true }
    try {
      f = new Intl.DateTimeFormat('en-US', tz ? { ...opts, timeZone: tz } : opts)
    } catch {
      f = new Intl.DateTimeFormat('en-US', opts)
    }
    labelFmts.set(id, f)
  }
  return f.format(t).replace(':00', '').replace(/\u202f|\u00a0/g, ' ')
}

// The venue's wall clock: { time: '2:32 PM', abbr: 'EDT' }, or null when the
// zone is missing/unknown. (Zones without a US abbreviation read 'GMT+8'.)
export function localClock(tz, date = new Date()) {
  if (!tz) return null
  try {
    let f = clockFmts.get(tz)
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true, timeZoneName: 'short' })
      clockFmts.set(tz, f)
    }
    const parts = f.formatToParts(date)
    const get = (type) => parts.find((p) => p.type === type)?.value
    const h = get('hour')
    const m = get('minute')
    const ap = get('dayPeriod')
    if (!h || !m) return null
    return { time: `${h}:${m}${ap ? ' ' + ap : ''}`, abbr: get('timeZoneName') || '' }
  } catch {
    return null
  }
}

const finite = (v) => typeof v === 'number' && Number.isFinite(v)

// MET compact JSON → { series: [{ t, kn, dir, tempF }] (ascending), updatedAt }
// or null. Validates every field; anything malformed is dropped, never thrown.
function normalize(json) {
  const ts = json && typeof json === 'object' ? json.properties?.timeseries : null
  if (!Array.isArray(ts)) return null
  const series = []
  for (const row of ts) {
    const t = typeof row?.time === 'string' ? Date.parse(row.time) : NaN
    const d = row?.data?.instant?.details
    if (!Number.isFinite(t) || !d || typeof d !== 'object') continue
    const kn = finite(d.wind_speed) ? Math.round(d.wind_speed * MS_TO_KN) : null
    const dir = finite(d.wind_from_direction) ? ((Math.round(d.wind_from_direction) % 360) + 360) % 360 : null
    const c = d.air_temperature
    const tempF = finite(c) && c > -90 && c < 65 ? Math.round((c * 9) / 5 + 32) : null
    const entry = { t, kn: kn != null && kn >= 0 && kn <= MAX_KN ? kn : null, dir, tempF }
    if (entry.kn == null && entry.dir == null && entry.tempF == null) continue
    series.push(entry)
  }
  if (!series.length) return null
  series.sort((a, b) => a.t - b.t)
  const up = Date.parse(json.properties?.meta?.updated_at || '')
  return { series, updatedAt: Number.isFinite(up) ? up : null }
}

// Normalized series → Conditions at `now` (epoch ms), labelled in `tz`.
function conditionsFrom(norm, tz, now, fallbackUpdatedAt = null) {
  const s = norm?.series
  if (!s?.length) return null
  let cur = s[0]
  for (const e of s) {
    if (e.t <= now) cur = e
    else break
  }
  const fc = []
  for (const h of FORECAST_HOURS) {
    const target = now + h * HOUR
    let best = null
    for (const e of s) {
      const gap = Math.abs(e.t - target)
      if (gap <= FORECAST_WINDOW_MS && (!best || gap < best.gap)) best = { e, gap }
    }
    const e = best?.e
    if (!e || e.t <= cur.t || (e.kn == null && e.dir == null)) continue
    if (fc.length && fc[fc.length - 1].t === e.t) continue
    fc.push({ t: e.t, label: hhmm(e.t, tz), kn: e.kn, dir: e.dir })
  }
  return {
    now: { kn: cur.kn, dir: cur.dir, compass: compass16(cur.dir), tempF: cur.tempF },
    fc: fc.map(({ label, kn, dir }) => ({ label, kn, dir, compass: compass16(dir) })),
    updatedAt: norm.updatedAt ?? fallbackUpdatedAt ?? now,
    fetchedAt: fallbackUpdatedAt ?? null, // when WE fetched it (the 'last updated' line)
    tz: tz || null,
  }
}

// Parse a raw MET compact response straight to Conditions (null if unusable).
// The hook uses the same two steps; exported for tests and tooling.
export function parseForecast(json, { tz = null, now = Date.now() } = {}) {
  try {
    return conditionsFrom(normalize(json), tz, now)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Shared cache: memory + localStorage, one in-flight request per location
// ---------------------------------------------------------------------------
const mem = new Map() // key → { expires, savedAt, data: { series, updatedAt } } | null
const inflight = new Map() // key → Promise<void>
const failedAt = new Map() // key → epoch ms of the last failed attempt
const subs = new Map() // key → Set<() => void>
let backoffUntil = 0 // 429: every location waits

function subscribe(key, fn) {
  let set = subs.get(key)
  if (!set) subs.set(key, (set = new Set()))
  set.add(fn)
  return () => set.delete(fn)
}
const emit = (key) => subs.get(key)?.forEach((fn) => fn())

function readEntry(key) {
  if (mem.has(key)) return mem.get(key)
  let entry = null
  try {
    const raw = JSON.parse(window.localStorage.getItem(STORE_PREFIX + key) || 'null')
    const rows = raw?.data?.series
    if (raw && finite(raw.expires) && finite(raw.savedAt) && Array.isArray(rows)) {
      const series = rows
        .filter((r) => Array.isArray(r) && finite(r[0]))
        .map(([t, kn, dir, tempF]) => ({ t, kn: finite(kn) ? kn : null, dir: finite(dir) ? dir : null, tempF: finite(tempF) ? tempF : null }))
      if (series.length) {
        entry = { expires: raw.expires, savedAt: raw.savedAt, data: { series, updatedAt: finite(raw.data.updatedAt) ? raw.data.updatedAt : null } }
      }
    }
  } catch {
    entry = null
  }
  mem.set(key, entry)
  return entry
}

function writeEntry(key, entry) {
  mem.set(key, entry)
  try {
    const { series, updatedAt } = entry.data
    window.localStorage.setItem(STORE_PREFIX + key, JSON.stringify({
      expires: entry.expires,
      savedAt: entry.savedAt,
      data: { updatedAt, series: series.map((e) => [e.t, e.kn, e.dir, e.tempF]) },
    }))
  } catch {
    // storage full / blocked: the memory copy still serves this page view
  }
}

// When this response goes stale. Relative to MET's Date when readable (immune
// to a skewed local clock), else the absolute Expires, floored at MIN_TTL.
function expiresFrom(res, now) {
  const exp = Date.parse(res.headers.get('expires') || '')
  const date = Date.parse(res.headers.get('date') || '')
  let at = now + DEFAULT_TTL_MS
  if (Number.isFinite(exp)) at = Number.isFinite(date) ? now + (exp - date) : exp
  return Math.max(at, now + MIN_TTL_MS)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// One request. Resolves { kind: 'ok' | 'retry' | 'throttled' | 'fail', ... };
// never rejects.
async function fetchOnce(url) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { credentials: 'omit', signal: ctl.signal })
    if (res.status === 429) return { kind: 'throttled' }
    if (res.status >= 500) return { kind: 'retry' }
    if (!res.ok) return { kind: 'fail' }
    if (import.meta.env.DEV && res.status === 203) {
      console.warn('metWeather: MET answered 203 (this product version is deprecated), check api.met.no')
    }
    const norm = normalize(await res.json())
    return norm ? { kind: 'ok', norm, expires: expiresFrom(res, Date.now()) } : { kind: 'fail' }
  } catch (err) {
    // network down, CORS, the 8 s abort: worth one retry. A body that isn't
    // JSON (an HTML error page) is not.
    return err instanceof SyntaxError ? { kind: 'fail' } : { kind: 'retry' }
  } finally {
    clearTimeout(timer)
  }
}

function trimSeries(series, now) {
  const kept = series.filter((e) => e.t >= now - KEEP_BEFORE_MS && e.t <= now + KEEP_AFTER_MS)
  return kept.length ? kept : series
}

// Fetch `key` unless it is fresh, already in flight, backing off or cooling
// down after a failure (`force` skips the cooldown, e.g. back online).
function revalidate(key, url, force = false) {
  const now = Date.now()
  const entry = readEntry(key)
  if (entry && now < entry.expires) return
  if (inflight.has(key) || now < backoffUntil) return
  if (!force && now - (failedAt.get(key) || 0) < FAIL_COOLDOWN_MS) return
  const job = (async () => {
    let r = await fetchOnce(url)
    if (r.kind === 'retry') {
      await sleep(RETRY_MS)
      r = await fetchOnce(url)
    }
    if (r.kind === 'ok') {
      const savedAt = Date.now()
      writeEntry(key, { expires: r.expires, savedAt, data: { series: trimSeries(r.norm.series, savedAt), updatedAt: r.norm.updatedAt } })
      failedAt.delete(key)
    } else {
      if (r.kind === 'throttled') backoffUntil = Date.now() + BACKOFF_429_MS
      failedAt.set(key, Date.now())
    }
  })()
    .catch(() => failedAt.set(key, Date.now()))
    .finally(() => {
      inflight.delete(key)
      emit(key)
    })
  inflight.set(key, job)
  emit(key)
}

// The hook's view of `key` at `now`.
function snapshot(id, key, tz, live, now = Date.now()) {
  let status = 'idle'
  let data = null
  if (key) {
    const entry = readEntry(key)
    const fresh = !!entry && now < entry.expires
    const usable = !!entry && (fresh || now - entry.savedAt <= STALE_MAX_MS)
    data = usable ? conditionsFrom(entry.data, tz, now, entry.savedAt) : null
    // A background retry after a failure keeps reading 'error' (no flicker
    // back to 'loading' every cooldown); success flips it straight to ready.
    // A routine refresh of just-expired data keeps reading 'ready' (no blue →
    // ink → blue flash every Expires cycle); 'stale' means a refresh FAILED,
    // or the data is well past its expiry.
    const refreshing = inflight.has(key) && !failedAt.has(key) && now >= backoffUntil
    const graceful = !!entry && refreshing && now - entry.expires < REFRESH_GRACE_MS
    if (data) status = fresh || graceful ? 'ready' : 'stale'
    else if (failedAt.has(key) || now < backoffUntil) status = 'error'
    else if (inflight.has(key) || live) status = 'loading'
  }
  const out = { status, data }
  return { id, sig: JSON.stringify(out), out }
}

const isVisible = () => typeof document === 'undefined' || document.visibilityState !== 'hidden'

// ---------------------------------------------------------------------------
// DEV fixture: a realistic September afternoon on the Severn (SSW sea breeze
// building to ~15 kn, then veering and easing after dark), MET compact shape.
// ---------------------------------------------------------------------------
function devFixture(now) {
  const base = Math.floor(now / HOUR) * HOUR
  const wind = [5.8, 6.2, 6.7, 7.1, 7.6, 7.9, 7.4, 6.6, 5.7, 4.9, 4.3, 3.8, 3.4, 3.1, 2.9, 3.2]
  const from = [196, 199, 203, 206, 209, 212, 216, 219, 223, 228, 233, 238, 244, 249, 253, 256]
  const temp = [24.2, 24.8, 25.1, 25.3, 25.0, 24.3, 23.4, 22.6, 21.9, 21.3, 20.8, 20.4, 20.1, 19.8, 19.6, 19.5]
  return {
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [-76.485, 38.9755, 3] },
    properties: {
      meta: {
        updated_at: new Date(base - 40 * MIN).toISOString(),
        units: { air_pressure_at_sea_level: 'hPa', air_temperature: 'celsius', cloud_area_fraction: '%', precipitation_amount: 'mm', relative_humidity: '%', wind_from_direction: 'degrees', wind_speed: 'm/s' },
      },
      timeseries: wind.map((w, i) => ({
        time: new Date(base + i * HOUR).toISOString().replace('.000Z', 'Z'),
        data: {
          instant: { details: { air_pressure_at_sea_level: 1016.2, air_temperature: temp[i], cloud_area_fraction: 18.8, relative_humidity: 61.4, wind_from_direction: from[i], wind_speed: w } },
          next_1_hours: { summary: { symbol_code: 'fair_day' }, details: { precipitation_amount: 0 } },
        },
      })),
    },
  }
}

function readWxParam() {
  try {
    const v = new URLSearchParams(window.location.search).get('wx')
    return ['loading', 'stale', 'error', 'fixture'].includes(v) ? v : null
  } catch {
    return null
  }
}

function devView(mode, tz, hasPlace) {
  if (!hasPlace) return { status: 'idle', data: null }
  if (mode === 'loading' || mode === 'error') return { status: mode, data: null }
  const now = Math.floor(Date.now() / MIN) * MIN // stable across StrictMode's double render
  const data = conditionsFrom(normalize(devFixture(now)), tz, now)
  if (mode === 'stale') data.updatedAt = now - 5 * HOUR
  return { status: mode === 'stale' ? 'stale' : 'ready', data }
}

// ---------------------------------------------------------------------------
// useConditions — live conditions for a Here.place (null-safe).
//   → { status: 'idle' | 'loading' | 'ready' | 'stale' | 'error', data }
// `enabled: false` stops all network activity (cached data still reads).
// While enabled and visible it re-checks once a minute (a fetch only happens
// once the cached copy has expired) and again on tab focus / back online.
// ---------------------------------------------------------------------------
export function useConditions(place, { enabled = true } = {}) {
  const lat = place?.lat
  const lng = place?.lng
  const tz = place?.tz || null
  const hasPlace = finite(lat) && finite(lng)
  const lat4 = hasPlace ? lat.toFixed(4) : ''
  const lng4 = hasPlace ? lng.toFixed(4) : ''
  const key = hasPlace ? `${lat4},${lng4}` : ''
  const devMode = import.meta.env.DEV ? readWxParam() : null
  const live = enabled && hasPlace && !devMode
  const id = `${key}|${tz || ''}|${live ? 1 : 0}`

  const [snap, setSnap] = useState(() => snapshot(id, key, tz, live))

  useEffect(() => {
    const refresh = () => setSnap((prev) => {
      const next = snapshot(id, key, tz, live)
      return prev.id === next.id && prev.sig === next.sig ? prev : next
    })
    refresh()
    if (!key) return undefined
    const unsubscribe = subscribe(key, refresh)
    if (!live) return unsubscribe
    const url = `${API}?lat=${lat4}&lon=${lng4}`
    const check = (force = false) => {
      if (!isVisible()) return
      revalidate(key, url, force)
      refresh()
    }
    check()
    const timer = setInterval(() => check(), RECHECK_MS)
    const onVisible = () => check()
    const onOnline = () => check(true)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onOnline)
    return () => {
      unsubscribe()
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onOnline)
    }
  }, [id, key, tz, live, lat4, lng4])

  const dev = useMemo(() => (import.meta.env.DEV && devMode ? devView(devMode, tz, hasPlace) : null), [devMode, tz, hasPlace])
  if (dev) return dev
  return snap.id === id ? snap.out : snapshot(id, key, tz, live).out
}
