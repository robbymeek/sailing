// ============================================================================
//  auto-bake.mjs  —  drive the bake harness with headful (real-GPU) Chrome.
// ============================================================================
//  An automated alternative to clicking buttons in /bake.html: launches the
//  system Chrome (headful → real Metal/ANGLE GPU, so the captured frames are the
//  genuine shader output, not a software render), waits for the globe to be ready
//  (window.__BAKE__.ready), records the REST loop and the MORPH off the harness's
//  black-composited capture canvas, and writes them to bake-recordings/.
//
//  Needs the dev server running (npm run dev) + a one-off `npm i -D puppeteer-core`.
//  Then: node scripts/auto-bake.mjs   (or set BAKE_URL / CHROME_PATH env vars)
//  Follow with `npm run bake:encode`. puppeteer-core is NOT a committed dep.
// ============================================================================
import puppeteer from 'puppeteer-core'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = resolve(root, 'bake-recordings')
mkdirSync(OUT, { recursive: true })

const URL = process.env.BAKE_URL || 'http://localhost:5173/bake.html'
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const REST_MS = 8360 // one boat cycle
const MORPH_MS = 3200 + 600 // morph + a beat of frozen-globe tail

// Runs IN the page: records `durationMs` off the harness capture canvas, optionally
// firing the morph at t0, and returns the webm as base64.
async function recordClip(durationMs, doMorph) {
  const out = window.__BAKE__.out
  const stream = out.captureStream(60)
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((m) => window.MediaRecorder.isTypeSupported(m)) || 'video/webm'
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12000000 })
  const chunks = []
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
  const stopped = new Promise((r) => { rec.onstop = r })
  rec.start()
  if (doMorph) window.__BAKE__.startMorph()
  await new Promise((r) => setTimeout(r, durationMs))
  rec.stop()
  await stopped
  const buf = await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()
  const bytes = new Uint8Array(buf)
  let bin = ''
  const STEP = 0x8000
  for (let i = 0; i < bytes.length; i += STEP) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP))
  }
  return btoa(bin)
}

const save = (name, b64) => {
  const p = resolve(OUT, name)
  writeFileSync(p, Buffer.from(b64, 'base64'))
  console.log(`  wrote ${name} (${(Buffer.from(b64, 'base64').length / 1e6).toFixed(1)} MB)`)
}

const run = async () => {
  console.log(`Launching Chrome → ${URL}`)
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,
    userDataDir: '/tmp/bake-chrome-profile', // throwaway — never touches your real profile
    args: [
      '--autoplay-policy=no-user-gesture-required',
      '--ignore-gpu-blocklist',
      '--use-angle=metal',
      '--no-first-run', '--no-default-browser-check',
      '--window-size=520,920',
    ],
  })
  try {
    const page = await browser.newPage()
    page.on('console', (m) => console.log('  [page]', m.text()))
    page.on('pageerror', (e) => console.log('  [page error]', e.message))
    await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 })
    // confirm we got a real GPU, not SwiftShader
    const renderer = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl2')
      const ext = gl && gl.getExtension('WEBGL_debug_renderer_info')
      return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown'
    })
    console.log(`  GPU renderer: ${renderer}`)
    console.log('  waiting for globe ready…')
    await page.waitForFunction('window.__BAKE__ && window.__BAKE__.ready()', { timeout: 60000, polling: 500 })
    await new Promise((r) => setTimeout(r, 800)) // a touch of extra settle
    console.log('  recording REST…')
    save('orb-rest.webm', await page.evaluate(recordClip, REST_MS, false))
    console.log('  recording MORPH…')
    save('orb-morph.webm', await page.evaluate(recordClip, MORPH_MS, true))
  } finally {
    await browser.close()
  }
}

run().then(() => console.log('bake done')).catch((e) => { console.error('BAKE FAILED:', e); process.exit(1) })
