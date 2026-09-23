// ============================================================================
//  sportTypes — Strava sport type → the home card's short label + icon.
// ============================================================================
//  The "last workout" tile shows ONE short line ("Bike ride · 1h 12m"), so
//  every Strava SportType gets a label that fits a small tile, one of a handful
//  of icon keys, and the duration basis that reads honestly for that sport:
//  MOVING time for the "go somewhere" sports (a stop at a light isn't riding),
//  ELAPSED time for sessions where standing still is part of the work (a sail
//  with a long wait between races, rest between sets, a yoga hold).
//
//  Plain data + pure functions, no imports and no import.meta: the Node side
//  (scripts/fetch-last-workout.mjs, scripts/stage-last-workout.mjs) and the
//  browser (src/utils/lastWorkout.js) share this one table, so the pipeline's
//  self-test and the card can never disagree about a sport.
//
//  Source of the enum: developers.strava.com/docs/reference/#api-models-SportType
//  (checked Sep 2026). A sport Strava adds later still renders: its CamelCase
//  name is split into sentence case with the generic icon.

// Icon keys the UI must draw. Order is stable (the UI may index by it).
export const SPORT_ICON_KEYS = ['sail', 'bike', 'run', 'walk', 'swim', 'row', 'paddle', 'strength', 'mobility', 'generic']

// Icon → which clock the tile reads. See the header for the reasoning.
const MOVING_ICONS = new Set(['bike', 'run', 'walk', 'swim', 'row', 'paddle'])

// SportType → [label, icon]. Labels are sentence case and short on purpose.
const TABLE = {
  // On the water (the day job)
  Sail: ['Sail', 'sail'],
  Windsurf: ['Windsurf', 'sail'],
  Kitesurf: ['Kitesurf', 'sail'],

  // Bike
  Ride: ['Bike ride', 'bike'],
  GravelRide: ['Bike ride', 'bike'],
  MountainBikeRide: ['Bike ride', 'bike'],
  EBikeRide: ['Bike ride', 'bike'],
  EMountainBikeRide: ['Bike ride', 'bike'],
  Velomobile: ['Bike ride', 'bike'],
  Handcycle: ['Bike ride', 'bike'],
  VirtualRide: ['Indoor ride', 'bike'],

  // Run
  Run: ['Run', 'run'],
  TrailRun: ['Trail run', 'run'],
  VirtualRun: ['Treadmill run', 'run'],

  // Walk
  Walk: ['Walk', 'walk'],
  Hike: ['Hike', 'walk'],

  // Swim
  Swim: ['Swim', 'swim'],

  // Row
  Rowing: ['Row', 'row'],
  VirtualRow: ['Erg', 'row'],

  // Paddle / board
  StandUpPaddling: ['Paddleboard', 'paddle'],
  Kayaking: ['Kayak', 'paddle'],
  Canoeing: ['Canoe', 'paddle'],
  Surfing: ['Surf', 'paddle'],

  // Gym
  WeightTraining: ['Strength', 'strength'],
  Crossfit: ['CrossFit', 'strength'],

  // Mobility
  Yoga: ['Yoga', 'mobility'],
  Pilates: ['Pilates', 'mobility'],

  // Everything else reads as a generic session
  Workout: ['Workout', 'generic'],
  HighIntensityIntervalTraining: ['HIIT', 'generic'],
  Elliptical: ['Elliptical', 'generic'],
  StairStepper: ['Stair climber', 'generic'],
  PhysicalTherapy: ['Physio', 'generic'],
  RockClimbing: ['Climb', 'generic'],
  AlpineSki: ['Ski', 'generic'],
  BackcountrySki: ['Backcountry ski', 'generic'],
  NordicSki: ['Nordic ski', 'generic'],
  RollerSki: ['Roller ski', 'generic'],
  Snowboard: ['Snowboard', 'generic'],
  Snowshoe: ['Snowshoe', 'generic'],
  IceSkate: ['Ice skate', 'generic'],
  InlineSkate: ['Inline skate', 'generic'],
  Skateboard: ['Skate', 'generic'],
  Wheelchair: ['Wheelchair', 'generic'],
  Dance: ['Dance', 'generic'],
  Golf: ['Golf', 'generic'],
  Tennis: ['Tennis', 'generic'],
  TableTennis: ['Table tennis', 'generic'],
  Badminton: ['Badminton', 'generic'],
  Squash: ['Squash', 'generic'],
  Racquetball: ['Racquetball', 'generic'],
  Padel: ['Padel', 'generic'],
  Pickleball: ['Pickleball', 'generic'],
  Soccer: ['Soccer', 'generic'],
  Basketball: ['Basketball', 'generic'],
  Volleyball: ['Volleyball', 'generic'],
  Cricket: ['Cricket', 'generic'],
}

// Every SportType this table knows (the stage script's self-test walks it).
export const SPORT_TYPES = Object.keys(TABLE)

// 'MountainHike' → 'Mountain hike' (a SportType Strava adds after this table).
function splitCamel(s) {
  const words = s
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .toLowerCase()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

// → { label: 'Bike ride', icon: 'bike', basis: 'moving' | 'elapsed' }
export function describeSport(sportType) {
  const hit = Object.prototype.hasOwnProperty.call(TABLE, sportType) ? TABLE[sportType] : null
  const label = hit
    ? hit[0]
    : (typeof sportType === 'string' && /^[A-Za-z]{2,40}$/.test(sportType) ? splitCamel(sportType) : 'Workout')
  const icon = hit ? hit[1] : 'generic'
  return { label, icon, basis: MOVING_ICONS.has(icon) ? 'moving' : 'elapsed' }
}

const positive = (n) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0)

// The seconds the tile shows: the sport's basis clock, falling back to the
// other one when Strava sent 0 (a manual entry often has only one of them).
// null when there's no usable duration at all.
export function pickDurationS({ sportType, movingTimeS, elapsedTimeS } = {}) {
  const moving = positive(movingTimeS)
  const elapsed = positive(elapsedTimeS)
  const { basis } = describeSport(sportType)
  const s = basis === 'moving' ? (moving || elapsed) : (elapsed || moving)
  return s ? Math.round(s) : null
}

// 2880 → '48 min', 4310 → '1h 12m', 3900 → '1h 5m', 7200 → '2h'. Rounds to the
// nearest minute FIRST so 3590 s reads '1h', never '60 min'. (Lives here, not
// in the browser hook, so the Node pipeline logs the same wording.)
export function formatDuration(s) {
  if (typeof s !== 'number' || !Number.isFinite(s) || s < 0) return ''
  const total = Math.max(1, Math.round(s / 60))
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h}h ${m}m` : `${h}h`
}
