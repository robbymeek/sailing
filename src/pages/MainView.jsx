import { useState, useEffect, useRef } from 'react'
import orbOverlay from '../lib/orbOverlay'
import { hasWebGL2 } from '../lib/webglSupport'
import { introPhotos } from '../assets/home-intro'
// Rest-state background: the portrait sailing shot, shown bright under a light
// 0.42 scrim — and refracted, with the boat, inside the glass orb.
import hikingBg from '../assets/home-intro/img-5957.jpg'
// Lightweight (733×1100, ~108KB) version of the same shot for the mobile home
// background — the full-res photo is only needed for the desktop orb's refraction.
import hikingBgMobile from '../assets/home-intro/img-5957-mobile.jpg'
import BakedOrb, { BAKED_ORB_READY } from '../components/BakedOrb'
import HomeSponsorStrip, { SponsorRect, SPONSOR_PAIRS } from '../components/HomeSponsorStrip'
import { HOME_FG, HOME_SPONSOR_W } from '../components/DesktopBanner'
import homeChrome from '../lib/homeChrome'
import blackBridge from '../lib/blackBridge'

const BASE = import.meta.env.BASE_URL
const BOAT_SIZE = 200
// Desktop glass-orb on-screen diameter (mirrors the orbOverlay.attach call below).
// Used to size the grab-cursor zone over the orb.
const ORB_DIAMETER = BOAT_SIZE * 1.3 // 260px — orb ≈ 130% of the sailboat height
// Clickable halo beyond the orb's rest RADIUS: the orb plus this ring is what
// navigates to The Road — everything else on the home is dead space (only the
// labelled controls are interactive). Must be ≥ rest radius × 0.7 (the scene's
// TUNE.peakScale growth to 1.7×) so the cursor-grown orb stays clickable
// edge-to-edge; the remainder is the "little bit around the orb". Passed to
// glassOrbScene for its hit-test AND sizes the grab-cursor circle below, so the
// pointer affordance and the actual click zone are the same circle.
const ORB_CLICK_HALO_PX = 95
// The morph's final globe frame (baked). Used as the mobile hand-off bridge so the
// globe stays on screen while the rest of the home fades to black.
const GLOBE_POSTER = `${BASE}orb/orb-globe-poster.webp`
// If the orb scene never signals ready by here, flip to the flat boat rather than
// leave a permanently blank orb (e.g. the background photo load hangs, or a real
// context is refused after the cheap probe passed). This is a true-hang BACKSTOP,
// not a slow-load tripwire: onReady normally fires <1s, the orb isn't shown until
// the intro reaches 'rest' (~4.4s), and the orb only runs on desktop — so 10s
// comfortably clears even a ~0.5 Mbps connection loading the 561KB photo.
const ORB_READY_TIMEOUT_MS = 10000

// The campaign's target: LA 2028 opening ceremony. Passed to the orb so it can draw
// the live countdown INSIDE the glass — the DOM corner countdown was retired for it.
const COUNTDOWN_TARGET = Date.parse('2028-07-14T00:00:00')

// Desktop top bar, hamburger menu and their sizing constants live in
// components/DesktopBanner.jsx now (the App-level sticky nav banner) — HOME_FG and
// HOME_SPONSOR_W are imported back from there for the blurb, scroll cue and the
// bottom-left sponsor lockup.

// The mini-bio blurb (bottom-left on both layouts). Colour = HOME_FG, imported above.
const BLURB_SIZE = 'clamp(12px, 0.9vw, 14px)'
const HOME_BLURB =
  'Robby Meek is a sailor for the US Sailing Team attending Harvard University working to compete and excel at the 2028 Olympic Games.'

// Module-level flag: the cinematic intro plays once per JS bundle
// initialization (hard refresh) and is skipped on SPA navigation back
// to /. No storage APIs — this lives for the tab's lifetime only.
let introHasPlayed = false
// Same lifetime as introHasPlayed: the orb's one-shot idle "inhale" fires once per
// tab (on the first settle to rest), never again on SPA re-entry to home.
let orbWakePlayed = false

// WebGL2 capability gate lives in ../lib/webglSupport (shared with TheRoad).

export default function MainView({ onNavigate, skipIntro, embedded }) {
  return (
    <HomeIntro
      onNavigate={onNavigate}
      skipIntro={skipIntro}
      embedded={embedded}
      boatSrc={`${BASE}[0001-0250].gif`}
    />
  )
}

