// ============================================================================
//  routeMeta — the ONE source of per-route <head> metadata.
// ============================================================================
//  Used by BOTH:
//    • build time — scripts/generate-static-routes.mjs bakes these into a real
//      dist/<route>/index.html for each route (so a direct hit returns HTTP 200
//      with the RIGHT title/description/canonical/OG before any JS runs), and
//      into dist/404.html for genuinely unknown URLs.
//    • run time   — src/lib/seo.js applies the same values on React Router
//      navigation, so client-side nav updates the tab title + social tags too.
//  Keeping one map means the static HTML and the SPA can never describe a route
//  two different ways.
//
//  PLAIN DATA ONLY — no import.meta / Vite-isms — so the Node build script can
//  import it directly.

const ORIGIN = 'https://robbysailing.com'
const OG_IMAGE = `${ORIGIN}/og-home.jpg` // the campaign share image (absolute URL)

// Build a full meta record from the editable bits. `social` overrides the OG /
// Twitter description when it should differ from the on-page meta description.
function make({ path, title, description, social, ogType = 'website' }) {
  const canonical = ORIGIN + (path === '/' ? '/' : path)
  const socialDesc = social || description
  return {
    title,
    description,
    canonical,
    ogTitle: title,
    ogDescription: socialDesc,
    ogUrl: canonical,
    ogImage: OG_IMAGE,
    ogType,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: socialDesc,
    twitterImage: OG_IMAGE,
  }
}

const BRAND = 'Robby Meek | LA2028 Olympic Sailing Campaign'

// Ordered so the generator emits them predictably; keys are the canonical route
// paths (no trailing slash except home).
export const ROUTE_META = {
  '/': make({
    path: '/',
    title: BRAND,
    description:
      'Official site of Robby Meek — Olympic hopeful and sailing athlete. Bio, partners, updates, and events from his road to LA 2028.',
    social:
      'Harvard student and US ODP sailor campaigning for the 2028 Olympics in Los Angeles. Follow the journey.',
  }),
  '/biography': make({
    path: '/biography',
    title: 'Biography · Robby Meek — LA2028 Sailing',
    description: "Robby Meek's sailing biography and race results on the road to the 2028 Olympics.",
  }),
  '/team': make({
    path: '/team',
    title: 'The Team · Robby Meek — LA2028 Sailing',
    description: "The team and partners behind Robby Meek's LA 2028 Olympic sailing campaign.",
  }),
  '/the-road': make({
    path: '/the-road',
    title: 'The Road · Robby Meek — LA2028 Sailing',
    description:
      "The Road to LA 2028 — the schedule and journey of Robby Meek's Olympic sailing campaign.",
  }),
  '/contact': make({
    path: '/contact',
    title: 'Contact · Robby Meek — LA2028 Sailing',
    description: 'Get in touch with Robby Meek.',
  }),
  '/support': make({
    path: '/support',
    title: 'Support · Robby Meek — LA2028 Sailing',
    description: "Support Robby Meek's LA 2028 Olympic sailing campaign.",
  }),
}

// Served (with an HTTP 404) for genuinely unknown URLs, and applied by the SPA's
// wildcard NotFound route. Canonical points home so a shared bad link still
// resolves to the site.
export const NOT_FOUND_META = make({
  path: '/',
  title: 'Page not found · Robby Meek — LA2028 Sailing',
  description:
    "That page doesn't exist. Head back to Robby Meek's LA 2028 Olympic sailing campaign.",
})
