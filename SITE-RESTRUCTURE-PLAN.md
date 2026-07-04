# Site Restructure Plan — the temporal spine

_Drafted 2026-07-03 from a brainstorm session; execution began 2026-07-04._

**Status:** steps 1–3 (The Road rename, LA 2028 corner retarget, Event
Calendar deletion + redirects, Biography → RESULTS) landed in PR #11. The
Team rework (step 5) is implemented in `feat/the-team` — bottom-of-page
treatment pending the owner's visual confirmation. Step 4 (event data
unification) remains deferred until the pages settle.

## The problem being solved

Two overlaps were identified:

1. **Path & Team vs. Coming Soon** — both are scroll-driven timeline journeys that
   climax on the identical beat: big "2028" + days-until countdown + support CTA.
   Path's last two entries (2027 Worlds, 2028 LA) are a compressed duplicate of the
   Coming Soon page's entire premise.
2. **Biography events section vs. Event Calendar page** — not similar, *identical*:
   same data (`src/data/events.js`), same components (`EventRow`/`BridgeRow`/
   `EventModal`), same header stack (LA 2028 + countdown + "Next Event" + hint).
   The standalone page is reachable only from the home page's LA 2028 corner.

## The organizing idea

The site becomes a **timeline spine** and each page owns one time-slice:

