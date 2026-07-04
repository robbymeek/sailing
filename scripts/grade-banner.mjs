// ============================================================================
//  grade-banner.mjs — per-clip colour fix + global grade for the sailing banner.
// ============================================================================
//  The iMovie master mixes clips shot on different days; the recurring 211414
//  "tack anchor" footage (overcast Long Beach) is objectively grey — SATAVG
//  ~3-7 where every other clip runs ~13-27. This script measures the master
//  frame-by-frame, finds the sustained grey windows, and prepends timeline-
//  enabled corrective filters to encode-trailer.mjs's global cool grade.
//  ONE encode pass — no segment/concat, no intermediates, the edit untouched
//  (build-action.mjs needed segments only because it re-timed clips).
//
//  Usage:  node scripts/grade-banner.mjs "/abs/path/MASTER.mp4"
//          DRY_RUN=1 node scripts/grade-banner.mjs …   → print windows + filter, no encode
//
//  Why the pieces are the way they are (validated frame-by-frame, ffmpeg 8.1):
//   * vibrance + colorbalance + curves ONLY inside the fix — all three process
//     gbrp10le natively. eq/hue would silently collapse the chain to 8-bit
//     yuv444p BEFORE the global grade, exactly where flat grey water bands
//     worst (the 10-bit intermediate exists to prevent that).
//   * the grey anchor is deliberately left a touch moodier than the sunny
//     clips (post-grade SATAVG ladder ≈ A 11-12 / B 15-16 / family 19 /
//     action flashes 25) — it is the edit's recurring "breather", not a bug.
//   * windows snap to scene cuts (scdet) so a grade step lands ON a cut and
//     reads as a new clip, never as a mid-shot shift; edges then sit at frame
//     midpoints (f±0.5)/fps to dodge between()'s double-inclusive bounds.
//   * gaps inside a window are merged only when the gap itself is grey — the
//     anchor is interleaved with 12-18-frame blue action flashes (SATAVG
//     17-27) that must NOT get the boost.
//   * FPS=30 is forced down into encode-trailer (its 24 default would drop
//     the master's intentional 1-frame glitch hits).
//   * TRIM_START is refused: encode-trailer trims with -ss BEFORE -i, which
//     resets filter time to 0 and would silently misalign every window.
//   * FFMPEG env pins the binary: the repo's optional ffmpeg-static is v6.0,
//     unverified for this chain; the grade was validated on system 8.1.
// ============================================================================
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ---- knobs (all validated on the real footage; override via env) -----------
const FPS = Number(process.env.FPS || 30) //  master fps; also forced on encode
const SAT_GREY = 9 //     a frame is "grey" below this SATAVG (healthy clips ≥13)
const Y_MIN = 60 //       …and above this luma (excludes the glitch blacks, Y=16)
const Y_MAX = 160 //      …and below this one: the edit's white flash cards sit at
//                        exactly Y 214.8 / SAT 0 and its white→grey→black dissolve
//                        (~27.4-28.3s) fades through neutral cards — all "grey" to
//                        a SAT test, all intentional effects that must not be graded.
//                        Real overcast anchor footage tops out around Y 137.
const MIN_RUN = 15 //     sustained windows only (~0.5s) — glitch-cluster grey
//                        flashes keep their raw character
const MAX_GAP = 5 //      frames; bridge encoder wobble inside one grey shot…
const GAP_SAT_MAX = 12 // …but only if the gap frames are themselves grey-ish
const STRONG_SAT = 4.5 // window mean below this → the near-B&W "zone A" kit
const SNAP = 3 //         frames; snap a window edge to a scene cut this close

// ---- the fix (10-bit native throughout; see header) -------------------------
//   strong: vibrance regains colour nonlinearly (no linear chroma-noise gain),
//   colorbalance injects a clean cool cast into shadows/mids (pl keeps
//   lightness) AND neutralises highlights (rh/bh): this clip carries a warm
//   cast that the vibrance boost would otherwise amplify into cream sails —
//   rh=-0.06:bh=0.08 lands the sail whites at U≈136/V≈122, matching the
//   cool-neutral sails everywhere else. curves ≈ eq brightness -0.04 /
//   contrast 1.06 without eq's 8-bit dip.
const strongFix = (en) =>
  `vibrance=intensity=1.4:enable='${en}',` +
  `colorbalance=rs=-0.06:bs=0.10:rm=-0.03:bm=0.05:rh=-0.06:bh=0.08:pl=1:enable='${en}',` +
  `curves=master='0/0 0.5/0.455 1/0.985':enable='${en}'`
