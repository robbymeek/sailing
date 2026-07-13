// The 2026 → 2028 campaign tour, in order. This single array drives The Road
// globe. Edit dates/venues/coords here as the circuit firms up.
//
// Copy voice (Jul 2026 revamp): race program, not brochure. Data renders as
// labeled instrument fields, never sentences. No em dashes, no spaced en
// dashes anywhere (asserted in dev below) — the only dash is the tight en
// dash inside a numeric range ('OCT–NOV 2026', '2025–26').
//
// Fields per stop:
//   region  — headline place name ("Dublin", "Australia")
//   event   — one of three classes (asserted in dev): a real regatta's proper
//             name ("World Championship", "Trofeo Princesa Sofía"), or
//             'Training Camp' (single city) / 'Training Block' (multi-city)
//   dates   — 'MMM YYYY' or 'MMM–MMM YYYY', uppercase 3-letter months,
//             tight en dash (asserted in dev)
//   start   — machine-readable window START, LOCAL ISO date 'YYYY-MM-DD'
//   end     — machine-readable window END,   LOCAL ISO date 'YYYY-MM-DD'
//             Derived from `dates`: a month-level stop spans the whole month
//             (start = 1st, end = last day); San Pedro OCR carries its
//             owner-confirmed EXACT day. Consumed by ../utils/campaignSchedule.js
//             for the self-rolling next-event readouts on Biography + the
//             HelmPanel. NEVER invent a day the source data doesn't state — where
//             only the month is known, the month window is the honest encoding.
//   venues  — [{ city, noc }] with 3-letter NOC country codes, rendered via
//             formatVenues() in ./tourChapters.js ("Adelaide · Fremantle ·
//             Sydney, AUS"); TOUR_STATS derives continents from the nocs
//   status  — 'confirmed' | 'projected' | 'training' | 'finale'
//   record  — optional real past fact at this venue, rendered as a data chip:
//             { result: 'GOLD' | 'RACED' | 'TRAINED', detail, date }
//             (facts cross-checked against ../data/events.js — never invent)
//
// A stop can have multiple `points` (waypoints): the globe zips through them
// in order while the one card stays up; the card's POSITION field ticks over
// per waypoint. lat/lng are decimal degrees of the sailing harbor/waterfront.
//
// Tour-narrative fields (Jul 2026 chapter redesign):
//   chapter — 0..4 half-year chapter index (H2'26, H1'27, H2'27, H1'28, H2'28).
//             Stops of one chapter must be contiguous (asserted in dev below);
//             chapter copy/titles live in ./tourChapters.js.
//   tier    — 'key' (championship/major: cinematic card, globe dwell zoom)
//             | 'support' (training camp: compact logbook card).
//   short   — roll-call label for the chapter interstitial ("Worlds");
//             presence ⇒ the stop is name-checked in the roll-call.
//   photo   — optional real photo of Robby at (or tied to) this venue. Outputs
//             of scripts/prep-tour-photos.mjs in public/tour/; `credit` when
//             required (rendered as a corner caption on the backdrop).
//             NEVER invent stock imagery — no photo means typography only.