| Time-slice | Page | Job |
|---|---|---|
| The record (past races) | **Results** (Biography's events section, retitled) | race-by-race archive |
| The story (past → now) | **The Team** (renamed from "Path & Team") | the team, celebrated through the journey it powered |
| The person (now) | **Biography** | who Robby is + recent form + press |
| The course ahead (future) | **The Road** (renamed from "Coming Soon") | every upcoming event, globe tour |

Links point *along* the spine (past ← present → future), and the ExitNav
(canonical in `src/components/exitCards.js`) handles all lateral movement.
That's a line, not a web — no confusing cross-linking.

---

## Decided changes

### 1. Rename "Coming Soon" → "The Road"

The page's own headline is already "The Road to LA 2028" — the nav label catches
up to it, and it pairs with "Path" (the path behind / the road ahead).

Touch points (all references to the internal page key `'Coming Soon'` and the
`/coming-soon` path):

- `src/components/Nav.jsx:3` — `PAGES` array entry (also displayed label).
- `src/App.jsx` — `COMPACT_PAGES` (line ~8), background/theme/title maps for
  `/coming-soon` (~29, 40, 51), nav-variant check (~67), page→path map (~113),
  the Route itself (~494), **and the raw pathname string checks** at ~157
  (globe-ready safety net) and ~167 (blackBridge curtain clear) — these MUST be
  updated together or the orb hand-off breaks silently.
- Navigation call sites: `src/components/eventUI.jsx:44` (BridgeRow),
  `src/pages/Biography.jsx:64` (ComingSoonCard), `src/pages/MainView.jsx:378,
  561, 568` (orb → tour).
- `src/pages/Biography.jsx` ComingSoonCard kicker text ("Coming Soon" eyebrow →
  something like "Up Next" or "The Road").
- Optional, cosmetic: rename `ComingSoon.jsx` → `TheRoad.jsx` and the lazy import.

URL strategy: route becomes `/the-road`; keep an in-app redirect
`/coming-soon` → `/the-road` so old links/bookmarks survive. GitHub Pages SPA
routing already funnels unknown paths through 404.html→index.html, so the
in-app redirect is sufficient. **CORRECTED (2026-07-04): do NOT use a
`<Navigate>` route element** — see "Execution notes" below for why and for the
safe mechanism.

Low-risk fallback if a full rename feels heavy: change only the *displayed*
label via `SHORT_LABELS` in Nav.jsx and keep internal keys/URL. But the full
rename is preferred — the URL is user-facing too.

⚠ Invariant to preserve (from prior work): the orb→tour hand-off is stateless
nav + one-shot `orbOverlay.pendingFromOrb`. Do NOT move `fromOrb` into router
state. Re-test the seamless morph on a real iPhone after the rename
(`browserstack/capture-changes.mjs`).

### 2. Home "LA 2028" corner → The Road

`src/pages/MainView.jsx:760` (`CountdownCorner`): `onNavigate('Event Calendar')`
becomes the Road page. "LA 2028" as a label promises the campaign/future page;
now it delivers it.

### 3. Delete the standalone Event Calendar page

- Remove `src/pages/EventCalendar.jsx`.
- `src/App.jsx`: remove the import (~11), the `/event-calendar` title map entry
  (~46), the page→path entry (~107), the Route (~489), and **the off-screen
  preload** (`displayLocation.pathname !== '/event-calendar' && <EventCalendar…>`
  at ~509).
- Add a redirect `/event-calendar` → `/biography` (ideally scrolling to the
  Results section) for old bookmarks.
- Update the stale comments in `src/data/events.js` and
  `src/components/eventUI.jsx` that reference "the standalone Event Calendar
  page".
- Side benefit: the hard-coded "Next Event: San Pedro OCR" line + its
  `2026-07-20` date currently live in BOTH files; after deletion only the
  Biography copy remains — no more parallel edits.

### 4. Biography events section → the Results archive

The section keeps its full design — dark background, event rows, modals, the
chrome BridgeRow "door" at the top of the list pointing forward to The Road —
and becomes the site's single home for past results.

- **Retitle the headline.** Working title: **RESULTS** (open: see title options
  below). The spray dissolve STAYS — it's applied to whatever headline text is
  there. `useTextSpray` measures per-glyph `<span>`s, so the new title must be
  rendered the same way the current "LA 2028" is
  (`'RESULTS'.split('').map(...)` per-glyph spans, `palette: 'white'`).
- Keep the spray invariants: `enabled: !preload` (App mounts a hidden Biography
  preload — the guard prevents a zombie GL loop), `pausedRef` while the
  EventModal is open, fadeRefs for the lines under the headline.
- **DECIDED: drop the Olympic countdown from the Results header.** The Road
  owns the LA 2028 + countdown climax now — one page, one climax. The chrome
  "Next Event: … in N days" line STAYS (and points forward — it should link to
  The Road). Its data should eventually derive from the shared event source
  (see "Event data unification" below) instead of the hard-coded name + date.
- `events.js` stays past-only; future events remain on The Road
  (`campaignStops.js`). Add results rows here as regattas finish.

Title candidates (undecided): `RESULTS` · `THE RECORD` · `RACE LOG` ·
`THE WAKE` (sailing pun — the wake behind the boat, pairing with The Road
ahead; possibly too clever).

### 5. The Road = the detailed future-events page

Content direction: really future-event focused — the authoritative outline of
every upcoming event (already `src/data/campaignStops.js`, 18 stops). No
structural change needed now beyond the rename; candidate enrichments later
(per-stop detail cards, dates/venues expansion) once Results owns the past.

### 6. Cleanup: orphaned `Team.jsx` (coordinates with The Team rework)

`src/pages/Team.jsx` is routed at `/team` but linked from nowhere (nav,
exit cards, and all `onNavigate` calls skip it); its sponsor content was
absorbed into `Path.jsx`. Since the rework renames Path & Team to "The Team",
the routing plan is: delete the orphaned `Team.jsx` FIRST (freeing the `/team`
slot), serve the reworked page at `/team`, and redirect `/path` → `/team`.

---

## Later: Event data unification — one source, everything moves in unison

**Deferred on purpose:** the Biography and Coming Soon/Road pages are changing
right now (steps 1–3), so solve this AFTER those changes land and the pages
settle. Until then the hard-coded copies stay as they are.

The problem: the same event facts currently live in four disconnected places,
so one real-world change (a regatta finishes, a date moves) means hand-editing
several files that can drift:

1. `src/data/events.js` — past results list (Results page).
2. `src/data/campaignStops.js` — future stops (The Road globe).
3. The chrome "Next Event: San Pedro OCR in N days" line — event name AND
   `2026-07-20` date hard-coded in `Biography.jsx` (and formerly
   `EventCalendar.jsx`, gone after step 2).
4. The Biography hero `REGATTAS` cards — three hand-coded cards (last result /
   Road promo / next race) with their own dates, names, statuses.

Target model — **two data files, everything else derived**:

- `campaignStops.js` stays the single source for the FUTURE (it already
  carries region/event/dates/venues per stop). Add a machine-readable
  `startDate` (ISO) per stop — the display `dates` string stays for the cards.
- `events.js` stays the single source for the PAST.
- **"Next Event" line** = first stop in `campaignStops` with
  `startDate >= today`, countdown computed from that same field. Zero
  hand-edits: when San Pedro passes, the line rolls to the next stop by
  itself.
- **Biography hero cards** = derived, not hand-coded: "last result" = newest
  entry in `events.js`, centre card = The Road promo (unchanged), "next race"
  = same next-stop lookup as the chrome line. One shared helper (e.g.
  `src/data/nextStop.js`) so the line and the card can never disagree.
- **Lifecycle of a race**: when a regatta finishes, ONE edit — move it from
  `campaignStops.js` to `events.js` with its result/summary. The globe drops
  it, Results gains it, the hero card and Next Event line roll forward, all in
  unison.

Open detail to settle when implementing: whether the globe should keep showing
completed stops (dimmed, as "sailed" trail) instead of dropping them — that
changes the lifecycle from "move" to "flag as done", with Results deriving
from flagged stops + extra past-only entries. Decide when The Road's final
shape is settled.

---

## The Team — the Path & Team rework (direction decided 2026-07-03)

The page becomes **"The Team"**: a celebration of the people behind the
campaign that doubles, by aspiration, as the pitch to prospective sponsors.
The frame: *the ILCA is a singlehanded boat — nobody sails it to the Olympics
alone.* No explicit "become a sponsor" sections and no tier/pricing language —
the celebration IS the recruitment; serious prospects use the email link and
the Support page.

### Decided

- **Title/name: "The Team"** everywhere user-facing — nav (`Nav.jsx` `PAGES` +
  the `SHORT_LABELS` 'Path' → 'Path & Team' entry), exit-card label
  (`exitCards.js`), page headline. Routing per change 6 above: orphan
  `Team.jsx` deleted first, reworked page served at `/team`, `/path` →
  `/team` redirect.
- **Hero = the top stop of the sailboat spine**: "The singlehanded class.
  Never sailed alone." — and it MUST NOT read cheesy. Execution spec: two
  flat declarative lines (periods; no italics, no exclamation, no nautical
  kitsch — no anchors, rope type, wave flourishes). The imagery makes the
  argument, not the words: at rest, a wide shot of Robby ALONE on open water;
  the first scroll beat crossfades to the team/supporters photo as "Never
  sailed alone." lands. (The per-chapter background-crossfade mechanism
  already exists in Path.jsx.)
