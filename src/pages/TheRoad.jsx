import { useState, useEffect, useLayoutEffect, useRef } from 'react'
import STOPS from '../data/campaignStops'
import CHAPTERS, { formatVenues, TOUR_STATS } from '../data/tourChapters'
import createGlobeScene from '../lib/globeScene'
import { hasWebGL2 } from '../lib/webglSupport'
import Footer from '../components/Footer'
import ExitNav from '../components/ExitNav'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'
import useTextSpray from '../hooks/useTextSpray'
// Exit-banner cards — canonical definitions shared by every page's ExitNav.
import { EXIT_CARDS } from '../components/exitCards'

const BASE = import.meta.env.BASE_URL

// Content lane (desktop): all text lives in the RIGHT column, its inner edge
// hard-pinned at 50vw so it can never overlap the globe (confined to the left
// half by globeScene's restOffset). Mobile content lives in a strict bottom
// band (top:50vh) below the globe's top-half zone.
const LANE = { left: '50vw', right: '7vw', maxWidth: 520 }
const MOBILE_LANE_TOP = '50vh'

// Fixed content frame — the same model on every screen size. The leg title sits
// at a CONSTANT distance from the top; the Play + NM controls at a constant
// distance from the bottom; the stop list lives in the CLIPPED box between them.
// On a tall screen the whole list fits and it looks like a static itinerary; on
// a short screen (or a long leg) the list scrolls INSIDE the box so the active
// stop stays framed — rows dissolve under the title (top) and behind the
// controls (bottom) and never overlap either. So the layout is uniform and
// self-adapting: title always in the same spot, controls always in the same
// spot, and nothing can spill past them.
const TITLE_TOP = 'max(76px, 23vh)' // desktop: title's fixed offset from the top (a touch higher than the old 29vh)
const CTRL_BOTTOM = 40 // desktop: controls' fixed offset from the bottom
const MOBILE_CTRL_BOTTOM = 'calc(24px + env(safe-area-inset-bottom))'

// Scroll choreography in viewport-height units. A "stop" is a card; a stop can
// span several waypoints (e.g. Australia hopping Adelaide → Perth → Sydney),
// each of which is a "frame" the globe rotates to. Stops group into half-year
// CHAPTERS (see ../data/tourChapters.js): each chapter opens with a full-screen
// interstitial beat while the globe pulls back and constellates that chapter's
// pins, and the whole tour closes with a RECAP beat (the fully travelled globe
// spinning once) before the last leg to LA.
//
// The tour is one flat list of typed SEGMENTS — the single choreography table
// consumed by BOTH computeScroll() (pure scalars for the DOM) and the globe
// scene (which resolves each segment's pose descriptors to quaternions once at
// init). Everything is a pure closed form of window.scrollY, so scrubbing
// backwards replays every effect in reverse, pixel-perfect.
const HERO = 1.0
// Between-stop pacing is PROPORTIONAL to how far the dot flies across the globe: a
// short hop scrolls briefly, a long haul (e.g. Annapolis → Adelaide) scrolls longer,
// so the scroll always matches the visible travel. Leg length = LEG_MIN + central
// angle (radians, 0..π) × LEG_PER_RAD.
const LEG_MIN = 0.5 // shortest between-stop leg
const LEG_PER_RAD = 0.5 // vh-units of scroll added per radian of dot travel
// Extra waypoints WITHIN one multi-city stop are quick fly-throughs regardless of
// distance — the card already shows all the cities at once, so the globe just zips
// between them with no stuck-feeling dwell. Entry into the first city and exit to the
// next stop still use the proportional leg length above.
const WAYPOINT_HOP = 0.12
const FINALE_EXTRA = 1.0 // runway for the LA 2028 zoom
const CHAPTER_LEN = 1.35 // chapter interstitial beat
const ENTRY_LEG = 0.6 // chapter-0 overview → first stop
const RECAP_LEN = 1.9 // "totally travelled" full-globe spin before the last leg
const KEY_ZOOM = 0.85 // camera dolly-in at key-stop arrivals (fraction of baseZ)
const RECAP_ZOOM = 1.15 // pull-back during the recap (and the final chapter's intro)

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))
const easeInOut = (t) => t * t * (3 - 2 * t)
function smoothstep(a, b, x) {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Flatten stops → frames (one per waypoint), tagging position within the stop.
function buildFrames(stops) {
  const frames = []
  stops.forEach((stop, si) => {
    const pts =
      stop.points && stop.points.length
        ? stop.points
        : [{ lat: stop.lat, lng: stop.lng, label: stop.region }]
    pts.forEach((pt, pi) => {
      frames.push({
        lat: pt.lat,
        lng: pt.lng,
        label: pt.label || stop.region,
        stopIndex: si,
        isFirstOfStop: pi === 0,
        isLastOfStop: pi === pts.length - 1,
        isFinale: stop.status === 'finale',
        multi: pts.length > 1,
        fullLeg: !!pt.fullLeg, // force a proportional (normal-speed) leg into this waypoint
        chapter: stop.chapter,
        keyArrival: pi === 0 && stop.tier === 'key', // arrival dollies the camera in
      })
    })
  })
  frames.forEach((f, i) => {
    // first frame of a chapter → a chapter interstitial precedes the leg into it
    f.chapterStart = f.isFirstOfStop && (i === 0 || frames[i - 1].chapter !== f.chapter)
  })
  return frames
}

const FRAMES = buildFrames(STOPS)
const F = FRAMES.length

// Great-circle central angle (radians, 0..π) between two {lat,lng} frames — drives
// the proportional between-stop leg length so scroll ≈ how far the dot travels.
const DEG = Math.PI / 180
function centralAngle(a, b) {
  const la1 = a.lat * DEG
  const la2 = b.lat * DEG
  const dLa = (b.lat - a.lat) * DEG
  const dLn = (b.lng - a.lng) * DEG
  const h = Math.sin(dLa / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLn / 2) ** 2
  return 2 * Math.asin(Math.min(1, Math.sqrt(h)))
}

// ---------- chapter overview poses ---------- (plain trig — the scene turns
// these into quaternions; this module must stay importable without three.js).
// A chapter's interstitial frames its stops by rotating their spherical
// centroid to face the camera and pulling the camera back by the spread. The
// camera never moves laterally, so this is the whole "framing" story. The LAST
// chapter's pose doubles as the recap pose → whole-route centroid.
function llToUnit(lat, lng) {
  // must match buildEarth.latLngToVector3 (equirectangular seam at lng ±180)
  const phi = (90 - lat) * DEG
  const theta = (lng + 180) * DEG
  return [-Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta)]
}

const N_CHAPTERS = 1 + Math.max(...STOPS.map((s) => s.chapter))
const CHAPTER_POSES = (() => {
  const poses = []
  for (let c = 0; c < N_CHAPTERS; c++) {
    const members = c === N_CHAPTERS - 1 ? STOPS : STOPS.filter((s) => s.chapter === c)
    let sx = 0
    let sy = 0
    let sz = 0
    for (const s of members) {
      const [x, y, z] = llToUnit(s.lat, s.lng)
      sx += x
      sy += y
      sz += z
    }
    const len = Math.hypot(sx, sy, sz)
    let lat
    let lng
    let cv
    if (len < 0.3) {
      // stops spread near-uniformly around the globe — centroid degenerates;
      // fall back to a mid-Atlantic view (Americas + Europe + Africa in frame)
      lat = 20
      lng = -40
      cv = llToUnit(lat, lng)
    } else {
      cv = [sx / len, sy / len, sz / len]
      lat = 90 - Math.acos(clamp(cv[1], -1, 1)) / DEG
      lng = Math.atan2(cv[2], -cv[0]) / DEG - 180
      if (lng <= -180) lng += 360
    }
    let maxAng = 0
    for (const s of members) {
      const v = llToUnit(s.lat, s.lng)
      maxAng = Math.max(maxAng, Math.acos(clamp(v[0] * cv[0] + v[1] * cv[1] + v[2] * cv[2], -1, 1)))
    }
    // pull-back grows with angular spread; stops >90° from centre sit behind
    // the limb regardless — the ghost pins on the edge still read "world tour".
    const spread = smoothstep(0.5, 1.6, maxAng)
    const pullback = c === N_CHAPTERS - 1 ? RECAP_ZOOM : 1 + clamp(0.05 + 0.1 * spread, 0.05, 0.15)
    poses.push({ lat, lng, pullback })
  }
  return poses
})()

