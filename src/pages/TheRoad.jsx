import { useState, useEffect, useRef, useCallback, memo } from 'react'
import STOPS from '../data/campaignStops'
import CHAPTERS, { rollCall, formatVenues, TOUR_STATS } from '../data/tourChapters'
import createGlobeScene from '../lib/globeScene'
import { hasWebGL2 } from '../lib/webglSupport'
import Footer from '../components/Footer'
import SailboatIcon from '../components/SailboatIcon'
import ExitNav from '../components/ExitNav'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'
import useTextSpray from '../hooks/useTextSpray'
// Exit-banner cards — canonical definitions shared by every page's ExitNav.
import { EXIT_CARDS } from '../components/exitCards'

const BASE = import.meta.env.BASE_URL

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

// First stop of each chapter (season label position) + compact tick labels
// derived from the chapter date ranges: 'JAN–JUN 2027' → 'JAN ’27'.
const CH_FIRST_STOP = (() => {
  const m = []
  STOPS.forEach((s, i) => { if (m[s.chapter] == null) m[s.chapter] = i })
  return m
})()
const railTick = (label) => {
  const m = label.match(/^([A-Za-z]+).*(\d{2})$/)
  return m ? `${m[1]} ’${m[2]}` : label
}

// ---------- passage-plan course geometry (the tracker) ----------
// The route is drawn as a 5-tack beat: each chapter is one straight leg of a
// zigzag, so a tack corner = a chapter boundary. Marks sit on the line (key
// regattas = diamonds, camps = ticks); the sailboat rides it, heeling with
// the current tack. Everything is precomputed once at mount — the per-frame
// work is just xAt/yAt lookups off card.prog.
const COURSE_W = 170 // board width (labels/tooltips hang off the line)
const COURSE_AXIS = 70 // course centreline x within the board
const COURSE_AMP = 9 // tack amplitude (± px off the centreline)
const TRACKER_MOBILE_H = 48 // mobile waterline strip height (above safe-area)

function buildCourse({ pitch, gap, amp, axisX }) {
  const N = STOPS.length
  const H = N * pitch + (N_CHAPTERS - 1) * gap
  const sy = (i) => i * pitch + STOPS[i].chapter * gap + pitch / 2
  // tack vertices: the start (y=0), one corner per chapter boundary (mid-gap,
  // where the old rail put its tick labels), and the finish (y=H)
  const vy = [0]
  for (let c = 1; c < N_CHAPTERS; c++) vy.push(sy(CH_FIRST_STOP[c]) - (pitch + gap) / 2)
  vy.push(H)
  const vx = vy.map((_, k) => axisX + (k % 2 === 0 ? -amp : amp))
  const legOf = (y) => {
    let k = 0
    while (k < vy.length - 2 && vy[k + 1] < y) k++
    return k
  }
  const xAt = (y) => {
    const k = legOf(y)
    return vx[k] + ((vx[k + 1] - vx[k]) * (y - vy[k])) / (vy[k + 1] - vy[k])
  }
  // signed lean of each leg (deg); the boat's heel blends across ±6px of a
  // corner so the tack-over reads as a turn, not a snap
  const legHeel = []
  for (let k = 0; k < vy.length - 1; k++) {
    legHeel.push(Math.atan2(vx[k + 1] - vx[k], vy[k + 1] - vy[k]) * (180 / Math.PI))
  }
  const heelAt = (y) => {
    const k = legOf(y)
    const SMOOTH = 6
    if (k < vy.length - 2 && vy[k + 1] - y < SMOOTH) {
      const t = (1 - (vy[k + 1] - y) / SMOOTH) * 0.5
      return legHeel[k] + (legHeel[k + 1] - legHeel[k]) * t
    }
    if (k > 0 && y - vy[k] < SMOOTH) {
      const t = (1 - (y - vy[k]) / SMOOTH) * 0.5
      return legHeel[k] + (legHeel[k - 1] - legHeel[k]) * t
    }
    return legHeel[k]
  }
  const yAt = (prog) => {
    const p = clamp(prog, 0, N - 1)
    const lo = Math.floor(p)
    const hi = Math.min(lo + 1, N - 1)
    return sy(lo) + (sy(hi) - sy(lo)) * (p - lo)
  }
  const yToProg = (yPx) => {
    if (yPx <= sy(0)) return 0
    if (yPx >= sy(N - 1)) return N - 1
    let lo = 0
    while (lo < N - 2 && sy(lo + 1) < yPx) lo++
    return lo + (yPx - sy(lo)) / (sy(lo + 1) - sy(lo))
  }
  // cumulative polyline length at each vertex → wake fraction (analytic, no
  // getTotalLength): frac drives the solid wake's dasharray reveal
  const cum = [0]
  for (let k = 0; k < vy.length - 1; k++) {
    cum.push(cum[k] + Math.hypot(vy[k + 1] - vy[k], vx[k + 1] - vx[k]))
  }
  const totalLen = cum[cum.length - 1]
  const fracAt = (y) => {
    const k = legOf(y)
    return (cum[k] + Math.hypot(y - vy[k], xAt(y) - vx[k])) / totalLen
  }
  const pathD = vy.map((y, k) => `${k === 0 ? 'M' : 'L'}${vx[k].toFixed(1)} ${y.toFixed(1)}`).join(' ')
  return { N, H, sy, vx, vy, xAt, yAt, heelAt, yToProg, fracAt, pathD }
}

