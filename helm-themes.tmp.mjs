import puppeteer from 'puppeteer-core'
const OUT = '/private/tmp/claude-501/-Users-robbymeek/49ff0799-3590-4ca0-ac92-9cd05f19e784/scratchpad/helm-shots'
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: false,
  userDataDir: '/tmp/helm-verify-profile',
  args: ['--ignore-gpu-blocklist', '--use-angle=metal', '--no-first-run', '--no-default-browser-check', '--window-size=1470,1000', '--hide-crash-restore-bubble'],
})
const errors = []
const page = await browser.newPage()
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('paddingBottom')) errors.push(`console: ${m.text()}`) })
for (const [tag, url] of [
  ['theme-classic', 'http://localhost:5199/'],
  ['theme-photo', 'http://localhost:5199/?helm=photo'],
  ['theme-blend', 'http://localhost:5199/?helm=blend'],
]) {
  await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 })
  await page.goto(url, { waitUntil: 'networkidle2' })
  await new Promise((r) => setTimeout(r, 3500))
  await page.evaluate(() => window.scrollTo(0, window.innerHeight))
  await new Promise((r) => setTimeout(r, 850))
  await page.screenshot({ path: `${OUT}/${tag}.png` })
}
await browser.close()
console.log(errors.length ? errors.join('\n') : 'NO ERRORS')
