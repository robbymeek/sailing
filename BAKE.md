# Baking the phone orb + morph

The desktop home runs the **live WebGL orb** (`src/lib/glassOrbScene.js`). Phones
can't run it reliably (Three.js 0.180 needs WebGL2, iOS drops GL contexts, the
refraction shader is heavy), so the phone path plays a **video recorded from the
real shader** — `src/components/BakedOrb.jsx`. Because it's the genuine rendered
frames, it looks pixel-identical to desktop; because it's opaque H.264/VP9 video,
it's bulletproof and light, and it animates the boat on every browser (no GIF, no
WebCodecs).

It's recorded **over the real rest backdrop** — the sailing photo (cover-fit into
the 1080×1920 frame) under the desktop's flat rgba(0,0,0,0.88) rest scrim — so the
orb's interior refraction and rim glow are genuine desktop pixels, with no blend
modes or fragile alpha video. At rest, `BakedOrb` shows the clip through a
feathered circular mask at the orb's rim; `MainView`'s `BakedOrbBackdrop` draws
the same photo with the same cover math behind it, so the seam is invisible. The
morph clip plays full-bleed: the harness bakes in the desktop's background fade
(0.88 → black once morph progress ≥ 0.9), so it still ends globe-on-black for the
/coming-soon hand-off.

```
rest loop ──tap──▶ morph clip ──ends──▶ /coming-soon
(cross-fades into the morph)  (ends on the globe hero pose)
```

## One-time setup

This is wired but **OFF** (`BAKED_ORB_READY = false`) until the clips exist, so the
mobile home keeps its current boat in the meantime.

### 1. Record the clips (needs a desktop GPU + Chrome)
```bash
npm run dev
```
Open **http://localhost:5173/bake.html in Chrome** (Chrome has `ImageDecoder`, so the
boat actually spins in the capture). **Keep the tab focused and frontmost the whole
time** — the orb pauses its render loop when hidden, which would freeze the clip (the
harness warns you if it detects this). Then:
- **Record REST loop** → downloads `orb-rest.webm` (one ~8.4s boat cycle; BakedOrb loops it and cross-fades any residual seam)
- **Record MORPH** → enabled only once the status reads **"globe ready"** (so the final globe frame isn't baked out black) → downloads `orb-morph.webm`

Tune capture size / framing at the top of `src/bake/bakeMain.js` if needed, and keep
it consistent with `BakedOrb`'s `object-fit: cover` framing.

**Automated alternative (this is what produced the committed clips):** instead of
clicking, drive headful Chrome — it captures both clips from the real GPU with no
manual steps and writes them straight to `bake-recordings/`:
```bash
npm i -D puppeteer-core    # one-off, NOT a committed dependency
npm run dev                # in another terminal
node scripts/auto-bake.mjs # records rest + morph, then continue at step 2
```

### 2. Encode to shippable formats
First make ffmpeg available — it's intentionally **not** a committed dependency, so it
can never run in (or break) the GitHub Pages production build. Either:
```bash
npm i -D ffmpeg-static     # bundled static binary, no system install
# or: brew install ffmpeg  # system ffmpeg on PATH
```
Move both downloads into `bake-recordings/`, then:
```bash
npm run bake:encode
```
This writes to `public/orb/`: `orb-rest.{webm,mp4}`, `orb-morph.{webm,mp4}`,
`orb-rest-poster.jpg`, and `orb-globe-poster.{jpg,webp}` (the morph's last frame).
Raise/lower quality with `CRF=18 npm run bake:encode` (lower = sharper/bigger).

### 3. Turn it on
In `src/components/BakedOrb.jsx` set:
```js
export const BAKED_ORB_READY = true
```
Then `npm run dev`, shrink the window < 700px (or use BrowserStack iPhone), and tap
the orb — it should play the morph and land on `/coming-soon`.

> **Hand-off:** the phone path navigates with a plain `onNavigate('Coming Soon')`
> (a ~350ms fade), NOT the desktop `{ fromOrb: true }` path. That desktop path is
> bridged by the body-level WebGL overlay canvas, which phones don't have — copying
> it would make Coming Soon expect an overlay handoff that never arrives. For a
> zero-flash land, use the poster bridge in step 4 instead.

### 4. (Optional — NOT wired yet) Perfectly seamless land — the poster bridge
This is a manual enhancement you add yourself; nothing references `orb-globe-poster`
in `ComingSoon.jsx` today. For a zero-flash hand-off into Coming Soon on phones, make
the page's **first mobile paint** the morph's final frame, then fade the live globe in
over it. In `src/pages/ComingSoon.jsx`, when it falls back to the static timeline (or
before the globe boots) on mobile, render:
```jsx
<img src={`${import.meta.env.BASE_URL}orb/orb-globe-poster.webp`} alt="" aria-hidden="true"
     style={{ position:'fixed', inset:0, width:'100%', height:'100%', objectFit:'cover', zIndex:-1 }} />
```
Because `orb-globe-poster` IS the morph's last frame, the cut is invisible. This
decouples the morph from live mobile WebGL — the morph never depends on the globe
booting in time.

### 5. Verify + commit
- Test on a real iPhone + Android via BrowserStack (`browserstack/` harness).
- Commit the `public/orb/` assets **and** the `BAKED_ORB_READY = true` flip.
- `bake-recordings/` is git-ignored (intermediates) — don't commit the raw webm.

## Notes
- Re-record any time the orb visuals change; the clips are a snapshot of the shader.
- `bake.html` + `src/bake/` are dev-only (not in the production build).
- Keep `MORPH_MS` in `bakeMain.js` equal to the one in `glassOrbScene.js` (3200ms).
- Framing: the bake uses a fixed `orbDiameterPx` on a 1080×1920 canvas; a real phone
  viewport differs, so verify the cover-cropped size on a device before shipping.
