# Home-page ideas — orb + mystery, one at a time

Direction from the Jul 2026 home-page design panel. The through-line: the home should *reward curiosity* rather than explain itself — keep the orb and the withheld mood, but make a first-time visitor lean in. Do these focused and one at a time.

**In progress / done: #1 — Reveal-on-approach + in-orb LA 2028 OLYMPICS + countdown.** The orb reacts to the cursor from anywhere on the page, grows faster the closer you get (peak ~1.7×), and brightens/clarifies as it grows so the photo, boat, and a hidden `LA 2028 OLYMPICS` headline + live countdown bloom in. The HUD text is a coverage mask sampled in the SHADER along the same refracted ray as the page, then driven to the MOST-CONTRASTING monochrome of whatever's behind it per pixel (pure white over dark, pure black over light — a luminance threshold), eased in by proximity (faint far → full contrast at full hover). Layout at full hover: the boat grows less than the orb and rises, with the headline (larger) stacked directly above the timer (smaller) below it. Knobs in `glassOrbScene.js` TUNE: `peakScale`, `boatGrow`, `boatRise`, `hudSize`, `hudTimerRatio`, `hudDrop`, `hudLineGap`, `hudFloor`, `hudAlpha`, `hudTrack`, `nearStrength`, `revealPeak`, `reach`, `proxExp`. Corner "LA 2028" + clock removed (The Road stays in the hover-nav + the orb). Peak size ~1.45×. See the branch `feat/orb-reveal-on-approach` and the plan for the engineering (single `prox` term; morph-uniform reset; click-halo bump to 65).

---

## Deferred — for future focused passes

### #2 — Un-mumble the corner blurb
The bottom-left line already names US Sailing Team · Harvard · 2028, but at 0.4 opacity as a skippable run-on. Keep it a whisper but set it to be read once: nudge to ~0.55, break it on the same mid-dot the nav row uses (`… · … · …`), and give the lead clause with his name slightly more weight. It should state *less*, not more — an evocative lead plus fine-print credentials, no stats. Highest-leverage credibility move for near-zero cost. Guardrail: hold the lead to caption register, not a marketing tagline.

### #3 — The intro is the résumé
Re-curate the fast→slow flash montage so its frames read pre-attentively as world-level — a packed international start line, US Sailing Team kit, national colors — and make the already-held final latched frame (~2600ms, `HomeIntro`) the strongest of them. The montage is the one loud moment the design already sanctions, and it fires on every hard refresh; prime the stakes there and the withholding rest state reads as confidence, not emptiness. Guardrail: a start line or team kit, **not** a podium/trophy — the instant it's a glory-brag it tips into bragging. Pure curation, no engineering.

### #4 — Give the marble a pulse
Ambient life so the orb is visibly the one living thing in the dead space: a near-subliminal idle wobble on `anchor.rotation` (a slow Lissajous) + a slow rim-glint crawl, and then one single slow "inhale" the instant the page reaches `rest`, so a first-timer's eye lands on the orb as it wakes. Guardrails: drive idle motion through `anchor.rotation`, **never** `orbFrac`/position (that would break the fixed click zone + grab-cursor circle); keep amplitude near-subliminal so the boat *swims* rather than sloshes; cue the one-shot wake from MainView at the rest transition and gate it so SPA re-entry never replays it.

### #5 — Quiet the chrome into one system
Collapse the ~5 mismatched greys (nav 0.75, blurb 0.4, dots 0.35, etc.) onto a 3-step tonal ramp stepped down from the shader's own `FRESNEL_COLOR` (≈rgb 158,184,219), so text and glass share one cast; give any remaining figures `font-variant-numeric: tabular-nums`. Cohesion reads as intention — the difference between half-finished UI and a composed page. Reveals nothing new; just harmonizes. (Note: #1 removed the corner countdown, so re-scope this to whatever chrome remains.)

---

## Support vs Donate (decided)
Keep **Support** as the label — it frames the visitor as backing a serious campaign, not pitying a cause; same confident register as sailing for the US. Separate future pass: make the Support *page* body live up to that dignified word (today it's a bare SFNY donate flow behind the warmer label).
