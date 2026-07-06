// Half-year legs of the 2026 → 2028 campaign tour. The Road page scrolls
// through these five legs — each opens with a full-screen interstitial that
// shows the leg counter ("Leg 1 / 5"), the months it covers, and a vertical
// itinerary of that leg's stops (rendered from stopIndices in TheRoad.jsx —
// the Worlds render in chrome). Only the months (`label`) live here now; the
// stops (and each stop's `chapter` index) live in ./campaignStops.js.
//
// No em dashes / spaced en dashes (asserted in dev below).
//
// No three.js in this file — it is imported by the StaticTimeline fallback too.

import STOPS from './campaignStops'

const CHAPTERS = [
  { id: 'h2-2026', label: 'JUL–DEC 2026' },
  { id: 'h1-2027', label: 'JAN–JUN 2027' },
  { id: 'h2-2027', label: 'JUL–DEC 2027' },
  { id: 'h1-2028', label: 'JAN–JUN 2028' },
  { id: 'h2-2028', label: 'JUL 2028' },
]

// Derived: which stop indices belong to each chapter (STOPS is the source of
// truth via each stop's `chapter` field, so reordering stops can't desync).
CHAPTERS.forEach((ch, ci) => {
  ch.stopIndices = STOPS.reduce((acc, s, i) => (s.chapter === ci ? [...acc, i] : acc), [])
})

// Venue line for a stop's card: consecutive same-NOC cities group with the
// code once at the end, middot joins — "Adelaide · Fremantle · Sydney, AUS",
// "Palma, ESP · Hyères, FRA · Miami, USA". The single place the format lives.
export function formatVenues(venues) {
  const parts = []
  let group = []
  for (const v of venues) {
    if (group.length && group[group.length - 1].noc !== v.noc) {
      parts.push(`${group.map((g) => g.city).join(' · ')}, ${group[0].noc}`)
      group = []
    }
    group.push(v)
  }
  if (group.length) parts.push(`${group.map((g) => g.city).join(' · ')}, ${group[0].noc}`)
  return parts.join(' · ')
}

// Journey stats for the finale ("18 STOPS · 4 CONTINENTS · 2 YEARS") — computed
// from the data, not hardcoded. Add new venue NOC codes to the map below.
const NOC_CONTINENT = {
  USA: 'North America',
  IRL: 'Europe',
  POR: 'Europe',
  ESP: 'Europe',
  FRA: 'Europe',
  BRA: 'South America',
  AUS: 'Oceania',
  NZL: 'Oceania',
}

export const TOUR_STATS = (() => {
  const nocs = new Set()
  for (const s of STOPS) for (const v of s.venues) nocs.add(v.noc)
  const continents = new Set()
  for (const noc of nocs) {
    const cont = NOC_CONTINENT[noc]
    if (cont) continents.add(cont)
    else if (import.meta.env.DEV) throw new Error(`tourChapters: no continent mapped for "${noc}"`)
  }
  return {
    stops: STOPS.length,
    countries: nocs.size,
    continents: continents.size,
    years: 2,
  }
})()

if (import.meta.env.DEV) {
  // Same copy-voice guard as campaignStops: no em dashes / spaced en dashes.
  const copy = JSON.stringify(CHAPTERS.map(({ stopIndices, ...c }) => c))
  if (/—| – /.test(copy)) {
    throw new Error('tourChapters: em dash or spaced en dash found in copy — restructure instead')
  }
}

export default CHAPTERS