// Mobile waterline strip: same stop map flattened to a horizontal line with
// small chapter gaps. Built once at mount from the viewport width.
function buildStrip(width) {
  const N = STOPS.length
  const gap = 8
  const pitch = (width - (N_CHAPTERS - 1) * gap) / (N - 1)
  const sx = (i) => i * pitch + STOPS[i].chapter * gap
  const xAt = (prog) => {
    const p = clamp(prog, 0, N - 1)
    const lo = Math.floor(p)
    const hi = Math.min(lo + 1, N - 1)
    return sx(lo) + (sx(hi) - sx(lo)) * (p - lo)
  }
  const xToProg = (xPx) => {
    if (xPx <= sx(0)) return 0
    if (xPx >= sx(N - 1)) return N - 1
    let lo = 0
    while (lo < N - 2 && sx(lo + 1) < xPx) lo++
    return lo + (xPx - sx(lo)) / (sx(lo + 1) - sx(lo))
  }
  return { N, width, sx, xAt, xToProg }
}

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
// computed once at module load — no ticking; the finale countdown owns live time
const DAYS_TO_GAMES = Math.max(0, Math.ceil((new Date('2028-07-14T00:00:00') - Date.now()) / 864e5))

// Scroll offset (px) for a fractional stop — shared by the desktop boat drag,
// the mobile strip drag/tap, and keyboard stepping. The last stop maps to the
// finale climax (top of the end block), like its mark does.
function progToScrollY(prog) {
  const N = STOPS.length
  const stopVh = (i) => (i >= N - 1 ? TOTAL_VH / 100 : STOP_Y[i])
  const p = clamp(prog, 0, N - 1)
  const lo = Math.floor(p)
  const hi = Math.min(lo + 1, N - 1)
  return (stopVh(lo) + (stopVh(hi) - stopVh(lo)) * (p - lo)) * window.innerHeight
}
function flyToStop(tour, i) {
  if (!tour) return
  const y = i >= STOPS.length - 1 ? (TOTAL_VH / 100) * window.innerHeight : STOP_Y[i] * window.innerHeight
  tour.toY(y)
}

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
    mode: 'hero', chIdx: -1, chT: 0,
  })
  const [finaleT, setFinaleT] = useState(0)
  const [heroDone, setHeroDone] = useState(false)
  const [isMobile] = useState(() => window.innerWidth < 700)
  const [playing, setPlaying] = useState(false)
  const [docked, setDocked] = useState(false) // "Back to Biography" docks to the top once scrolled past the nav
  // Course geometry, built once at mount (compact vertical pitch on short
  // windows; the strip spans the phone width). Resize mid-session is unhandled
  // by design — same precedent as the mount-time isMobile.
  const [courseGeom] = useState(() => {
    const compact = window.innerHeight < 760
    return buildCourse({
      pitch: compact ? 22 : 26,
      gap: compact ? 14 : 18,
      amp: COURSE_AMP,
      axisX: COURSE_AXIS,
    })
  })
  const [stripGeom] = useState(() => buildStrip(window.innerWidth - 32))
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

  useEffect(() => {
    let scene
    try {
      scene = createGlobeScene(canvasRef.current, FRAMES, {
        isMobile: window.innerWidth < 700,
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
      if (tourRef.current) tourRef.current.dispose()
    }
  }, [])

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
          prev.chT === p.chapterCardT
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
                chT: p.chapterCardT,
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

  // The displayed stop + which of its waypoints the globe is at (multi-city
  // stops tick their POSITION field per hop). Frames are contiguous per stop,
  // so the active waypoint is just labelKey relative to the stop's first frame.
  const dStop = STOPS[Math.min(card.stopIndex, STOPS.length - 1)]
  const wpIdx = dStop.points
    ? clamp(card.labelKey - STOP_FRAME[Math.min(card.stopIndex, STOPS.length - 1)], 0, dStop.points.length - 1)
    : 0
  const currentStop = isMobile ? card.stopIndex : Math.round(card.prog)
  // the chapter interstitial + recap own the screen — tracker/card/controls yield
  const interlude = card.mode === 'chapter' || card.mode === 'recap'
  const reelVisible = heroDone && finaleT < 0.05 && !interlude
  const railVisible = heroDone && finaleT === 0 && !interlude

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

      <Hero visible={!heroDone} seamless={seamless} />

      {/* half-year chapter interstitial — every element a pure function of
          scroll (chT), so scrubbing back plays the entrance in reverse */}
      {card.chIdx >= 0 && <ChapterCard chapterIdx={card.chIdx} t={card.chT} isMobile={isMobile} />}

      {/* "Back to Biography" — only when arriving from the Biography page. Sits below
          the nav at the top, docks up with a little padding once scrolled, and fades
          out at the finale so the LA 2028 headline arrives on a clean top edge. */}
      {fromBiography && <BackButton onNavigate={onNavigate} docked={docked} finaleT={finaleT} />}

      {/* passage plan (desktop) — the tacking course line: click a mark to fly
          there, drag the boat to scrub, arrows/Home/End step the stops. */}
      {!isMobile && (
        <CourseBoard
          geom={courseGeom}
          prog={card.prog}
          current={currentStop}
          visible={railVisible}
          tour={tourRef.current}
        />
      )}

      {/* desktop: the stop panel — one Chart Datum display at a time; the
          arrival/departure envelope (card.opacity) is scrub-pure, so the inner
          node carries NO CSS transition, only the wrapper's visibility fade */}
      {!isMobile && (
        <div
          data-testid="stop-panel"
          style={{
            position: 'fixed',
            right: '7vw',
            top: '50%',
            transform: 'translateY(-50%)',
            width: NARROW_DESKTOP ? 'min(400px, 38vw)' : 'min(480px, 42vw)',
            zIndex: 1,
            opacity: reelVisible ? 1 : 0,
            transition: 'opacity 0.45s ease',
            pointerEvents: 'none',
          }}
        >
          <div
            data-testid="stop-card"
            style={{
              opacity: card.opacity,
              transform: `translateY(${(1 - card.opacity) * 14}px)`,
            }}
          >
            <StopDisplay stop={dStop} index={card.stopIndex} waypointIdx={wpIdx} variant="desktop" />
          </div>
        </div>
      )}

      {/* desktop: tour controls sit at the bottom-right, left-aligned to the
          stop panel's column */}
      {!isMobile && (
        <div style={{
          position: 'fixed', right: '7vw', bottom: 40, width: NARROW_DESKTOP ? 'min(400px, 38vw)' : 'min(480px, 42vw)', zIndex: 4,
          opacity: reelVisible ? 1 : 0, transition: 'opacity 0.45s ease',
          pointerEvents: reelVisible ? 'auto' : 'none',
        }}>
          <TourControls tour={tourRef.current} playing={playing} />
        </div>
      )}

      {/* mobile: the single stop card, with the tour controls directly BELOW it
          (the whole stack clears the waterline strip at the bottom edge) */}
      {isMobile && (
        <div style={{
          position: 'fixed', left: 20, right: 20,
          // clear the waterline strip AND the notch safe-area (the strip adds
          // the same inset, so the card must too or it overlaps on notched phones)
          bottom: `calc(${TRACKER_MOBILE_H + 30}px + env(safe-area-inset-bottom))`,
          zIndex: 3,
        }}>
          <div
            data-testid="stop-card"
            style={{
              opacity: card.opacity,
              transform: `translateY(${(1 - card.opacity) * 10}px)`,
              pointerEvents: 'none',
            }}
          >
            <StopDisplay stop={dStop} index={card.stopIndex} waypointIdx={wpIdx} variant="mobile" />
          </div>
          {/* controls sit just below the displayed stop */}
          <div style={{
            marginTop: 16, display: 'flex', justifyContent: 'center',
            opacity: reelVisible ? 1 : 0, transition: 'opacity 0.45s ease',
            pointerEvents: reelVisible ? 'auto' : 'none',
          }}>
            <TourControls tour={tourRef.current} playing={playing} />
          </div>
        </div>
      )}

      {/* mobile: the waterline strip — the tracker the phone never had. Tap to
          fly to the nearest stop; a sideways drag scrubs (vertical swipes still
          scroll the page). */}
      {isMobile && (
        <CourseStrip
          geom={stripGeom}
          prog={card.prog}
          current={currentStop}
          visible={railVisible}
          tour={tourRef.current}
        />
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

// ---------- Chart Datum stop display ----------
// One stop on screen at a time, as an instrument readout: a hairline "datum
// line" carries the stop index, labeled fields hang beneath it. Key regattas
// arrive cinematic (cyan kicker, huge region hero, full field grid, result
// chip); training camps read as quiet logbook entries (WHEN + POSITION only).
// No prose, no in-card photos — the full-bleed backdrop is the photo layer.

// Decimal degrees → nautical degrees + minutes: 53.2956,-6.1306 → 53°18′N 6°08′W
function fmtPosition(lat, lng) {
  const part = (v, pos, neg) => {
    const hemi = v >= 0 ? pos : neg
    const a = Math.abs(v)
    let d = Math.floor(a)
    let m = Math.round((a - d) * 60)
    if (m === 60) { d += 1; m = 0 }
    return `${d}°${String(m).padStart(2, '0')}′${hemi}`
  }
  return `${part(lat, 'N', 'S')} ${part(lng, 'E', 'W')}`
}

const STATUS_LABEL = { confirmed: 'Confirmed', projected: 'Projected', training: 'Training', finale: 'Confirmed' }

// label-over-value instrument field
function Field({ label, size = 15, children }) {
  return (
    <div>
      <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 9.5, fontWeight: 600, letterSpacing: '1.8px', textTransform: 'uppercase', margin: '0 0 5px' }}>
        {label}
      </p>
      <p style={{ color: '#fff', fontSize: size, fontWeight: 600, letterSpacing: '0.2px', fontVariantNumeric: 'tabular-nums', textTransform: 'uppercase', margin: 0 }}>
        {children}
      </p>
    </div>
  )
}

// the signature device: stop index + hairline rule
function DatumLine({ index }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '0 0 16px' }}>
      <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: 600, letterSpacing: '1px', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
        {String(index + 1).padStart(2, '0')} / {STOPS.length}
      </span>
      <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.18)' }} />
    </div>
  )
}

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

