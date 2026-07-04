// ============================================================================
//  encode-trailer.mjs  —  turn the iMovie sailing master into a shippable banner.
// ============================================================================
//  Input  : the sailing master exported from iMovie, dropped into trailer-src/.
//           Auto-detected if trailer-src/ holds exactly one video; otherwise pass
//           it explicitly:  npm run trailer:encode -- "/abs/path/My Movie.mp4"
//  Output : public/trailer/trailer.mp4          (autoplay banner, H.264 High)
//           public/trailer/trailer-poster.jpg   (graded frame for instant paint)
//
//  DESIGN NOTES (why it looks the way it does):
//   * NO AUDIO. The banner is a silent, muted, looping cinematic strip (-an).
//   * COOL cinematic grade to match the deep-blue site: deepen the water toward
//     teal, cool the shadows/mids, keep highlights (the white sails) clean, mild
//     contrast + gentle sharpen for pop. Turn off with GRADE=off.
//   * H.264 ONLY — no WebM/VP9. On this high-motion water footage VP9 came out
//     LARGER than H.264 at equal quality (55s of sparkle is near worst-case for
//     any codec), and H.264 High + yuv420p + faststart plays everywhere. So one
//     well-tuned MP4 is both smaller and simpler.
//   * LIGHTWEIGHT defaults (1152px / 24fps / CRF 31) — the previous 1600/30/CRF24
//     encode was ~40MB; these land the full 55s clip around ~12MB. For a genuinely
//     "few MB" file, TRIM to a punchy ~20s (see TRIM_START/TRIM_DUR below).
//
//  ffmpeg is resolved at run time and is NOT a committed dependency (so it never
//  runs in CI). Install ONE of these first:
//     npm i -D ffmpeg-static     (bundled static binary, no system install), or
//     brew install ffmpeg        (system ffmpeg on PATH)
//  Then: npm run trailer:encode
//
//  Tunables (env vars):
//     WIDTH=1280       output width in px (height auto, keeps aspect; cover-cropped)
//     FPS=24           output frame rate (24 = filmic + ~20% lighter than 30)
//     CRF=29           H.264 quality floor (lower = better/bigger; ~26 crisp, ~31 tiny)
//     MAXRATE=1400k    peak bitrate cap — the real size governor on spiky water
//     BUFSIZE=2100k    rate-control buffer (~1.5x maxrate)
//     GRADE=off        skip the cool cinematic grade entirely (e.g. graded in iMovie)
//     GRADE_FILTER=... override the whole grade filter chain with your own
//     TRIM_START=17    seconds into the master to start (enables a trimmed cut)
//     TRIM_DUR=20      length in seconds of the trimmed cut (needs TRIM_START)
//     POSTER_TIME=18   seconds into the master to grab the poster frame
//        Example lightweight ~20s cut (~3-4 MB):
//        TRIM_START=17 TRIM_DUR=20 npm run trailer:encode -- "/path/SAILING MOVIE 1.mp4"
// ============================================================================
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/trailer')

const WIDTH = process.env.WIDTH || '1280'
const FPS = process.env.FPS || '24'
const CRF = process.env.CRF || '29'
const MAXRATE = process.env.MAXRATE || '1400k' // peak cap = the real size governor
const BUFSIZE = process.env.BUFSIZE || '2100k'
const GRADE = process.env.GRADE !== 'off'
const TRIM_START = process.env.TRIM_START // seconds, optional
const TRIM_DUR = process.env.TRIM_DUR //     seconds, optional (needs TRIM_START)
const POSTER_TIME = process.env.POSTER_TIME || '18'
const OUTFILE = process.env.OUTFILE || 'trailer.mp4' // e.g. trailer-mobile.mp4
const SKIP_POSTER = process.env.SKIP_POSTER === '1' // secondary encodes reuse the main poster

// Cool cinematic grade, validated frame-by-frame on the real footage:
//   format=gbrp10le ........ grade in 10-bit to keep the smooth sky/water gradient
//                            band-free through the maxrate-capped encode
//   curves medium_contrast . filmic contrast
//   colorbalance ........... push shadows/mids toward blue-cyan (teal water),
//                            keep highlights near-neutral so the sails stay white
//   eq saturation .......... a touch more colour
//   unsharp 5x5 (luma only). gentle edge pop without chroma fringing
//   format=yuv420p ......... collapse back to the 8-bit the H.264 banner ships in
// Swap the whole chain with GRADE_FILTER=... , or GRADE=off to disable.
const GRADE_FILTER = process.env.GRADE_FILTER ||
  'format=gbrp10le,' +
  'curves=preset=medium_contrast,' +
  'colorbalance=rs=-0.08:bs=0.13:rm=-0.04:bm=0.06:rh=-0.02:bh=0.02,' +
  'eq=saturation=1.06,unsharp=5:5:0.5:5:5:0.0,' +
  'format=yuv420p'

// Prefer an explicit FFMPEG=/path pin (grade-banner.mjs sets this so analysis
// and encode run on the SAME binary), then an optional local ffmpeg-static,
// otherwise a system `ffmpeg` on PATH.
async function resolveFfmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG
  try {
    const mod = await import('ffmpeg-static')
    if (mod?.default) return mod.default
  } catch { /* not installed — fall through to system ffmpeg */ }
  return 'ffmpeg'
}
const ffmpegPath = await resolveFfmpeg()

