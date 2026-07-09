# robbysailing.com — Full Site Audit

**Branch:** `site-audit` (off `main`, commit `b86c412`) · **Date:** 2026-07-06
**Stack:** React 18 + Vite 6 SPA, react-router-dom 6, three.js 0.180 · deployed to **robbysailing.com** via GitHub Pages.
**Status:** Phase 1 (audit) + Phase 2 (report) complete. **No source changed yet** — awaiting go-ahead on Tier 1.

---

## How this was tested (evidence)

| Check | Method | Result |
|---|---|---|
| Production build | `npm run build` | ✅ clean, 1.17s, **no warnings/errors** |
| Runtime, all 6 routes × 375/768/1440px | Puppeteer (real Chrome, Metal WebGL) against **prod preview** (`vite preview`) **and dev** | ✅ **0 console errors, 0 pageErrors, 0 4xx/5xx, 0 broken images, 0 horizontal overflow** |
| React dev warnings | Same probe, dev server + StrictMode | Only 2 informational React-Router-v7 future-flag warnings (dev-only) |
| Internal routes/links | Source trace of every `<Route>`, `onNavigate`, redirect | ✅ no broken targets; **no `*` catch-all** (blank page on unknown URL) |
| External links (21) | `curl -L` + real headless Chrome | 17× **200**; 4× scuttlebutt **403** (see Open Questions) |
| Assets (every ref vs `git ls-files`/`check-ignore`/disk) | Source trace + git | ✅ **0 production 404s**, all refs tracked + correct-case |
| Hooks / leaks / error-boundary / bundle / re-renders | 5-agent read-only deep-dive workflow | See findings below |
| Secrets / env / CNAME / base path | grep + git | ✅ no secrets, CNAME deploy-safe, base path correct |

**Overall health: good.** The app is well-engineered — clean runtime, no leaks, correct WebGL lifecycle, correct code-splitting of three.js. The findings are almost entirely **hygiene, deploy-resilience, asset weight, and SEO/metadata** — not bugs a visitor hits today.

---

## ✅ Verified clean / already correct (no action — so we don't "fix" what isn't broken)

- **Build** clean, **base path** `/` correct for the apex domain, **`CNAME`** is git-tracked in `public/` → lands in `dist/CNAME` (`robbysailing.com`) every build (deploy-safe — *not* the classic wipe bug).
- **`404.html` === `index.html`** → SPA deep-link fallback works on GitHub Pages.
- **No secrets/keys/.env committed**; no `VITE_` env leakage (the app uses no env vars beyond `BASE_URL`).
- **Runtime is clean** on every route/width — no console errors, no broken images, **no horizontal scroll at 375/768/1440**.
- **No dead buttons / empty `href` / `javascript:void(0)` / missing handlers** anywhere. (Home background "dead space" is intentional by design.)
- **No resource leaks** — every WebGL scene, rAF loop, scroll/resize/visibility listener, observer, timer, and GIF decoder is cleaned up; StrictMode double-mount is explicitly handled.
- **No rules-of-hooks violations.** No missing-`key` warnings. No invalid DOM nesting. No duplicate `id`s.
- **three.js is already optimally code-split** — it is *not* in the entry bundle, loads via dynamic import, and never blocks first paint. `import * as THREE` does **not** bloat it (Rollup tree-shakes). **Do not** refactor three imports or try to "remove three from home" — no real saving exists.
- **System-font stack only** → zero web-font cost, no FOIT/FOUT.
- **No old-host URLs, no tracking/analytics snippets, no mixed content** (the one `http://` is an SVG `xmlns`, not a fetch). No Framer/builder cruft (this site was hand-built).

---

## Findings

Legend: **[T1]** invisible fix · **[T2]** visible/ambiguous (needs approval) · **[MANUAL]** owner decision · **[OK]** informational.

### A. Build, lint & config

- **[T1] No linting exists at all.** No ESLint config, no `lint` script, no `eslint-plugin-react-hooks` / `jsx-a11y`. Nothing has ever been lint-checked.
  *Why:* hooks-deps and a11y regressions can land silently. *Fix:* add ESLint (flat config) + `react-hooks` + `jsx-a11y` plugins as **dev** deps and a `lint` script. **⚠ Requires new dev dependencies — flagged for approval per ground rule 2.** (In its place, the deep-dive workflow already hand-audited hooks + a11y; results are in this report.)