// ---------- Home intro + rest-state component ----------
// All cinematic state and timers live here so MainView stays a thin
// shell. Kept in the same file per the original brief.
function HomeIntro({ onNavigate, skipIntro: forceSkip, embedded, boatSrc }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Exit reveal — the hero is PINNED (sticky, above) and never scrolls away;
  // as the white helm card rises over it, the frame BRIGHTENS to the raw
  // photograph (owner direction, Jul 2026 — no fade-to-black): the 0.42 rest
  // scrim lifts to 0 in lockstep with the scroll while the orb fades in
  // place and the hero chrome (blurb, sponsor lockups, cue) fades out via
  // the scrolledAway state below. Progress comes from window.scrollY
  // (rect.top stays 0 while pinned). Pure closed form of scroll — reverse
  // scroll replays exactly, same invariant as Biography's parallax, which
  // uses this same rAF pattern.
  const homeRootRef = useRef(null)
  const restScrimRef = useRef(null)
  const bakedScrimRef = useRef(null)
  useEffect(() => {
    // Runs on both mobile and desktop — the helm card covers both the same
    // way, and the live orb (a body-level fixed canvas) fades IN PLACE in
    // lockstep with the scrim lift — it stays centered under the rising card.
    //
    // Driven by PASSIVE scroll/resize (coalesced into one rAF), not a permanent
    // rAF: it did a getBoundingClientRect() every frame while idle. The sticky
    // hero is 100dvh, so we cache its height once (+ on resize) and drive
    // progress from scrollY — no per-frame layout read, and nothing runs while
    // the tab is hidden or the page is still.
    let rafId = null
    let orbTouched = false
    // Measure the sticky root's height once (handles dvh vs innerHeight); refresh
    // only on resize, never per frame.
    let rootH = homeRootRef.current?.getBoundingClientRect().height || window.innerHeight
    const apply = () => {
      rafId = null
      // rect.top stays 0 while the sticky hero is pinned, so scrollY alone drives
      // progress. Fully bright once the cover has risen 62% of the frame height.
      const gone = Math.min(1, Math.max(0, window.scrollY / (rootH * 0.62)))
      const scrim = restScrimRef.current
      if (scrim) scrim.style.opacity = 1 - gone
      const bakedScrim = bakedScrimRef.current
      if (bakedScrim) bakedScrim.style.opacity = 1 - gone
      // Desktop live orb: it lives in a fixed body-level overlay (survives the
      // morph route-swap) — like the pinned hero it STAYS PUT, fading in place
      // while the card rises over it. Only while at rest (the morph owns the orb
      // otherwise); untouched at the very top so the intro fade-in is preserved.
      if (showOrbRef.current && phaseRef.current === 'rest' && morphRef.current === 0) {
        if (gone > 0.002) { orbOverlay.setScrollFade(0, 1 - gone); orbTouched = true }
        else if (orbTouched) { orbOverlay.setScrollFade(0, 1); orbTouched = false }
      }
    }
    const schedule = () => {
      if (rafId == null && !document.hidden) rafId = requestAnimationFrame(apply)
    }
    const onResize = () => {
      rootH = homeRootRef.current?.getBoundingClientRect().height || window.innerHeight
      schedule()
    }
    apply() // initial paint
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      if (rafId != null) cancelAnimationFrame(rafId)
    }
  }, [embedded])

  // Mobile scroll cue: hide it once the visitor starts scrolling into the bio (and
  // bring it back near the top, so reverse-scroll replays). Window scroll — the
  // MobileHome page scrolls as one; the home is the top section.
  const [cueScrolled, setCueScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setCueScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Skip the flash montage on: forced skip, replay (already played this tab),
  // reduced-motion, OR a constrained connection (Save-Data / slow 2g). Those
  // visitors get the lightweight static first frame (the rest hiking photo)
  // instead of a ~5MB montage; capable connections keep the full montage timing.
  const conn = typeof navigator !== 'undefined'
    ? (navigator.connection || navigator.webkitConnection || navigator.mozConnection)
    : null
  const saveData = !!conn?.saveData
  const constrainedNet = saveData || /(^|-)2g$/.test(conn?.effectiveType || '')
  const skipIntro = forceSkip || introHasPlayed || prefersReducedMotion || constrainedNet

  // Viewport-appropriate montage frames (phones use the small derivative where
  // one exists). Empty-safe: when skipIntro, we never start the montage below.
  const montagePhotos = introPhotos({ isMobile: embedded })

  // The glass orb (desktop) refracts the page behind it — the dark photo + the
  // spinning boat. Needs WebGL + motion; skipped in the mobile embedded home and
  // for reduced-motion/no-WebGL2, which keep the original DOM boat. Computed ONCE
  // (lazy) — hasWebGL2() spins up a throwaway context, never run every render.
  // Save-Data desktop skips the live WebGL orb so the 6.6MB boat GIF is never
  // fetched — it falls through to the lighter baked video orb (~1.5MB rest clip,
  // morph deferred) already wired for the no-WebGL2 desktop path.
  const [useOrb] = useState(
    () => !embedded && !prefersReducedMotion && !saveData && hasWebGL2()
  )
  const boatImgRef = useRef(null)
  const [orbReady, setOrbReady] = useState(false)
  const [orbFailed, setOrbFailed] = useState(false)
  const [morph, setMorph] = useState(0) // 0→1 morph progress, drives the text-out
  const showOrb = useOrb && !orbFailed

  // scrolledAway does double duty on BOTH layouts now: it disables the orb's
  // CLICK once the page has scrolled a little (a tap where the orb used to be
  // can't fire the morph while the card rises), AND it fades the hero chrome
  // (blurb, sponsor lockups, mobile baked-orb video) out through the elements'
  // existing 0.5-0.8s opacity transitions — the house cueScrolled pattern —
  // so the brightening photo is left clean under the rising card.
  const [scrolledAway, setScrolledAway] = useState(false)
  const scrolledAwayRef = useRef(false)
  useEffect(() => {
    const onScroll = () => {
      const away = window.scrollY > 40
      scrolledAwayRef.current = away
      setScrolledAway(away)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // beginMorph (orb clicked) + navTo (fired by the scene at m≈0.82). Held in refs
  // so they always see the current uiVisible/onNavigate without re-attaching.
  const beginMorphRef = useRef(() => {})
  const navToRef = useRef(() => {})

  // Mount the orb into the BODY-LEVEL overlay (orbOverlay), so the canvas survives
  // the Home → The Road route swap for the seamless morph handoff.
  useEffect(() => {
    if (!useOrb) return undefined
    // Safety net: a thrown context rejects the attach() promise (handled below),
    // but a scene that simply never signals onReady would leave a blank orb with
    // no fallback. Flip to the flat boat if ready hasn't fired in time. Mirrors
    // The Road overlay's net in App.jsx. Cleared the instant onReady fires.
    let readyFired = false
    const safety = setTimeout(() => {
      if (readyFired) return
      // eslint-disable-next-line no-console
      console.warn('[HomeIntro] glass orb never became ready, using flat boat')
      setOrbFailed(true)
    }, ORB_READY_TIMEOUT_MS)
    orbOverlay
      .attach({
        isMobile: window.innerWidth < 700,
        baseUrl: BASE,
        photoUrl: hikingBg,
        boatUrl: `${BASE}[0001-0250].gif`,
        boatImg: boatImgRef.current,
        boatSize: BOAT_SIZE,
        orbDiameterPx: ORB_DIAMETER, // orb ≈ 130% of the sailboat height
        clickHaloPx: ORB_CLICK_HALO_PX, // click zone = orb + halo (see constant above)
        prefersReducedMotion,
        countdownTarget: COUNTDOWN_TARGET, // drawn as the live countdown inside the orb
        onReady: () => { readyFired = true; clearTimeout(safety); setOrbReady(true) },
        onMorph: (m) => setMorph(m),
        onClick: () => beginMorphRef.current(),
      })
      .catch((err) => {
        clearTimeout(safety)
        console.warn('[HomeIntro] glass orb failed to init, using flat boat', err)
        setOrbFailed(true)
      })
    return () => {
      clearTimeout(safety)
      // Keep the overlay alive across a fromOrb nav (the morph handoff needs it);
      // otherwise tear it down — but DEFERRED, so a StrictMode remount cancels it.
      if (!orbOverlay.holding) orbOverlay.requestDetach()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // phase drives the black overlay; separate booleans drive boat/UI fades
  // so their timing isn't locked to the overlay transition.
  const [phase, setPhase] = useState(skipIntro ? 'rest' : 'ignition')
  const [photoIndex, setPhotoIndex] = useState(0)
  const [photoLayerVisible, setPhotoLayerVisible] = useState(!skipIntro && montagePhotos.length > 0)
  // Only photos that fully loaded + decoded make it into the montage, so a
  // slow or failed image can never produce a blank/broken flash frame.
  const [playablePhotos, setPlayablePhotos] = useState([])
  const [photoAnimDuration, setPhotoAnimDuration] = useState(80)
  const [boatVisible, setBoatVisible] = useState(skipIntro)
  const [uiVisible, setUiVisible] = useState(skipIntro)
  const photoTimerRef = useRef(null)
  const phaseTimersRef = useRef([])

  useEffect(() => {
    if (skipIntro) {
      introHasPlayed = true
      return
    }
    let cancelled = false

    const runWithoutMontage = () => {
      // Degrade gracefully: skip the flash montage, run the boat/ui reveals only
      setPhotoLayerVisible(false)
      const schedule = (ms, fn) => {
        phaseTimersRef.current.push(setTimeout(fn, ms))
      }
      schedule(200, () => setPhase('revealing'))
      schedule(400, () => setBoatVisible(true))
      schedule(1400, () => { setPhase('rest'); setUiVisible(true); introHasPlayed = true })
    }

    if (montagePhotos.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[HomeIntro] No montage frames, skipping flash montage')
      runWithoutMontage()
      return () => {
        cancelled = true
        phaseTimersRef.current.forEach((t) => clearTimeout(t))
        phaseTimersRef.current = []
      }
    }

    // Photo cadence: starts very fast (45ms), eases up to ~85ms by ~1.4s,
    // then a slowing phase to ~480ms, then stops cycling — the last image
    // hovers in place while the overlay fades to black on top of it.
    const delayForElapsed = (elapsed) => {
      if (elapsed < 1400) {
        // Snap-fast at the start, gentle ramp 45ms → 85ms over 1.4s
        const t = elapsed / 1400
        return 45 + 40 * t
      }
      if (elapsed < 2600) {
        // Slowing: 85ms → 480ms ease-out over 1.2s
        const t = (elapsed - 1400) / 1200
        const eased = 1 - Math.pow(1 - t, 2)
        return 85 + (480 - 85) * eased
      }
      return Infinity // hold last image
    }

    const schedule = (ms, fn) => {
      phaseTimersRef.current.push(setTimeout(fn, ms))
    }

    // Reliable preload: every photo is fully loaded AND decoded before the
    // montage starts, so no frame can ever flash blank. Photos that fail (or
    // are still in flight at the 4s ceiling) are simply left out of the run.
    const loadOne = (url) =>
      new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          if (img.decode) img.decode().then(() => resolve(url), () => resolve(url))
          else resolve(url)
        }
        img.onerror = () => resolve(null)
        img.src = url
      })

    const results = []
    const allLoaded = Promise.all(
      montagePhotos.map((url) => loadOne(url).then((r) => { results.push(r); return r }))
    )
    const ceiling = new Promise((resolve) => setTimeout(resolve, 4000))

    Promise.race([allLoaded, ceiling]).then(() => {
      if (cancelled) return
      const loaded = results.filter(Boolean)
      if (loaded.length === 0) {
        // Nothing usable arrived in time — degrade to the no-montage reveal.
        runWithoutMontage()
        return
      }
      setPlayablePhotos(loaded)

      const startTime = performance.now()
      const cyclePhoto = () => {
        const elapsed = performance.now() - startTime
        const delay = delayForElapsed(elapsed)
        if (delay === Infinity) return
        photoTimerRef.current = setTimeout(() => {
          setPhotoIndex((i) => i + 1)
          setPhotoAnimDuration(delay)
          cyclePhoto()
        }, delay)
      }

      // Phase timeline (relative to preload completing):
      //   200ms : flash begins (snap-fast cadence)
      //  1400ms : cadence ease-out begins
      //  2600ms : last image latches in place; overlay starts fading to black
      //  3400ms : boat starts fading in over the (still visible) last image
      //  3800ms : photo layer hidden — overlay is fully black by now
      //  4400ms : rest state — overlay eases back to near-black so the hiking
      //           background photo emerges; bottom-left nav + countdown fade in
      schedule(200, () => {
        setPhase('flash')
        setPhotoAnimDuration(45)
        cyclePhoto()
      })
      schedule(1400, () => setPhase('slowing'))
      schedule(2600, () => setPhase('revealing'))
      schedule(3400, () => setBoatVisible(true))
      schedule(3800, () => setPhotoLayerVisible(false))
      schedule(4400, () => {
        setPhase('rest')
        setUiVisible(true)
        introHasPlayed = true
      })
    })

    return () => {
      cancelled = true
      if (photoTimerRef.current) clearTimeout(photoTimerRef.current)
      phaseTimersRef.current.forEach((t) => clearTimeout(t))
      phaseTimersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fade the body-level orb overlay in once the page has settled (mirrors the old
  // in-place canvas opacity rule). Once a morph starts it owns its own opacity.
  useEffect(() => {
    if (morph === 0) orbOverlay.setVisible(showOrb && orbReady && phase === 'rest')
    // Cue the orb's one-shot idle "inhale" the instant it becomes visible at rest,
    // so the eye lands on the marble as it wakes. Module-gated → never replays on
    // SPA re-entry to home (same rule as the cinematic intro).
    if (showOrb && orbReady && phase === 'rest' && !orbWakePlayed) {
      orbWakePlayed = true
      orbOverlay.wake()
    }
  }, [showOrb, orbReady, phase, morph])

  // Cross-device diagnostics: exposes the orb's own gating decision (which the
  // external BrowserStack probe can't see) on window.__ORB_DEBUG__. Gated to dev
  // builds and ?debug=1 only, so production stays clean.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!import.meta.env.DEV && !/[?&]debug=1/.test(window.location.search)) return
    window.__ORB_DEBUG__ = {
      embedded: !!embedded,
      reducedMotion: prefersReducedMotion,
      useOrb,
      orbFailed,
      orbReady,
      showOrb,
      phase,
      morph: Math.round(morph * 100) / 100,
    }
  }, [embedded, prefersReducedMotion, useOrb, orbFailed, orbReady, showOrb, phase, morph])

  // Baked-orb path: the moment the user taps the orb, start pulling everything the
  // The Road page needs — the lazy route chunk (three.js + globe code are static
  // imports of it) and the exact texture set buildEarth will request (-2k on phones),
  // plus the curtain's globe poster. All land in the HTTP cache while the ~2.5s morph
  // clip plays, so the globe's onReady fires almost immediately after the route swap
  // instead of stalling the curtain on ~1.6MB of cold texture fetches.
  // The baked morph can't report continuous progress like the live orb (which
  // drives textOut via onMorph), so the instant it starts we fade the home UI out
  // wholesale — otherwise the nav/countdown would sit on top of the growing orb.
  const [bakedMorphOut, setBakedMorphOut] = useState(false)

  // The bridge → The Road navigation timer. Cancelled on unmount so a user who
  // clicks a nav link mid-morph can't have their navigation overridden 480ms later.
  const bridgeNavTimerRef = useRef(0)
  useEffect(() => () => clearTimeout(bridgeNavTimerRef.current), [])

  // Rest state on the baked path: quietly cache the curtain's 24KB globe poster so
  // the morph-end fade never paints a black rectangle while it loads. Runs after
  // the intro settles, so it never competes with the montage or the orb videos.
  useEffect(() => {
    if (showOrb || !BAKED_ORB_READY || !uiVisible) return
    new Image().src = GLOBE_POSTER
  }, [showOrb, uiVisible])

  const warmedRef = useRef(false)
  const warmTheRoad = () => {
    setBakedMorphOut(true)
    if (warmedRef.current) return
    warmedRef.current = true
    import('./TheRoad').catch(() => {}) // warm only — the route's own lazy() surfaces real failures
    new Image().src = GLOBE_POSTER // the curtain paints this; never let it flash black
    // Textures only help the WebGL globe — reduced-motion / no-WebGL2 devices get
    // the static timeline and must not pay ~1.6MB for nothing. Deferred + marked
    // low priority so the morph clip's own buffering wins the first bandwidth.
    if (prefersReducedMotion || !hasWebGL2()) return
    const sfx = window.innerWidth < 700 ? '-2k' : ''
    setTimeout(() => {
      for (const f of [
        `earth/earth-blue-marble${sfx}.jpg`,
        `earth/earth-night${sfx}.jpg`,
        'earth/earth-topology.png',
        'earth/earth-water.png',
      ]) {
        const img = new Image()
        img.fetchPriority = 'low'
        img.src = `${BASE}${f}`
      }
    }, 500)
  }

  // Keep the click + navigate handlers current (they read uiVisible / onNavigate).
  beginMorphRef.current = () => {
    if (!uiVisible || orbOverlay.holding || scrolledAwayRef.current) return // only at rest, at top, once
    orbOverlay.holding = true // overlay must survive the upcoming route swap
    orbOverlay.pendingFromOrb = true
    import('./TheRoad') // load The Road ASAP so it's ready under the overlay
    orbOverlay.startMorph()
  }
  // Stateless: the hand-off signal is orbOverlay.pendingFromOrb (set in beginMorph),
  // which App consumes once — router state would persist on the history entry and
  // replay the seamless arrival on every back/forward re-entry.
  navToRef.current = () => onNavigate('The Road')

  // Latest values for the scroll rAF loop above (so it stays subscribed once, not
  // re-created on every morph frame).
  const showOrbRef = useRef(false); showOrbRef.current = showOrb
  const phaseRef = useRef(phase); phaseRef.current = phase
  const morphRef = useRef(morph); morphRef.current = morph

  // The home background is intentionally DEAD SPACE: clicking it does nothing.
  // Only the orb (plus ORB_CLICK_HALO_PX around it — the scene's window-level
  // hit-test → onClick → beginMorph) navigates to The Road, and only the
  // labelled controls (nav words, LA 2028, the fallback boat button) navigate
  // elsewhere. The BakedOrb paths scope their own orb-sized tap hotspot.

  // As the morph grows the orb, the home text fades out and slides aside (early,
  // so the screen is clear before the orb is large). 0 → 1 across morph 0.08–0.32.
  // The baked path has no continuous progress — it snaps textOut to 1 the moment
  // its morph begins (the nav's 0.6s opacity transition supplies the fade).
  const textOut = (() => {
    if (bakedMorphOut) return 1
    const t = Math.min(1, Math.max(0, (morph - 0.08) / 0.24))
    return t * t * (3 - 2 * t)
  })()

  // Publish the desktop nav banner's chrome fade — the same (uiVisible)*(1-textOut)
  // the old absolute top bar used, so the App-level DesktopBanner keeps the intro
  // reveal + orb-morph fade-out choreography. Render-body write (HomeIntro re-renders
  // every live-morph frame via setMorph — same contract as the refs above); the
  // banner's rAF loop reads it each frame while the home route is displayed. The
  // embedded (mobile) home must never write it — the mobile bar is a different
  // surface that stays up through the intro. No unmount reset needed (and none is
  // safe: StrictMode's mount→cleanup→remount would replay it AFTER the intro renders
  // wrote 0, ghosting the banner over the cold-load intro): off home the banner
  // ignores the signal entirely, and a home remount rewrites it here, pre-paint,
  // before the banner's layout effect re-reads it.
  if (!embedded) homeChrome.fade = (uiVisible ? 1 : 0) * (1 - textOut)

  // Once the orb has become the globe (morph ≥ 0.9), fade the page background
  // (the faded photo) to FULL black — so the globe ends up on pure black BEFORE
  // we swap routes. The swap is then black→black (invisible), not a photo cut.
  const bgBlack = morph >= 0.9
  useEffect(() => {
    if (!bgBlack) return undefined
    // navigate only after the background has finished going black (the 0.6s fade)
    const t = setTimeout(() => navToRef.current(), 620)
    return () => clearTimeout(t)
  }, [bgBlack])

  // Overlay per phase — black only. The montage darkens gradually, goes fully
  // black, then eases back to a light scrim so the hiking photo behind it reads
  // as a bright, legible backdrop at rest (0.42 = ~58% of the photo shows through).
  const overlayStyle = (() => {
    let background = 'rgba(0,0,0,0)'
    let transition = 'background 1.2s linear'
    if (bgBlack) {
      // post-morph: drive the background to pure black under the formed globe
      background = 'rgba(0,0,0,1)'
      transition = 'background 0.6s ease'
    } else if (phase === 'flash') {
      background = 'rgba(0,0,0,0.12)'
    } else if (phase === 'slowing') {
      background = 'rgba(0,0,0,0.3)'
    } else if (phase === 'revealing') {
      // Fade the held last image down to full black over 1.2s (2600→3800ms)
      background = 'rgba(0,0,0,1)'
    } else if (phase === 'rest') {
      background = 'rgba(0,0,0,0.42)'
      transition = 'background 1.4s ease'
    }
    return { background, transition }
  })()

  const activePhoto = playablePhotos.length > 0
    ? photoIndex % playablePhotos.length
    : -1

  // The desktop live orb is interactive only at rest, at the top of the page,
  // before the morph — the same gate the scene's own click hit-test uses.
  const orbInteractive = showOrb && uiVisible && phase === 'rest' && morph === 0 && !scrolledAway

  return (
    <div ref={homeRootRef} style={{
      background: 'rgb(0,0,0)',
      height: '100dvh',
      width: '100%',
      // Pinned cover (owner direction, Jul 2026): the hero stays FIXED in the
      // viewport — it never scrolls away. On scroll it BRIGHTENS to the raw
      // photo (rest scrim lifts, chrome fades) while the helm card + the rest
      // of the site ride up OVER it (HomeShell's z45 scroll layer). Sticky
      // keeps its 100dvh flow footprint so the scroll layer starts one
      // viewport down; zIndex 0 pins the hero's whole stacking context
      // beneath the scroll layer.
      position: 'sticky',
      top: 0,
      zIndex: 0,
      overflow: 'hidden',
    }}>
      {/* Accessible page heading — the home's visual identity is the orb + the
          in-orb LOS ANGELES render (canvas, not DOM), so carry the document's
          <h1> here for screen readers and crawlers without changing the withheld
          look. Both layouts: the overview below heads its sections at h2/h3. */}
      <h1 style={{
        position: 'absolute', width: 1, height: 1, padding: 0, margin: -1,
        overflow: 'hidden', clip: 'rect(0 0 0 0)', whiteSpace: 'nowrap', border: 0,
      }}>
        Robby Meek — sailing for LA 2028
      </h1>

      {/* Rest-state background — hiking shot, sits under everything and shows
          through the light 0.42 rest scrim once the intro settles. Toggled
          while hidden behind the fully-black overlay, so no visible pop. On the
          baked path, BakedOrbBackdrop draws its own clip-aligned copy above it. */}
      <img
        src={embedded ? hikingBgMobile : hikingBg}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover',
          opacity: phase === 'rest' ? 1 : 0,
        }}
      />

      {/* Full-bleed photo layer — all decoded photos stay mounted, stacked;
          only the active one is visible. No per-frame remounting, so the
          montage can never flash a blank frame. */}
      {photoLayerVisible && playablePhotos.map((url, i) => (
        <img
          key={url}
          src={url}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: i === activePhoto ? 1 : 0,
            animation: i === activePhoto
              ? `photoFlash ${photoAnimDuration}ms linear forwards`
              : 'none',
            transformOrigin: 'center center',
          }}
        />
      ))}

      {/* Darkening overlay (solid black, alpha animates via CSS transition).
          Its OPACITY is a second, scroll-driven channel: the exit-reveal rAF
          lifts it 1→0 as the helm card rises, brightening the photo to full. */}
      <div
        ref={restScrimRef}
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          pointerEvents: 'none',
          ...overlayStyle,
        }}
      />

      {/* Spinning boat. With the orb it's hidden (opacity 0) and only sampled
          into the orb's refraction, so you see it bent through the glass. Without
          the orb (mobile / reduced-motion / no-WebGL) it's the original
          clickable DOM boat, centered. */}
      {showOrb ? (
        <img
          ref={boatImgRef}
          src={boatSrc}
          alt=""
          aria-hidden="true"
          style={{
            position: 'absolute', top: 0, left: 0,
            width: BOAT_SIZE, height: BOAT_SIZE,
            opacity: 0, pointerEvents: 'none', zIndex: 0,
          }}
        />
      ) : BAKED_ORB_READY ? (
        // Phone path: the pixel-identical baked orb + morph (see BAKE.md). Full-bleed
        // so the morph can grow to fill the screen. Inert until the clips are baked.
        // The morph clip runs ~2.5s — warmTheRoad() uses that window to pull the
        // route chunk, the globe's textures, and the curtain poster into cache so the
        // globe is ready (or nearly so) the moment the route swaps underneath.
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          opacity: boatVisible ? 1 : 0, transition: 'opacity 0.8s ease',
          pointerEvents: uiVisible && !scrolledAway ? 'auto' : 'none',
        }}>
          {/* The sailing photo + flat 0.42 scrim behind the orb, laid out with the
              SAME cover math as the baked clips (see BakedOrbBackdrop) so the DOM
              pixels line up with the backdrop baked INTO the video — the orb's
              mask rim and the morph's first frame are then seamless. No porthole,
              no blend modes: the lit-glass interior is real shader output now. */}
          <BakedOrbBackdrop embedded={embedded} scrimRef={bakedScrimRef} />
          {/* The 0.42 scrim is BAKED into the clip pixels, so on scroll the
              VIDEO fades out (backdrop stays) and the DOM photo brightens
              through as its scrim lifts. */}
          <div style={{
            position: 'absolute', inset: 0,
            opacity: scrolledAway ? 0 : 1, transition: 'opacity 0.8s ease',
          }}>
          <BakedOrb
            prefersReducedMotion={prefersReducedMotion}
            onMorphBegin={warmTheRoad}
            onMorphEnd={() => {
              // morph ends on the globe → fade the rest of the home to black but KEEP
              // the globe (the bridge shows the globe-on-black poster), then swap routes
              // underneath. The Road lifts the bridge once loaded (App's onGlobeReady
              // → blackBridge.fadeOut), revealing its globe at the same pose.
              // pendingFromOrb (one-shot; App consumes it right after the swap): App
              // swaps routes synchronously (no 350ms exit fade) and mounts The Road
              // with seamless=true, so its globe paints opaque at the exact pose of the
              // curtain poster — the crossfade reads as the globe waking up. A module
              // flag, NOT navigation state: state would persist on the history entry
              // and replay the seamless choreography on every back/forward re-entry.
              blackBridge.fadeIn(450, { image: GLOBE_POSTER })
              bridgeNavTimerRef.current = setTimeout(() => {
                orbOverlay.pendingFromOrb = true
                onNavigate('The Road')
              }, 480)
            }}
          />
          </div>
        </div>
      ) : (
        <button
          onClick={() => onNavigate('The Road')}
          className="road-tap"
          aria-label="Explore The Road to LA 2028"
          disabled={!uiVisible}
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            width: BOAT_SIZE, height: BOAT_SIZE,
            transform: 'translate(-50%, -50%)',
            opacity: boatVisible ? 1 : 0,
            transition: 'opacity 0.8s ease',
            pointerEvents: uiVisible ? 'auto' : 'none',
            cursor: uiVisible ? 'pointer' : 'default',
            background: 'none',
            border: 'none',
            padding: 0,
            zIndex: 10,
          }}
        >
          <img
            src={boatSrc}
            alt="Spinning sailboat"
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </button>
      )}

      {/* The glass orb renders into a BODY-LEVEL overlay canvas (orbOverlay.js),
          NOT here — so it survives the route swap during the orb→globe morph.
          Clicking it (window-level hit-test) plays the morph → The Road. */}

      {/* Desktop "grabbing hand" cursor over the orb (over the z40 orb canvas,
          under the z50 app nav). Sized to the orb's CLICKABLE zone — rest diameter
          plus the click halo all around — so the grab cursor shows exactly where a
          click will start the morph. Affordance only: the actual click is the
          window-level hit-test in glassOrbScene, which uses the same circle. */}
      {showOrb && (
        <button
          type="button"
          className="orb-grab"
          aria-label="Explore The Road to LA 2028"
          onClick={() => beginMorphRef.current()}
          disabled={!orbInteractive}
          style={{
            position: 'fixed', top: '50%', left: '50%',
            width: ORB_DIAMETER + ORB_CLICK_HALO_PX * 2,
            height: ORB_DIAMETER + ORB_CLICK_HALO_PX * 2,
            marginTop: -(ORB_DIAMETER / 2 + ORB_CLICK_HALO_PX),
            marginLeft: -(ORB_DIAMETER / 2 + ORB_CLICK_HALO_PX),
            borderRadius: '50%',
            background: 'none', border: 'none', padding: 0,
            cursor: orbInteractive ? 'grab' : 'default',
            zIndex: 45,
            // Interactive (and in the tab order) only at rest; `disabled` drops
            // it out otherwise. Keyboard Enter/Space + a screen-reader click both
            // fire onClick → the same morph the scene's mouse hit-test starts.
            pointerEvents: orbInteractive ? 'auto' : 'none',
          }}
        />
      )}

      {/* Home menu. MOBILE (embedded): the Support CTA (long arrow) + blurb, absolute
          at the bottom so it scrolls off with the frame — UNCHANGED. DESKTOP: a quiet
          bottom-left stack — the four sections (dot-separated) on top, Support beneath,
          blurb below; a touch larger so it reads as navigable, still recessive so the
          orb owns the field. Fade (uiVisible*(1-textOut)) is preserved in both. */}
      {embedded ? (
        <nav
          aria-label="Primary"
          style={{
            position: 'absolute',
            left: 'clamp(20px, 5vw, 64px)', // padded from the left, where it was
            maxWidth: 'min(88vw, 420px)',
            bottom: 'clamp(56px, 9vh, 84px)', // raised a touch to clear the scroll cue below
            display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
            gap: 'clamp(16px, 2.4vh, 24px)',
            opacity: (uiVisible && !scrolledAway ? 1 : 0) * (1 - textOut),
            transform: `translateX(${-28 * textOut}px)`,
            transition: `opacity 0.6s ease${bakedMorphOut ? ', transform 0.6s ease' : ''}`,
            pointerEvents: uiVisible && !scrolledAway && textOut < 0.05 ? 'auto' : 'none',
            zIndex: 20,
          }}
        >
          {/* Bottom-left: the mini-bio blurb. (Donate CTA + LA 2028 countdown both live in
              the top sticky bar now — App.jsx.) */}
          <p style={{
            color: HOME_FG, fontSize: BLURB_SIZE,
            lineHeight: 1.55, margin: 0, fontWeight: 400, letterSpacing: 0,
            maxWidth: 'min(100%, 420px)', textAlign: 'left',
          }}>{HOME_BLURB}</p>
        </nav>
      ) : (
        // Desktop home: the top bar (sponsor lockup · Donate CTA · hamburger/Menu) is
        // the App-level DesktopBanner now — fixed, it rides up and pins on scroll and
        // fades with uiVisible/textOut via the homeChrome signal written above. Only
        // the second sponsor lockup + blurb remain here, bottom-left in one column,
        // ABSOLUTE so they scroll away with the frame into the biography below.
        <>
          {/* Bottom-left: the blurb with the second sponsor lockup flush in the very
              bottom-left corner beneath it — the white box butts against the screen's
              left edge and bottom (no corner inset). One column so the blurb +
              lockup share a width and adapt together on resize. */}
          <div
            style={{
              position: 'absolute', left: 0, bottom: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
              gap: 'clamp(12px, 1.8vh, 20px)', width: HOME_SPONSOR_W, maxWidth: '84vw',
              opacity: (uiVisible && !scrolledAway ? 1 : 0) * (1 - textOut),
              transition: 'opacity 0.6s ease',
              pointerEvents: 'none', zIndex: 46,
            }}
          >
            <p style={{
              color: HOME_FG,
              fontSize: 'clamp(12.5px, 0.95vw, 14px)',
              lineHeight: 1.6, margin: 0, fontWeight: 400, letterSpacing: '0.2px',
              textAlign: 'left',
              // Left inset off the screen edge; box stays full column width so the
              // right side still wraps at the sponsor banner's right edge.
              width: '100%', boxSizing: 'border-box',
              paddingLeft: 'clamp(14px, 1.5vw, 20px)',
            }}>{HOME_BLURB}</p>
            <SponsorRect pair={SPONSOR_PAIRS[1]} style={{ width: '100%' }} />
          </div>
        </>
      )}

      {/* Title-sponsor sticker — a quiet credibility mark. MOBILE: a strip across the
          top (clears the hamburger, sits above the LA 2028 HUD, scrolls off with the
          frame). DESKTOP: a compact vertical sticker to the right of the centered orb.
          Fades in lockstep with the home nav via uiVisible*(1-textOut). */}
      <HomeSponsorStrip embedded={embedded} uiVisible={uiVisible} textOut={scrolledAway ? 1 : textOut} />

      {/* Scroll cue — a quiet "Explore" hint that scrolling leads on into the page
          (so it doesn't read as a dead end). Gently bounces (site scrollHint), fades
          in after the intro, fades out once you scroll (returns near the top), and
          taps to smooth-scroll down into the section. Now on desktop too, which
          scrolls into the biography below. */}
      {(
        <button
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
          aria-label="Explore — scroll down"
          style={{
            position: 'absolute', left: '50%', bottom: 'clamp(16px, 2.5vh, 26px)',
            transform: 'translateX(-50%)',
            background: 'none', border: 'none', cursor: 'pointer', padding: '8px 12px',
            color: HOME_FG,
            fontSize: 12, fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase',
            fontFamily: 'inherit', whiteSpace: 'nowrap',
            opacity: (uiVisible && !cueScrolled ? 1 : 0) * (1 - textOut),
            transition: 'opacity 0.5s ease',
            pointerEvents: uiVisible && !cueScrolled && textOut < 0.05 ? 'auto' : 'none',
            zIndex: 20,
          }}
        >
          <span style={{ display: 'inline-block', animation: prefersReducedMotion ? 'none' : 'scrollHint 1.6s ease-in-out infinite' }}>
            Explore ↓
          </span>
        </button>
      )}


    </div>
  )
}

