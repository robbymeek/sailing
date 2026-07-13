// Per-route <head> metadata for the SPA. Applied by an effect in App.jsx on
// every route change — no react-helmet dependency. The values come from the
// shared ../data/routeMeta.js map, the SAME map scripts/generate-static-routes
// bakes into each route's static index.html at build time, so the initial HTML
// (what crawlers/social scrapers read) and the client-side updates can never
// describe a route two different ways.

import { ROUTE_META, NOT_FOUND_META } from '../data/routeMeta'

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertCanonical(href) {
  let el = document.head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', 'canonical')
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

export function applyRouteMeta(pathname) {
  // Normalise the way the app + the index.html first-paint script do (case /
  // trailing slash), then fall back to the Not Found metadata for any route the
  // SPA's wildcard renders.
  const key = pathname.toLowerCase().replace(/\/+$/, '') || '/'
  const meta = ROUTE_META[key] || NOT_FOUND_META

  document.title = meta.title
  upsertMeta('name', 'description', meta.description)
  upsertCanonical(meta.canonical)

  upsertMeta('property', 'og:title', meta.ogTitle)
  upsertMeta('property', 'og:description', meta.ogDescription)
  upsertMeta('property', 'og:url', meta.ogUrl)
  upsertMeta('property', 'og:image', meta.ogImage)
  upsertMeta('property', 'og:type', meta.ogType)

  upsertMeta('name', 'twitter:card', meta.twitterCard)
  upsertMeta('name', 'twitter:title', meta.twitterTitle)
  upsertMeta('name', 'twitter:description', meta.twitterDescription)
  upsertMeta('name', 'twitter:image', meta.twitterImage)
}
