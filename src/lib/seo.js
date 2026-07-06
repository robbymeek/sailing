// Per-route <title>, meta description, and canonical URL for the SPA.
// Applied by an effect in App.jsx on every route change — no react-helmet
// dependency. index.html still carries the default/home head (and the OG /
// Twitter tags social scrapers read), so no-JS crawlers get sensible defaults;
// this upgrades the per-route signal for JS-capable crawlers and browser tabs.
//
// These titles/descriptions are editable metadata assembled from the existing
// page names + brand line — not on-page copy. Tweak freely.

const BRAND = 'Robby Meek | LA2028 Olympic Sailing Campaign'
const ORIGIN = 'https://robbysailing.com'

const ROUTE_META = {
  '/': {
    title: BRAND,
    description:
      'Official site of Robby Meek — Olympic hopeful and sailing athlete. Bio, partners, updates, and events from his road to LA 2028.',
  },
  '/biography': {
    title: 'Biography · Robby Meek — LA2028 Sailing',
    description: "Robby Meek's sailing biography and race results on the road to the 2028 Olympics.",
  },
  '/team': {
    title: 'The Team · Robby Meek — LA2028 Sailing',
    description: "The team and partners behind Robby Meek's LA 2028 Olympic sailing campaign.",
  },
  '/the-road': {
    title: 'The Road · Robby Meek — LA2028 Sailing',
    description: "The Road to LA 2028 — the schedule and journey of Robby Meek's Olympic sailing campaign.",
  },
  '/contact': {
    title: 'Contact · Robby Meek — LA2028 Sailing',
    description: 'Get in touch with Robby Meek.',
  },
  '/support': {
    title: 'Support · Robby Meek — LA2028 Sailing',
    description: "Support Robby Meek's LA 2028 Olympic sailing campaign.",
  },
}

function upsertMeta(name, content) {
  let el = document.head.querySelector(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
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
  const meta = ROUTE_META[pathname] || ROUTE_META['/']
  document.title = meta.title
  upsertMeta('description', meta.description)
  upsertCanonical(ORIGIN + (pathname === '/' ? '/' : pathname))
}