// ---------- baked-orb backdrop ----------
// The baked clips (bakeMain.js) composite the sailing photo cover-fit into a
// 1080×1920 frame under a flat rgba(0,0,0,0.42) scrim — the desktop rest look.
// This draws the SAME thing in the DOM with the SAME two-step cover math (photo →
// 1080×1920 frame → frame cover-fit to the viewport), so DOM pixels line up with
// the clip's baked backdrop on every device aspect. That alignment is what makes
// the rest clip's mask rim (BakedOrb) and the full-bleed morph's first frame
// read as one continuous image. No porthole: the lit glass is in the clip itself.
const BAKE_W = 1080
const BAKE_H = 1920
const BAKE_ORB_R = 166 // matches BakedOrb: orb radius in the 1080×1920 baked source (expanded orb)

function BakedOrbBackdrop({ embedded, scrimRef }) {
  const [vp, setVp] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 390,
    h: typeof window !== 'undefined' ? window.innerHeight : 844,
  }))
  useEffect(() => {
    const h = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const s = Math.max(vp.w / BAKE_W, vp.h / BAKE_H)
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      {/* the clip's 1080×1920 frame, cover-fit to the viewport and centred */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: BAKE_W * s, height: BAKE_H * s,
        transform: 'translate(-50%, -50%)',
      }}>
        <img
          src={embedded ? hikingBgMobile : hikingBg}
          alt=""
          aria-hidden="true"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
      {/* rest overlay: one flat colour, no vignette. The exit-reveal rAF lifts
          its opacity 1→0 on scroll so the photo brightens under the card. */}
      <div ref={scrimRef} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)' }} />
    </div>
  )
}

// The desktop hamburger + menu overlay live in components/DesktopBanner.jsx now
// (BannerHamburger / DesktopMenuOverlay) — site-wide, rendered by App.