// ---------- the SEGMENTS table ----------
// Each segment: { type, start, len, arcIdx, dest?, poseFrom, poseTo, zoomFrom,
// zoomTo, zEase, centerFrom, centerTo }. Pose descriptors are plain data
// ({ k:'hero' } | { k:'frame', i } | { k:'chapter', c }); zoom/center are
// chained by construction so every boundary is continuous.
const SEGMENTS = []
const LAND_Y = new Array(F) // vh offset where the dot lands at frame d (ripple timing)
const TOTAL_UNITS = (() => {
  let total = 0
  let curZoom = 1
  let curCenter = 0
  let prevPose = { k: 'hero' }
  const push = (seg) => {
    seg.start = total
    seg.poseFrom = prevPose
    if (!seg.poseTo) seg.poseTo = prevPose
    seg.zoomFrom = curZoom
    if (seg.zoomTo == null) seg.zoomTo = curZoom
    seg.centerFrom = curCenter
    if (seg.centerTo == null) seg.centerTo = curCenter
    prevPose = seg.poseTo
    curZoom = seg.zoomTo
    curCenter = seg.centerTo
    total += seg.len
    SEGMENTS.push(seg)
  }

  push({ type: 'hero', len: HERO, arcIdx: -1, poseTo: { k: 'chapter', c: 0 } })
  for (let d = 0; d < F; d++) {
    const fr = FRAMES[d]
    if (fr.chapterStart) {
      const c = fr.chapter
      push({
        type: 'chapter',
        c,
        len: CHAPTER_LEN,
        arcIdx: d - 1,
        poseTo: { k: 'chapter', c },
        zoomTo: CHAPTER_POSES[c].pullback,
      })
      if (c === N_CHAPTERS - 1) {
        // the "totally travelled place": recentre, hold the whole-route pose,
        // spin the globe once with every pin + arc lit (see the scene's spinT)
        push({
          type: 'recap',
          len: RECAP_LEN,
          arcIdx: d - 1,
          zoomTo: RECAP_ZOOM,
          centerTo: 1,
        })
      }
    }
    if (d === 0) {
      push({
        type: 'leg',
        len: ENTRY_LEG,
        arcIdx: -1, // no arc into the first stop — pure rotation, no travel dot
        dest: 0,
        poseTo: { k: 'frame', i: 0 },
        zoomTo: fr.keyArrival ? KEY_ZOOM : 1,
        zEase: 'late',
      })
    } else {
      const isHop = !fr.isFirstOfStop && !fr.fullLeg
      const finaleLeg = d === F - 1
      push({
        type: finaleLeg ? 'finale-leg' : isHop ? 'hop' : 'leg',
        len: isHop ? WAYPOINT_HOP : LEG_MIN + centralAngle(FRAMES[d - 1], fr) * LEG_PER_RAD,
        arcIdx: d - 1,
        dest: d,
        afterChapter: fr.chapterStart, // an interstitial preceded — no departing card
        poseTo: { k: 'frame', i: d },
        // key arrivals dolly in late (as the dot lands); the finale-leg instead
        // eases the recap pull-back to exactly 1 so the LA zoom takes over cleanly
        zoomTo: finaleLeg ? 1 : fr.keyArrival ? KEY_ZOOM : 1,
        zEase: finaleLeg ? 'mid' : fr.keyArrival ? 'late' : undefined,
      })
    }
    LAND_Y[d] = total // end of the arriving segment = standing at frame d
  }
  push({ type: 'finale', len: FINALE_EXTRA, arcIdx: F - 2, dest: F - 1 })

  // leaving a dolled-in key stop → return to neutral promptly ('early');
  // everything else without an explicit ease glides ('mid').
  for (const seg of SEGMENTS) {
    if (!seg.zEase) seg.zEase = seg.zoomFrom < 1 && seg.zoomTo >= 1 ? 'early' : 'mid'
  }
  return total
})()

const TOTAL_VH = (TOTAL_UNITS + 0.8) * 100 // +0.8 screen of finale linger before the end block

// First frame index of each stop, and the scroll offset (vh units) where the
// tour dwells at that stop — the clickable rail / boat-drag targets.
const STOP_FRAME = (() => {
  const m = []
  FRAMES.forEach((f, i) => { if (f.isFirstOfStop) m[f.stopIndex] = i })
  return m
})()
const STOP_Y = STOP_FRAME.map((fi) => LAND_Y[fi])

// ---------- distance made good ----------
// Real great-circle miles along the route (the readout's "NM TO LA").
const NM_PER_RAD = 3440.065
const FRAME_NM = (() => {
  const c = [0]
  for (let i = 1; i < F; i++) c[i] = c[i - 1] + centralAngle(FRAMES[i - 1], FRAMES[i]) * NM_PER_RAD
  return c
})()
const STOP_NM = STOP_FRAME.map((fi) => FRAME_NM[fi])
const TOTAL_NM = FRAME_NM[F - 1]
function nmToLA(prog) {
  const p = clamp(prog, 0, STOPS.length - 1)
  const lo = Math.floor(p)
  const hi = Math.min(lo + 1, STOPS.length - 1)
  return Math.max(0, TOTAL_NM - (STOP_NM[lo] + (STOP_NM[hi] - STOP_NM[lo]) * (p - lo)))
}
const fmtNM = (nm) => Math.round(nm).toLocaleString('en-US')

// dotT past which the globe is "arriving" at the next waypoint: the card for
// the destination pops up here — just before the dot reaches the pin. Key
// regattas open earlier (synced with their camera dolly-in) so they dwell.
const arriveAt = (stopIndex) => (STOPS[stopIndex].tier === 'key' ? 0.64 : 0.74)

function zoomEase(kind, t) {
  if (kind === 'late') return smoothstep(0.55, 0.95, t) // dolly in as the dot lands
  if (kind === 'early') return smoothstep(0.05, 0.4, t) // return to neutral promptly
  return easeInOut(t)
}

// Single source of truth for scroll progress — the three.js loop reads this
// every frame (poses/arcs/zoom/spin channels); the React listener uses the DOM
// channels for the cards/reel/rail/chapter interstitial. One module-level
// result object, reused: both consumers read it synchronously and the React
// listener copies fields into state, so per-call allocation is pure waste.
const P = {
  y: 0,
  segIndex: 0,
  segT: 0,
  mode: 'hero',
  heroT: 0,
  chapterIdx: -1, // chapter whose pins are ACTIVE (sticky through its legs)
  chapterCardIdx: -1, // interstitial card, only during a 'chapter' segment
  chapterCardT: 0,
  arcIdx: -1, // which great-circle hop is animating (-1: none)
  arcT: 0, // eased progress along that hop
  frontier: -1, // continuous visited frontier: pin i is VISITED ⇔ i ≤ frontier
  zoom: 1, // camera distance multiplier (composes with the finale dolly)
  focus: 0, // 0 → globe rests at its screen offset, 1 → key-stop dolly is full in
  center: 0, // 0 → globe at its screen offset, 1 → recentred
  recapT: 0,
  spinT: 0, // extra full-turn yaw during the recap
  pulseT: 0, // route-pulse sweep during the recap
  finaleT: 0,
  isFinaleFrame: false,
  stopProgress: 0,
  bodyStopIndex: 0,
  bodyOpacity: 0,
  showLabel: false,
  label: '',
  labelKey: 0,
}

