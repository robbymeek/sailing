// Half-year chapters of the 2026 → 2028 campaign tour. The Coming Soon page
// scrolls through these five chapters — each opens with a full-screen
// interstitial (kicker / title / subtitle / roll-call) while the globe pulls
// back and constellates that chapter's pins. Copy lives here; the stop data
// (and each stop's `chapter` index) lives in ./campaignStops.js.
//
// No three.js in this file — it is imported by the StaticTimeline fallback too.

import STOPS from './campaignStops'

const CHAPTERS = [
  {
    id: 'h2-2026',
    label: 'JUL – DEC 2026',
    title: 'The Campaign Begins',
    subtitle: 'Two years out. First start on the Olympic waters, then east to a World Championship.',
  },
  {
    id: 'h1-2027',
    label: 'JAN – JUN 2027',
    title: 'The Proving Ground',
    subtitle: 'A Worlds in Brazil, then the full European circuit — every major fleet, back to back.',
  },
  {
    id: 'h2-2027',
    label: 'JUL – DEC 2027',
    title: 'Home Waters, Far Horizons',
    subtitle: 'Learning Long Beach by heart, then chasing summer across the Pacific.',
    rollCallOverride: [
      { t: 'Venue training — Long Beach', em: true },
      { t: 'Southern summer — Fremantle · Sydney · Auckland', em: false },
    ],
  },
  {
    id: 'h1-2028',
    label: 'JAN – JUN 2028',
    title: 'The Last Mile',
    subtitle: 'A final Worlds in Auckland, and every session pointed at one regatta.',
    rollCallOverride: [
      { t: 'Worlds — Auckland', em: true },
      { t: 'Final tune-up — Palma · Hyères · Miami', em: false },
    ],
  },
  {
    id: 'h2-2028',
    label: 'JUL 2028',
    title: 'The Games',
    chrome: true, // the only chrome-text chapter title — chrome stays LA-2028-flavored
    subtitle: 'Olympic sailing returns to American waters. San Pedro, July 2028.',
  },
]

// Derived: which stop indices belong to each chapter (STOPS is the source of
// truth via each stop's `chapter` field, so reordering stops can't desync).
CHAPTERS.forEach((ch, ci) => {
  ch.stopIndices = STOPS.reduce((acc, s, i) => (s.chapter === ci ? [...acc, i] : acc), [])
})

// stopIndex → chapterIdx
export const CHAPTER_OF_STOP = STOPS.map((s) => s.chapter)

// Roll-call line for a chapter's interstitial: named (emphasized) entries for
// every stop carrying a `short` label, then one "+ N camps" tail for the rest.
// A chapter can override the whole line when the derived one reads clumsily.
export function rollCall(ch) {
  if (ch.rollCallOverride) return ch.rollCallOverride
  const items = []
  let camps = 0
  for (const i of ch.stopIndices) {
    const s = STOPS[i]
    if (s.short) items.push({ t: `${s.short} — ${s.region}`, em: s.tier === 'key' })
    else camps += 1
  }
  if (camps > 0) items.push({ t: `+ ${camps} training ${camps === 1 ? 'camp' : 'camps'}`, em: false })
  return items
}

// Journey stats for the finale ("18 STOPS · 4 CONTINENTS · 2 YEARS") — computed
// from the data, not hardcoded. Add new venue countries to the map below.
const COUNTRY_CONTINENT = {
  USA: 'North America',
  Ireland: 'Europe',
  Australia: 'Oceania',
  Portugal: 'Europe',
  Brazil: 'South America',
  Spain: 'Europe',
  France: 'Europe',
  'New Zealand': 'Oceania',
}

export const TOUR_STATS = (() => {
  const countries = new Set()
  for (const s of STOPS) {
    for (const v of s.venues.split('|')) {
      const country = v.split(',').pop().trim()
      if (country) countries.add(country)
    }
  }
  const continents = new Set()
  for (const c of countries) {
    const cont = COUNTRY_CONTINENT[c]
    if (cont) continents.add(cont)
    else if (import.meta.env.DEV) throw new Error(`tourChapters: no continent mapped for "${c}"`)
  }
  return {
    stops: STOPS.length,
    countries: countries.size,
    continents: continents.size,
    years: 2,
  }
})()

export default CHAPTERS