- **The sailboat spine stays** (boat + ghost stops + full-viewport photo
  chapters) and is retold as **eras credited to backers** — the journey as
  evidence of what backing produces. Chapter chronology (confirm exact
  boundaries and backer names with Robby — sponsor-sensitive content):
  1. Hero statement (top of spine).
  2. Early years — Annapolis Yacht Club, where it started.
  3. 2019–2023 — the Severn Sailing Association years.
  4. 2023 → — Harvard Sailing + US Sailing Team.
  5. Now — the Olympic push: AA ENT flagship + the full roster.
  One achievement line per era, not a résumé — Results owns race-by-race.
- **The timeline ends at "now"** — no 2027/2028 entries, no countdown (The
  Road owns the future and the LA 2028 climax). The current `FinalSlide`
  (2027/2028 + days countdown + SUPPORT) goes away, replaced by the
  bottom-of-page sequence below.
- **AA ENT billing moves from the top banner to the story's climax**: the
  "now" chapter is the only chapter that renders an actual logo (all other
  backers are typeset names), and AA ENT leads the partner-card row directly
  below it. Framing for the sponsor conversation: the climax chapter is where
  attention peaks, immediately before the conversion moment — stronger
  billing than a header banner people scroll past.
- **Kept as-is**: the interactive partner cards (hover → blue reveal), the
  supporters roster with the "Your Name" empty slots, and the thank-you
  letter (stays last, before the exits — it shows prospects how sponsors are
  treated here).

### Bottom-of-page treatment (proposed, described 2026-07-03 — confirm on review)

Three beats after the last chapter, so the spine *resolves* instead of just
stopping:

1. **Arrival** — the "now" chapter: brightest chapter, AA ENT flagship, the
   boat at the last filled stop.
2. **The partner gallery** — the existing expanding-card row directly below,
   introduced by a small label ("THE PARTNERS"). Same component, new meaning:
   arriving after the story, each card is a character the reader recognizes,
   not a logo in a wall.