const STOPS = [
  {
    id: 'san-pedro-ocr',
    start: '2026-07-20', end: '2026-07-20', // owner-confirmed EXACT day; every other stop is a month-level window
    region: 'Los Angeles',
    event: 'Olympic Classes Regatta',
    dates: 'JUL 2026',
    venues: [{ city: 'San Pedro', noc: 'USA' }],
    status: 'confirmed',
    lat: 33.7088,
    lng: -118.2836,
    chapter: 0,
    tier: 'key',
    short: 'Olympic Classes',
    record: { result: 'GOLD', detail: 'US Open Sailing Series, Long Beach', date: 'JUL 2025' },
    photo: {
      src: 'tour/la-open.jpg',
      srcMobile: 'tour/la-open-m.jpg',
      position: 'center 30%', // crops the baked-in banner at the frame's bottom
      alt: 'Robby Meek atop the podium at the US Open Sailing Series in Long Beach',
      credit: 'US Sailing / Simone Staff',
    },
  },
  {
    id: 'nyc-training',
    start: '2026-06-01', end: '2026-08-31',
    region: 'New York City',
    event: 'Training Camp',
    dates: 'JUN–AUG 2026',
    venues: [{ city: 'New York City', noc: 'USA' }],
    status: 'training',
    lat: 40.7128,
    lng: -74.006,
    chapter: 0,
    tier: 'support',
  },
  {
    id: 'dun-laoghaire-worlds',
    start: '2026-08-01', end: '2026-08-31',
    region: 'Dublin',
    event: 'World Championship',
    dates: 'AUG 2026',
    venues: [{ city: 'Dún Laoghaire', noc: 'IRL' }],
    status: 'confirmed',
    lat: 53.2956,
    lng: -6.1306,
    chapter: 0,
    tier: 'key',
    short: 'Worlds',
  },
  {
    id: 'annapolis-fall-26',
    start: '2026-09-01', end: '2026-09-30',
    region: 'Annapolis',
    event: 'Training Camp',
    dates: 'SEP 2026',
    venues: [{ city: 'Annapolis', noc: 'USA' }],
    status: 'training',
    lat: 38.9755,
    lng: -76.485,
    chapter: 0,
    tier: 'support',
  },
  {
    id: 'australia-breeze-26',
    start: '2026-10-01', end: '2026-11-30',
    region: 'Australia',
    event: 'Training Block',
    dates: 'OCT–NOV 2026',
    venues: [
      { city: 'Adelaide', noc: 'AUS' },
      { city: 'Fremantle', noc: 'AUS' },
      { city: 'Sydney', noc: 'AUS' },
    ],
    status: 'training',
    lat: -35.02583,
    lng: 138.51718,
    chapter: 0,
    tier: 'support',
    points: [
      { lat: -35.02583, lng: 138.51718, label: 'Adelaide' },
      { lat: -32.06853, lng: 115.74937, label: 'Fremantle' },
      { lat: -33.84889, lng: 151.21694, label: 'Sydney' },
    ],
  },
  {
    id: 'vilamoura-26',
    start: '2026-11-01', end: '2026-12-31',
    region: 'Algarve',
    event: 'Vilamoura Grand-Prix',
    dates: 'NOV–DEC 2026',
    venues: [{ city: 'Vilamoura', noc: 'POR' }],
    status: 'projected',
    lat: 37.0741,
    lng: -8.1247,
    chapter: 0,
    tier: 'support',
    short: 'Grand-Prix',
    record: { result: 'RACED', detail: 'Vilamoura Grand-Prix', date: 'NOV 2025' },
    photo: {
      src: 'tour/vilamoura.jpg',
      srcMobile: 'tour/vilamoura-m.jpg',
      position: 'center 42%',
      alt: 'Robby Meek reaching past the red cliffs of the Algarve at Vilamoura',
      credit: null,
    },
  },
  {
    id: 'miami-jan-27',
    start: '2027-01-01', end: '2027-01-31',
    region: 'Miami',
    event: 'Training Camp',
    dates: 'JAN 2027',
    venues: [{ city: 'Miami', noc: 'USA' }],
    status: 'training',
    lat: 25.7345,
    lng: -80.2326,
    chapter: 1,
    tier: 'support',
  },
  {
    id: 'fortaleza-worlds-27',
    start: '2027-01-01', end: '2027-01-31',
    region: 'Fortaleza',
    event: 'World Championship',
    dates: 'JAN 2027',
    venues: [{ city: 'Fortaleza', noc: 'BRA' }],
    status: 'projected',
    lat: -3.718,
    lng: -38.515,
    chapter: 1,
    tier: 'key',
    short: 'Worlds',
  },
  {
    id: 'fort-lauderdale-feb-27',
    start: '2027-02-01', end: '2027-02-28',
    region: 'Fort Lauderdale',
    event: 'Training Camp',
    dates: 'FEB 2027',
    venues: [{ city: 'Fort Lauderdale', noc: 'USA' }],
    status: 'training',
    lat: 26.108,
    lng: -80.1232,
    chapter: 1,
    tier: 'support',
  },
  {
    id: 'palma-27',
    start: '2027-03-01', end: '2027-03-31',
    region: 'Mallorca',
    event: 'Trofeo Princesa Sofía',
    dates: 'MAR 2027',
    venues: [{ city: 'Palma', noc: 'ESP' }],
    status: 'projected',
    lat: 39.5645,
    lng: 2.6333,
    chapter: 1,
    tier: 'key',
    short: 'Princesa Sofía',
    record: { result: 'RACED', detail: 'Trofeo Princesa Sofía', date: 'MAR 2026' },
    photo: {
      src: 'tour/palma.jpg',
      srcMobile: 'tour/palma-m.jpg',
      position: 'center 55%',
      alt: 'The fleet off the start with the Mediterranean hillside behind',
      credit: null,
    },
  },
  {
    id: 'hyeres-27',
    start: '2027-04-01', end: '2027-04-30',
    region: 'Hyères',
    event: 'French Olympic Week',
    dates: 'APR 2027',
    venues: [{ city: 'Hyères', noc: 'FRA' }],
    status: 'projected',
    lat: 43.0822,
    lng: 6.135,
    chapter: 1,
    tier: 'key',
    short: 'Olympic Week',
  },
  {
    id: 'europeans-27',
    start: '2027-05-01', end: '2027-05-31',
    region: 'Mar Menor',
    event: 'European Championship',
    dates: 'MAY 2027',
    venues: [{ city: 'Los Alcázares', noc: 'ESP' }],
    status: 'projected',
    lat: 37.7419,
    lng: -0.8508,
    chapter: 1,
    tier: 'key',
    short: 'Europeans',
  },
  {
    id: 'la-training-27',
    start: '2027-06-01', end: '2027-08-31',
    region: 'California',
    event: 'Training Block',
    dates: 'JUN–AUG 2027',
    venues: [
      { city: 'San Pedro', noc: 'USA' },
      { city: 'Long Beach', noc: 'USA' },
      { city: 'San Francisco', noc: 'USA' },
    ],
    status: 'training',
    lat: 33.7088,
    lng: -118.2836,
    chapter: 2,
    tier: 'support',
    record: { result: 'GOLD', detail: 'North American Championship, Alamitos Bay', date: 'JUN 2025' },
    photo: {
      src: 'tour/california.jpg',
      srcMobile: 'tour/california-m.jpg',
      position: 'center 60%',
      alt: 'The ILCA fleet racing off the Southern California shoreline',
      credit: null,
    },
    points: [
      { lat: 33.7088, lng: -118.2836, label: 'San Pedro' },
      { lat: 33.7554, lng: -118.1488, label: 'Long Beach' },
      { lat: 37.8072, lng: -122.4469, label: 'San Francisco' },
    ],
  },
  {
    id: 'annapolis-fall-27',
    start: '2027-09-01', end: '2027-09-30',
    region: 'Annapolis',
    event: 'Training Camp',
    dates: 'SEP 2027',
    venues: [{ city: 'Annapolis', noc: 'USA' }],
    status: 'training',
    lat: 38.9755,
    lng: -76.485,
    chapter: 2,
    tier: 'support',
  },
  {
    id: 'oceania-summer-27',
    start: '2027-10-01', end: '2027-12-31',
    region: 'Australia & New Zealand',
    event: 'Training Block',
    dates: 'OCT–DEC 2027',
    venues: [
      { city: 'Fremantle', noc: 'AUS' },
      { city: 'Melbourne', noc: 'AUS' },
      { city: 'Sydney', noc: 'AUS' },
      { city: 'Auckland', noc: 'NZL' },
    ],
    status: 'training',
    lat: -32.06853,
    lng: 115.74937,
    chapter: 2,
    tier: 'support',
    points: [
      { lat: -32.06853, lng: 115.74937, label: 'Fremantle' },
      { lat: -37.94559, lng: 144.99698, label: 'Melbourne' },
      { lat: -33.84889, lng: 151.21694, label: 'Sydney' },
      { lat: -36.78576, lng: 174.77544, label: 'Auckland' },
    ],
  },
  {
    id: 'nz-worlds-28',
    start: '2028-01-01', end: '2028-01-31',
    region: 'Auckland',
    event: 'World Championship',
    dates: 'JAN 2028',
    venues: [{ city: 'Takapuna', noc: 'NZL' }],
    status: 'confirmed',
    lat: -36.78576,
    lng: 174.77544,
    chapter: 3,
    tier: 'key',
    short: 'Worlds',
  },
  {
    id: 'olympic-prep-28',
    start: '2028-03-01', end: '2028-05-31',
    region: 'Europe & USA',
    event: 'Training Block',
    dates: 'MAR–MAY 2028',
    venues: [
      { city: 'Palma', noc: 'ESP' },
      { city: 'Hyères', noc: 'FRA' },
      { city: 'Miami', noc: 'USA' },
    ],
    status: 'training',
    lat: 39.5645,
    lng: 2.6333,
    chapter: 3,
    tier: 'support',
    record: { result: 'TRAINED', detail: 'US Sailing Team, Miami', date: '2025–26' },
    photo: {
      src: 'tour/olympic-prep.jpg',
      srcMobile: 'tour/olympic-prep-m.jpg',
      position: 'center 40%',
      alt: 'Robby Meek hiking upwind with the Miami skyline behind',
      credit: 'Allison Chenard / USST',
    },
    points: [
      { lat: 39.5645, lng: 2.6333, label: 'Palma' },
      { lat: 43.0822, lng: 6.135, label: 'Hyères' },
      // Hyères → Miami is a full ocean crossing, so scroll it at normal (distance-
      // proportional) speed rather than the quick within-stop hop.
      { lat: 25.7345, lng: -80.2326, label: 'Miami', fullLeg: true },
    ],
  },
  {
    id: 'la-2028',
    start: '2028-07-01', end: '2028-07-31',
    region: 'Los Angeles',
    event: 'Olympic Games',
    dates: 'JUL 2028',
    venues: [{ city: 'San Pedro', noc: 'USA' }],
    status: 'finale',
    lat: 33.7088,
    lng: -118.2836,
    chapter: 4,
    tier: 'key',
    short: 'Olympic Games',
  },
]