function computeScroll() {
  const vh = window.innerHeight || 1
  const y = window.scrollY / vh

  // active segment = last segment whose start has passed (linear scan, ~40 rows)
  let k = 0
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (SEGMENTS[i].start <= y) k = i
    else break
  }
  const seg = SEGMENTS[k]
  const segT = clamp((y - seg.start) / seg.len, 0, 1)
  const travel = seg.type === 'leg' || seg.type === 'hop' || seg.type === 'finale-leg'
  const recap = seg.type === 'recap'

  P.y = y
  P.segIndex = k
  P.segT = segT
  P.mode = seg.type
  P.heroT = seg.type === 'hero' ? segT : 1
  P.finaleT = seg.type === 'finale' ? segT : 0
  P.isFinaleFrame = seg.type === 'finale'
  P.zoom = seg.zoomFrom + (seg.zoomTo - seg.zoomFrom) * zoomEase(seg.zEase, segT)
  // How far the key-stop dolly is engaged (0 rest → 1 full KEY_ZOOM). The globe
  // scene uses this to slide the zoomed-in pin toward centre-of-screen instead of
  // letting the dolly shove the left-offset globe off the edge. Only key arrivals
  // dip zoom below 1, so this is 0 everywhere else (recap pull-back is >1 → clamped).
  P.focus = clamp((1 - P.zoom) / (1 - KEY_ZOOM), 0, 1)
  P.center = seg.centerFrom + (seg.centerTo - seg.centerFrom) * smoothstep(0, 0.3, segT)
  P.recapT = recap ? segT : 0
  P.spinT = recap ? easeInOut(clamp((segT - 0.15) / 0.7, 0, 1)) : 0
  P.pulseT = recap ? clamp((segT - 0.2) / 0.7, 0, 1) : 0
  P.chapterCardIdx = seg.type === 'chapter' ? seg.c : -1
  P.chapterCardT = seg.type === 'chapter' ? segT : 0
  P.arcIdx = seg.arcIdx
  P.arcT = travel ? easeInOut(segT) : seg.type === 'finale' ? 1 : 0
  P.frontier = P.arcIdx + smoothstep(0.85, 1, P.arcT)

  // chapter whose pins read ACTIVE: the destination's chapter while traveling,
  // the interstitial's chapter during its beat, the last chapter from the recap on.
  if (seg.type === 'hero') P.chapterIdx = -1
  else if (seg.type === 'chapter') P.chapterIdx = seg.c
  else if (recap || seg.type === 'finale') P.chapterIdx = N_CHAPTERS - 1
  else P.chapterIdx = FRAMES[seg.dest].chapter

  // ---- DOM channels (card body / reel / rail boat) ----
  const holdFrame = FRAMES[Math.max(0, seg.arcIdx)]
  let labelFrameIdx = Math.max(0, seg.arcIdx)
  if (travel) {
    const dst = FRAMES[seg.dest]
    const dotT = P.arcT
    // ONE shared arrival threshold per destination (tiered: key stops open
    // earlier) — it gates the card switch, the opacity ramp, AND the label
    // frame below, so the three can never desync mid-leg.
    const ARR = arriveAt(dst.stopIndex)
    const arriving = dotT >= ARR
    if (seg.arcIdx < 0) {
      // entry leg — no departure card; the first stop pops as the globe settles
      P.bodyStopIndex = dst.stopIndex
      P.bodyOpacity = smoothstep(ARR, 0.9, dotT)
      P.stopProgress = 0
    } else if (holdFrame.stopIndex === dst.stopIndex) {
      // hop within one multi-waypoint stop: the card just stays up
      P.bodyStopIndex = holdFrame.stopIndex
      P.bodyOpacity = 1
      P.stopProgress = holdFrame.stopIndex
    } else if (arriving) {
      P.bodyStopIndex = dst.stopIndex
      P.bodyOpacity = smoothstep(ARR, 0.9, dotT)
      P.stopProgress = holdFrame.stopIndex + smoothstep(0.18, 0.82, dotT)
    } else {
      P.bodyStopIndex = holdFrame.stopIndex
      // legs right after an interstitial: the departing card already faded out
      // under the chapter card — only the arrival pop shows on this leg.
      // Key stops linger a touch longer before letting go.
      const key = STOPS[holdFrame.stopIndex].tier === 'key'
      P.bodyOpacity = seg.afterChapter
        ? 0
        : 1 - (key ? smoothstep(0.2, 0.55, dotT) : smoothstep(0.16, 0.46, dotT))
      P.stopProgress = holdFrame.stopIndex + smoothstep(0.18, 0.82, dotT)
    }
    if (seg.type === 'finale-leg') P.bodyOpacity = 0 // clean centred approach to LA
    if (arriving) labelFrameIdx = seg.dest
  } else if (seg.type === 'chapter' && seg.arcIdx >= 0) {
    // the just-landed card fades out under the incoming chapter interstitial
    P.bodyStopIndex = holdFrame.stopIndex
    P.bodyOpacity = 1 - smoothstep(0, 0.12, segT)
    P.stopProgress = holdFrame.stopIndex
  } else {
    // hero / chapter 0 / recap / finale: card body down, boat holds its dot
    P.bodyStopIndex = seg.type === 'finale' ? FRAMES[F - 1].stopIndex : holdFrame.stopIndex
    P.bodyOpacity = 0
    P.stopProgress =
      seg.type === 'hero' ? 0 : seg.type === 'finale' ? STOPS.length - 1 : holdFrame.stopIndex
  }
  if (STOPS[P.bodyStopIndex] && STOPS[P.bodyStopIndex].status === 'finale') P.bodyOpacity = 0

  // Per-waypoint city labels are OFF: multi-city stops now show all their cities at
  // once (the card's `location` line), and the globe zips through the waypoints fast,
  // so a city-by-city pop would just re-introduce the stuck-on-each-spot feeling.
  P.showLabel = false
  P.label = FRAMES[labelFrameIdx].label
  P.labelKey = labelFrameIdx

  return P
}

// ---------- auto-play time warp ----------
// Play tweens window.scrollY at a constant per-vh-unit pace, but WEIGHTED so the
// tour lingers on the chapter interstitials and the recap instead of blowing
// through them. Piecewise-linear map between scroll (vh units) and warped units.
const PLAY_MS_PER_UNIT = 1100 // pace knob — bigger = calmer tour
// One weight function shared by the map and its inverse (they must agree):
// interstitials linger most, the recap breathes, key arrivals get a beat.
const weightOf = (seg) => {
  if (seg.type === 'chapter') return 1.8
  if (seg.type === 'recap') return 1.3
  if (seg.type === 'leg' && seg.dest != null && FRAMES[seg.dest].keyArrival) return 1.2
  return 1
}
const PLAY_CUMU = (() => {
  const cumu = []
  let acc = 0
  for (const seg of SEGMENTS) {
    cumu.push(acc)
    acc += seg.len * weightOf(seg)
  }
  cumu.push(acc) // sentinel: warped units at the end of the last segment
  return cumu
})()

function playUOfY(yVh) {
  const lastEnd = SEGMENTS[SEGMENTS.length - 1].start + SEGMENTS[SEGMENTS.length - 1].len
  if (yVh >= lastEnd) return PLAY_CUMU[SEGMENTS.length] + (yVh - lastEnd) // finale linger: weight 1
  let k = 0
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (SEGMENTS[i].start <= yVh) k = i
    else break
  }
  const seg = SEGMENTS[k]
  return PLAY_CUMU[k] + clamp((yVh - seg.start) / seg.len, 0, 1) * seg.len * weightOf(seg)
}

function playYOfU(u) {
  const total = PLAY_CUMU[SEGMENTS.length]
  if (u >= total) {
    const lastEnd = SEGMENTS[SEGMENTS.length - 1].start + SEGMENTS[SEGMENTS.length - 1].len
    return lastEnd + (u - total)
  }
  let k = 0
  for (let i = 0; i < SEGMENTS.length; i++) {
    if (PLAY_CUMU[i] <= u) k = i
    else break
  }
  const seg = SEGMENTS[k]
  return seg.start + (u - PLAY_CUMU[k]) / weightOf(seg)
}

// seamless: arrived via the home orb→globe morph. The body-level orb overlay is
// already showing the finished globe, so this page's globe must paint opaque from
// the first frame (no 1.2s black-in) and relay onReady up so the overlay dissolves.
export default function TheRoad({ onNavigate, seamless = false, onGlobeReady, fromBiography = false }) {
  // Capture seamless ONCE at mount: the flag is a one-shot hand-off signal that
  // App consumes right after the route swap, so the prop can flip false while
  // we're mounted — the staged reveal must keep the value it started with.
  const [seamlessAtMount] = useState(seamless)
  // Fallback gate: reduced motion, no WebGL, or the renderer failing to boot
  // (some environments pass the context probe but refuse a real context).
  const [useFallback, setUseFallback] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || !hasWebGL2()
  )
  // The static fallback has no globe to boot — signal ready at once so the mobile
  // black-bridge curtain (faded in by the home morph) lifts promptly instead of
  // waiting on a globe onReady that will never come.
  useEffect(() => {
    if (useFallback && onGlobeReady) onGlobeReady()
  }, [useFallback, onGlobeReady])
  return useFallback ? (
    <StaticTimeline onNavigate={onNavigate} />
  ) : (
    <GlobeTour
      onNavigate={onNavigate}
      seamless={seamlessAtMount}
      onGlobeReady={onGlobeReady}
      fromBiography={fromBiography}
      onSceneFail={() => setUseFallback(true)}
    />
  )
}

// ---------- scroll-driven globe tour ----------