3. **The roster as the spine's continuation** — the spine line runs on down
   through the supporters list: each supporter's existing blue square marker
   sits ON the line like stops on the course, and the "Your Name" slots
   (already rendered as hollow outlined squares) read as **open berths**.
   Filled square = aboard; hollow = open seat — the conversion moment is
   literally a gap in the crew line. Optional flourish: the small sailboat
   resting beside the first hollow slot. The line ends at a closing block —
   "This team sails for LA in 2028" — with two actions: **Join the Team**
   (Support) and **See the Road** (The Road). Then the letter, ExitNav
   (Support card last), footer.
   - Alignment: mobile spine is already left-aligned (24px) so the roster
     bullets line up naturally; desktop spine is centered — either center the
     roster's bullet column on the spine (names reading rightward) or let the
     line fade out at the timeline's end and reappear as the roster's left
     rail.

### Unchanged from earlier notes

- **Unify the rail grammar** with The Road (same stop shape / boat behavior)
  so the traveling-a-line motif reads as one system across both pages.
- The Biography hero's hand-coded `REGATTAS` cards are handled by the "Event
  data unification" section above (derived last-result / Road promo /
  next-race), not by this rework.

---

## Execution notes — verified against the code 2026-07-04

A full-repo verification sweep (8 parallel readers) before implementation found
the plan directionally correct but with five substantive errors/gaps. Line
numbers in the sections above are stale (Biography/ComingSoon/App were all
reworked Jul 3); the findings below are authoritative.

### 1. The `<Navigate>` redirect would break the route-transition machine

App.jsx renders `<Routes location={displayLocation}>` — routes match a
*lagging* location so pages can fade out over 350ms before the swap. A
`<Navigate>` element only fires when its route mounts, i.e. AFTER a full fade
toward a blank page, then a second fade — ~700ms, a blank flash, and worst
case it consumes the one-shot `orbOverlay.pendingFromOrb` flag on the blank
hop, replaying the orb hand-off as a curtainless fade (the exact failure the
fromOrb comment warns about). A bare `<Navigate>` also drops `location.state`
(`fromOrb`, `from: 'Biography'`).

**Correct mechanism** (all in App.jsx): a `REDIRECTS` map
(`'/coming-soon': '/the-road'`, `'/event-calendar': '/biography'`,
`'/path': '/team'`) applied in three places: (a) the `displayLocation`
useState initializer resolves redirects so a cold load at an old URL paints
the target page on the first frame; (b) a `useLayoutEffect` declared BEFORE
the transition effect does `navigate(target, { replace: true, state:
location.state })`; (c) the transition effect's first line returns early when
`REDIRECTS[location.pathname]` is set, so the machine never fades toward a
redirect source and never consumes `pendingFromOrb` on one.

### 2. `/team` is not a free slot — it has live map entries for the old page

Deleting Team.jsx is necessary but not sufficient. `/team` already has:
`INNER_BG['/team'] = 'rgb(22,24,28)'` (must become Path's `'rgb(12,14,18)'`),
`VARIANT_MAP['/team'] = 'blue'` (must become `'dark'`), `CURRENT_MAP['/team']
= 'Team'` (must become `'The Team'`), and `getNavMode` has NO `/team` case
(falls to `'static'` — must return `'overlay'` like `/path` does today, or
the nav breaks over the dark hero). `go()`'s map has both `'Path': '/path'`
and `'Team': '/team'` entries; both are replaced by `'The Team': '/team'`.

### 3. The caller/label list was incomplete

Beyond Nav.jsx and exitCards.js, the 'Path'/'Path & Team' label appears in:
`Footer.jsx:15` (`['Path', 'Path & Team']`), `MainView.jsx:652` (home nav
`['PATH & TEAM', 'Path']`), and `App.jsx:465` (compact-overlay label remap
`{'Path': 'Path & Team'}[item]` — becomes dead code unless removed).
`go()` falls back to `'/'` for unknown page keys — a missed caller silently
navigates HOME, no error — so every `onNavigate` string must flip in the same
commit as the map. Confirmed 'Coming Soon' callers: `eventUI.jsx:44`,
`Biography.jsx:64`, `MainView.jsx:378,561,568`. 'Event Calendar' caller:
`MainView.jsx:760` (the LA 2028 corner — retargets to The Road per step 2).

### 4. The BrowserStack harness hardcodes the old route and aria-labels

The plan said "re-test with the harness" but missed that the harness itself
breaks: `run.js:187` (regex polls for `/coming-soon` after the orb morph —
would falsely report the hand-off broken), `capture.js:22`
(`PAGE = '/coming-soon'`), `spray-check.mjs:47` (`pagePath`), and two selector
contracts: `probe.js:62` selects `button[aria-label^="Coming soon"]` (device
classifier — misclassifies every fallback device if the labels change without
it) and `capture-changes.mjs:87` selects `[aria-label*="road to LA"]`
(case-sensitive). **Aria-label strategy:** the orb/flat-boat labels in
`MainView.jsx:569` and `BakedOrb.jsx:302` become "The Road — see the road to
LA 2028" (keeps the lowercase "road to LA" substring so capture-changes needs
no edit), and `probe.js:62` flips to `^="The Road"` in the same commit.

