// Half-year legs of the 2026 → 2028 campaign tour. The Road page scrolls
// through these five legs — each opens with a full-screen interstitial
// (kicker "LEG N · JUL–DEC 2026" / title / subtitle / roll-call) while the
// globe pulls back and constellates that leg's pins. Copy lives here; the
// stop data (and each stop's `chapter` index) lives in ./campaignStops.js.
//
// Copy voice: race program, not brochure — titles are a parallel "The ___"
// system of campaign nouns; subtitles are short facts, never mood. No em
// dashes / spaced en dashes (asserted in dev below).
//
// No three.js in this file — it is imported by the StaticTimeline fallback too.

import STOPS from './campaignStops'

const CHAPTERS = [
  {
    id: 'h2-2026',
    label: 'JUL–DEC 2026',
    title: 'The Start',
    subtitle: 'First race on the 2028 Olympic course.',
  },
  {
    id: 'h1-2027',
    label: 'JAN–JUN 2027',
    title: 'The Circuit',
    subtitle: 'Worlds in Brazil. Then the European majors.',
  },
  {
    id: 'h2-2027',
    label: 'JUL–DEC 2027',
    title: 'The Venue',
    subtitle: 'Three months at Long Beach. Then the southern summer.',
    rollCallOverride: [
      { name: 'Long Beach', em: true },
      { name: 'Fremantle' },
      { name: 'Sydney' },
      { name: 'Auckland' },
    ],
  },
  {
    id: 'h1-2028',
    label: 'JAN–JUN 2028',
    title: 'The Last Worlds',
    subtitle: 'Auckland in January. Then everything points to July.',
    rollCallOverride: [
      { name: 'Worlds', place: 'Auckland', em: true },
      { name: 'Palma' },
      { name: 'Hyères' },
      { name: 'Miami' },
    ],
  },
  {
    id: 'h2-2028',
    label: 'JUL 2028',
    title: 'The Games',
    chrome: true, // the only chrome-text leg title — chrome stays LA-2028-flavored
    subtitle: 'San Pedro, California.',
    rollCallOverride: [], // kicker + chrome title + three words. That's the point.
  },
]

// Derived: which stop indices belong to each chapter (STOPS is the source of
// truth via each stop's `chapter` field, so reordering stops can't desync).
CHAPTERS.forEach((ch, ci) => {
  ch.stopIndices = STOPS.reduce((acc, s, i) => (s.chapter === ci ? [...acc, i] : acc), [])
})

// stopIndex → chapterIdx
export const CHAPTER_OF_STOP = STOPS.map((s) => s.chapter)

// Roll-call line for a leg's interstitial: { name, place?, em } entries —
// name-checked regattas as name + dim place ("Worlds Dublin"), then one bare
// "N camps" tail. Typography does the joining (no dashes). A chapter can
// override the whole line when the derived one reads clumsily.
export function rollCall(ch) {
  if (ch.rollCallOverride) return ch.rollCallOverride
  const items = []
  let camps = 0
  for (const i of ch.stopIndices) {
    const s = STOPS[i]
    if (s.short) items.push({ name: s.short, place: s.region, em: s.tier === 'key' })
    else camps += 1
  }
  if (camps > 0) items.push({ name: `${camps} camp${camps === 1 ? '' : 's'}` })
  return items
}

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
