// ============================================================================
//  generate-static-routes — post-build static HTML for every valid route.
// ============================================================================
//  Runs after `vite build` (see package.json). GitHub Pages serves a physical
//  file with HTTP 200; without one it falls back to 404.html with HTTP 404. So
//  for each valid route we bake a real dist/<route>/index.html carrying that
//  route's OWN title/description/canonical/OG/Twitter — a direct hit or a
//  refresh then returns 200 with correct metadata BEFORE any JS runs. Unknown
//  URLs still fall through to dist/404.html (kept 404) → the SPA's NotFound.
//
//  The metadata comes from the SAME src/data/routeMeta.js the client uses at
//  runtime (src/lib/seo.js), so the static HTML and the SPA can't drift. We only
//  swap the head's text/attribute VALUES — the Loading splash, the per-route
//  first-paint background script and the hashed asset tags (absolute /assets/…,
//  so they resolve from nested dirs) are left exactly as Vite emitted them.
//
//  Do NOT hand-edit dist/*. Edit routeMeta.js or this script.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ROUTE_META, NOT_FOUND_META } from '../src/data/routeMeta.js'

const DIST = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const escText = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const escAttr = (s) => escText(s).replace(/"/g, '&quot;')

// Replace exactly one occurrence, failing LOUDLY if the tag isn't found — so a
// future change to index.html's head that breaks a selector fails the build
// instead of silently shipping stale metadata.
function swap(html, re, value, label) {
  if (!re.test(html)) {
    throw new Error(`generate-static-routes: "${label}" not found in dist/index.html — did the <head> template change?`)
  }
  return html.replace(re, (_m, p1 = '', p2 = '') => `${p1}${value}${p2}`)
}

const setTitle = (html, v) =>
  swap(html, /(<title>)[\s\S]*?(<\/title>)/, escText(v), 'title')
const setCanonical = (html, v) =>
  swap(html, /(<link rel="canonical" href=")[^"]*(")/, escAttr(v), 'canonical')
const setMeta = (html, attr, key, v) =>
  swap(html, new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), escAttr(v), `${attr}="${key}"`)

function render(template, meta) {
  let html = setTitle(template, meta.title)
  html = setMeta(html, 'name', 'description', meta.description)
  html = setCanonical(html, meta.canonical)
  html = setMeta(html, 'property', 'og:title', meta.ogTitle)
  html = setMeta(html, 'property', 'og:description', meta.ogDescription)
  html = setMeta(html, 'property', 'og:url', meta.ogUrl)
  html = setMeta(html, 'property', 'og:image', meta.ogImage)
  html = setMeta(html, 'property', 'og:type', meta.ogType)
  html = setMeta(html, 'name', 'twitter:card', meta.twitterCard)
  html = setMeta(html, 'name', 'twitter:title', meta.twitterTitle)
  html = setMeta(html, 'name', 'twitter:description', meta.twitterDescription)
  html = setMeta(html, 'name', 'twitter:image', meta.twitterImage)
  return html
}

const template = await readFile(join(DIST, 'index.html'), 'utf8')
const written = []

for (const [path, meta] of Object.entries(ROUTE_META)) {
  const html = render(template, meta)
  const outDir = path === '/' ? DIST : join(DIST, path.replace(/^\/+/, ''))
  await mkdir(outDir, { recursive: true })
  await writeFile(join(outDir, 'index.html'), html)
  written.push(path === '/' ? 'index.html' : `${path.replace(/^\/+/, '')}/index.html`)
}

// The genuine unknown-URL fallback: served WITH an HTTP 404 by GitHub Pages, so
// it carries Not Found metadata (the SPA's wildcard renders the designed page).
await writeFile(join(DIST, '404.html'), render(template, NOT_FOUND_META))
written.push('404.html')

console.log(`generate-static-routes: wrote ${written.length} files → ${written.join(', ')}`)