- **[OK]** Build, base path, CNAME, secrets all correct (see "Verified clean").

### B. React correctness & robustness

- **[T1] No error boundary anywhere** (`src/main.jsx:7`). Any render/commit throw in any route — or in the always-mounted hidden `<Biography preload/>` — unmounts the whole tree → blank `#root`, no recovery.
  *Fix:* add one top-level class `ErrorBoundary` (`getDerivedStateFromError` + `componentDidCatch`), wrap `<App/>`. Invisible unless a crash occurs.
- **[T1] Lazy-chunk rejection white-screens the app after every deploy** (`src/App.jsx:530`). `TheRoad` is `React.lazy` with only a black-div `Suspense` fallback and **no error boundary**. When a deploy changes chunk hashes, an already-open tab that navigates to `/the-road` requests a hash that no longer exists → the `import()` rejects → whole app dies. This is the single most likely real-world failure mode (the `index.html`→`404.html` SPA fallback makes it *more* likely, not less).
  *Fix:* wrap the lazy route in the error boundary with a one-shot `window.location.reload()` on chunk-load error (sessionStorage-guarded against loops) + a retry-once `lazy()` wrapper. Invisible unless a chunk fails.
- **[T1] Hidden Biography preload widens the crash blast radius** (`src/App.jsx:543-550`). Because it's mounted on all 5 non-bio routes, a Biography-only throw blanks whatever page you're actually on. *Fix:* the top-level boundary fixes this; optionally give the preload its own swallow-failures boundary.
- **[T2] No `<noscript>`** (`index.html`). JS-off / failed-bundle visitors get a fully blank page. *Fix:* add a static `<noscript>` block (name + one-line bio + email). **Visible for no-JS visitors → Tier 2.**
- **[OK]** All WebGL entry points are correctly guarded (`hasWebGL2()` + try/catch + `.catch` on dynamic imports). Residual: module-eval data indexing in `TheRoad.jsx:134,736` relies on dev-only asserts (stripped in prod) — a *future* bad data edit to `campaignStops.js` would throw; the error boundary above contains it.

### C. Re-render / interaction performance

