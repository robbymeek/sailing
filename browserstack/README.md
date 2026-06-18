# BrowserStack cross-device harness — home glass orb

Mac-only dev box → can't reproduce the real Windows-ANGLE or iOS-Safari behavior locally
(Chrome/Safari device emulation still uses the Mac GPU/WebKit). This harness drives **real
Windows + iPhone + Android** on BrowserStack Automate, runs an in-page capability probe, and
reports whether each device shows the **live WebGL orb** or the **flat-boat fallback**.

## Setup (once)

```bash
cd browserstack
npm install
cp .env.example .env          # paste your BrowserStack username + access key
```

Find your key at <https://www.browserstack.com/accounts/profile/details>.

## Run

```bash
# Baseline — test the deployed site (confirms the CURRENT cross-device behavior)
npm run test:deployed

# Test your LOCAL unmerged build: spawns `vite --host`, tunnels it, tests real devices
npm run test:local

# A subset, with the in-app debug overlay enabled
node run.js --url https://robbysailing.com --only win-chrome,win-firefox,iphone15 --debug
```

Flags: `--url`, `--local`, `--serve`, `--port`, `--only <ids>`, `--debug`, `--wait <ms>`.
Device ids live in [devices.js](devices.js).

## Output

- `report.md` / `report.json` — per-device verdict + WebGL/codec capabilities
- `screenshots/<id>.png` — what each real device actually rendered

**Verdict legend:** `LIVE_ORB` (real orb on screen) · `FLAT_BOAT` (DOM fallback) ·
`ORB_CANVAS_HIDDEN` (orb mounted, not faded in) · `ERROR`.

## What the probe answers (the Phase 0 unknowns)

- Does a **real `high-performance` WebGL context** actually create on this device? (root cause #1)
- Is **`ImageDecoder`** present? (boat-animation API — root cause #4)
- Which **alpha video formats** play here (`webm/vp9`, `hevc`)? — drives the boat fix, since the boat GIF is transparent
- **DPR**, reduced-motion, pointer type — the live-vs-baked tiering inputs

## Notes

- Trial accounts usually allow **1 parallel session**; the runner is sequential.
- The runner sets each BrowserStack session's pass/fail status, so they're easy to find on the dashboard.
- `--local` needs the dev server reachable on this machine; `--serve` starts it for you.
- This is the **automated** complement to the BrowserStack **VS Code extension**
  (`BrowserStack.browserstack-vscode`), which you install separately for hands-on Live testing.