// multi-city stops: the waypoint chain; the active city pops as the dot lands
function WaypointChain({ points, activeIdx, marginBottom = 14 }) {
  return (
    <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: 1.8, margin: `0 0 ${marginBottom}px` }}>
      {points.map((pt, i) => (
        <span key={pt.label}>
          {i > 0 && <span style={{ color: 'rgba(255,255,255,0.3)' }}>{' · '}</span>}
          <span
            key={`${pt.label}-${i === activeIdx}`}
            className={i === activeIdx ? 'cs-pop' : undefined}
            style={{
              display: 'inline-block',
              color: i === activeIdx ? '#fff' : 'rgba(255,255,255,0.4)',
              fontWeight: i === activeIdx ? 700 : 600,
            }}
          >
            {pt.label}
          </span>
        </span>
      ))}
    </p>
  )
}

// Narrow-desktop gate (mount-time, like isMobile): below this the dollied
// globe's limb reaches under the panel, so the key hero caps smaller and the
// panel narrows to keep text on dark space.
const NARROW_DESKTOP = typeof window !== 'undefined' && window.innerWidth < 1160

function StopDisplay({ stop, index, waypointIdx, variant }) {
  const isKey = stop.tier === 'key'
  const mobile = variant === 'mobile'
  // POSITION reads the active waypoint on multi-city stops — the coordinates
  // tick over per hop, chart-plotter style
  const at = stop.points ? stop.points[clamp(waypointIdx, 0, stop.points.length - 1)] : stop
  const position = (
    <span
      key={stop.points ? `${index}-${waypointIdx}` : index}
      className={stop.points ? 'cs-pop' : undefined}
      style={{ display: 'inline-block' }}
    >
      {fmtPosition(at.lat, at.lng)}
    </span>
  )
  const fieldSize = mobile || !isKey ? 12.5 : 15

  return (
    <div style={{ maxWidth: !mobile && !isKey ? 320 : undefined }}>
      <p
        style={{
          color: isKey ? 'rgb(0,180,255)' : 'rgba(255,255,255,0.45)',
          fontSize: isKey ? (mobile ? 10.5 : 12) : 10.5,
          fontWeight: isKey ? 700 : 600,
          letterSpacing: isKey ? '2.2px' : '2px',
          textTransform: 'uppercase',
          margin: isKey ? '0 0 14px' : '0 0 10px',
        }}
      >
        {stop.event}
      </p>
      <h2
        style={{
          color: '#fff',
          fontSize: isKey ? (mobile ? 28 : NARROW_DESKTOP ? 36 : 'clamp(40px, 4.6vw, 64px)') : mobile ? 19 : 22,
          fontWeight: isKey ? 800 : 700,
          letterSpacing: isKey ? '-2px' : '-0.4px',
          lineHeight: 0.98,
          margin: isKey ? (mobile ? '0 0 16px' : '0 0 26px') : '0 0 14px',
        }}
      >
        {stop.region}
      </h2>
      {!isKey && stop.points && <WaypointChain points={stop.points} activeIdx={waypointIdx} />}
      <DatumLine index={index} />
      {isKey && !mobile ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 28px' }}>
          <Field label="When" size={fieldSize}>{stop.dates}</Field>
          <Field label="Venue" size={fieldSize}>{formatVenues(stop.venues)}</Field>
          <Field label="Position" size={fieldSize}>{position}</Field>
          <Field label="Status" size={fieldSize}>{STATUS_LABEL[stop.status]}</Field>
        </div>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 26px' }}>
          <Field label="When" size={fieldSize}>{stop.dates}</Field>
          <Field label="Position" size={fieldSize}>{position}</Field>
          {isKey && <Field label="Status" size={fieldSize}>{STATUS_LABEL[stop.status]}</Field>}
        </div>
      )}
      <RecordChip record={stop.record} marginTop={mobile ? 14 : 20} />
    </div>
  )
}

