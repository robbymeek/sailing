// One-off: capture scrolled phone views of a page on a real iPhone (BrowserStack
// Local → local dev server). Unlike run.js (orb verdict), this just scrolls to a
// few positions and screenshots, so we can eyeball the scroll-driven Coming Soon
// tour on a phone.  Usage:  node capture.js
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Builder } from 'selenium-webdriver'
import browserstack from 'browserstack-local'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HUB = 'https://hub-cloud.browserstack.com/wd/hub'
const PORT = 5173

for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const user = process.env.BROWSERSTACK_USERNAME
const key = process.env.BROWSERSTACK_ACCESS_KEY

const PAGE = '/coming-soon'
const LOAD_WAIT = 22000 // Coming Soon lazy-loads the globe engine + Earth textures — slow over the tunnel
// (name, scroll fraction of full scrollHeight, settle ms after scrolling)
const SHOTS = [
  { name: 'cs-hero', frac: 0, settle: 2500 },
  { name: 'cs-stop', frac: 0.33, settle: 3000 },
  { name: 'cs-finale', frac: 0.9, settle: 4000 },
]

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const localId = `robbysailing-cap-${stamp}`
const bs = new browserstack.Local()
await new Promise((res, rej) =>
  bs.start({ key, localIdentifier: localId, force: 'true', forceLocal: 'true' }, (e) => (e ? rej(e) : res()))
)
console.log('✓ tunnel up')

const caps = {
  browserName: 'safari',
  'bstack:options': {
    deviceName: 'iPhone 15', osVersion: '17',
    userName: user, accessKey: key,
    projectName: 'robbysailing', buildName: `capture-${stamp}`,
    local: 'true', localIdentifier: localId,
  },
}
const driver = await new Builder().usingServer(HUB).withCapabilities(caps).build()
const shotDir = path.join(__dirname, 'screenshots')
fs.mkdirSync(shotDir, { recursive: true })
try {
  await driver.get(`http://bs-local.com:${PORT}${PAGE}`)
  await driver.sleep(LOAD_WAIT) // let the globe boot + textures decode
  for (const s of SHOTS) {
    await driver.executeScript(
      `window.scrollTo(0, ${s.frac} * (document.body.scrollHeight - window.innerHeight))`
    )
    await driver.sleep(s.settle)
    fs.writeFileSync(path.join(shotDir, `${s.name}.png`), await driver.takeScreenshot(), 'base64')
    console.log('✓ shot', s.name)
  }
} finally {
  try { await driver.quit() } catch { /* ignore */ }
  await new Promise((r) => bs.stop(() => r()))
  console.log('✓ tunnel down')
}