const mildFix = (en) => `vibrance=intensity=0.4:enable='${en}'`

// Global chain — KEEP IN SYNC with the GRADE_FILTER default in
// encode-trailer.mjs (minus its format= bookends, which we own here).
const GLOBAL =
  'curves=preset=medium_contrast,' +
  'colorbalance=rs=-0.08:bs=0.13:rm=-0.04:bm=0.06:rh=-0.02:bh=0.02,' +
  'eq=saturation=1.06,unsharp=5:5:0.5:5:5:0.0'

// ---- guards ------------------------------------------------------------------
if (process.env.TRIM_START || process.env.TRIM_DUR) {
  console.error('grade-banner: TRIM_START/TRIM_DUR would shift filter time and\n' +
    'misalign every enable window (encode-trailer seeks BEFORE -i). Refusing.\n' +
    'Trim the master itself first, then re-run.')
  process.exit(1)
}

const argSrc = process.argv[2]
if (!argSrc) {
  console.error('Usage: node scripts/grade-banner.mjs "/abs/path/MASTER.mp4"')
  process.exit(1)
}
const src = isAbsolute(argSrc) ? argSrc : resolve(root, argSrc)
if (!existsSync(src)) {
  console.error(`grade-banner: master not found: ${src}`)
  process.exit(1)
}

// Pin the binary the whole pipeline runs on (analysis AND encode must agree).
const FFMPEG = process.env.FFMPEG ||
  (existsSync('/opt/homebrew/bin/ffmpeg') ? '/opt/homebrew/bin/ffmpeg' : 'ffmpeg')
const FFPROBE = process.env.FFPROBE ||
  (existsSync('/opt/homebrew/bin/ffprobe') ? '/opt/homebrew/bin/ffprobe' : 'ffprobe')