// Full-screen half-year interstitial. Rendered only during a 'chapter' segment;
// every element's entrance/exit is a pure function of chapterT (no CSS
// transitions), so a reverse scrub reassembles it exactly. Sits over the globe
// while the chapter's pins constellate in behind the text.
function ChapterCard({ chapterIdx, t, isMobile }) {
  const ch = CHAPTERS[chapterIdx]
  if (!ch) return null
  const gone = smoothstep(0.82, 0.97, t) // exit: fade + drift up
  const el = (a, b) => {
    const e = smoothstep(a, b, t)
    return { opacity: e * (1 - gone), transform: `translateY(${(1 - e) * 22 - gone * 16}px)` }
  }
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '0 24px',
        pointerEvents: 'none',
      }}
    >
      <p style={{ ...el(0.1, 0.26), color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '1.6px', textTransform: 'uppercase', margin: '0 0 16px' }}>
        Leg {chapterIdx + 1} · {ch.label}
      </p>
      <h2
        className={ch.chrome ? 'chrome-text' : undefined}
        style={{
          ...el(0.14, 0.3),
          color: ch.chrome ? undefined : '#fff',
          fontSize: 'clamp(34px, 5.5vw, 64px)',
          fontWeight: 800,
          letterSpacing: '-2px',
          lineHeight: 1.02,
          margin: '0 0 12px',
        }}
      >
        {ch.title}
      </h2>
      <p style={{ ...el(0.18, 0.34), color: 'rgba(255,255,255,0.75)', fontSize: 'clamp(15px, 1.8vw, 19px)', fontWeight: 500, letterSpacing: '-0.2px', margin: '0 0 22px', maxWidth: 560 }}>
        {ch.subtitle}
      </p>
      {/* roll-call: name-checked regattas as name + dim place, camps counted —
          typography does the joining (no dashes anywhere) */}
      {rollCall(ch).length > 0 && (
        <p style={{ ...el(0.22, 0.38), fontSize: isMobile ? 13 : 13.5, lineHeight: 1.7, letterSpacing: '0.2px', maxWidth: 640, margin: 0 }}>
          {rollCall(ch).map((seg, i) => (
            <span key={i}>
              {i > 0 && <span style={{ color: 'rgba(255,255,255,0.35)' }}>{' · '}</span>}
              <span style={{ color: seg.em ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: seg.em ? 600 : 400 }}>{seg.name}</span>
              {seg.place && (
                <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}> {seg.place}</span>
              )}
            </span>
          ))}
        </p>
      )}
    </div>
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