### 5. Docs/comments that must track the rename

`README.md:43` (pages inventory: drop EventCalendar, rename ComingSoon/Path),
`BAKE.md:19,22,75,77,85,87` (`/coming-soon`, `onNavigate('Coming Soon')`,
`ComingSoon.jsx`), stale comments in `events.js`, `eventUI.jsx`,
`exitCards.js`, `ExitNav.jsx`, `tourChapters.js:1`, `campaignStops.js:2`.
The only user-visible "coming soon" text on the tour page itself is the
StaticTimeline fallback kicker (`ComingSoon.jsx:1493`) — delete it (the
"coming soon" framing is obsolete). Biography's ComingSoonCard kicker
(line 104) becomes "Up Next". File renames: `ComingSoon.jsx → TheRoad.jsx`
requires exactly four import updates (`App.jsx:20,188`,
`MainView.jsx:346,372` — lazy + idle-prefetch + two morph warms, which must
stay pointed at ONE chunk).

Also verified: no sitemap/robots/manifest exist (GH Pages can't 301 — the
in-app redirect is the only mechanism, accepted); CI on PRs is `npm ci +
vite build` only, so deleting a page file and its import in different commits
would fail the build — do them together; `index.html` meta needs no changes;
Team.jsx is confirmed imported ONLY by App.jsx.

### Results-header removal details (step 3)

Removing the Olympic countdown also removes: the `countdownRef` declaration,
its entry in the spray `fadeRefs` array, and the now-unused
`olympic = useCountdown(...)` hook call. The RESULTS headline keeps the
per-glyph `<span>` structure (`'RESULTS'.split('')`) and `palette: 'white'`.
The Next Event line becomes a real `<button>` (a11y) wrapping the chrome-text,
navigating to The Road. The mobile home embeds the same Biography component,
so all of this appears there automatically — and the hidden preload copy's
`enabled: !preload` spray guard must survive the edit untouched.

---

## Suggested sequencing

Each step is independently shippable; this order keeps risk low:

1. **Retarget + rename** (changes 1 & 2 together — they touch the same
   navigation strings): rename Coming Soon → The Road everywhere, add the
   `/coming-soon` redirect, point the home LA 2028 corner at it.
2. **Delete Event Calendar** (change 3) + `/event-calendar` redirect.
3. **Retitle Biography section → Results** (change 4): drop the Olympic
   countdown, keep the chrome Next Event line (title still TBD).
4. **Event data unification** — only after steps 1–3 have landed and the Bio +
   Road pages have settled (see the "Event data unification" section).
5. **The Team rework** (change 6 + "The Team" section) — direction decided;
   bottom-of-page treatment to be confirmed on visual review.

## Verification (per step)

- Dev server with `--host`; BrowserStack `capture-changes.mjs --port <p>` for
  page screenshots + iPhone orb tap-through (creds in `browserstack/.env`).
- Specifically re-test after step 1: desktop orb→globe morph, mobile baked-orb
  morph → blackBridge → The Road (the pathname checks in App.jsx are part of
  that choreography), nav labels desktop + mobile (breakpoint `< 700`).
- After step 3: spray dissolve on the new headline — scroll down (letters
  atomize), scroll back (pixel-perfect reassembly), modal open pauses spray.
- Redirects: hit `/coming-soon` and `/event-calendar` directly on the deployed
  site (GH Pages 404.html path).
- House rules that still apply: Support card LAST in every ExitNav; no sticky
  banners; home background stays dead space (orb + labelled words only).