try {
  execFileSync(ffmpegPath, ['-version'], { stdio: 'ignore' })
} catch {
  console.error('\nffmpeg not found. Install one of:\n' +
    '  npm i -D ffmpeg-static   (bundled binary, no system install)\n' +
    '  brew install ffmpeg      (system)\n' +
    'then re-run: npm run trailer:encode\n')
  process.exit(1)
}

// Locate the source master: explicit arg/env, else the lone video in trailer-src/.
function findSource() {
  const explicit = process.argv[2] || process.env.TRAILER_SRC
  if (explicit) return isAbsolute(explicit) ? explicit : resolve(root, explicit)
  const dir = resolve(root, 'trailer-src')
  if (!existsSync(dir)) return null
  const vids = readdirSync(dir).filter(f => /\.(mp4|mov|m4v|webm)$/i.test(f) && !f.startsWith('.'))
  if (vids.length === 1) return resolve(dir, vids[0])
  if (vids.length === 0) return null
  console.error(`\nMultiple videos in trailer-src/ (${vids.join(', ')}).\n` +
    'Pass one explicitly:  npm run trailer:encode -- "trailer-src/NAME.mov"\n')
  process.exit(1)
}

const src = findSource()
if (!src || !existsSync(src)) {
  console.error('\nNo trailer master found.\n' +
    '  1. Export your sailing cut from iMovie (1080p, High).\n' +
    '  2. Drop it in trailer-src/  (create the folder next to package.json),\n' +
    '     or pass its path:  npm run trailer:encode -- "/path/to/movie.mp4"\n')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

// Optional trim (fast keyframe seek). Applied to the video encode; the poster is
// grabbed from within the trimmed window so it always matches what plays.
const trimInArgs = TRIM_START ? ['-ss', TRIM_START] : []
const trimOutArgs = TRIM_DUR ? ['-t', TRIM_DUR] : []

// Shared video filter: normalise fps, scale to web width (lanczos), then the grade.
const base = `fps=${FPS},scale=${WIDTH}:-2:flags=lanczos`
const VF = GRADE ? `${base},${GRADE_FILTER}` : base

const ff = (args) => {
  process.stdout.write(`\n$ ffmpeg ${args.join(' ')}\n`)
  execFileSync(ffmpegPath, ['-y', ...args], { stdio: 'inherit' })
}

const dur = TRIM_START ? `${TRIM_DUR || '?'}s from ${TRIM_START}s` : 'full clip'
console.log(`Encoding banner → ${OUT}\n  source : ${src}\n  ffmpeg : ${ffmpegPath}` +
  `\n  width=${WIDTH}  fps=${FPS}  crf=${CRF}  maxrate=${MAXRATE}  grade=${GRADE ? 'cool' : 'off'}` +
  `  cut=${dur}  audio=none`)

// MP4 (H.264 High) — the universal, hardware-decoded, silent banner. No audio, no
// WebM: on this high-motion water even two-pass VP9 came out LARGER than H.264, so
// one capped-bitrate MP4 is both smaller and plays everywhere.
//   -tune film  → gently denoises spray so bits go to structure, not noise
//   -g 240      → one keyframe every ~10s; the loop only plays start→end, never seeks
//   -maxrate/-bufsize → hard peak cap = the size governor on spiky water
//   +faststart  → moov atom up front so playback starts before full download
//   bt709 tags → the grade's RGB round-trip can drop the colour-matrix tag
//   (the previously shipped file had color_space=unknown), and untagged
//   1280-wide video is exactly where players guess bt601 and desaturate.
ff([...trimInArgs, '-i', src, ...trimOutArgs, '-vf', VF, '-an',
  '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
  '-preset', 'slow', '-tune', 'film', '-crf', CRF,
  '-maxrate', MAXRATE, '-bufsize', BUFSIZE, '-g', '240',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
  '-color_range', 'tv',
  '-movflags', '+faststart', resolve(OUT, OUTFILE)])

if (!SKIP_POSTER) {
  // Poster — a graded frame → instant <video poster> paint AND the still shown to
  // prefers-reduced-motion visitors, so pick a strong frame. Clamp into the trim.
  let posterAt = POSTER_TIME
  if (TRIM_START) {
    const start = Number(TRIM_START)
    const dLen = TRIM_DUR ? Number(TRIM_DUR) : 4
    posterAt = String(start + Math.min(2, Math.max(0, dLen / 2)))
  }
  // Poster VF omits the fps step (single frame) but keeps the grade so the still is
  // on-brand cool; -q:v 6 keeps it under ~60KB (it is off the critical path).
  const posterVF = GRADE ? `scale=${WIDTH}:-2:flags=lanczos,${GRADE_FILTER}` : `scale=${WIDTH}:-2:flags=lanczos`
  ff(['-ss', posterAt, '-i', src, '-vf', posterVF, '-frames:v', '1', '-q:v', '6',
    '-update', '1', resolve(OUT, 'trailer-poster.jpg')])
}

const mb = (p) => (statSync(p).size / 1048576).toFixed(1)
console.log(`\nDone.\n  ${OUTFILE.padEnd(18)} ${mb(resolve(OUT, OUTFILE))} MB` +
  (SKIP_POSTER ? '' : `\n  trailer-poster.jpg ${mb(resolve(OUT, 'trailer-poster.jpg'))} MB`) +
  `\nInspect public/trailer/, then load the Biography page (npm run dev).`)