// ---------- passage plan (the tracker) ----------

// shared sharp-cornered tooltip/HUD box
const HUD_BOX = {
  background: 'rgba(0,0,0,0.85)',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 0,
  padding: '7px 10px',
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
  textAlign: 'left',
}

// One chart mark on the course: key regattas are diamonds (course marks),
// camps are ticks perpendicular to their tack. Click flies the globe there.
// `onSelect` is a STABLE callback + `index` a primitive, so the memo actually
// bails for the ~16 marks whose active/done don't change on a stop crossing
// (a fresh inline onClick closure would defeat memo entirely).
const CourseMark = memo(function CourseMark({ index, x, y, heel, isKey, active, done, name, event, dates, onSelect }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={() => onSelect(index)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={name}
      style={{
        position: 'absolute', left: x, top: y,
        transform: 'translate(-50%, -50%)',
        background: 'none', border: 'none', margin: 0,
        padding: 12, // invisible hit area → easy to click
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      {isKey ? (
        <span
          style={{
            display: 'block', width: 8, height: 8,
            transform: `rotate(45deg) scale(${hover ? 1.35 : 1})`,
            background: active ? '#1E40FF' : done ? 'rgba(255,255,255,0.55)' : 'transparent',
            border: active || done ? 'none' : '1px solid rgba(255,255,255,0.5)',
            boxShadow: active ? '0 0 0 4px rgba(30,64,255,0.22), 0 0 12px rgba(0,80,255,0.6)' : 'none',
            transition: 'transform 0.2s ease, background 0.3s ease, box-shadow 0.2s ease',
          }}
        />
      ) : (
        <span
          style={{
            display: 'block', width: 7, height: active ? 2 : 1.5,
            transform: `rotate(${heel}deg) scale(${hover ? 1.35 : 1})`,
            background: active ? '#1E40FF' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)',
            transition: 'transform 0.2s ease, background 0.3s ease',
          }}
        />
      )}
      {hover && (
        <span
          style={{
            ...HUD_BOX,
            position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)',
            borderLeft: isKey ? '2px solid rgb(0,80,255)' : HUD_BOX.border,
          }}
        >
          <span style={{ display: 'block', color: '#fff', fontSize: 12, fontWeight: 600 }}>{name}</span>
          <span style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 10.5, marginTop: 2 }}>
            {event} · {dates}
          </span>
        </span>
      )}
    </button>
  )
})

// readout row: label left, numeral right
function ReadoutRow({ label, value, cyan }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 6 }}>
      <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: 600, letterSpacing: '1.6px', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ color: cyan ? 'rgb(0,180,255)' : '#fff', fontSize: 11, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  )
}

