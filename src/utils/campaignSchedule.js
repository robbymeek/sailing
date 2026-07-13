// ============================================================================
//  campaignSchedule — the ONE source of truth for "what's the next event".
// ============================================================================
//  Derives live scheduling state (upcoming / in progress / completed, the
//  featured next regatta, and a human countdown) from the campaign STOPS in
//  ../data/campaignStops.js. Biography's "Next Event" line and the HelmPanel's
//  NEXT EVENT LCD both read from here, so their readouts can never drift and the
//  schedule ROLLS OVER on its own — no hard-coded date or event name in either
//  component, and it can never get stuck on "in 0 Days".
//
//  Dates are LOCAL CALENDAR dates ('YYYY-MM-DD'), parsed at local midnight, so a
//  UTC conversion can never shove an event onto the wrong day. Most stops carry
//  only month-level precision (the source data does); those read "In progress"
//  for the whole event month. San Pedro OCR carries its owner-confirmed exact day.

import { useEffect, useState } from 'react'
import STOPS from '../data/campaignStops'

const MS_PER_DAY = 86400000
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

// Training vs racing: only regattas are surfaced as "the next event" (training
// camps/blocks stay in the data and still drive The Road globe).
const TRAINING_EVENTS = new Set(['Training Camp', 'Training Block'])

// Short tags so a long event name renders like the old hand-tuned label
// ("San Pedro OCR", "Dún Laoghaire Worlds"). Unmapped names keep the full name.
const EVENT_ABBREV = {
  'Olympic Classes Regatta': 'OCR',
  'World Championship': 'Worlds',
  'European Championship': 'Europeans',
  'Trofeo Princesa Sofía': 'Trofeo Sofía',
  'French Olympic Week': 'Olympic Week',
  'Vilamoura Grand-Prix': 'Grand-Prix',
  'Olympic Games': 'Olympic Games',
}

// Parse 'YYYY-MM-DD' as LOCAL midnight. (new Date('2026-07-01') parses as UTC,
// which in a negative-offset timezone lands on Jun 30 — the exact day-shift bug
// this whole module is written to avoid.)
export function parseLocalDate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

// Whole-day difference between two local-midnight dates. Rounding absorbs the
// ±1h wobble a DST transition adds to a "24h" span, so the count stays exact.
const dayDiff = (fromMidnight, toMidnight) =>
  Math.round((toMidnight - fromMidnight) / MS_PER_DAY)

function formatWhen(ev) {
  if (ev.precision === 'day') {
    const d = parseLocalDate(ev.start)
    return `${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}` // "JUL 20 2026"
  }
  return ev.displayDate // "AUG 2026" / "OCT–NOV 2026"
}

// The canonical event list, derived once from the single STOPS source.
export const CAMPAIGN_EVENTS = STOPS
  .filter((s) => s.start && s.end)
  .map((s) => {
    const city = s.venues?.[0]?.city || s.region
    return {
      id: s.id,
      name: s.event,
      region: s.region,
      city,
      displayDate: s.dates,
      start: s.start,
      end: s.end,
      precision: s.start === s.end ? 'day' : 'range',
      kind: TRAINING_EVENTS.has(s.event) ? 'training' : 'regatta',
      title: `${city} ${EVENT_ABBREV[s.event] || s.event}`,
      resultUrl: s.record?.url || null, // optional post-event link (none in data yet)
    }
  })
  .sort((a, b) => a.start.localeCompare(b.start)) // ISO strings sort chronologically

export function eventStatus(ev, now = new Date()) {
  const today = startOfDay(now).getTime()
  const start = parseLocalDate(ev.start).getTime()
  const end = parseLocalDate(ev.end).getTime()
  if (today < start) return 'upcoming'
  if (today > end) return 'completed'
  return 'in-progress'
}

export function daysUntilStart(ev, now = new Date()) {
  return dayDiff(startOfDay(now).getTime(), parseLocalDate(ev.start).getTime())
}

// Snapshot of the schedule at `now`, optionally restricted to a `kind`
// ('regatta' | 'training'). `featured` = the event to headline: the one in
// progress, else the next upcoming.
export function getScheduleState(now = new Date(), { kind } = {}) {
  const pool = kind ? CAMPAIGN_EVENTS.filter((e) => e.kind === kind) : CAMPAIGN_EVENTS
  const completed = []
  let current = null
  let next = null
  for (const e of pool) {
    const st = eventStatus(e, now)
    if (st === 'completed') completed.push(e)
    else if (st === 'in-progress') { if (!current) current = e }
    else if (!next) next = e // first upcoming (pool is chronological)
  }
  return { current, next, completed, featured: current || next || null }
}

// The next-event readout shared by Biography + HelmPanel. Everything a consumer
// needs to render its own layout, so the SELECTION + WORDING live in one place.
export function nextEventDisplay(now = new Date()) {
  const { featured } = getScheduleState(now, { kind: 'regatta' })

  if (!featured) {
    // Every regatta is behind us — an intentional, non-broken end state.
    return {
      event: null, status: 'none', days: null,
      title: 'Next event to be announced',
      line: 'Next event to be announced',
      statusText: 'Schedule update coming soon',
      lcd: { name: 'TBA', where: 'SCHEDULE', when: 'COMING SOON', tMinus: 'TBA' },
      aria: 'Next event to be announced. See The Road.',
    }
  }

  const status = eventStatus(featured, now)
  const when = formatWhen(featured)

  if (status === 'in-progress') {
    // A month-window event reads "In progress"; the day-precise San Pedro reads
    // "Today" on its date. Never "in 0 Days".
    const statusText = featured.precision === 'day' ? 'Today' : 'In progress'
    return {
      event: featured, status, days: 0, when,
      title: featured.title,
      line: `${featured.title} — ${statusText}`,
      statusText,
      lcd: { name: featured.title.toUpperCase(), where: featured.region.toUpperCase(), when, tMinus: statusText.toUpperCase() },
      aria: `Now: ${featured.title}, ${featured.region}, ${when}, ${statusText}. See The Road.`,
    }
  }

  // upcoming
  const days = daysUntilStart(featured, now)
  const statusText = days <= 1 ? 'Tomorrow' : `in ${days} Days`
  return {
    event: featured, status, days, when,
    title: featured.title,
    line: `Next Event: ${featured.title} ${statusText}`,
    statusText,
    lcd: { name: featured.title.toUpperCase(), where: featured.region.toUpperCase(), when, tMinus: `T-${days} DAYS` },
    aria: `Next event: ${featured.title}, ${featured.region}, ${when}, ${statusText}. See The Road.`,
  }
}

// Live next-event state. Re-derives once a minute so a long-lived tab rolls over
// at the day boundary without a reload (day-level display — no faster tick
// needed). `enabled: false` (Biography's off-screen preload copy) freezes it at
// mount so a never-seen instance doesn't re-render.
export function useNextEvent(enabled = true) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!enabled) return undefined
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [enabled])
  return nextEventDisplay(now)
}
