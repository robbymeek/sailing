// The 2026 → 2028 campaign tour, in order. This single array drives The Road
// globe. Edit dates/venues/coords here as the circuit firms up.
//
// Each stop is one card, displayed as:
//   {ordinal} of 18 Stops        — position in the tour
//   region                        — general location (e.g. "Australia", "Annapolis")
//   event                         — short description (e.g. "World Championship")
//   dates                         — Month Year (e.g. "July 2028", "August – October 2027")
//   venues                        — specific "City, Country", multiple joined by " | "
//
// A stop can have multiple `points` (waypoints): the globe zips through them in
// order while the one card (showing all venues at once) stays up. lat/lng are
// decimal degrees of the sailing harbor/waterfront. status: 'confirmed' |
// 'projected' | 'training' | 'finale'.
//
// Tour-narrative fields (Jul 2026 chapter redesign):
//   chapter — 0..4 half-year chapter index (H2'26, H1'27, H2'27, H1'28, H2'28).
//             Stops of one chapter must be contiguous (asserted in dev below);
//             chapter copy/titles live in ./tourChapters.js.
//   tier    — 'key' (championship/major regatta: bigger card, globe dwell zoom)
//             | 'support' (training camp: compact card).
//   short   — roll-call label for the chapter interstitial ("Worlds", "Europeans");
//             presence ⇒ the stop is name-checked (emphasized) in the roll-call.
//   photo   — optional real photo of Robby at (or tied to) this venue. Outputs of
//             scripts/prep-tour-photos.mjs in public/tour/. `pastNote` cites the
//             real past result (see ../data/events.js); `credit` when required.
//             NEVER invent stock imagery — no photo means a typography treatment.