function GlobeTour({ onNavigate, seamless, onGlobeReady, onSceneFail, fromBiography }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [card, setCard] = useState({
    stopIndex: 0, opacity: 0, prog: 0, showLabel: false, label: '', labelKey: 0,
    mode: 'hero', chIdx: -1, chapterIdx: -1, chT: 0, recapT: 0,
  })
  const [finaleT, setFinaleT] = useState(0)
  const [heroDone, setHeroDone] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700)
  const [playing, setPlaying] = useState(false)
  const [docked, setDocked] = useState(false) // "Back to Biography" docks to the top once scrolled past the nav
  // Save-Data / 2g → skip the photo backdrops + warm-ahead entirely (the same
  // lite gate SailingBanner uses; reduced-motion already fell back upstream).
  const [lite] = useState(() => {
    const conn = navigator.connection
    return !!(conn && conn.saveData) || /(^|-)2g$/.test((conn && conn.effectiveType) || '')
  })

  // Warm a chapter's photos during its interstitial (≈1.35 scroll-units of lead
  // time before the first card needs them), and the first stop's photo on ready.
  const warmedRef = useRef(new Set())
  const warmStop = (i) => {
    const s = STOPS[i]
    if (!s || !s.photo || warmedRef.current.has(i)) return
    warmedRef.current.add(i)
    const img = new Image()
    img.src = `${BASE}${isMobile ? s.photo.srcMobile : s.photo.src}`
  }
  useEffect(() => {
    if (lite || card.chIdx < 0) return
    STOPS.forEach((s, i) => { if (s.chapter === card.chIdx) warmStop(i) })
  }, [card.chIdx, lite]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (lite || !ready) return undefined
    const t = setTimeout(() => warmStop(0), 800)
    return () => clearTimeout(t)
  }, [ready, lite]) // eslint-disable-line react-hooks/exhaustive-deps

  // Tour controls (additive — the page stays scroll-driven). A shared rAF tween of
  // window.scrollY powers "to the start / play / to the end"; any real user input
  // (wheel / touch / scroll-keys) cancels it, so manual scrolling always wins. The
  // scene + computeScroll read window.scrollY, so this needs no globe API.
  const tourRef = useRef(null)
  if (tourRef.current === null) {
    const S = { raf: 0, onUser: null, onKey: null, playing: false }
    const easeIO = (t) => t * t * (3 - 2 * t)
    const climaxY = () => (TOTAL_VH / 100) * window.innerHeight // top of the end block = LA 2028 centered
    const detach = () => {
      if (S.onUser) {
        window.removeEventListener('wheel', S.onUser)
        window.removeEventListener('touchstart', S.onUser)
        S.onUser = null
      }
      if (S.onKey) { window.removeEventListener('keydown', S.onKey); S.onKey = null }
    }
    const halt = () => {
      if (S.raf) { cancelAnimationFrame(S.raf); S.raf = 0 }
      detach()
      if (S.playing) { S.playing = false; setPlaying(false) }
    }
    // Shared animation plumbing: run `apply(p)` under a rAF for `ms`, with the
    // user-input cancel hooks attached. tween eases scrollY directly; play maps
    // linear time through the warped-units table so chapter intros linger.
    const animate = (ms, apply, onDone) => {
      halt()
      S.onUser = () => halt()
      S.onKey = (e) => { if ([' ', 'ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End'].includes(e.key)) halt() }
      window.addEventListener('wheel', S.onUser, { passive: true })
      window.addEventListener('touchstart', S.onUser, { passive: true })
      window.addEventListener('keydown', S.onKey)
      const t0 = performance.now()
      const step = (now) => {
        const p = Math.min(1, (now - t0) / ms)
        apply(p)
        if (p < 1) S.raf = requestAnimationFrame(step)
        else { S.raf = 0; detach(); if (onDone) onDone() }
      }
      S.raf = requestAnimationFrame(step)
    }
    const tween = (targetY, ms, onDone) => {
      const startY = window.scrollY
      const dist = targetY - startY
      if (Math.abs(dist) < 2 || ms <= 0) { halt(); window.scrollTo(0, targetY); if (onDone) onDone(); return }
      animate(ms, (p) => window.scrollTo(0, startY + dist * easeIO(p)), onDone)
    }
    tourRef.current = {
      toStart: () => tween(0, 850),
      toEnd: () => tween(climaxY(), 1100),
      toY: (y, ms = 900) => tween(y, ms), // fly to an arbitrary scroll offset (clickable rail)
      stop: () => halt(), // cancel any in-flight tween (e.g. when the user grabs the boat)
      toggle: () => {
        if (S.playing) { halt(); return }
        const target = climaxY()
        const remaining = target - window.scrollY
        if (remaining < 8) { tween(0, 850); return } // at the climax → rewind to the start
        const u0 = playUOfY(window.scrollY / (window.innerHeight || 1))
        const u1 = playUOfY(target / (window.innerHeight || 1))
        animate((u1 - u0) * PLAY_MS_PER_UNIT, (p) => {
          const vh = window.innerHeight || 1
          window.scrollTo(0, playYOfU(u0 + (u1 - u0) * p) * vh)
        }, () => { S.playing = false; setPlaying(false) })
        // set AFTER animate(): its opening halt() would clear the flag again
        S.playing = true
        setPlaying(true)
      },
      dispose: () => { if (S.raf) cancelAnimationFrame(S.raf); detach() },
    }
  }

  // Keep the desktop/mobile split responsive: crossing the 700px breakpoint (e.g.
  // dragging the window narrow) flips isMobile so the whole page re-lays out to the
  // matching frame instead of staying in the desktop layout and getting smushed.
  // setIsMobile with the same value is a no-op, so this only re-renders on a cross.
  useEffect(() => {
    const onBreakpoint = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', onBreakpoint)
    return () => window.removeEventListener('resize', onBreakpoint)
  }, [])

  // The tour controls outlive globe re-inits — dispose only on unmount.
  useEffect(() => () => { if (tourRef.current) tourRef.current.dispose() }, [])

  // Re-runs when isMobile flips: the globe scene bakes isMobile into its pose
  // (confined-left vs high-centered), pixel ratio, stars and pins, so a breakpoint
  // cross rebuilds it. dispose() intentionally keeps the canvas context (see
  // globeScene.js), so re-creating on the same canvas is safe.
  useEffect(() => {
    let scene
    try {
      scene = createGlobeScene(canvasRef.current, FRAMES, {
        isMobile,
        baseUrl: import.meta.env.BASE_URL,
        onReady: () => { setReady(true); if (onGlobeReady) onGlobeReady() },
        getProgress: computeScroll,
        seamless, // fade the pins in after the orb→globe handoff
        tour: { segments: SEGMENTS, chapterPoses: CHAPTER_POSES, landY: LAND_Y },
      })
    } catch (err) {
      console.warn('Globe scene failed to initialize, using static timeline', err)
      onSceneFail()
      return undefined
    }
    const onResize = () => scene.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      scene.dispose()
    }
  }, [isMobile]) // eslint-disable-line react-hooks/exhaustive-deps

  // Seamless arrival: lock scrolling through the staged reveal (globe → pins →
  // text) so the tour can't be scrubbed mid-animation, then release it.
  useEffect(() => {
    if (!seamless) return undefined
    const html = document.documentElement
    const prev = html.style.overflow
    html.style.overflow = 'hidden'
    window.scrollTo(0, 0)
    const t = setTimeout(() => { html.style.overflow = prev }, 1900)
    return () => { clearTimeout(t); html.style.overflow = prev }
  }, [seamless])

  // Coarse React state; the heavy per-frame work runs in the scene's rAF loop.
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const p = computeScroll()
        setCard((prev) =>
          prev.stopIndex === p.bodyStopIndex &&
          prev.opacity === p.bodyOpacity &&
          prev.prog === p.stopProgress &&
          prev.showLabel === p.showLabel &&
          prev.label === p.label &&
          prev.labelKey === p.labelKey &&
          prev.mode === p.mode &&
          prev.chIdx === p.chapterCardIdx &&
          prev.chapterIdx === p.chapterIdx &&
          prev.chT === p.chapterCardT &&
          prev.recapT === p.recapT
            ? prev
            : {
                stopIndex: p.bodyStopIndex,
                opacity: p.bodyOpacity,
                prog: p.stopProgress,
                showLabel: p.showLabel,
                label: p.label,
                labelKey: p.labelKey,
                mode: p.mode,
                chIdx: p.chapterCardIdx,
                chapterIdx: p.chapterIdx,
                chT: p.chapterCardT,
                recapT: p.recapT,
              }
        )
        setHeroDone(p.heroT > 0.6)
        setFinaleT(p.finaleT)
        setDocked(window.scrollY > 48)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  // The leg frame is the tour's PERSISTENT scaffolding. Once it fades in (on the
  // first chapter interstitial) it stays on screen — chrome and all — until the
  // recap/finale takes over. Between legs NOTHING cross-fades wholesale:
  //   • "Leg N / 5" keeps the word + the "/ 5"; only the NUMBER swaps.
  //   • the half-year tracker stays put; only which box is lit hands off.
  //   • Play + NM-to-LA never move or fade between legs.
  //   • the stop list is the only body that changes: as you reach a leg's last
  //     stop, its banner rides UP to the top while that leg's rows fade out and
  //     the next leg's rows fade in beneath it.
  // Everything is a pure closed form of scroll (chapterIdx / chT / prog / recapT),
  // so a reverse scrub replays every hand-off exactly.
  const stopInLeg = (c) => clamp(card.prog - CHAPTERS[c].stopIndices[0], 0, CHAPTERS[c].stopIndices.length - 1)
  const inIntro = card.mode === 'chapter'
  // whole-frame opacity: fade in on the first interstitial, hold at 1 across the
  // legs and their hand-offs, fade out as the recap begins (finale → gone).
  let frameOpacity = 0
  if (heroDone && card.chapterIdx >= 0) {
    if (card.mode === 'recap') frameOpacity = 1 - smoothstep(0, 0.18, card.recapT)
    else if (card.mode === 'finale-leg' || card.mode === 'finale' || finaleT >= 0.05) frameOpacity = 0
    else if (inIntro && card.chIdx === 0) frameOpacity = smoothstep(0.05, 0.4, card.chT) // very first appearance
    else frameOpacity = 1
  }
  const frameMounted = frameOpacity > 0.001
  // the outgoing leg during a mid-tour hand-off (none on the very first appearance)
  const prevLeg = inIntro && card.chIdx > 0 ? card.chIdx - 1 : -1
  const curLeg = card.chapterIdx
  // "Leg N / 5" number swap, the tracker's gliding lit box, the list crossfade
  const numPrev = prevLeg >= 0 ? prevLeg + 1 : null
  const numCur = curLeg + 1
  const numT = inIntro ? card.chT : 1
  const timelineF = prevLeg >= 0 ? prevLeg + smoothstep(0.3, 0.7, card.chT) : curLeg
  const listChT = inIntro ? card.chT : 1
  const progIn = curLeg >= 0 ? stopInLeg(curLeg) : 0
  const progOut = prevLeg >= 0 ? stopInLeg(prevLeg) : 0
  const controlsInteractive = frameOpacity > 0.5
  // Click a tracker box -> fly to that leg's first stop (settled, list visible).
  // Reuses the tour tween; adds no state to the closed form, so reverse-scrub is safe.
  const jumpToLeg = (i) => {
    const ih = window.innerHeight || 1
    // the final leg's only stop IS the finale climax, where the frame is faded out;
    // land on the recap instead, where "Leg 5 / 5" is still lit and its stop listed.
    if (i === CHAPTERS.length - 1) {
      const recap = SEGMENTS.find((s) => s.type === 'recap')
      if (recap) { tourRef.current?.toY(recap.start * ih); return }
    }
    const si = CHAPTERS[i]?.stopIndices?.[0]
    if (si == null) return
    tourRef.current?.toY(STOP_Y[si] * ih)
  }
  return (
    <div style={{ background: 'rgb(0,0,0)' }}>
      {/* venue-photo backdrops sit UNDER the alpha-true globe canvas (same
          zIndex, earlier in the DOM) — the globe keeps flying over them */}
      {!lite && (
        <TourBackdrops
          mode={card.mode}
          stopIndex={card.stopIndex}
          opacity={card.opacity}
          prog={card.prog}
          isMobile={isMobile}
        />
      )}
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 0,
          // seamless handoff: paint opaque immediately (the orb overlay is showing
          // the identical globe over us and will dissolve once we're ready).
          opacity: seamless ? 1 : ready ? 1 : 0,
          transition: seamless ? 'none' : 'opacity 1.2s ease',
        }}
      />

      {/* scroll runway — all visible content is fixed-position above it */}
      <div style={{ height: `${TOTAL_VH}vh` }} />

      <Hero visible={!heroDone} seamless={seamless} isMobile={isMobile} />

      {/* "Back to Biography" — only when arriving from the Biography page. Sits below
          the nav at the top, docks up with a little padding once scrolled, and fades
          out at the finale so the LA 2028 headline arrives on a clean top edge. */}
      {fromBiography && <BackButton onNavigate={onNavigate} docked={docked} finaleT={finaleT} />}

      {/* DESKTOP leg frame — the PERSISTENT scaffolding. Title/tracker pinned at
          TITLE_TOP, Play + NM controls pinned at CTRL_BOTTOM, the stop list
          clipped in the flexing box between them. The header and controls stay
          put across the whole leg sequence; only the leg number, the lit tracker
          box, the banner position, and the list content change from leg to leg.
          The whole frame fades in on the first interstitial and out into the
          recap. A long leg still just scrolls inside its box (see LegList). */}
      {frameMounted && !isMobile && (
        <div style={{
          position: 'fixed', top: TITLE_TOP, bottom: CTRL_BOTTOM,
          left: LANE.left, right: LANE.right, maxWidth: LANE.maxWidth, zIndex: 1,
          display: 'flex', flexDirection: 'column', pointerEvents: 'none',
          opacity: frameOpacity, transform: `translateY(${(1 - frameOpacity) * 14}px)`,
        }}>
          <LegHeader numPrev={numPrev} numCur={numCur} numT={numT} timelineF={timelineF} isMobile={false} onJump={jumpToLeg} interactive={controlsInteractive} />
          <LegList prevLeg={prevLeg} curLeg={curLeg} chT={listChT} progOut={progOut} progIn={progIn} isMobile={false} />
          {/* passage readout + Play — persistent (fade only with the whole frame) */}
          <div style={{
            flexShrink: 0, marginTop: 16, display: 'flex', alignItems: 'center', gap: 18,
            pointerEvents: controlsInteractive ? 'auto' : 'none',
          }}>
            <TourControls tour={tourRef.current} playing={playing} />
            <NmToLa prog={card.prog} />
          </div>
        </div>
      )}

      {/* MOBILE leg frame — same persistent model in the bottom band: header
          pinned to the top (so the globe always fits above it), stop list clipped
          in the flexing box, readout + Play pinned to the bottom. */}
      {frameMounted && isMobile && (
        <div style={{
          position: 'fixed', left: 20, right: 20,
          top: MOBILE_LANE_TOP, bottom: MOBILE_CTRL_BOTTOM,
          zIndex: 3, display: 'flex', flexDirection: 'column', pointerEvents: 'none',
          opacity: frameOpacity, transform: `translateY(${(1 - frameOpacity) * 12}px)`,
        }}>
          <LegHeader numPrev={numPrev} numCur={numCur} numT={numT} timelineF={timelineF} isMobile onJump={jumpToLeg} interactive={controlsInteractive} />
          <LegList prevLeg={prevLeg} curLeg={curLeg} chT={listChT} progOut={progOut} progIn={progIn} isMobile />
          <div style={{
            flexShrink: 0, marginTop: 14,
            pointerEvents: controlsInteractive ? 'auto' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16,
          }}>
            <TourControls tour={tourRef.current} playing={playing} />
            <NmToLa prog={card.prog} />
          </div>
        </div>
      )}

      {/* end block scrolls up over the fixed globe. The LA 2028 climax reads over the
          zoomed globe (transparent lead-in), then everything scrolls through the top —
          the headline dissolving into spray as it crosses (see EndBlock). */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        <EndBlock onNavigate={onNavigate} isMobile={isMobile} />
      </div>
    </div>
  )
}