// Desktop tracker: the tacking course. Sailed track = solid blue wake; route
// ahead = dashed hairline (chart-plotter notation). One cyan pennant flies on
// the next key regatta ahead of the boat. Below: the distance-made-good block.
function CourseBoard({ geom, prog, current, visible, tour }) {
  const boardRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const draggingRef = useRef(false)

  const boatY = geom.yAt(prog)
  const boat = { x: geom.xAt(boatY), y: boatY, heel: geom.heelAt(boatY) }
  const frac = geom.fracAt(boatY)
  const nm = nmToLA(prog)
  const nearLA = prog > geom.N - 2
  // first key regatta strictly ahead of the boat — the "next major" pennant
  const nextKey = STOPS.findIndex((s, i) => s.tier === 'key' && i > prog)
  const scrubStop = STOPS[clamp(Math.round(prog), 0, geom.N - 1)]
  // stable per-render — keeps CourseMark's memo effective (tour is a ref value)
  const onMarkSelect = useCallback((i) => flyToStop(tour, i), [tour])

  const scrub = (clientY) => {
    const el = boardRef.current
    if (!el) return
    window.scrollTo(0, progToScrollY(geom.yToProg(clientY - el.getBoundingClientRect().top)))
  }

  return (
    <div
      ref={boardRef}
      style={{
        position: 'fixed',
        left: 22,
        top: '50%',
        transform: `translate(${visible ? 0 : -10}px, -50%)`,
        width: COURSE_W,
        height: geom.H + 86,
        zIndex: 4,
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <svg width={COURSE_W} height={geom.H} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id="wakeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(18,0,120)" />
            <stop offset="100%" stopColor="rgb(0,80,255)" />
          </linearGradient>
        </defs>
        {/* route ahead: dashed hairline */}
        <path d={geom.pathD} fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="2 5" />
        {/* sailed track: solid glowing wake, revealed to the boat's position */}
        <path
          d={geom.pathD}
          fill="none"
          stroke="url(#wakeGrad)"
          strokeWidth="2"
          pathLength="1000"
          strokeDasharray={`${frac * 1000} 1000`}
          style={{ filter: 'drop-shadow(0 0 6px rgba(0,80,255,0.45))' }}
        />
        {/* finish line: two strokes across the final approach */}
        {[14, 9].map((dy) => {
          const fy = geom.sy(geom.N - 1) - dy
          const fx = geom.xAt(fy)
          return <line key={dy} x1={fx - 7} y1={fy} x2={fx + 7} y2={fy} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
        })}
      </svg>

      {/* season labels at the tack corners (outside of each corner) */}
      {CHAPTERS.map((ch, k) => {
        const onLeft = k % 2 === 0
        return (
          <span
            key={ch.id}
            style={{
              position: 'absolute',
              top: geom.vy[k],
              ...(onLeft
                ? { right: COURSE_W - (geom.vx[k] - 10) }
                : { left: geom.vx[k] + 10 }),
              transform: 'translateY(-50%)',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '1.2px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
            }}
          >
            {railTick(ch.label)}
          </span>
        )
      })}

      {/* chart marks */}
      {STOPS.map((s, i) => {
        const y = geom.sy(i)
        return (
          <CourseMark
            key={s.id}
            index={i}
            x={geom.xAt(y)}
            y={y}
            heel={geom.heelAt(y)}
            isKey={s.tier === 'key'}
            active={i === current}
            done={i < current}
            name={s.region}
            event={s.event}
            dates={s.dates}
            onSelect={onMarkSelect}
          />
        )
      })}

      {/* the next-major pennant */}
      {nextKey >= 0 && (
        <svg
          width="14"
          height="13"
          aria-hidden="true"
          style={{ position: 'absolute', left: geom.xAt(geom.sy(nextKey)) + 8, top: geom.sy(nextKey) - 14, pointerEvents: 'none' }}
        >
          <line x1="1" y1="1" x2="1" y2="13" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          <path d="M2 1 L11 3.5 L2 6 Z" fill="rgba(0,180,255,0.9)" />
        </svg>
      )}

      {/* LA ’28 at the finish */}
      <span
        style={{
          position: 'absolute',
          left: geom.xAt(geom.sy(geom.N - 1)) + 12,
          top: geom.sy(geom.N - 1),
          transform: 'translateY(-50%)',
          color: nearLA ? 'rgb(0,180,255)' : 'rgba(255,255,255,0.5)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: '1.6px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          transition: 'color 0.3s ease',
        }}
      >
        LA ’28
      </span>

      {/* the boat = you; heels with the tack, drag to scrub, arrows to step */}
      <div
        role="slider"
        tabIndex={0}
        aria-label="Drag to move through the stops"
        aria-valuemin={1}
        aria-valuemax={geom.N}
        aria-valuenow={clamp(Math.round(prog), 0, geom.N - 1) + 1}
        aria-valuetext={`Stop ${clamp(Math.round(prog), 0, geom.N - 1) + 1} of ${geom.N}: ${scrubStop.region}, ${scrubStop.dates}`}
        onPointerDown={(e) => {
          e.preventDefault()
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
          // preventDefault above suppresses the browser's focus-on-pointerdown,
          // so focus explicitly — the Arrow/Home/End stepping needs it after a grab
          try { e.currentTarget.focus({ preventScroll: true }) } catch { /* ignore */ }
          draggingRef.current = true
          setDragging(true)
          if (tour) tour.stop()
          scrub(e.clientY)
        }}
        onPointerMove={(e) => { if (draggingRef.current) scrub(e.clientY) }}
        onPointerUp={(e) => {
          draggingRef.current = false
          setDragging(false)
          try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
        }}
        onPointerCancel={() => { draggingRef.current = false; setDragging(false) }}
        onKeyDown={(e) => {
          // stopPropagation: the fly tween's own cancel hook listens for these
          // keys on window — without it the triggering keypress bubbles up and
          // halts the tween it just started
          const cur = clamp(Math.round(prog), 0, geom.N - 1)
          if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); flyToStop(tour, Math.min(cur + 1, geom.N - 1)) }
          else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); flyToStop(tour, Math.max(cur - 1, 0)) }
          else if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); if (tour) tour.toStart() }
          else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); if (tour) tour.toEnd() }
        }}
        style={{
          position: 'absolute',
          left: boat.x,
          top: boat.y,
          transform: `translate(-50%, -58%) rotate(${boat.heel}deg) scale(${dragging ? 1.15 : 1})`,
          transition: dragging ? 'none' : 'top 0.1s linear, left 0.1s linear, transform 0.15s ease',
          cursor: dragging ? 'grabbing' : 'grab',
          touchAction: 'none',
          zIndex: 5,
          willChange: 'transform',
        }}
      >
        <SailboatIcon variant="active" size={20} />
      </div>

      {/* scrub HUD: where you are + distance run, live under the drag */}
      {dragging && (
        <div
          style={{
            ...HUD_BOX,
            position: 'absolute',
            left: COURSE_AXIS + COURSE_AMP + 18,
            top: boat.y,
            transform: 'translateY(-50%)',
            zIndex: 6,
          }}
        >
          <span style={{ display: 'block', color: '#fff', fontSize: 12, fontWeight: 600 }}>{scrubStop.region}</span>
          <span style={{ display: 'block', color: 'rgba(255,255,255,0.55)', fontSize: 10.5, marginTop: 2 }}>{scrubStop.dates}</span>
          <span style={{ display: 'block', color: 'rgb(0,180,255)', fontSize: 10.5, fontWeight: 700, fontVariantNumeric: 'tabular-nums', marginTop: 2 }}>
            {fmtNM(nm)} NM TO LA
          </span>
        </div>
      )}

      {/* distance made good */}
      <div style={{ position: 'absolute', left: 8, right: 8, top: geom.H + 14, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 6 }}>
        <ReadoutRow label="Stop" value={`${String(clamp(Math.round(prog), 0, geom.N - 1) + 1).padStart(2, '0')} / ${geom.N}`} />
        <ReadoutRow label="NM to LA" value={fmtNM(nm)} cyan={nearLA} />
        <ReadoutRow label="Days" value={String(DAYS_TO_GAMES)} />
      </div>
    </div>
  )
}

