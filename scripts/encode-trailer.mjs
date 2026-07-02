// ============================================================================
//  encode-trailer.mjs  —  turn the iMovie sailing master into a shippable banner.
// ============================================================================
//  Input  : the ~20s trailer you exported from iMovie, dropped into trailer-src/.
//           Auto-detected if trailer-src/ holds exactly one video; otherwise pass
//           it explicitly:  npm run trailer:encode -- "trailer-src/My Trailer.mov"
//  Output : public/trailer/trailer.{webm,mp4}   (autoplay banner, dual source)
//           public/trailer/trailer-poster.jpg   (first-frame instant paint)
//
//  Unlike encode-orb.mjs this KEEPS THE AUDIO TRACK (AAC in mp4, Opus in webm) so
//  the banner's unmute button can play the music. It also applies a light
//  "bright & energetic" finishing grade — turn it off if you already graded in
//  iMovie:  GRADE=off npm run trailer:encode
//
//  ffmpeg is resolved at run time and is NOT a committed dependency (so it never
//  runs in CI). Install ONE of these first:
//     npm i -D ffmpeg-static     (bundled static binary, no system install), or
//     brew install ffmpeg        (system ffmpeg on PATH)
//  Then: npm run trailer:encode
//
//  Tunables (env vars):
//     WIDTH=1600     output width in px (height auto, keeps aspect; cover-cropped)
//     CRF=24         H.264 quality (lower = better/bigger; ~20 sharp, ~28 small)
//     VP9_CRF=32     VP9 quality (VP9 runs a few points higher than x264)
//     GRADE=off      skip the bright/energetic grade entirely
//     SAT / CONTRAST / BRIGHT   grade strength (defaults 1.18 / 1.06 / 0.02)
//     POSTER_TIME=1  seconds into the clip to grab the poster frame
// ============================================================================
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, resolve, isAbsolute } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/trailer')

const WIDTH = process.env.WIDTH || '1600'
const CRF = process.env.CRF || '24'
const VP9_CRF = process.env.VP9_CRF || '32'
const POSTER_TIME = process.env.POSTER_TIME || '1'
const GRADE = process.env.GRADE !== 'off'
const SAT = process.env.SAT || '1.18'
const CONTRAST = process.env.CONTRAST || '1.06'
const BRIGHT = process.env.BRIGHT || '0.02'

// Prefer an optional local ffmpeg-static; otherwise a system `ffmpeg` on PATH.
async function resolveFfmpeg() {
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
    '  1. Export your ~20s trailer from iMovie (1080p, High).\n' +
    '  2. Drop it in trailer-src/  (create the folder next to package.json).\n' +
    '  3. Re-run: npm run trailer:encode\n')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

// Shared video filter: scale to web width (lanczos), then the optional grade.
const scale = `scale=${WIDTH}:-2:flags=lanczos`
const grade = GRADE
  ? `,eq=saturation=${SAT}:contrast=${CONTRAST}:brightness=${BRIGHT},unsharp=3:3:0.3`
  : ''
const VF = `${scale}${grade}`

const ff = (args) => {
  process.stdout.write(`\n$ ffmpeg ${args.join(' ')}\n`)
  execFileSync(ffmpegPath, ['-y', ...args], { stdio: 'inherit' })
}

console.log(`Encoding trailer → ${OUT}\n  source : ${src}\n  ffmpeg : ${ffmpegPath}` +
  `\n  width=${WIDTH}  crf=${CRF}  vp9_crf=${VP9_CRF}  grade=${GRADE ? 'on' : 'off'}`)

// MP4 (H.264 High) — the universal hardware-decoded path on every phone/desktop.
ff(['-i', src, '-vf', VF,
  '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-crf', CRF, '-preset', 'slow',
  '-c:a', 'aac', '-b:a', '128k',
  '-movflags', '+faststart', resolve(OUT, 'trailer.mp4')])

// WebM (VP9) — lighter first choice where supported; Opus audio.
ff(['-i', src, '-vf', VF,
  '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', VP9_CRF,
  '-pix_fmt', 'yuv420p', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '2',
  '-c:a', 'libopus', '-b:a', '96k', resolve(OUT, 'trailer.webm')])

// Poster — a graded frame a beat into the clip → instant <video poster> paint.
ff(['-ss', POSTER_TIME, '-i', src, '-vf', VF, '-frames:v', '1', '-q:v', '3',
  '-update', '1', resolve(OUT, 'trailer-poster.jpg')])

console.log('\nDone. Inspect public/trailer/, then load the Biography page (npm run dev).')
