// One-off: sanity-check the LA 2028 sea-spray dissolve on a real iPhone.
//   node spray-check.mjs [--port 5210]
// Scrubs the headline across the top edge on /biography and /the-road and
// photographs mid-burst, the hanging oval, and reassembly.
// Shots land in screenshots/spray/<name>.png
//
// NB: the effect's standstill evaporation would fade the cloud during the
// screenshot round-trip, so a ±1px scroll "wiggler" keeps velocity alive
// while the shot is taken (mirrors a thumb resting mid-scroll).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Builder } from 'selenium-webdriver'
import browserstack from 'browserstack-local'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const HUB = 'https://hub-cloud.browserstack.com/wd/hub'
const PORT = process.argv.includes('--port')
  ? parseInt(process.argv[process.argv.indexOf('--port') + 1], 10)
  : 5210

for (const line of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
}
const user = process.env.BROWSERSTACK_USERNAME
const key = process.env.BROWSERSTACK_ACCESS_KEY

// Per-page: the sprayed headline differs (RESULTS on /biography, LA 2028 on
// /the-road finale). A missing headline leaves __top = 0, which photographs
// the hero instead of the spray — the DIAG h1Top field is the tell.
const FIND_H1 = (text) => `window.__h1 = [...document.querySelectorAll('h1')].find(h => h.textContent.replace(/\\s/g,'') === '${text}');
window.__top = window.__h1 ? window.__h1.getBoundingClientRect().top + window.scrollY : 0;`
const WIGGLE_ON = `clearInterval(window.__wig); let i = 0;
window.__wig = setInterval(() => window.scrollBy(0, (i++ % 2) ? 1 : -1), 120);`
const WIGGLE_OFF = `clearInterval(window.__wig);`

// steps: [label, js, sleepMs, shot?]
const PAGES = [
  {
    pagePath: '/biography', settle: 9000,
    steps: [
      ['arm', `${FIND_H1('RESULTS')} window.scrollTo(0, window.__top - window.innerHeight);`, 3000, false],
      ['bio-mid', `window.scrollTo(0, window.__top + 50); ${WIGGLE_ON}`, 900, true],
      ['bio-oval', `window.scrollTo(0, window.__top + 200);`, 900, true],
      ['bio-reassembled', `${WIGGLE_OFF} window.scrollTo(0, window.__top - 300);`, 1300, true],
    ],
  },
  {
    pagePath: '/the-road', settle: 12000,
    steps: [
      ['arm', `${FIND_H1('LA2028')} window.scrollTo(0, window.__top - window.innerHeight);`, 3000, false],
      ['cs-mid', `window.scrollTo(0, window.__top + 60); ${WIGGLE_ON}`, 900, true],
      ['cs-oval', `window.scrollTo(0, window.__top + 220);`, 900, true],
      ['cs-reassembled', `${WIGGLE_OFF} window.scrollTo(0, window.__top - 400);`, 1300, true],
    ],
  },
]

const DIAG = `return JSON.stringify({
  path: location.pathname, y: window.scrollY, h1Top: window.__top,
  sprayCanvas: [...document.querySelectorAll('canvas')].map(c => ({ z: c.style.zIndex, display: c.style.display, h: c.style.height })),
})`

const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const localId = `robbysailing-spray-${stamp}`
const bs = new browserstack.Local()
await new Promise((res, rej) =>
  bs.start({ key, localIdentifier: localId, force: 'true', forceLocal: 'true' }, (e) => (e ? rej(e) : res()))
)
console.log('✓ tunnel up')

const shotDir = path.join(__dirname, 'screenshots', 'spray')
fs.mkdirSync(shotDir, { recursive: true })

const caps = {
  browserName: 'safari',
  'bstack:options': {
    deviceName: 'iPhone 15', osVersion: '17',
    userName: user, accessKey: key,
    projectName: 'robbysailing', buildName: `spray-check-${stamp}`,
    sessionName: 'iphone15-spray',
    local: 'true', localIdentifier: localId,
  },
}

try {
  console.log('▶ iphone15')
  const driver = await new Builder().usingServer(HUB).withCapabilities(caps).build()
  try {
    for (const page of PAGES) {
      await driver.get(`http://bs-local.com:${PORT}${page.pagePath}`)
      await driver.sleep(page.settle)
      for (const [name, js, ms, shot] of page.steps) {
        await driver.executeScript(js)
        await driver.sleep(ms)
        if (shot) {
          fs.writeFileSync(path.join(shotDir, `iphone15-${name}.png`), await driver.takeScreenshot(), 'base64')
          console.log(`  ✓ ${name}`)
        }
      }
      console.log(`  diag: ${await driver.executeScript(DIAG)}`)
    }
  } finally {
    try { await driver.quit() } catch { /* ignore */ }
  }
} finally {
  await new Promise((r) => bs.stop(() => r()))
  console.log('✓ tunnel down')
}
