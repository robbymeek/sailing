// ============================================================================
//  prep-tour-photos.mjs — resize/encode the Coming Soon tour photos.
// ============================================================================
//  Input  : full-res photos already in the repo (see SOURCES below)
//  Output : public/tour/<name>.jpg   (desktop, long edge 1280, target ≤250KB)
//           public/tour/<name>-m.jpg (mobile,  long edge  800, target ≤130KB)
//
//  These back the per-stop photo cards + full-viewport backdrops on the Coming
//  Soon globe tour (src/data/campaignStops.js `photo` fields reference the
//  outputs). Outputs are committed; this script never runs in CI.
//
//  Encoder: macOS `sips` (zero deps) when available, else ffmpeg resolved like
//  scripts/encode-orb.mjs (optional ffmpeg-static → system PATH).
//  Run: npm run tour:photos
// ============================================================================
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'public/tour')

// source (repo-relative) → output basename. Keep in sync with the `photo`
// fields in src/data/campaignStops.js. cropBottomFrac trims a baked-in
// banner/caption strip off the bottom BEFORE resizing (fraction of height).
const SOURCES = [
  { src: 'public/sailing-photos/IMG_0062.JPG', name: 'la-open', cropBottomFrac: 0.16 },
  { src: 'public/sailing-photos/P1233011 (1).JPG', name: 'vilamoura' },
  { src: 'src/assets/home-intro/p1233486-2.jpg', name: 'palma' },
  { src: 'src/assets/home-intro/p1166617.jpeg', name: 'california' },
  { src: 'public/sailing-photos/IMG_5956.JPG', name: 'olympic-prep', cropBottomFrac: 0.08 },
]

const VARIANTS = [
  { suffix: '', maxPx: 1280, quality: 65, budgetKB: 250 },
  { suffix: '-m', maxPx: 800, quality: 68, budgetKB: 130 },
]

function hasSips() {
  try {
    execFileSync('sips', ['--help'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function resolveFfmpeg() {
  try {
    const mod = await import('ffmpeg-static')
    if (mod?.default) return mod.default
  } catch { /* not installed — fall through to system ffmpeg */ }
  return 'ffmpeg'
}

const useSips = process.platform === 'darwin' && hasSips()
const ffmpegPath = useSips ? null : await resolveFfmpeg()
if (!useSips) {
  try {
    execFileSync(ffmpegPath, ['-version'], { stdio: 'ignore' })
  } catch {
    console.error('\nNeither sips (macOS) nor ffmpeg found. Install one:\n' +
      '  npm i -D ffmpeg-static   (bundled binary, no system install)\n' +
      '  brew install ffmpeg      (system)\n' +
      'then re-run: npm run tour:photos\n')
    process.exit(1)
  }
}

function sipsDims(src) {
  const out = execFileSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', src]).toString()
  return {
    w: Number(out.match(/pixelWidth: (\d+)/)[1]),
    h: Number(out.match(/pixelHeight: (\d+)/)[1]),
  }
}

function encode(src, dst, { maxPx, quality }, cropBottomFrac) {
  if (useSips) {
    if (cropBottomFrac) {
      // Two passes: crop the banner strip off the bottom (keep the top), then
      // resample. sips applies -c around the offset given by --cropOffset.
      const { w, h } = sipsDims(src)
      const keptH = Math.floor(h * (1 - cropBottomFrac))
      execFileSync('sips', ['-c', String(keptH), String(w), '--cropOffset', '0', '0', src, '--out', dst], { stdio: 'ignore' })
      execFileSync('sips', [
        '--resampleHeightWidthMax', String(maxPx),
        '--setProperty', 'format', 'jpeg',
        '--setProperty', 'formatOptions', String(quality),
        dst, '--out', dst,
      ], { stdio: 'ignore' })
      return
    }
    execFileSync('sips', [
      '--resampleHeightWidthMax', String(maxPx),
      '--setProperty', 'format', 'jpeg',
      '--setProperty', 'formatOptions', String(quality),
      src, '--out', dst,
    ], { stdio: 'ignore' })
  } else {
    // -q:v 5 ≈ visually clean web JPEG; scale long edge down, never up.
    const crop = cropBottomFrac ? `crop=iw:floor(ih*${1 - cropBottomFrac}):0:0,` : ''
    execFileSync(ffmpegPath, [
      '-y', '-i', src,
      '-vf', `${crop}scale='min(${maxPx},iw)':'min(${maxPx},ih)':force_original_aspect_ratio=decrease`,
      '-q:v', '5', dst,
    ], { stdio: 'ignore' })
  }
}

let missing = false
mkdirSync(OUT, { recursive: true })
const rows = []
for (const { src, name, cropBottomFrac } of SOURCES) {
  const abs = resolve(root, src)
  if (!existsSync(abs)) {
    console.error(`MISSING source: ${src}`)
    missing = true
    continue
  }
  for (const variant of VARIANTS) {
    const dst = resolve(OUT, `${name}${variant.suffix}.jpg`)
    encode(abs, dst, variant, cropBottomFrac)
    const kb = Math.round(statSync(dst).size / 1024)
    const over = kb > variant.budgetKB
    rows.push({ file: `tour/${name}${variant.suffix}.jpg`, kb, over, budget: variant.budgetKB })
  }
}

console.log('\n  output                        size     budget')
console.log('  ' + '-'.repeat(46))
let total = 0
for (const r of rows) {
  total += r.kb
  const flag = r.over ? `  OVER ${r.budget}KB — lower the quality setting` : ''
  console.log(`  ${r.file.padEnd(28)}  ${String(r.kb).padStart(4)}KB  ${flag}`)
}
console.log('  ' + '-'.repeat(46))
console.log(`  total ${total}KB (${(total / 1024).toFixed(2)}MB)\n`)

if (missing) process.exit(1)
