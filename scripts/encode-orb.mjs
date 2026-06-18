// ============================================================================
//  encode-orb.mjs  —  turn the bake-harness recordings into shippable clips.
// ============================================================================
//  Input  : bake-recordings/orb-rest.webm , bake-recordings/orb-morph.webm
//           (downloaded from /bake.html — see BAKE.md)
//  Output : public/orb/orb-rest.{webm,mp4} , orb-morph.{webm,mp4}
//           public/orb/orb-rest-poster.jpg   (first rest frame — instant paint)
//           public/orb/orb-globe-poster.{jpg,webp}  (morph's last frame, globe hero)
//
//  ffmpeg is resolved at run time and is NOT a committed dependency — so it never
//  runs in the GitHub Pages CI build. Install ONE of these before baking:
//     npm i -D ffmpeg-static     (bundled static binary, no system install), or
//     brew install ffmpeg        (system ffmpeg on PATH)
//  Then: npm run bake:encode
//
//  Encoding: H.264 High + yuv420p + faststart = the universally hardware-decoded
//  path on iOS/Android; VP9 webm as the lighter first choice. CRF 23 keeps the
//  smooth glass gradients clean; drop toward 18 if you see banding, raise toward
//  28 for smaller files: `CRF=18 npm run bake:encode`.
// ============================================================================
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const IN = resolve(root, 'bake-recordings')
const OUT = resolve(root, 'public/orb')
const CRF = process.env.CRF || '23'

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
    'then re-run: npm run bake:encode\n')
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })

const ff = (args) => {
  process.stdout.write(`\n$ ffmpeg ${args.join(' ')}\n`)
  execFileSync(ffmpegPath, ['-y', ...args], { stdio: 'inherit' })
}

function encodeClip(name) {
  const src = resolve(IN, `${name}.webm`)
  if (!existsSync(src)) {
    console.warn(`! missing ${src} — record it from /bake.html first (skipping)`)
    return false
  }
  // MP4 (H.264) — the universal phone path
  ff(['-i', src, '-an', '-c:v', 'libx264', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
    '-crf', CRF, '-movflags', '+faststart', resolve(OUT, `${name}.mp4`)])
  // WebM (VP9) — lighter first choice where supported
  ff(['-i', src, '-an', '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', CRF,
    '-pix_fmt', 'yuv420p', '-row-mt', '1', resolve(OUT, `${name}.webm`)])
  return true
}

console.log(`Encoding orb clips → ${OUT}  (ffmpeg=${ffmpegPath}, CRF=${CRF})`)

if (encodeClip('orb-rest')) {
  // first frame of the rest loop → instant <video poster> paint
  ff(['-i', resolve(IN, 'orb-rest.webm'), '-frames:v', '1', '-q:v', '3',
    resolve(OUT, 'orb-rest-poster.jpg')])
}

if (encodeClip('orb-morph')) {
  // LAST frame of the morph = the globe hero pose. Use it as ComingSoon's first
  // mobile paint (poster bridge) for a perfectly seamless land — see BAKE.md.
  ff(['-sseof', '-0.15', '-i', resolve(IN, 'orb-morph.webm'), '-frames:v', '1',
    '-update', '1', '-q:v', '3', resolve(OUT, 'orb-globe-poster.jpg')])
  ff(['-sseof', '-0.15', '-i', resolve(IN, 'orb-morph.webm'), '-frames:v', '1',
    '-update', '1', resolve(OUT, 'orb-globe-poster.webp')])
}

console.log('\nDone. Inspect public/orb/, then set BAKED_ORB_READY = true in src/components/BakedOrb.jsx.')
