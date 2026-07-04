// ============================================================================
//  BrowserStack Automate runner — home-orb cross-device verification
// ============================================================================
//  Loads the site on each device in devices.js, waits for the home intro to
//  settle, runs probe.js inside the real browser, screenshots it, and classifies
//  LIVE_ORB vs FLAT_BOAT. Writes report.json + report.md + screenshots/<id>.png.
//
//  USAGE (from browserstack/):
//    npm install
//    cp .env.example .env      # then paste your BrowserStack creds into .env
//    npm run test:deployed     # test the live site (robbysailing.com)
//    npm run test:local        # spawn `vite --host`, tunnel it, test localhost
//
//  FLAGS:
//    --url <url>     target URL (default https://robbysailing.com)
//    --local         use BrowserStack Local; target http://bs-local.com:<port>/
//    --serve         spawn `npm run dev -- --host --port <port>` in the repo root
//    --port <n>      dev-server/local port (default 5173)
//    --only <ids>    comma list of device ids (see devices.js), e.g. win-chrome,iphone15
//    --debug         append ?debug=1 so the app exposes window.__ORB_DEBUG__
//    --wait <ms>     settle time before probing (default 9000)
//
//  Creds: BROWSERSTACK_USERNAME / BROWSERSTACK_ACCESS_KEY from env or ./.env
// ============================================================================

import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { Builder, By } from 'selenium-webdriver'
import browserstack from 'browserstack-local'
import { selectDevices } from './devices.js'
import { pageProbe, classify } from './probe.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '..')
const HUB = 'https://hub-cloud.browserstack.com/wd/hub'

// ---------- args ----------
function parseArgs(argv) {
  const a = { local: false, serve: false, preview: false, debug: false, morph: false, port: 5173, wait: 9000, url: null, only: null }
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i]
    if (k === '--local') a.local = true
    else if (k === '--serve') a.serve = true
    // --preview serves the PRODUCTION build (vite preview) — the faithful test:
    // no StrictMode double-mount, optimized assets. Implies --serve + --local.
    else if (k === '--preview') { a.preview = true; a.serve = true; a.local = true }
    // --morph: on LIVE_ORB devices, click the orb and confirm it morphs/navigates
    // to The Road (the seamless-handoff regression guard). Implies --debug.
    else if (k === '--morph') { a.morph = true; a.debug = true }
    else if (k === '--debug') a.debug = true
    else if (k === '--url') a.url = argv[++i]
    else if (k === '--only') a.only = argv[++i]
    else if (k === '--port') a.port = parseInt(argv[++i], 10)
    else if (k === '--wait') a.wait = parseInt(argv[++i], 10)
  }
  return a
}

// ---------- creds ----------
function loadCreds() {
  const envFile = path.join(__dirname, '.env')
  if (fs.existsSync(envFile) && typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(envFile) } catch { /* ignore */ }
  } else if (fs.existsSync(envFile)) {
    // minimal fallback parser for older node
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
  const user = process.env.BROWSERSTACK_USERNAME
  const key = process.env.BROWSERSTACK_ACCESS_KEY
  if (!user || !key) {
    console.error('\n✗ Missing BrowserStack credentials.')
    console.error('  Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY in browserstack/.env')
    console.error('  (copy .env.example). Find them at: https://www.browserstack.com/accounts/profile/details\n')
    process.exit(1)
  }
  return { user, key }
}

// ---------- dev server (optional --serve) ----------
function waitForPort(port, timeoutMs = 30000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      const req = http.get({ host: '127.0.0.1', port, path: '/', timeout: 2000 }, (res) => {
        res.destroy(); resolve(true)
      })
      req.on('error', () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`dev server not up on :${port} after ${timeoutMs}ms`))
        else setTimeout(tick, 600)
      })
      req.on('timeout', () => { req.destroy() })
    }
    tick()
  })
}