// Mobile tracker: the waterline strip along the bottom edge. The line doubles
// as the water: solid wake behind the boat, dashed route ahead. Tap flies to
// the nearest stop; a sideways drag scrubs (vertical swipes scroll the page).
function CourseStrip({ geom, prog, current, visible, tour }) {
  const stripRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const gestureRef = useRef(null) // { id, x0, y0, t0, dragging }

  const boatX = geom.xAt(prog)
  const nm = nmToLA(prog)
  const nearLA = prog > geom.N - 2
  const scrubStop = STOPS[clamp(Math.round(prog), 0, geom.N - 1)]
  // waterline y within the strip: 5px padding + ~11px kicker row + 8px svg
  // margin + the line at y=10 inside the svg
  const LINE_Y = 34

  const scrub = (clientX) => {
    const el = stripRef.current
    if (!el) return
    const x = clientX - el.getBoundingClientRect().left - 16
    window.scrollTo(0, progToScrollY(geom.xToProg(x)))
  }

  return (
    <div
      ref={stripRef}
      role="slider"
      tabIndex={0}
      aria-label="Tour progress. Tap to fly to a stop, drag sideways to scrub."
      aria-valuemin={1}
      aria-valuemax={geom.N}
      aria-valuenow={clamp(Math.round(prog), 0, geom.N - 1) + 1}
      aria-valuetext={`Stop ${clamp(Math.round(prog), 0, geom.N - 1) + 1} of ${geom.N}: ${scrubStop.region}, ${scrubStop.dates}`}
      onPointerDown={(e) => {
        // ignore a second finger while one is already scrubbing — otherwise it
        // orphans the active drag and its own lift could fly to a stray stop
        if (gestureRef.current && gestureRef.current.dragging) return
        gestureRef.current = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), dragging: false }
      }}
      onPointerMove={(e) => {
        const g = gestureRef.current
        if (!g || g.id !== e.pointerId) return
        if (!g.dragging) {
          const dx = e.clientX - g.x0
          const dy = e.clientY - g.y0
          // capture only on clear horizontal intent — vertical stays native scroll
          if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) {
            g.dragging = true
            setDragging(true)
            try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* ignore */ }
            if (tour) tour.stop()
          }
        }
        if (g.dragging) scrub(e.clientX)
      }}
      onPointerUp={(e) => {
        const g = gestureRef.current
        gestureRef.current = null
        setDragging(false)
        if (!g || g.id !== e.pointerId) return
        try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* ignore */ }
        const moved = Math.hypot(e.clientX - g.x0, e.clientY - g.y0)
        if (!g.dragging && moved < 8 && performance.now() - g.t0 < 300) {
          // tap → fly to the nearest stop
          const el = stripRef.current
          if (!el) return
          if (tour) tour.stop()
          const x = e.clientX - el.getBoundingClientRect().left - 16
          flyToStop(tour, clamp(Math.round(geom.xToProg(x)), 0, geom.N - 1))
        }
      }}
      onPointerCancel={() => { gestureRef.current = null; setDragging(false) }}
      onKeyDown={(e) => {
        // stopPropagation: see CourseBoard — don't let the triggering keypress
        // cancel the fly tween it starts
        const cur = clamp(Math.round(prog), 0, geom.N - 1)
        if (e.key === 'ArrowRight') { e.preventDefault(); e.stopPropagation(); flyToStop(tour, Math.min(cur + 1, geom.N - 1)) }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); e.stopPropagation(); flyToStop(tour, Math.max(cur - 1, 0)) }
        else if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); if (tour) tour.toStart() }
        else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); if (tour) tour.toEnd() }
      }}
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        height: `calc(${TRACKER_MOBILE_H}px + env(safe-area-inset-bottom))`,
        padding: '5px 16px 0',
        background: 'linear-gradient(to top, rgba(0,0,0,0.92) 60%, rgba(0,0,0,0))',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        zIndex: 4,
        opacity: visible ? 1 : 0,
        transform: `translateY(${visible ? 0 : 10}px)`,
        transition: 'opacity 0.5s cubic-bezier(0.2, 0.7, 0.2, 1), transform 0.5s cubic-bezier(0.2, 0.7, 0.2, 1)',
        pointerEvents: visible ? 'auto' : 'none',
        touchAction: 'pan-y',
      }}
    >
      {/* kicker row: where you are · how far to LA */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
          {dragging
            ? `${String(clamp(Math.round(prog), 0, geom.N - 1) + 1).padStart(2, '0')}/${geom.N} · ${scrubStop.region}`
            : `Stop ${String(clamp(Math.round(prog), 0, geom.N - 1) + 1).padStart(2, '0')}/${geom.N}`}
        </span>
        <span style={{ color: nearLA ? 'rgb(0,180,255)' : 'rgba(255,255,255,0.55)', fontSize: 9, fontWeight: 600, letterSpacing: '1.2px', textTransform: 'uppercase', fontVariantNumeric: 'tabular-nums' }}>
          {fmtNM(nm)} NM to LA
        </span>
      </div>

      <svg width={geom.width} height={20} style={{ display: 'block', marginTop: 8, overflow: 'visible' }} aria-hidden="true">
        <defs>
          <linearGradient id="stripWakeGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgb(18,0,120)" />
            <stop offset="100%" stopColor="rgb(0,80,255)" />
          </linearGradient>
        </defs>
        {/* route ahead + sailed wake on the waterline */}
        <line x1={boatX} y1={10} x2={geom.width} y2={10} stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" strokeDasharray="2 5" />
        <line
          x1={0}
          y1={10}
          x2={boatX}
          y2={10}
          stroke="url(#stripWakeGrad)"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,80,255,0.45))' }}
        />
        {/* marks: diamonds for majors, ticks for camps */}
        {STOPS.map((s, i) => {
          const x = geom.sx(i)
          const active = i === current
          const done = i < current
          if (s.tier === 'key') {
            const la = i === geom.N - 1
            return (
              <rect
                key={s.id}
                x={-3}
                y={-3}
                width={6}
                height={6}
                transform={`translate(${x} 10) rotate(45)`}
                fill={active ? '#1E40FF' : done ? 'rgba(255,255,255,0.55)' : la && nearLA ? 'rgb(0,180,255)' : 'rgba(0,0,0,1)'}
                stroke={active || done ? 'none' : la && nearLA ? 'rgb(0,180,255)' : 'rgba(255,255,255,0.5)'}
                strokeWidth="1"
              />
            )
          }
          return (
            <line
              key={s.id}
              x1={x}
              y1={6.5}
              x2={x}
              y2={13.5}
              stroke={active ? '#1E40FF' : done ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.35)'}
              strokeWidth={active ? 2 : 1.5}
            />
          )
        })}
      </svg>

      {/* the boat sits ON the waterline */}
      <div
        style={{
          position: 'absolute',
          left: 16 + boatX,
          top: LINE_Y,
          transform: `translate(-50%, -88%) scale(${dragging ? 1.15 : 1})`,
          transition: dragging ? 'none' : 'left 0.1s linear, transform 0.15s ease',
          pointerEvents: 'none',
          willChange: 'transform',
        }}
      >
        <SailboatIcon variant="active" size={16} />
      </div>
    </div>
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