// ---------- shared stop bits (used by the reduced-motion StaticTimeline) ----------

// structured past fact — GOLD is hardware, so it gets the filled cyan chip;
// RACED/TRAINED are plain tracked caption lines
function RecordChip({ record, marginTop = 20 }) {
  if (!record) return null
  const gold = record.result === 'GOLD'
  return (
    <p
      style={{
        display: 'inline-block',
        margin: `${marginTop}px 0 0`,
        padding: gold ? '5px 10px' : 0,
        border: gold ? '1px solid rgba(0,180,255,0.5)' : 'none',
        background: gold ? 'rgba(0,180,255,0.12)' : 'none',
        color: gold ? 'rgb(0,180,255)' : 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: gold ? 700 : 600,
        letterSpacing: '1.6px',
        textTransform: 'uppercase',
        lineHeight: 1.5,
      }}
    >
      {record.result} · {record.detail} · {record.date}
    </p>
  )
}

// Half-year timeline tracker beside the leg counter — one box per leg (the five
// half-years to 2028). The lit box HANDS OFF from leg to leg: `activeF` is a
// FLOAT, so during a hand-off the highlight glides from box N to box N+1 (a
// quick baton pass) instead of a hard cut, matching the number swap beside it.
// Each leg is labelled by its half of the year: "H2 2026", "H1 2027", ... "H2
// 2028" (the Olympics) — H1 = a Jan-start leg, H2 = a Jul-start leg.
const legAbbr = (label) => {
  const m = label.match(/^([A-Za-z]{3}).*?(\d{4})$/)
  if (!m) return label
  const firstHalf = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN'].includes(m[1].toUpperCase())
  return `${firstHalf ? 'H1' : 'H2'} ${m[2]}`
}
const mix = (a, b, t) => a + (b - a) * t
// The half-year tracker. Each box lights by scroll (`on`) AND — when the frame is
// interactive — is a button that flies the tour to that leg's first stop (onJump).
function LegTimeline({ activeF, isMobile, onJump, interactive }) {
  const [hoverIdx, setHoverIdx] = useState(-1)
  const clickable = interactive && typeof onJump === 'function'
  return (
    // re-enable pointer events (the whole frame is pointerEvents:'none'); off while
    // the frame is mid-fade so half-transparent boxes aren't clickable
    <div style={{ display: 'flex', gap: isMobile ? 4 : 5, alignItems: 'center', pointerEvents: clickable ? 'auto' : 'none' }}>
      {CHAPTERS.map((ch, i) => {
        // 1 = fully lit, 0 = unlit; fractional for the two boxes mid-handoff
        const on = clamp(1 - Math.abs(i - activeF), 0, 1)
        const hovered = clickable && hoverIdx === i
        return (
          <span
            key={ch.id}
            role={clickable ? 'button' : undefined}
            tabIndex={clickable ? 0 : undefined}
            aria-label={clickable ? `Go to Leg ${i + 1}, ${legAbbr(ch.label)}` : undefined}
            onClick={clickable ? () => onJump(i) : undefined}
            onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onJump(i) } } : undefined}
            onMouseEnter={clickable ? () => setHoverIdx(i) : undefined}
            onMouseLeave={clickable ? () => setHoverIdx(-1) : undefined}
            style={{
              padding: isMobile ? '3px 5px' : '4px 7px',
              border: `1px solid rgba(${mix(255, 0, on)},${mix(255, 80, on)},${mix(255, 255, on)},${mix(0.18, 1, on)})`,
              background: `rgba(${mix(255, 0, on)},${mix(255, 80, on)},${mix(255, 255, on)},${mix(0.03, 1, on)})`,
              color: `rgba(255,255,255,${mix(0.4, 1, on)})`,
              fontSize: isMobile ? 8.5 : 9.5, fontWeight: 600, letterSpacing: '0.6px',
              textTransform: 'uppercase', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums',
              boxShadow: on > 0.01 ? `0 0 ${14 * on}px rgba(0,80,255,${0.5 * on})` : 'none',
              cursor: clickable ? 'pointer' : 'default',
              // hover affordance rides ONLY scroll-independent props (filter/transform)
              // so the per-frame lit-box animation (border/bg/color) is never smeared
              filter: hovered ? 'brightness(1.5)' : 'none',
              transform: hovered ? 'translateY(-1px)' : 'none',
              transition: 'filter 120ms ease, transform 120ms ease',
              WebkitTapHighlightColor: 'transparent', userSelect: 'none',
            }}
          >
            {legAbbr(ch.label)}
          </span>
        )
      })}
    </div>
  )
}