const STOPS = [
  {
    id: 'san-pedro-ocr',
    region: 'Los Angeles',
    event: 'Olympic Classes Regatta',
    dates: 'July 2026',
    venues: 'San Pedro, USA',
    status: 'confirmed',
    lat: 33.7088,
    lng: -118.2836,
    chapter: 0,
    tier: 'key',
    short: 'Olympic Classes',
    photo: {
      src: 'tour/la-open.jpg',
      srcMobile: 'tour/la-open-m.jpg',
      position: 'center 30%', // crops the baked-in banner at the frame's bottom
      alt: 'Robby Meek atop the podium at the US Open Sailing Series in Long Beach',
      pastNote: 'Gold on these waters — US Open Sailing Series, Long Beach',
      credit: 'US Sailing / Simone Staff',
    },
  },
  {
    id: 'nyc-training',
    region: 'New York City',
    event: 'Training Camp',
    dates: 'June – August 2026',
    venues: 'New York City, USA',
    status: 'training',
    lat: 40.7128,
    lng: -74.006,
    chapter: 0,
    tier: 'support',
  },
  {
    id: 'dun-laoghaire-worlds',
    region: 'Dublin',
    event: 'World Championship',
    dates: 'August 2026',
    venues: 'Dún Laoghaire, Ireland',
    status: 'confirmed',
    lat: 53.2956,
    lng: -6.1306,
    chapter: 0,
    tier: 'key',
    short: 'Worlds',
  },
  {
    id: 'annapolis-fall-26',
    region: 'Annapolis',
    event: 'Training Camp',
    dates: 'September 2026',
    venues: 'Annapolis, USA',
    status: 'training',
    lat: 38.9755,
    lng: -76.485,
    chapter: 0,
    tier: 'support',
  },
  {
    id: 'australia-breeze-26',
    region: 'Australia',
    event: 'Breeze Training',
    dates: 'October – November 2026',
    venues: 'Adelaide, Australia | Fremantle, Australia | Sydney, Australia',
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
    region: 'Algarve',
    event: 'Training & Racing',
    dates: 'November – December 2026',
    venues: 'Vilamoura, Portugal',
    status: 'projected',
    lat: 37.0741,
    lng: -8.1247,
    chapter: 0,
    tier: 'support',
    short: 'Grand-Prix',
    photo: {
      src: 'tour/vilamoura.jpg',
      srcMobile: 'tour/vilamoura-m.jpg',
      position: 'center 42%',
      alt: 'Robby Meek reaching past the red cliffs of the Algarve at Vilamoura',
      pastNote: 'Raced here — Vilamoura Grand-Prix, Nov 2025',
      credit: null,
    },
  },
  {
    id: 'miami-jan-27',
    region: 'Miami',
    event: 'Training Camp',
    dates: 'January 2027',
    venues: 'Miami, USA',
    status: 'training',
    lat: 25.7345,
    lng: -80.2326,
    chapter: 1,
    tier: 'support',
  },
  {
    id: 'fortaleza-worlds-27',
    region: 'Fortaleza',
    event: 'World Sailing Championships',
    dates: 'January 2027',
    venues: 'Fortaleza, Brazil',
    status: 'projected',
    lat: -3.718,
    lng: -38.515,
    chapter: 1,
    tier: 'key',
    short: 'Worlds',
  },
  {
    id: 'fort-lauderdale-feb-27',
    region: 'Fort Lauderdale',
    event: 'Training Camp',
    dates: 'February 2027',
    venues: 'Fort Lauderdale, USA',
    status: 'training',
    lat: 26.108,
    lng: -80.1232,
    chapter: 1,
    tier: 'support',
  },
  {
    id: 'palma-27',
    region: 'Mallorca',
    event: 'Princesa Sofía Regatta',
    dates: 'March 2027',
    venues: 'Palma, Spain',
    status: 'projected',
    lat: 39.5645,
    lng: 2.6333,
    chapter: 1,
    tier: 'key',
    short: 'Princesa Sofía',
    photo: {
      src: 'tour/palma.jpg',
      srcMobile: 'tour/palma-m.jpg',
      position: 'center 55%',
      alt: 'The fleet off the start with the Mediterranean hillside behind',
      pastNote: 'Raced here — Trofeo Princesa Sofía, Mar 2026',
      credit: null,
    },
  },
  {
    id: 'hyeres-27',
    region: 'Hyères',
    event: 'French Olympic Week',
    dates: 'April 2027',
    venues: 'Hyères, France',
    status: 'projected',
    lat: 43.0822,
    lng: 6.135,
    chapter: 1,
    tier: 'key',
    short: 'Olympic Week',
  },
  {
    id: 'europeans-27',
    region: 'Mar Menor',
    event: 'European Championship',
    dates: 'May 2027',
    venues: 'Los Alcázares, Spain',
    status: 'projected',
    lat: 37.7419,
    lng: -0.8508,
    chapter: 1,
    tier: 'key',
    short: 'Europeans',
  },
  {
    id: 'la-training-27',
    region: 'California',
    event: 'Venue Training',
    dates: 'June – August 2027',
    venues: 'San Pedro, USA | Long Beach, USA | San Francisco, USA',
    status: 'training',
    lat: 33.7088,
    lng: -118.2836,
    chapter: 2,
    tier: 'support',
    photo: {
      src: 'tour/california.jpg',
      srcMobile: 'tour/california-m.jpg',
      position: 'center 60%',
      alt: 'The ILCA fleet racing off the Southern California shoreline',
      pastNote: 'NA Championship gold, Alamitos Bay — Jun 2025',
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
    region: 'Annapolis',
    event: 'Training Camp',
    dates: 'September 2027',
    venues: 'Annapolis, USA',
    status: 'training',
    lat: 38.9755,
    lng: -76.485,
    chapter: 2,
    tier: 'support',
  },
  {
    id: 'oceania-summer-27',
    region: 'Australia & New Zealand',
    event: 'Summer Training Block',
    dates: 'October – December 2027',
    venues: 'Fremantle, Australia | Melbourne, Australia | Sydney, Australia | Auckland, New Zealand',
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
    region: 'Auckland',
    event: 'World Championship',
    dates: 'January 2028',
    venues: 'Takapuna, New Zealand',
    status: 'confirmed',
    lat: -36.78576,
    lng: 174.77544,
    chapter: 3,
    tier: 'key',
    short: 'Worlds',
  },
  {
    id: 'olympic-prep-28',
    region: 'Europe & USA',
    event: 'Olympic Preparation',
    dates: 'March – May 2028',
    venues: 'Palma, Spain | Hyères, France | Miami, USA',
    status: 'training',
    lat: 39.5645,
    lng: 2.6333,
    chapter: 3,
    tier: 'support',
    photo: {
      src: 'tour/olympic-prep.jpg',
      srcMobile: 'tour/olympic-prep-m.jpg',
      position: 'center 40%',
      alt: 'Robby Meek hiking upwind with the Miami skyline behind',
      pastNote: 'Miami training blocks with the US Sailing Team, 2025 – 26',
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
    region: 'Los Angeles',
    event: 'Olympic Games',
    dates: 'July 2028',
    venues: 'San Pedro, USA',
    status: 'finale',
    lat: 33.7088,
    lng: -118.2836,
    chapter: 4,
    tier: 'key',
    short: 'Olympic Games',
  },
]

// Chapters must be contiguous, ascending blocks — the scroll engine inserts one
// interstitial per chapter boundary and would silently misbehave otherwise.
if (import.meta.env.DEV) {
  for (let i = 1; i < STOPS.length; i++) {
    const prev = STOPS[i - 1].chapter
    const cur = STOPS[i].chapter
    if (cur !== prev && cur !== prev + 1) {
      throw new Error(`campaignStops: chapters not contiguous at "${STOPS[i].id}" (${prev} → ${cur})`)
    }
  }
}

export default STOPS