- **[T1] Hidden Biography preload re-renders a large subtree every second, forever, on 5/6 routes** (`src/pages/Biography.jsx:151`). `useCountdown` is **not** gated by the `preload` prop (unlike the spray/parallax effects that are), so its 1 Hz `setInterval(setNow)` reconciles the whole hidden bio VDOM once per second on Home/Team/Contact/Support/The Road — permanent, invisible background CPU. *Fix:* add an `enabled` param to `useCountdown`, pass `!preload`. Behavior-preserving.
- **[T1] Nav color-sampler forces a layout reflow on every scroll event** (`src/App.jsx:376`). `updateTriggerColor` runs an un-throttled scroll listener that does `elementFromPoint` + `getComputedStyle` (synchronous layout flush) — the classic phone-scroll-jank pattern, in compact/mobile nav mode. It *also* already runs on a 400ms interval, so the scroll sampling is redundant. *Fix:* rAF-coalesce to one sample/frame, or drop the scroll listener and keep the interval.
- **[T1] Home countdown re-renders all of `HomeIntro` every second** (`src/pages/MainView.jsx:48`) though only the tiny `CountdownCorner` consumes it. *Fix:* move `useCountdown` into `CountdownCorner` (as `TheRoad`'s `EndBlock` already does). Behavior-preserving.
- **[T2] Orb-morph drives React `setState` per frame** during the ~2.5s morph (`src/pages/MainView.jsx:165`) — likely intentional (transient, light DOM). Leave unless profiling shows jank.

### D. Functionality & connections

- **[T2] No `*` catch-all route** (`src/App.jsx:517-539`). Only 6 routes + 3 redirects; any other URL (typo, stale share) renders the **nav with a blank content area** — a silent blank page, not a helpful 404. *Fix:* add a `path="*"` route → a small 404 view or a redirect to Home. **New visible behavior → Tier 2.**
- **[OK]** Every internal `onNavigate`/link target resolves (unknown names safely fall back to `/`). Redirects `/coming-soon→/the-road`, `/event-calendar→/biography`, `/path→/team` all work.
- **[OK]** `mailto:robby@robbysailing.com` (`Contact.jsx`, personal) and `mailto:info@robbysailing.com` (`Footer.jsx`, general) are well-formed. Support intentionally has no form (static donate guide → external `sfny.org/donate`).
- **[MANUAL] 4 external press links return 403** (all `sailingscuttlebutt.com` articles) to both `curl` and real headless Chrome, while the site root returns 200 — see Open Questions.

### E. Assets & cruft

- **[T1] Dead dependency `@emailjs/browser`** (`package.json:15`) — imported nowhere. *Fix:* remove from deps + regenerate lockfile. (0 bundle impact — hygiene only.)
- **[T1] Orphan component `src/components/Marquee.jsx`** — imported nowhere, absent from the built bundle — **plus its dead `@keyframes marquee` CSS** (`src/index.css:189-193`). *Fix:* delete both.
- **[T1/MANUAL] ~8.5 MB of orphaned-but-deployed assets** ship to production for nothing: **15 unreferenced `public/sailing-photos/*` (~8.4 MB)** + small orphans `orb/orb-globe-poster.jpg` (57 KB, only the `.webp` is used), `charter-financial-logo.jpeg` + `charter-financial-logo-new.png` (both unused), `harvard-crest.png` (superseded by `Harvard-Crimson-Logo-2002.png`). *Fix:* delete from repo. **These are your personal photos — confirm you don't want them before I remove (Open Questions).**
- **[OK]** 3 `Screenshot*.png` in local `dist/` are gitignored/untracked → **never deployed** (local clutter only).
- **[OK] Fragile filenames** that work today but rely on URL-encoding: `[0001-0250].gif`, `IMG_5957 2.JPG` (space), `sailing-photos/P1233011 (1).JPG` (space+parens). Optional Tier-2 rename (see below).

### F. Loading & performance — bundle & code-splitting

- **[T1] Lazy-load `Team`** (`App.jsx:12,526`) — the largest page (1396 lines), only reachable via `/team`, not in the preload. ~9–11 KB gzip off the entry — the biggest clean win. *Fix:* `const Team = lazy(...)` + `Suspense` (fallback matched to `INNER_BG['/team']`).
- **[T1] Lazy-load `Support`** (`App.jsx:14,528`) — simple static page, ~1.5–2 KB gzip off entry.
- **[T1/OK] Contact** (42 lines, ~1 KB) is too small to split alone — leave eager, or group Contact+Support into one lazy chunk.
- **[T2] The `TheRoad` idle-prefetch fires on *every* route after 2.5s** (`App.jsx:224-227`), pulling the **123 KB-gz three chunk + 20 KB-gz TheRoad chunk onto the mobile home** (which uses the baked *video* orb and never instantiates three), plus `/contact` and `/support`. The clearest concrete waste in the audit. *Fix:* gate it (skip on `saveData`; on mobile rely on the existing orb-tap `warmTheRoad()`). **Changes load timing → Tier 2.**
- **[OK]** Lazy `Biography` is *not* worth it — the always-on preload + mobile inline render re-fetch its chunk on home anyway (would need to also gate the preload).
- **[OK]** three.js on desktop home is inherent to the hero and already split — no action.

### G. Loading & performance — images & media

- **[T1] Massive image weight (biggest visitor-facing win).** Deployed offenders:
  - `sponsor-ussailing.jpg` **5.65 MB** — a sponsor *card thumbnail*. Absurd. → ~150 KB WebP.
  - All 4 sponsor cards total **~8 MB** (`sfny` 1.0 MB, `ayc` 825 KB, `aaent` 576 KB) → resize + WebP/AVIF.
  - Earth globe textures **~4 MB** (`blue-marble` 1.46 MB, `night` 715 KB, `water`/`topology` PNGs) → WebP/optimize.
  - Bundled/imported photos run 400–783 KB each (`portrait` 783 KB, `img-5866` 727 KB, several 500–600 KB) → resize to display size + WebP.
  *Fix:* resize to actual display dimensions + convert to WebP/AVIF. **Tier 1 — verified pixel-identical per image; any visible quality change → revert + move to Tier 2.**
- **[T2] `public/[0001-0250].gif` is 6.8 MB** (the spinning-boat sprite in the orb). It's decoded frame-by-frame via `ImageDecoder`, so converting to video/spritesheet touches the decode path. → **Tier 2 (behavior risk)**; a smaller re-encode (fewer colors/frames) may be a safe Tier-1 subset.
- **[T1] No image is lazy-loaded except 4** (`Team`/`TheRoad` list photos). Add `loading="lazy"` to below-the-fold images. Invisible (defers offscreen loads).
- **[T1] No `<img>` has `width`/`height`** anywhere → layout-shift (CLS) risk. Add intrinsic dims or `aspect-ratio`. **Verify no shift per page** (most are CSS-sized already).
- **[T1] Orb-morph clip preloads eagerly** (`BakedOrb.jsx:367`, `preload="auto"`) — downloads `orb-morph.webm` **2.9 MB** on Home before any interaction. *Fix:* `preload="none"`/`"metadata"`. **Verify the tap→morph still starts instantly; if it hitches → revert.**

### H. Accessibility

- **[T1] Descriptive `alt` for meaningful images currently `alt=""`**: era/org logos (`Team.jsx:886`), athlete portraits (`Team.jsx:1181,1344`), the "ROBBY MEEK" wordmark (`SailingBanner.jsx:199`, `HomeFilmBridge.jsx:45`). *Fix:* add real alt text. Invisible (no render change). *(Decorative backdrops correctly keep `alt=""` — leave those.)*
- **[T1] Two clickable `<div>`s aren't keyboard-accessible** — `Biography.jsx:64` (RoadCard → The Road) and `Biography.jsx:338` (regatta card → scroll). *Fix:* add `role="button"` + `tabIndex={0}` + `onKeyDown`, or make them `<button>`. Invisible.
- **[T2] Heading hierarchy** — every non-bio route carries an extra empty `<h1>` from the (aria-hidden) preload, and **`/team` renders 4 real `<h1>`s** ("The singlehanded class." ×2, "Never sailed alone.", "THE TEAM"); Biography opens with `<h3>` before its only `<h1>` ("RESULTS"). The preload copy is `aria-hidden` so screen readers skip it, but the visible multi-`h1` is a real structure issue. *Fix:* one `<h1>` per view, demote the rest to `<h2>`. **Touches the Team crossfade DOM → verify no visual change → Tier 2.**
- **[OK]** No missing `alt` (26/26 imgs have the attribute). Focus states rely on default UA outline (acceptable). Contrast: text-on-darkened-photos is by design (owner uses photo-darkening filters, not scrims) — flagged only, not changed.

### I. SEO & metadata

- **[T1] Every route shares one `<title>`/description/OG** — no `react-helmet`, no `document.title`. `/biography`, `/team`, `/the-road` etc. all show the identical tab title + social preview. *Fix:* a tiny `useEffect(() => { document.title = ... })` per page (**no new dep**) or `react-helmet-async` (new dep — flag). Big SEO win, invisible to on-page visitors.
- **[T1] No canonical, no `sitemap.xml`, no `robots.txt`, no `apple-touch-icon`, no `theme-color`.** Favicon is SVG-only (iOS/Safari won't use it). *Fix:* add `<link rel="canonical">`, `public/robots.txt` + `public/sitemap.xml`, an `apple-touch-icon.png` (rasterize the SVG), `<meta name="theme-color">`. Invisible on-page.
- **[T1/OK]** OG description (`index.html:12`) differs from `<meta name="description">` (`:7`) — minor inconsistency; reconcile (metadata, not visible copy).
- **[T2/OK] Deep-link SEO caveat (architectural):** GitHub Pages serves `404.html` with an **HTTP 404 status** for deep URLs, and the SPA uses zero real `<a href>` anchors (all JS `onNavigate`), so crawlers see a 404 + no internal link graph for `/biography`, `/team`, etc. Fully fixing this means prerendering/SSG + real anchors — a large architectural change. Noted, not scoped into Tier 1.

### J. Minor hygiene (low priority, Tier 1)

- Silence the 2 dev-only React-Router-v7 future-flag warnings by adding `future={{ v7_startTransition:true, v7_relativeSplatPath:true }}` to `<BrowserRouter>`.
- `usePageEntrance.js:14` empty deps array with a `itemCount` it reads (latent — safe today, all callers pass constants); `TheRoad.jsx:515` `onGlobeReady` unstable-dep re-invocation (benign — idempotent). Optional dep-array tidy-ups.

---

## Tier 1 — proposed fix plan (invisible; one commit per category)

| # | Category | Fixes | Appearance risk |
|---|---|---|---|
| 1 | **Dead code / deps** | remove `@emailjs/browser`; delete `Marquee.jsx` + dead `@keyframes marquee` | none |
| 2 | **Orphaned assets** | delete ~8.5 MB unreferenced photos/logos *(confirm first)* | none |
| 3 | **Error boundary + deploy resilience** | top-level `ErrorBoundary`; wrap lazy route with chunk-error reload/retry | none unless crash |
| 4 | **Re-render perf** | gate preload `useCountdown`; localize home countdown; rAF-throttle nav color sampler | none |
| 5 | **Code-splitting** | lazy-load `Team`, `Support` | none (fade masks swap) |
| 6 | **Image/media optimization** | resize + WebP for sponsors/earth/imported photos; orb-morph `preload` | **verify per image** |
| 7 | **Lazy-load + CLS** | `loading="lazy"` below-fold; `width`/`height`/`aspect-ratio` | **verify no shift** |
| 8 | **SEO/metadata** | per-route titles+desc; canonical; sitemap; robots; apple-touch-icon; theme-color | none on-page |
| 9 | **Accessibility** | descriptive `alt`; keyboard-enable 2 clickable divs | none |
| 10 | **Minor hygiene** | RR v7 future flags; dep-array tidy-ups | none (dev-only) |
| 11 | **Lint tooling** *(⚠ new dev deps — approve first)* | ESLint + react-hooks + jsx-a11y + `lint` script | none |

## Tier 2 — needs your explicit approval (visible / ambiguous)

1. **Catch-all `404` route** — blank content area → a real 404 view or redirect.
2. **`<noscript>` fallback** — visible content for JS-off visitors.
3. **Gate the `TheRoad` idle-prefetch** — stops mobile home/contact/support from downloading three.js; slightly slows a later first `/the-road` nav.
4. **Heading hierarchy** — collapse `/team`'s 4 `<h1>`s to one + `<h2>`s; fix Biography `h3`-before-`h1`.
5. **6.8 MB boat GIF → video/spritesheet** — touches the `ImageDecoder` path.
6. **Rename fragile-filename assets** (spaces/brackets) + update refs.
7. **Deep-link SEO** — prerender/SSG + real `<a>` anchors (architectural).

## Open questions for you

1. **4 scuttlebutt press links** (`Biography.jsx` PRESS list) return **403** to curl *and* real headless Chrome, while the site root returns 200 — so either the articles were removed, or the site blocks automated/headless clients. **Please click them in your normal browser** to confirm they still work for humans. I won't touch press links (content is final) without your say-so.
2. **Delete the ~8.5 MB of orphaned personal photos** from the repo (Tier 1 #2)? They're your images, just currently unreferenced — confirm they're not being saved for later.
3. **OK to add ESLint** (dev-only) and, if you prefer it over a hand-rolled `useEffect`, `react-helmet-async` for per-route titles? Both are new dependencies (ground rule 2 flag).

---

# Phase 3–5 — Execution results (Tier 1 applied)

Your decisions: **do all Tier 1**, **move orphaned photos out of the repo**, **ESLint (dev-only) + per-route titles via a no-dep `useEffect`** (zero runtime deps). All work is on branch `site-audit`, one commit per category, each verified before moving on. Not merged.

## Summary table

| # | Category | Commit | What changed | Evidence |
|---|---|---|---|---|
| 1 | Dead code / deps | `a6ee5d0` | remove `@emailjs/browser`, delete `Marquee.jsx` + dead `@keyframes` | build green; provably unused |
| 2 | Orphaned assets | `e8f1be5` | 20 files (~8.5 MB) moved to `~/Desktop/robbysailing-assets/archive/…` | probe identical, 0 broken |
| 3 | Error boundary + deploy resilience | `c103f8f` | top-level `ErrorBoundary`, `lazyWithRetry`, `silent` preload boundary | **functional test:** throwing route → fallback + Reload; normal routes unaffected |
| 4 | Re-render perf | `44609f1` | gate preload `useCountdown`; rAF-throttle nav color sampler | probe identical; visible countdowns unchanged |
| 5 | Code-splitting | `39dba68` | lazy-load `Team` + `Support` | entry **259→231 kB** gz 80.9→73.3; routes render identical |
| 6 | Image optimization | `d26766f` | resize/recompress 6 oversized public images in place (~6 MB) | **visually verified** (sponsor images pristine, no artifacts) |
| 7 | Lazy-load below-fold | `d307201` | `loading="lazy"` on ExitNav + deep Team images | scroll-check: all load, 0 broken; Team lazy 4→20 |
| 8 | SEO / metadata | `152f29a` | per-route title/description/canonical; robots.txt; sitemap.xml; apple-touch-icon; theme-color | each route now shows a distinct title |
| 9 | Accessibility | `25000f1` | descriptive `alt` on 2 content images; keyboard access on 2 card buttons | probe identical (attribute-only) |
| 10 | Hooks dep fix | `854267e` | declare `usePageEntrance` effect deps | reveals still fire on Support/Team/The Road |
| 11 | ESLint tooling | `06e2403` | ESLint 9 + react-hooks + jsx-a11y + `lint` script | `npm run lint` **passes** (0 errors, 22 advisory warnings) |

**Verification method:** a Puppeteer harness captured a **baseline** (12 screenshots + a DOM probe — overflow, `<h1>`s, image counts, broken images, titles, console errors — per route × desktop/mobile) and re-ran it after every category. Every category's probe matched baseline (no layout change, 0 broken images, 0 console errors). Image quality and the render of each page were confirmed by eye.

## Deferred to Tier 2 (moved there to honour "nothing gets messed up")

These are Tier-1-flavoured but carry a real risk of visibly changing behaviour, so they were **not** applied and await your call:

- **Home countdown → `CountdownCorner` localization** (cat 4) — multi-hop refactor of the home page; marginal benefit.
- **React Router v7 future flags** (cat 10) — `v7_startTransition` could disturb the custom route-transition machine; the warnings are dev-only.
- **`TheRoad` `onGlobeReady` ref-guard** (cat 10) — currently benign (idempotent); touching the globe hand-off isn't worth it.
- **Explicit `width`/`height` for CLS** (cat 7) — this site sizes everything via CSS; adding intrinsic dims risks layout shifts.
- **Orb-morph clip `preload="none"`** (cat 7) — could stall the signature orb→globe morph on first tap.
- **`src/assets` hero-photo optimization / WebP** (cat 6) — sips recompression backfired (bigger + quality loss); real savings need a WebP/AVIF build step (a flagged dev tool).

## Phase 4 — Tier 2 items awaiting your approval

(unchanged from the Tier 2 list above) — catch-all 404 route · `<noscript>` fallback · gate the three.js idle-prefetch off mobile home · heading hierarchy (`/team`'s 4 `<h1>`s) · 6.8 MB GIF → video · rename fragile-filename assets · prerender-for-SEO — **plus** the six deferred items just above. Reply with the numbers/names you want and I'll implement them one commit each with before/after evidence.

## Phase 5 — Final verification & state of the site

Clean `rm -rf dist && npm run build` succeeds with no warnings; `npm run lint` passes; `dist/CNAME` = `robbysailing.com`; the final probe is clean on all 6 routes × 375/768/1440 (no overflow, no broken images, **0 console errors**, distinct per-route titles, lazy loading active). `git diff main --stat`: **44 files, +3579 / −394** (the bulk of the insertions is `package-lock.json` for the ESLint dev-deps).

**State of the site:** robbysailing was already well-built — clean runtime, no memory leaks, correct WebGL lifecycle, sensible code-splitting — so this pass was about resilience, weight, and discoverability rather than bug-fixing. It now survives a component crash and a post-deploy stale-chunk load instead of white-screening, ships **~14.5 MB lighter** (≈8.5 MB orphans removed + ≈6 MB image optimization) with a **~24 KB-gz smaller entry bundle** and lazy below-the-fold images, stops doing permanent 1 Hz background work on 5/6 routes, presents a distinct title/description/canonical per route with a sitemap/robots/touch-icon, is keyboard-operable on its card buttons, and has a lint gate for the future — all with the rendered design pixel-for-pixel unchanged. **Not merged — the `site-audit` branch is yours to review and merge.**