async function startDevServer(port, preview) {
  const script = preview ? 'preview' : 'dev'
  console.log(`▶ starting ${preview ? 'preview (prod build)' : 'dev'} server: npm run ${script} -- --host --port ${port}`)
  const proc = spawn('npm', ['run', script, '--', '--host', '--port', String(port), '--strictPort'], {
    cwd: REPO_ROOT, stdio: 'ignore', detached: false,
  })
  proc.on('error', (e) => console.error('server spawn error:', e.message))
  await waitForPort(port)
  console.log(`✓ ${script} server up on :${port}`)
  return proc
}

// ---------- BrowserStack Local tunnel (optional --local) ----------
function startTunnel(key, localIdentifier) {
  const bs = new browserstack.Local()
  return new Promise((resolve, reject) => {
    bs.start({ key, localIdentifier, force: 'true', forceLocal: 'true' }, (err) => {
      if (err) reject(err)
      else { console.log(`✓ BrowserStack Local tunnel up (id ${localIdentifier})`); resolve(bs) }
    })
  })
}
function stopTunnel(bs) {
  return new Promise((resolve) => { if (bs) bs.stop(() => resolve()); else resolve() })
}

// ---------- per-device caps ----------
function buildCaps(device, common) {
  return {
    ...device.caps,
    'bstack:options': { ...common, ...(device.caps['bstack:options'] || {}) },
  }
}

// ---------- run one device ----------
async function runDevice(device, { url, common, waitMs, morph }) {
  const caps = buildCaps(device, { ...common, sessionName: device.label })
  let driver
  const out = { id: device.id, label: device.label, ok: false }
  try {
    driver = await new Builder().usingServer(HUB).withCapabilities(caps).build()
    const sess = await driver.getSession()
    out.sessionId = sess.getId()

    await driver.get(url)

    // Poll until the orb canvas or the flat boat appears + intro settles.
    const deadline = Date.now() + waitMs + 8000
    let probe = null
    while (Date.now() < deadline) {
      probe = await driver.executeScript(`return (${pageProbe.toString()})()`)
      const c = classify(probe)
      if (c === 'LIVE_ORB' || c === 'FLAT_BOAT') break
      await driver.sleep(1500)
    }
    // one more settle pass so the orb has time to fade in
    await driver.sleep(2500)
    probe = await driver.executeScript(`return (${pageProbe.toString()})()`)

    out.probe = probe
    out.verdict = classify(probe)
    out.ok = true

    // screenshot
    const png = await driver.takeScreenshot()
    const shotDir = path.join(__dirname, 'screenshots')
    fs.mkdirSync(shotDir, { recursive: true })
    fs.writeFileSync(path.join(shotDir, `${device.id}.png`), png, 'base64')
    out.screenshot = `screenshots/${device.id}.png`

    // --morph: exercise the orb→globe handoff on a real device. The orb's click
    // handler is window-level (the canvas is pointer-events:none), so a click at
    // the viewport centre (= the orb's screen position) triggers it. We then poll
    // for the route swap to /the-road and record peak morph progress.
    if (morph && out.verdict === 'LIVE_ORB') {
      try {
        const body = await driver.findElement(By.css('body'))
        await driver.actions({ async: true }).move({ origin: body }).pause(200).press().pause(60).release().perform()
        let navigated = false
        let maxProgress = 0
        const md = Date.now() + 12000
        while (Date.now() < md) {
          const st = await driver.executeScript('return { path: location.pathname, m: (window.__ORB_DEBUG__ && window.__ORB_DEBUG__.morph) }')
          if (typeof st.m === 'number') maxProgress = Math.max(maxProgress, st.m)
          if (/the-road/.test(st.path || '')) { navigated = true; break }
          await driver.sleep(400)
        }
        await driver.sleep(1500) // let the globe paint + overlay cross-fade
        out.morph = { navigated, maxProgress, finalPath: await driver.executeScript('return location.pathname') }
        const png2 = await driver.takeScreenshot()
        fs.writeFileSync(path.join(shotDir, `${device.id}-morph.png`), png2, 'base64')
        out.morphScreenshot = `screenshots/${device.id}-morph.png`
      } catch (e) {
        out.morph = { error: String((e && e.message) || e) }
      }
    }

    // mark the BrowserStack session
    const pass = out.verdict === 'LIVE_ORB' || out.verdict === 'FLAT_BOAT'
    await driver.executeScript(
      'browserstack_executor: ' + JSON.stringify({
        action: 'setSessionStatus',
        arguments: { status: pass ? 'passed' : 'failed', reason: `verdict=${out.verdict}` },
      })
    )
  } catch (err) {
    out.error = String((err && err.message) || err)
  } finally {
    if (driver) { try { await driver.quit() } catch { /* ignore */ } }
  }
  const tag = out.verdict || (out.error ? 'ERROR' : '?')
  const morphTag = out.morph ? `  morph→${out.morph.navigated ? 'the-road ✓' : `peak ${out.morph.maxProgress ?? '?'}${out.morph.error ? ' ' + out.morph.error.slice(0, 40) : ''}`}` : ''
  console.log(`  ${out.ok ? '✓' : '✗'} ${device.label.padEnd(34)} → ${tag}${morphTag}${out.error ? '  (' + out.error.slice(0, 80) + ')' : ''}`)
  return out
}