function Hero({ visible, seamless }) {
  // After a seamless morph, hold the hero text back so it fades in LAST — after
  // the overlay has dissolved to the globe and the pins have faded in.
  const entrance = usePageEntrance(2, { staggerMs: 150, initialDelayMs: seamless ? 1450 : 200 })
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.6s ease',
        pointerEvents: 'none',
        padding: '0 20px',
      }}
    >
      <h1 style={{ ...entrance.style(0), color: '#fff', fontSize: 'clamp(40px, 7vw, 88px)', fontWeight: 800, letterSpacing: '-3px', margin: 0 }}>
        The Road to LA 2028
      </h1>
      {/* scroll cue — micro-caps kicker, the lone title carries the moment */}
      <div style={{ ...entrance.style(1), marginTop: 34 }}>
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

// Positionless control row ("to the start • play • to the end"). Placement +
// visibility are handled by the wrapper — under the rail on desktop, under the
// stop card on mobile.
function TourControls({ tour, playing }) {
  const [hover, setHover] = useState(null)
  if (!tour) return null
  const btn = (id, label, onClick) => (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(id)}
      onMouseLeave={() => setHover(null)}
      style={{
        background: hover === id ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.4)',
        borderRadius: 3,
        color: '#fff', cursor: 'pointer', padding: '9px 16px',
        fontSize: 15, fontWeight: 600, letterSpacing: '0.3px', fontFamily: 'inherit',
        transition: 'background 0.2s ease, border-color 0.2s ease',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  )
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {btn('start', 'Start', tour.toStart)}
      {btn('play', playing ? 'Pause' : 'Play', tour.toggle)}
      {btn('end', 'Finish', tour.toEnd)}
    </div>
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
            {/* leg header — the same half-year story the globe tour tells */}
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)', padding: '26px 0 14px' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, fontWeight: 600, letterSpacing: '1.6px', textTransform: 'uppercase', margin: '0 0 8px' }}>
                Leg {ci + 1} · {ch.label}
              </p>
              <h2
                className={ch.chrome ? 'chrome-text' : undefined}
                style={{ color: ch.chrome ? undefined : '#fff', fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px', margin: '0 0 6px' }}
              >
                {ch.title}
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 500, margin: 0 }}>
                {ch.subtitle}
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
