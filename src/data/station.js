// ============================================================================
//  station — owner-editable data for the home "Currently here" card.
// ============================================================================
//  WHERE Robby is comes automatically from The Road (src/data/campaignStops.js)
//  by date — see src/utils/whereNow.js for the rules. This file holds the few
//  things the stops can't know. Plain data, no imports (the build check and
//  the chart bake read it from Node). Copy rules match campaignStops: no em
//  dashes, no spaced en dashes. `npm run build` validates everything here.

// ---------------------------------------------------------------------------
// LOCATION_OVERRIDES — pin the card somewhere the dated stops don't say.
// The FIRST active entry whose from..until window covers today wins; it
// expires on its own after `until` (inclusive, local date), so a forgotten
// override can't lie for long.
//   active   true | false          the flip
//   until    'YYYY-MM-DD'          REQUIRED
//   from     'YYYY-MM-DD'          optional; default = effective now
//   stopId   a campaignStops id    inherit that stop's place + context
//   point    a points[].label      pick a city inside a multi-city block
//   place, area, noc, lat, lng     a place off The Road (needs a chart bake:
//                                  npm --prefix scripts/charts run bake)
//   focus    string                "working on" copy for this override
// Examples:
//   { active: true, until: '2026-10-05', stopId: 'annapolis-fall-26' },
//   { active: true, from: '2026-10-20', until: '2026-11-09', stopId: 'australia-breeze-26', point: 'Sydney' },
// ---------------------------------------------------------------------------
export const LOCATION_OVERRIDES = []

// ---------------------------------------------------------------------------
// Multi-city blocks have no per-city dates, so the card shows ONE city for the
// whole block unless an override moves it. Default = the block's first point;
// list a block here to start somewhere else (owner, Sep 23 2026: "the first
// australia thing will be in Fremantle").
// ---------------------------------------------------------------------------
export const BLOCK_START_POINT = {
  'australia-breeze-26': 'Fremantle',
}

// ---------------------------------------------------------------------------
// WORKING_ON — Robby's own one-liner for what he's working on at a stop.
// Key = stop id, or 'stopId--PointLabel' for one city of a block (the point
// line beats the block line). '' or missing = the line is hidden. Never filled
// in by anyone else. Keep it short (≤ 90 characters).
// ---------------------------------------------------------------------------
export const WORKING_ON = {
  'annapolis-fall-26': 'Fitness',
}

// ---------------------------------------------------------------------------
// Place details keyed by place key (city slug, see src/utils/places.js).
// PLACE_TZ labels the forecast in the venue's own time. Every place needs one
// (the build check enforces it).
// ---------------------------------------------------------------------------
export const PLACE_TZ = {
  'san-pedro': 'America/Los_Angeles',
  'long-beach': 'America/Los_Angeles',
  'san-francisco': 'America/Los_Angeles',
  'new-york-city': 'America/New_York',
  annapolis: 'America/New_York',
  miami: 'America/New_York',
  'fort-lauderdale': 'America/New_York',
  'dun-laoghaire': 'Europe/Dublin',
  adelaide: 'Australia/Adelaide',
  fremantle: 'Australia/Perth',
  sydney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
  auckland: 'Pacific/Auckland',
  takapuna: 'Pacific/Auckland',
  vilamoura: 'Europe/Lisbon',
  fortaleza: 'America/Fortaleza',
  palma: 'Europe/Madrid',
  hyeres: 'Europe/Paris',
  'los-alcazares': 'Europe/Madrid',
}

// US venues read "City, ST"; everywhere else "City, NOC".
export const US_STATE = {
  'San Pedro': 'CA',
  'Long Beach': 'CA',
  'San Francisco': 'CA',
  'New York City': 'NY',
  Annapolis: 'MD',
  Miami: 'FL',
  'Fort Lauderdale': 'FL',
}

// Display names where the data name reads wrong in a title.
export const CITY_DISPLAY = {
  'New York City': 'New York',
}