// ---------- report ----------
function writeReport(results, meta) {
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify({ meta, results }, null, 2))
  const rows = results.map((r) => {
    const p = r.probe || {}
    const cp = p.canPlay || {}
    return `| ${r.label} | **${r.verdict || 'ERROR'}** | ${p.realHighPerfContext ? 'yes' : 'no'} | ${p.imageDecoder ? 'yes' : 'no'} | ${cp.webmVp9Alpha || '-'} | ${cp.hevcAlpha || '-'} | ${p.devicePixelRatio ?? '-'} | ${p.reducedMotion ? 'on' : 'off'} | ${(p.renderer || r.error || '').toString().slice(0, 38)} |`
  }).join('\n')
  const md = `# BrowserStack orb verification — ${meta.when}

Target: \`${meta.url}\`  ·  build: \`${meta.buildName}\`

| Device | Verdict | RealGL | ImageDecoder | webm/vp9 | hevc(α) | DPR | reduced-motion | renderer / error |
|---|---|---|---|---|---|---|---|---|
${rows}

**Verdict legend:** LIVE_ORB = real WebGL orb on screen · FLAT_BOAT = DOM-boat fallback · ORB_CANVAS_HIDDEN = orb mounted but not faded in · ERROR = session failed.

Screenshots: \`browserstack/screenshots/<id>.png\`. Full probe data: \`browserstack/report.json\`.
`
  fs.writeFileSync(path.join(__dirname, 'report.md'), md)
  console.log('\n' + md)
}

// ---------- main ----------
async function main() {
  const args = parseArgs(process.argv.slice(2))
  const { user, key } = loadCreds()
  const devices = selectDevices(args.only)
  if (!devices.length) { console.error('No devices selected.'); process.exit(1) }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const buildName = `orb-${stamp}`
  const localIdentifier = `robbysailing-${stamp}`
  let url = args.url || (args.local ? `http://bs-local.com:${args.port}/` : 'https://robbysailing.com')
  if (args.debug) url += (url.includes('?') ? '&' : '?') + 'debug=1'

  let devProc = null
  let tunnel = null
  try {
    if (args.serve) devProc = await startDevServer(args.port, args.preview)
    if (args.local) tunnel = await startTunnel(key, localIdentifier)

    const common = {
      userName: user,
      accessKey: key,
      projectName: 'robbysailing',
      buildName,
      debug: 'true',
      consoleLogs: 'info',
      networkLogs: 'true',
      ...(args.local ? { local: 'true', localIdentifier } : {}),
    }

    console.log(`\n▶ Testing ${devices.length} device(s) against ${url}\n`)
    const results = []
    for (const d of devices) {
      results.push(await runDevice(d, { url, common, waitMs: args.wait, morph: args.morph }))
    }
    writeReport(results, { when: new Date().toISOString(), url, buildName })
  } finally {
    await stopTunnel(tunnel)
    if (devProc) { try { devProc.kill('SIGTERM') } catch { /* ignore */ } }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