const probe = (args) => execFileSync(FFPROBE, ['-v', 'error', ...args],
  { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

const verLine = execFileSync(FFMPEG, ['-version'], { encoding: 'utf8' }).split('\n')[0]
const major = Number((verLine.match(/ffmpeg version (\d+)/) || [])[1])
if (!(major >= 7)) {
  console.warn(`grade-banner: WARNING — ${verLine.trim()}\n` +
    '  The 10-bit fix chain was validated on ffmpeg 8.x; older builds may\n' +
    '  negotiate formats differently. Set FFMPEG=/path/to/newer to be safe.')
}

// The frame-index→time math below trusts a clean 0-based constant-frame-rate
// timeline; assert it rather than assume the next master exports the same way.
const fmt = probe(['-show_entries', 'stream=r_frame_rate:format=start_time',
  '-select_streams', 'v:0', '-of', 'json', src])
const meta = JSON.parse(fmt)
const rfr = meta.streams?.[0]?.r_frame_rate
const startT = Number(meta.format?.start_time ?? 0)
if (rfr !== `${FPS}/1` || Math.abs(startT) > 0.001) {
  console.error(`grade-banner: master must be ${FPS}/1 cfr with start_time 0 ` +
    `(got r_frame_rate=${rfr}, start_time=${startT}). Re-export or adjust FPS=.`)
  process.exit(1)
}

// ---- one decode pass: per-frame stats + scene cuts ---------------------------
console.log(`Analyzing ${src}\n  (per-frame signalstats + scdet — one decode, ~30s)`)
const lavfiPath = src.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'")
const analysis = JSON.parse(probe([
  '-f', 'lavfi', '-i', `movie='${lavfiPath}',signalstats,scdet=threshold=7`,
  '-show_entries',
  'frame=pts_time:frame_tags=lavfi.signalstats.YAVG,lavfi.signalstats.SATAVG,lavfi.scd.score,lavfi.scd.time',
  '-of', 'json',
]))
const frames = analysis.frames.map((f, i) => ({
  i,
  t: Number(f.pts_time),
  y: Number(f.tags?.['lavfi.signalstats.YAVG'] ?? 0),
  sat: Number(f.tags?.['lavfi.signalstats.SATAVG'] ?? 0),
  // scdet tags scd.time only on detected scene-change frames (first of scene)
  cut: f.tags?.['lavfi.scd.time'] !== undefined,
}))
console.log(`  ${frames.length} frames, ${frames.filter(f => f.cut).length} scene cuts`)

// ---- grey-window detection ----------------------------------------------------
const isGrey = (f) => f.sat < SAT_GREY && f.y > Y_MIN && f.y < Y_MAX

// 1. raw grey runs
const runs = []
for (let i = 0; i < frames.length; i++) {
  if (!isGrey(frames[i])) continue
  const s = i
  while (i + 1 < frames.length && isGrey(frames[i + 1])) i++
  runs.push({ s, e: i })
}
// 2. merge across short, still-grey gaps (bridges intra-shot wobble, never a
//    saturated action flash — those are 12+ frames AND well above GAP_SAT_MAX)
const merged = []
for (const r of runs) {
  const prev = merged[merged.length - 1]
  if (prev && r.s - prev.e - 1 < MAX_GAP &&
      frames.slice(prev.e + 1, r.s).every(f => f.sat < GAP_SAT_MAX)) {
    prev.e = r.e
  } else {
    merged.push({ ...r })
  }
}
// 3. sustained only
const windows = merged.filter(w => w.e - w.s + 1 >= MIN_RUN)

// 4. bucket + 5. snap edges to the nearest cut (≤ SNAP frames away)
const cuts = frames.filter(f => f.cut).map(f => f.i)
const snapTo = (idx) => {
  let best = null
  for (const c of cuts) if (Math.abs(c - idx) <= SNAP &&
    (best === null || Math.abs(c - idx) < Math.abs(best - idx))) best = c
  return best
}
for (const w of windows) {
  const seg = frames.slice(w.s, w.e + 1)
  w.meanSat = seg.reduce((a, f) => a + f.sat, 0) / seg.length
  w.meanY = seg.reduce((a, f) => a + f.y, 0) / seg.length
  w.bucket = w.meanSat < STRONG_SAT ? 'strong' : 'mild'
  const sc = snapTo(w.s) //          cut frame = first frame of the grey shot
  const ec = snapTo(w.e + 1) //      cut frame = first frame of the NEXT shot
  w.sSnap = sc !== null ? sc : w.s
  w.eSnap = ec !== null ? ec - 1 : w.e
  w.a = (w.sSnap - 0.5) / FPS
  w.b = (w.eSnap + 0.5) / FPS
}
// snapped edges must never overlap a neighbour
for (let i = 1; i < windows.length; i++) {
  if (windows[i].a < windows[i - 1].b) windows[i].a = windows[i - 1].b
}

if (windows.length === 0) {
  console.error('grade-banner: no sustained grey windows found — nothing to fix.\n' +
    'Run encode-trailer.mjs directly for a global-grade-only encode.')
  process.exit(1)
}

const fmtT = (t) => t.toFixed(2).padStart(6)
console.log('\nGrey windows (fix applied on these, edges snapped to cuts):')
for (const w of windows) {
  console.log(`  ${fmtT(w.a)}s → ${fmtT(w.b)}s   ${w.bucket.padEnd(6)}  ` +
    `SATAVG ${w.meanSat.toFixed(1).padStart(4)}  YAVG ${w.meanY.toFixed(0)}  ` +
    `(${w.eSnap - w.sSnap + 1} frames${w.sSnap !== w.s || w.eSnap !== w.e ? ', snapped' : ''})`)
}
const covered = windows.reduce((a, w) => a + (w.b - w.a), 0)
console.log(`  total fixed: ${covered.toFixed(1)}s of ${frames.length / FPS}s`)

// ---- compose the full grade & hand off to the encoder -------------------------
const enable = (ws) => ws.map(w => `between(t,${w.a.toFixed(4)},${w.b.toFixed(4)})`).join('+')
const strongWs = windows.filter(w => w.bucket === 'strong')
const mildWs = windows.filter(w => w.bucket === 'mild')
const fix = [
  strongWs.length ? strongFix(enable(strongWs)) : null,
  mildWs.length ? mildFix(enable(mildWs)) : null,
].filter(Boolean).join(',')
const GRADE_FILTER = `format=gbrp10le,${fix},${GLOBAL},format=yuv420p`

console.log(`\nComposed GRADE_FILTER:\n  ${GRADE_FILTER}\n`)

if (process.env.DRY_RUN) {
  console.log('DRY_RUN set — stopping before the encode.')
  process.exit(0)
}

execFileSync(process.execPath, [resolve(root, 'scripts/encode-trailer.mjs'), src], {
  stdio: 'inherit',
  env: {
    ...process.env,
    GRADE_FILTER,
    FFMPEG, //                                 same binary analysis ran on
    FPS: String(FPS), //                       24 default would drop glitch frames
    POSTER_TIME: process.env.POSTER_TIME || '2', // the ROBBY MEEK badge frame
  },
})
