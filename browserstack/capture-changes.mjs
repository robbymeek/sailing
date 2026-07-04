// One-off: capture the pages touched by the July 2026 card/orb changes on a real
// iPhone + a real Windows Chrome, via BrowserStack Local → the local dev server.
//   node capture-changes.mjs [--port 5199]
// Shots land in screenshots/changes/<device>-<name>.png
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Builder } from 'selenium-webdriver'
import browserstack from 'browserstack-local'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HUB = 'https://hub-cloud.browserstack.com/wd/hub'
const PORT = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10)
  : 5199

for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const user = process.env.BROWSERSTACK_USERNAME
const key = process.env.BROWSERSTACK_ACCESS_KEY

const DEVICES = [
  {
    id: 'iphone15',
    caps: { browserName: 'safari', 'bstack:options': { deviceName: 'iPhone 15', osVersion: '17' } },
  },
  {
    id: 'win-chrome',
    caps: { browserName: 'Chrome', 'bstack:options': { os: 'Windows', osVersion: '11', browserVersion: 'latest' } },
  },
]

// Each page visit: load, settle, optional in-page scroll, shot.
const SHOTS = [
  { name: 'home-rest', pagePath: '/', wait: 14000 },
  { name: 'bio-hero', pagePath: '/biography', wait: 9000 },
  {
    name: 'bio-exit-cards', pagePath: null, // stay on /biography
    js: `const b=[...document.querySelectorAll('button')].filter(x=>/Back to the start/.test(x.textContent));
         if(b.length)b[0].scrollIntoView({block:'center'});`,
    wait: 2500,
  },
]

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const localId = `robbysailing-chg-${stamp}`
const bs = new browserstack.Local()
await new Promise((res, rej) =>
  bs.start({ key, localIdentifier: localId, force: 'true', forceLocal: 'true' }, (e) => (e ? rej(e) : res()))
)
console.log('✓ tunnel up')

const shotDir = path.join(__dirname, 'screenshots', 'changes')
fs.mkdirSync(shotDir, { recursive: true })

try {
  for (const device of DEVICES) {
    const caps = {
      ...device.caps,
      'bstack:options': {
        ...device.caps['bstack:options'],
        userName: user, accessKey: key,
        projectName: 'robbysailing', buildName: `capture-changes-${stamp}`,
        sessionName: device.id,
        local: 'true', localIdentifier: localId,
      },
    }
    console.log(`▶ ${device.id}`)
    const driver = await new Builder().usingServer(HUB).withCapabilities(caps).build()
    try {
      for (const s of SHOTS) {
        if (s.pagePath) await driver.get(`http://bs-local.com:${PORT}${s.pagePath}`)
        if (s.js) await driver.executeScript(s.js)
        await driver.sleep(s.wait)
        fs.writeFileSync(path.join(shotDir, `${device.id}-${s.name}.png`), await driver.takeScreenshot(), 'base64')
        console.log(`  ✓ ${s.name}`)
      }

      // iPhone only: tap the baked orb and photograph the morph → curtain →
      // The Road hand-off (the transition this change set reworks).
      if (device.id === 'iphone15') {
        await driver.get(`http://bs-local.com:${PORT}/`)
        await driver.sleep(14000)
        await driver.executeScript(
          `document.querySelector('[role="button"][aria-label*="road to LA"]')?.click()`
        )
        for (const [name, ms] of [['orb-tap-morph', 1500], ['orb-tap-bridge', 1800], ['orb-tap-landed', 3500]]) {
          await driver.sleep(ms)
          fs.writeFileSync(path.join(shotDir, `${device.id}-${name}.png`), await driver.takeScreenshot(), 'base64')
          console.log(`  ✓ ${name} (url: ${await driver.getCurrentUrl()})`)
        }
      }
    } finally {
      try { await driver.quit() } catch { /* ignore */ }
    }
  }
} finally {
  await new Promise((r) => bs.stop(() => r()))
  console.log('✓ tunnel down')
}