// The leg counter — "Leg N / 5" where the word + the "/ 5" are fixed and only
// the NUMBER changes. Two digits share a fixed 1ch slot: the outgoing fades out
// as the incoming fades in (t = interstitial progress). A hidden copy holds the
// slot width so the surrounding text never reflows. During a leg prev is null
// and the current digit is simply solid.
function LegNumber({ prev, cur, t }) {
  const digit = (val, opacity) => (
    <span style={{ position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', opacity }}>{val}</span>
  )
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: '1ch', textAlign: 'center', verticalAlign: 'baseline', fontVariantNumeric: 'tabular-nums' }}>
      <span style={{ visibility: 'hidden' }}>{cur}</span>
      {/* overlapping curves (like LegTimeline's baton pass) so the brighter
          digit never drops near zero mid-swap — otherwise the number blinks out */}
      {prev != null && digit(prev, 1 - smoothstep(0.2, 0.7, t))}
      {digit(cur, prev != null ? smoothstep(0.3, 0.8, t) : 1)}
    </span>
  )
}

// The PERSISTENT header — "Leg N / 5" (number swaps) + the half-year tracker
// (lit box hands off). Lives in the frame ABOVE the list and never remounts
// between legs, so nothing here flickers as the tour moves on.
function LegHeader({ numPrev, numCur, numT, timelineF, isMobile, onJump, interactive }) {
  return (
    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', margin: '0 0 22px' }}>
      <h2 style={{ color: '#fff', fontSize: isMobile ? 30 : 'clamp(34px, 5vw, 60px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1, margin: 0 }}>
        Leg <LegNumber prev={numPrev} cur={numCur} t={numT} /> / {CHAPTERS.length}
      </h2>
      <LegTimeline activeF={timelineF} isMobile={isMobile} onJump={onJump} interactive={interactive} />
    </div>
  )
}

// Horizontal bleed of the active-stop banner past the list's text column (the
// blue border pokes left, the highlight softens off to the right). The clipped
// box is widened by exactly this so the bleed is never cut by overflow:hidden.
const BANNER_BLEED_L = 16
const BANNER_BLEED_R = 8

// The stop list — the ONE part of the leg frame that changes per leg. A SINGLE
// persistent banner (positioned in BOX space, so it survives the leg change)
// glides to the active stop as you scroll; when you reach a leg's last stop and
// cross into the interstitial it rides UP to the top while the outgoing leg's
// rows fade out and the incoming leg's rows fade in beneath it. Each leg's rows
// scroll INSIDE the clipped box (a long leg on a short screen keeps the active
// stop framed). Banner position, internal scroll, and the crossfade are all pure
// functions of scroll (progIn / progOut / chT), so reverse-scrub is exact.
// During a leg prevLeg is -1 and chT is 1 (no crossfade — just the current leg).
function LegList({ prevLeg, curLeg, chT, progOut, progIn, isMobile }) {
  const itemH = isMobile ? 34 : 42
  const FADE = isMobile ? 20 : 26
  const boxRef = useRef(null)
  const [boxH, setBoxH] = useState(0)
  useLayoutEffect(() => {
    const el = boxRef.current
    if (!el) return undefined
    setBoxH(el.clientHeight)
    if (typeof ResizeObserver === 'undefined') return undefined
    const ro = new ResizeObserver(() => setBoxH(el.clientHeight))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // per-leg geometry: how far a leg's list is internally scrolled, and where its
  // active stop sits in BOX space (list-space position minus that scroll).
  const geo = (legIdx, pos) => {
    const ch = CHAPTERS[legIdx]
    if (!ch) return null
    const n = ch.stopIndices.length
    const p = clamp(pos, 0, Math.max(0, n - 1))
    const listH = n * itemH
    const maxScroll = Math.max(0, listH - boxH)
    const scrollOffset = boxH > 0 ? clamp(p * itemH + itemH / 2 - boxH / 2, 0, maxScroll) : 0
    return { ch, n, p, maxScroll, scrollOffset, activeScreenY: p * itemH - scrollOffset, active: Math.round(p) }
  }
  const cur = geo(curLeg, progIn)
  const out = prevLeg >= 0 ? geo(prevLeg, progOut) : null
  if (!cur) return <div ref={boxRef} style={{ flex: 1, minHeight: 0 }} />

  const transitioning = !!out && chT < 1
  const outOpacity = transitioning ? 1 - smoothstep(0, 0.55, chT) : 0
  const inOpacity = transitioning ? smoothstep(0.35, 0.9, chT) : 1
  // the persistent banner rides from the outgoing active row up to the incoming
  // one (which sits at the top, since progIn resolves to 0 during a hand-off)
  const bannerY = transitioning ? mix(out.activeScreenY, cur.activeScreenY, easeInOut(chT)) : cur.activeScreenY

  const outClips = out && outOpacity > 0.01
  // Feather rows at the box edges from the CURRENTLY-DOMINANT (higher-opacity)
  // list only — masking the OR of both would feather the outgoing leg's still-
  // solid active row during a hand-off. Cap the feather at half the box so the
  // two gradient stops can't cross on a very short box (which would collapse the
  // opaque middle band and dim the active row).
  const dom = !out || inOpacity >= outOpacity ? cur : out
  const f = boxH > 0 ? Math.max(0, Math.min(FADE, boxH / 2 - 1)) : FADE
  const maskTop = dom.scrollOffset > 0.5 ? f : 0
  const maskBot = dom.scrollOffset < dom.maxScroll - 0.5 ? f : 0
  const masked = maskTop > 0 || maskBot > 0
  const mask = `linear-gradient(to bottom, transparent 0, #000 ${maskTop}px, #000 calc(100% - ${maskBot}px), transparent 100%)`

  return (
    <div
      ref={boxRef}
      style={{
        position: 'relative', flex: 1, minHeight: 0, overflow: 'hidden',
        marginLeft: -BANNER_BLEED_L, marginRight: -BANNER_BLEED_R,
        WebkitMaskImage: masked ? mask : undefined, maskImage: masked ? mask : undefined,
      }}
    >
      {/* the ONE persistent see-through banner (box space) — glides between rows
          within a leg, rides up to the top across a hand-off */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute', left: 0, right: 0, top: bannerY, height: itemH,
          background: 'linear-gradient(90deg, rgba(0,80,255,0.16), rgba(0,80,255,0.02))',
          borderLeft: '2px solid rgb(0,80,255)',
        }}
      />
      <StopList leg={cur} opacity={inOpacity} itemH={itemH} isMobile={isMobile} />
      {outClips && <StopList leg={out} opacity={outOpacity} itemH={itemH} isMobile={isMobile} />}
    </div>
  )
}

// One leg's rows, translated to keep the active stop framed inside the clipped
// box. Banner-free (the frame owns the single persistent banner). Presentational
// only — its `leg` geometry + opacity are computed by LegList from scroll.
function StopList({ leg, opacity, itemH, isMobile }) {
  return (
    <ul style={{ position: 'absolute', left: 0, right: 0, top: 0, listStyle: 'none', margin: 0, padding: `0 ${BANNER_BLEED_R}px 0 ${BANNER_BLEED_L}px`, transform: `translateY(${-leg.scrollOffset}px)`, opacity }}>
      {leg.ch.stopIndices.map((si, i) => {
        const s = STOPS[si]
        const worlds = s.short === 'Worlds'
        const on = i === leg.active
        return (
          <li key={s.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, height: itemH, fontSize: isMobile ? 14 : 17 }}>
            <span style={{ color: on ? 'rgb(0,120,255)' : 'rgba(255,255,255,0.3)', fontSize: 9 }}>●</span>
            <span style={{ color: on ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: 600 }}>{s.region}</span>
            {s.short && (
              <span
                className={worlds ? 'chrome-text' : undefined}
                style={worlds ? { fontWeight: 700 } : { color: on ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.4)', fontWeight: 400 }}
              >
                {s.short}
              </span>
            )}
            <span style={{ marginLeft: 'auto', color: 'rgba(255,255,255,0.42)', fontSize: isMobile ? 11 : 12.5, fontWeight: 600, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
              {s.dates}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

// Full-viewport venue-photo backdrops behind the globe canvas (the renderer is
// alpha:true, so the earth/stars composite over them). Opacity rides the card's
// own arrival envelope — scrub-driven, no CSS transitions. Photos mount on
// approach and stay mounted so a reverse scrub never re-decodes.
function TourBackdrops({ mode, stopIndex, opacity, prog, isMobile }) {
  const mountedRef = useRef(new Set())
  const [failed, setFailed] = useState(() => new Set())
  STOPS.forEach((s, i) => {
    if (s.photo && Math.abs(prog - i) < 1.5) mountedRef.current.add(i)
  })
  // only while dwelling/traveling between stops — never over the chapter
  // interstitials, the recap, or the LA finale approach
  const show = mode === 'leg' || mode === 'hop'
  const activeIdx = show && STOPS[stopIndex] && STOPS[stopIndex].photo && !failed.has(stopIndex) ? stopIndex : -1
  const o = activeIdx >= 0 ? opacity * 0.85 : 0
  return (
    <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      {[...mountedRef.current].map((i) => {
        const s = STOPS[i]
        if (failed.has(i)) return null
        return (
          <img
            key={i}
            src={`${BASE}${isMobile ? s.photo.srcMobile : s.photo.src}`}
            alt=""
            decoding="async"
            onError={() => setFailed((prev) => new Set(prev).add(i))}
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: s.photo.position,
              filter: 'grayscale(0.2) contrast(1.08) brightness(0.34)',
              opacity: i === activeIdx ? o : 0,
              willChange: 'opacity',
            }}
          />
        )
      })}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: o,
          background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.3) 45%, rgba(0,0,0,0.15) 100%)',
        }}
      />
      {/* photo credit rides the backdrop it belongs to (desktop only — the
          mobile bottom edge belongs to the card + waterline strip) */}
      {!isMobile && activeIdx >= 0 && STOPS[activeIdx].photo.credit && (
        <p
          style={{
            position: 'absolute', left: 20, bottom: 16, margin: 0,
            color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 600,
            letterSpacing: '1.5px', textTransform: 'uppercase', opacity: o,
          }}
        >
          Photo · {STOPS[activeIdx].photo.credit}
        </p>
      )}
    </div>
  )
}

// ---------- passage readout ----------

// Distance made good — the one stat that stays, sat beside the Play button:
// "NM to LA" + the live great-circle miles (flips cyan on the final leg).
function NmToLa({ prog }) {
  const nearLA = prog > STOPS.length - 2
  return (
    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
        NM to LA
      </span>
      <span style={{ color: nearLA ? 'rgb(0,180,255)' : '#fff', fontSize: 15, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {fmtNM(nmToLA(prog))}
      </span>
    </span>
  )
}

// "Back to Biography" pill — centered at the top (below the nav), docks up with a
// little padding once scrolled, fades out as the LA 2028 finale headline arrives.
function BackButton({ onNavigate, docked, finaleT }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => onNavigate('Biography')}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: 'fixed', top: docked ? 20 : 74, left: '50%', transform: 'translateX(-50%)',
        zIndex: 6,
        opacity: 1 - Math.min(1, finaleT * 2),
        pointerEvents: finaleT > 0.4 ? 'none' : 'auto',
        transition: 'top 0.35s ease, opacity 0.35s ease, background 0.2s ease, border-color 0.2s ease',
        background: hover ? 'rgba(20,24,40,0.82)' : 'rgba(10,12,20,0.55)',
        border: `1px solid ${hover ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)'}`,
        borderRadius: 100, color: '#fff', padding: '9px 20px',
        fontSize: 13.5, fontWeight: 600, letterSpacing: '0.3px',
        fontFamily: 'inherit', cursor: 'pointer',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', whiteSpace: 'nowrap',
      }}
    >
      ← Back to Biography
    </button>
  )
}

function Hero({ visible, seamless, isMobile }) {
  // After a seamless morph, hold the hero text back so it fades in LAST — after
  // the overlay has dissolved to the globe and it has settled small + left.
  const entrance = usePageEntrance(2, { staggerMs: 150, initialDelayMs: seamless ? 1450 : 200 })
  // Same lane as the rest of the content — right column (desktop) / bottom band
  // (mobile), left-aligned — so the title never overlaps the globe.
  // Mobile: TOP-align the title to the band top (MOBILE_LANE_TOP) so it lands in
  // the exact spot the leg headers use — no dead gap between the globe and the
  // title, and the hero→leg hand-off keeps the title still. Desktop stays centred
  // in the lane against the vertically-centred globe.
  const laneBox = isMobile
    ? { position: 'fixed', left: 20, right: 20, top: MOBILE_LANE_TOP, bottom: MOBILE_CTRL_BOTTOM, justifyContent: 'flex-start' }
    : { position: 'fixed', left: LANE.left, right: LANE.right, top: 0, bottom: 0, maxWidth: LANE.maxWidth, justifyContent: 'center' }
  return (
    <div
      style={{
        ...laneBox,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        textAlign: 'left',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
        pointerEvents: 'none',
      }}
    >
      <h1 style={{ ...entrance.style(0), color: '#fff', fontSize: 'clamp(34px, 4vw, 62px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.02, margin: 0 }}>
        The Road to LA 2028
      </h1>
      {/* scroll cue — micro-caps kicker, the lone title carries the moment */}
      <div style={{ ...entrance.style(1), marginTop: 28 }}>
        <div style={{
          color: '#fff', fontSize: 12, fontWeight: 600, letterSpacing: '2.2px',
          textTransform: 'uppercase',
          animation: 'scrollHint 1.6s ease-in-out infinite',
        }}>
          Scroll ↓
        </div>
      </div>
    </div>
  )
}

// A single Play / Pause pill — the tour's one control (auto-plays through the
// stops; scrolling still works manually). Placement + visibility are handled by
// the wrapper. Blue-accented icon chip + label, glows on hover.
function TourControls({ tour, playing }) {
  const [hover, setHover] = useState(false)
  if (!tour) return null
  return (
    <button
      onClick={tour.toggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={playing ? 'Pause the tour' : 'Play the tour'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 11,
        background: hover ? 'rgba(0,80,255,0.20)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${hover ? 'rgba(60,120,255,0.75)' : 'rgba(255,255,255,0.32)'}`,
        borderRadius: 100,
        color: '#fff', cursor: 'pointer', padding: '10px 22px 10px 12px',
        fontSize: 13, fontWeight: 600, letterSpacing: '1.4px', fontFamily: 'inherit',
        textTransform: 'uppercase',
        boxShadow: hover ? '0 0 26px rgba(0,80,255,0.35)' : 'none',
        transition: 'background 0.25s ease, border-color 0.25s ease, box-shadow 0.25s ease',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
        background: hover ? 'rgb(0,80,255)' : 'rgba(255,255,255,0.14)',
        transition: 'background 0.25s ease',
      }}>
        {playing ? (
          <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden="true">
            <rect x="1" y="0" width="3" height="11" fill="#fff" />
            <rect x="6" y="0" width="3" height="11" fill="#fff" />
          </svg>
        ) : (
          <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true" style={{ marginLeft: 2 }}>
            <path d="M0 0 L11 6 L0 12 Z" fill="#fff" />
          </svg>
        )}
      </span>
      {playing ? 'Pause' : 'Play Tour'}
    </button>
  )
}

// Fancy image-backed exit cards for the end of the tour — richer than the flat
// Biography "explore" cards: a sailing photo per destination, dark scrim, and a
// lift + zoom + royal-blue glow on hover.
const EXIT_LINKS = [EXIT_CARDS.home, EXIT_CARDS.biography, EXIT_CARDS.team, EXIT_CARDS.support]

function EndBlock({ onNavigate, isMobile }) {
  const { days, hrs, mins, secs } = useCountdown(new Date('2028-07-14T00:00:00'))
  const blockRef = useRef(null)
  const h1Ref = useRef(null)
  const countdownRef = useRef(null)
  const statsRef = useRef(null)

  // journey stats count up once, when the line scrolls into view
  const [statsRun, setStatsRun] = useState(false)
  useEffect(() => {
    const el = statsRef.current
    if (!el) return undefined
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsRun(true); io.disconnect() } },
      // fire the moment the line peeks over the globe — a visible "0 stops"
      // beat while waiting for a deeper threshold reads as a bug
      { threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // LA 2028 chrome-spray dissolve — replaces the old sticky header. The
  // headline scrolls straight through the top of the viewport; as its letters
  // cross the edge they atomize into shimmer-matched chrome spray
  // (useTextSpray → lib/textSpray) and reassemble on scroll-back. The stats +
  // countdown fade out just before the edge instead of clipping flatly.
  useTextSpray(h1Ref, {
    palette: 'chrome',
    containerRef: blockRef,
    zIndex: 10,
    fadeRefs: [statsRef, countdownRef],
  })

  return (
    <>
      {/* END SECTION — the LA 2028 chrome rises over the zoomed globe on its
          solid-black band and keeps scrolling: no pinning. The exit nav +
          footer flow below it as ordinary content. */}
      <div ref={blockRef} style={{ position: 'relative' }}>
        {/* brief lead-in so LA 2028 reads over the zoomed globe before it reaches the top */}
        <div style={{ height: '46vh' }} />

        <div style={{
          background: 'rgb(0,0,0)',
          textAlign: 'center', padding: '54px 20px 32px',
        }}>
          {/* the journey, in numbers — single line so the h1's glyph
              measurement (textSpray) never shifts */}
          <p ref={statsRef} style={{
            color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: 600,
            letterSpacing: '2.4px', textTransform: 'uppercase', margin: '0 0 18px',
          }}>
            <Count to={TOUR_STATS.stops} run={statsRun} /> stops <StatSep />{' '}
            <Count to={TOUR_STATS.continents} run={statsRun} /> continents <StatSep />{' '}
            <Count to={TOUR_STATS.years} run={statsRun} /> years
          </p>
          <h1 ref={h1Ref} className="chrome-text" style={{
            fontSize: 'clamp(48px, 9vw, 104px)', fontWeight: 800,
            letterSpacing: '-4px', margin: '0 0 10px',
          }}>
            {/* per-glyph spans: the spray module measures each glyph's box */}
            {'LA 2028'.split('').map((ch, i) => (ch === ' ' ? ' ' : <span key={i}>{ch}</span>))}
          </h1>
          <p ref={countdownRef} style={{ color: '#fff', fontSize: 18, fontWeight: 400, letterSpacing: '1px', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
            <CountdownUnits days={days} hrs={hrs} mins={mins} secs={secs} />
          </p>
        </div>

        {/* exit nav on solid black (keeps the fixed globe canvas covered) */}
        <div style={{
          background: 'rgb(0,0,0)',
          padding: '72px 0 90px',
        }}>
          <ExitNav links={EXIT_LINKS} onNavigate={onNavigate} isMobile={isMobile} />
          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <BackToTop />
          </div>
        </div>
      </div>
      <Footer variant="dark" onNavigate={onNavigate} />
    </>
  )
}

// One stat number: eases 0 → `to` over ~900ms once `run` flips true (the line
// entered the viewport). Numbers are tiny, so a plain rAF loop is fine.
function Count({ to, run }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!run) return undefined
    let raf = 0
    const t0 = performance.now()
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 900)
      setN(Math.round(to * (1 - (1 - p) * (1 - p) * (1 - p)))) // ease-out cubic
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [run, to])
  return <span>{run ? n : 0}</span>
}

function StatSep() {
  return <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
}

// Self-labeling countdown: digits at full size, unit words as quiet micro-caps.
function CountdownUnits({ days, hrs, mins, secs }) {
  const unit = {
    fontSize: 10, fontWeight: 600, letterSpacing: '1.6px',
    color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
  }
  const sep = <span style={{ color: 'rgba(255,255,255,0.3)' }}>{' · '}</span>
  return (
    <>
      {days} <span style={unit}>days</span>{sep}
      {String(hrs).padStart(2, '0')} <span style={unit}>hrs</span>{sep}
      {String(mins).padStart(2, '0')} <span style={unit}>min</span>{sep}
      {String(secs).padStart(2, '0')} <span style={unit}>sec</span>
    </>
  )
}

// "Back to the top" — smooth-scrolls to the top of the tour. Styled like the tour
// controls (white, bordered) for consistency.
function BackToTop() {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.4)', borderRadius: 3,
        color: '#fff', cursor: 'pointer', padding: '10px 22px',
        fontSize: 14, fontWeight: 600, letterSpacing: '0.3px', fontFamily: 'inherit',
        transition: 'background 0.2s ease',
      }}
    >
      ↑ Back to the start
    </button>
  )
}

// ---------- fallback: static timeline (reduced motion / no WebGL) ----------

function StaticTimeline({ onNavigate }) {
  const entrance = usePageEntrance(4, { staggerMs: 120, initialDelayMs: 50 })
  const { days, hrs, mins, secs } = useCountdown(new Date('2028-07-14T00:00:00'))
  return (
    <div style={{ background: 'rgb(0,0,0)', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '110px 20px 30px' }}>
        <h1 style={{ ...entrance.style(1), color: '#fff', fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 800, letterSpacing: '-2px', margin: 0 }}>
          The Road to LA 2028
        </h1>
      </div>

      <div style={{ ...entrance.style(2), maxWidth: 720, margin: '0 auto', padding: '0 24px 50px' }}>
        {CHAPTERS.map((ch, ci) => (
          <div key={ch.id}>
            {/* leg header — the counter + the months it covers */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '26px 0 14px' }}>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 4px' }}>
                Leg {ci + 1} / {CHAPTERS.length}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase', margin: 0 }}>
                {ch.label}
              </p>
            </div>
            {ch.stopIndices.map((i) => {
              const s = STOPS[i]
              return (
                <div key={s.id} style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                  {s.photo && (
                    <div style={{ padding: '18px 0 0' }}>
                      <img
                        src={`${BASE}${s.photo.src}`}
                        alt={s.photo.alt}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.currentTarget.parentElement.style.display = 'none' }}
                        style={{
                          width: '100%', aspectRatio: '16 / 9', objectFit: 'cover',
                          objectPosition: s.photo.position, filter: 'brightness(0.75)', display: 'block',
                        }}
                      />
                      {s.photo.credit && (
                        <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', margin: '8px 0 0' }}>
                          Photo · {s.photo.credit}
                        </p>
                      )}
                    </div>
                  )}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'baseline',
                      gap: 16,
                      padding: '18px 0',
                    }}
                  >
                    <div>
                      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '1px', fontVariantNumeric: 'tabular-nums', margin: '0 0 5px' }}>
                        {String(i + 1).padStart(2, '0')} / {STOPS.length}
                      </p>
                      <p style={{ color: '#fff', fontSize: 15, fontWeight: 600, margin: '0 0 2px' }}>{s.region}</p>
                      <p style={{ color: s.tier === 'key' ? 'rgb(0,180,255)' : 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: 500, margin: '0 0 4px' }}>{s.event}</p>
                      <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 400, margin: 0 }}>{formatVenues(s.venues)}</p>
                      {s.record && <RecordChip record={s.record} marginTop={10} />}
                    </div>
                    <span style={{ color: 'rgba(255,255,255,0.92)', fontSize: 15, fontWeight: 400, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{s.dates}</span>
                  </div>
                </div>
              )
            })}
          </div>
        ))}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }} />
      </div>

      <div style={{ ...entrance.style(3), textAlign: 'center', padding: '10px 20px 80px' }}>
        <p style={{
          color: 'rgba(255,255,255,0.55)', fontSize: 12.5, fontWeight: 600,
          letterSpacing: '2.4px', textTransform: 'uppercase', margin: '0 0 16px',
        }}>
          {TOUR_STATS.stops} stops <StatSep /> {TOUR_STATS.continents} continents <StatSep /> {TOUR_STATS.years} years
        </p>
        <h2 className="chrome-text" style={{ fontSize: 'clamp(40px, 7vw, 72px)', fontWeight: 800, letterSpacing: '-3px', margin: '0 0 8px' }}>
          LA 2028
        </h2>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 400, letterSpacing: '1px', margin: 0, fontVariantNumeric: 'tabular-nums' }}>
          <CountdownUnits days={days} hrs={hrs} mins={mins} secs={secs} />
        </p>
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