if (import.meta.env.DEV) {
  // Chapters must be contiguous, ascending blocks — the scroll engine inserts one
  // interstitial per chapter boundary and would silently misbehave otherwise.
  for (let i = 1; i < STOPS.length; i++) {
    const prev = STOPS[i - 1].chapter
    const cur = STOPS[i].chapter
    if (cur !== prev && cur !== prev + 1) {
      throw new Error(`campaignStops: chapters not contiguous at "${STOPS[i].id}" (${prev} → ${cur})`)
    }
  }
  // Copy-voice guards: dates in race-sheet form, events from the fixed taxonomy,
  // and no em dashes / spaced en dashes hiding in any rendered string.
  const EVENT_CLASSES = new Set([
    'Olympic Classes Regatta', 'World Championship', 'Trofeo Princesa Sofía',
    'French Olympic Week', 'European Championship', 'Vilamoura Grand-Prix',
    'Olympic Games', 'Training Camp', 'Training Block',
  ])
  const DATES_RE = /^[A-Z]{3}(–[A-Z]{3})? \d{4}$/
  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
  for (const s of STOPS) {
    if (!DATES_RE.test(s.dates)) {
      throw new Error(`campaignStops: "${s.id}" dates "${s.dates}" not in MMM YYYY / MMM–MMM YYYY form`)
    }
    if (!EVENT_CLASSES.has(s.event)) {
      throw new Error(`campaignStops: "${s.id}" event "${s.event}" not in the taxonomy (add it deliberately)`)
    }
    if (s.record && !['GOLD', 'RACED', 'TRAINED'].includes(s.record.result)) {
      throw new Error(`campaignStops: "${s.id}" record.result "${s.record.result}" unknown`)
    }
    // Machine-readable window (drives ../utils/campaignSchedule.js). ISO local
    // calendar dates, ascending — a bad/absent pair would silently break rollover.
    if (!ISO_DATE_RE.test(s.start) || !ISO_DATE_RE.test(s.end)) {
      throw new Error(`campaignStops: "${s.id}" needs ISO start/end dates (YYYY-MM-DD)`)
    }
    if (s.start > s.end) {
      throw new Error(`campaignStops: "${s.id}" start ${s.start} is after end ${s.end}`)
    }
  }
  if (/—| – /.test(JSON.stringify(STOPS))) {
    throw new Error('campaignStops: em dash or spaced en dash found in data — restructure the copy instead')
  }
}

export default STOPS
