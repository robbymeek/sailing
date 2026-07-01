import { useState, useEffect, useRef } from 'react'
import useCountdown from '../hooks/useCountdown'
import orbOverlay from '../lib/orbOverlay'
import { hasWebGL2 } from '../lib/webglSupport'
import { introPhotos } from '../assets/home-intro'
// Rest-state background: the portrait sailing shot, shown nearly black under the
// overlay — and refracted, with the boat, inside the glass orb.
import hikingBg from '../assets/home-intro/img-5957.jpg'
// Lightweight (733×1100, ~108KB) version of the same shot for the mobile home
// background — the full-res photo is only needed for the desktop orb's refraction.
import hikingBgMobile from '../assets/home-intro/img-5957-mobile.jpg'
import BakedOrb, { BAKED_ORB_READY } from '../components/BakedOrb'
import blackBridge from '../lib/blackBridge'

const BASE = import.meta.env.BASE_URL
const BOAT_SIZE = 200
// Desktop glass-orb on-screen diameter (mirrors the orbOverlay.attach call below).
// Used to size the grab-cursor zone over the orb.
const ORB_DIAMETER = BOAT_SIZE * 1.3 // 260px — orb ≈ 130% of the sailboat height
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

// Module-level flag: the cinematic intro plays once per JS bundle
// initialization (hard refresh) and is skipped on SPA navigation back
// to /. No storage APIs — this lives for the tab's lifetime only.
let introHasPlayed = false

// WebGL2 capability gate lives in ../lib/webglSupport (shared with ComingSoon).

export default function MainView({ onNavigate, hoverNavOpen, skipIntro, embedded }) {
  const target = new Date('2028-07-14T00:00:00')
  const { days, hrs, mins, secs } = useCountdown(target)

  return (
    <HomeIntro
      onNavigate={onNavigate}
      hoverNavOpen={hoverNavOpen}
      skipIntro={skipIntro}
      embedded={embedded}
      boatSrc={`${BASE}[0001-0250].gif`}
      days={days}
      hrs={hrs}
      mins={mins}
      secs={secs}
    />
  )
}

// ---------- Home intro + rest-state component ----------
// All cinematic state and timers live here so MainView stays a thin
// shell. Kept in the same file per the original brief.
function HomeIntro({ onNavigate, hoverNavOpen, skipIntro: forceSkip, embedded, boatSrc, days, hrs, mins, secs }) {
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  )
  const [portrait, setPortrait] = useState(
    typeof window !== 'undefined' ? window.innerHeight > window.innerWidth : false
  )
  useEffect(() => {
    const h = () => {
      setViewportWidth(window.innerWidth)
      setPortrait(window.innerHeight > window.innerWidth)
    }
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Skip check: respect the module-level played flag + reduced-motion.
  const skipIntro = forceSkip || introHasPlayed || prefersReducedMotion

  // The glass orb (desktop) refracts the page behind it — the dark photo + the
  // spinning boat. Needs WebGL + motion; skipped in the mobile embedded home and
  // for reduced-motion/no-WebGL2, which keep the original DOM boat. Computed ONCE
  // (lazy) — hasWebGL2() spins up a throwaway context, never run every render.
  const [useOrb] = useState(
    () => !embedded && !prefersReducedMotion && hasWebGL2()
  )
  const boatImgRef = useRef(null)
  const bakedRef = useRef(null) // imperative handle to the phone-path BakedOrb (begin the morph)
  const [orbReady, setOrbReady] = useState(false)
  const [orbFailed, setOrbFailed] = useState(false)
  const [morph, setMorph] = useState(0) // 0→1 morph progress, drives the text-out
  const showOrb = useOrb && !orbFailed

  // beginMorph (orb clicked) + navTo (fired by the scene at m≈0.82). Held in refs
  // so they always see the current uiVisible/onNavigate without re-attaching.
  const beginMorphRef = useRef(() => {})
  const navToRef = useRef(() => {})

  // Mount the orb into the BODY-LEVEL overlay (orbOverlay), so the canvas survives
  // the Home → Coming Soon route swap for the seamless morph handoff.
  useEffect(() => {
    if (!useOrb) return undefined
    // Safety net: a thrown context rejects the attach() promise (handled below),
    // but a scene that simply never signals onReady would leave a blank orb with
    // no fallback. Flip to the flat boat if ready hasn't fired in time. Mirrors
    // the Coming Soon overlay's net in App.jsx. Cleared the instant onReady fires.
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
        prefersReducedMotion,
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
  const [photoLayerVisible, setPhotoLayerVisible] = useState(!skipIntro && introPhotos.length > 0)
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

    if (introPhotos.length === 0) {
      // eslint-disable-next-line no-console
      console.warn('[HomeIntro] No photos in src/assets/home-intro/, skipping flash montage')
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
      introPhotos.map((url) => loadOne(url).then((r) => { results.push(r); return r }))
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

  // Keep the click + navigate handlers current (they read uiVisible / onNavigate).
  beginMorphRef.current = () => {
    if (!uiVisible || orbOverlay.holding) return // only at rest, once
    orbOverlay.holding = true // overlay must survive the upcoming route swap
    orbOverlay.pendingFromOrb = true
    import('./ComingSoon') // load Coming Soon ASAP so it's ready under the overlay
    orbOverlay.startMorph()
  }
  navToRef.current = () => onNavigate('Coming Soon', { fromOrb: true })

  // Click-anywhere-to-enter (DESKTOP). Anywhere on the home that isn't an actual
  // control — the bottom-left nav, the LA 2028 corner, or the top hover banner
  // (all <button>s / tagged [data-orb-skip]) — plays the same orb→globe morph as
  // clicking the orb itself. Mobile is intentionally excluded: there the orb is a
  // baked video with its own tap target (per the wrapped "Click here" caption), so
  // only an orb tap navigates and stray taps while scrolling to the bio don't.
  const handlePageActivate = (e) => {
    if (embedded) return // mobile home: only the orb tap navigates
    if (!uiVisible || phase !== 'rest' || morph !== 0 || orbOverlay.holding) return
    if (e.target.closest && e.target.closest('button, a, input, textarea, [data-orb-skip]')) return
    // Don't hijack a click that was really a text selection drag.
    if (typeof window !== 'undefined' && window.getSelection && String(window.getSelection())) return
    if (showOrb) beginMorphRef.current() // live glass orb → morph
    else if (BAKED_ORB_READY && bakedRef.current) bakedRef.current.begin() // desktop baked fallback
    else onNavigate('Coming Soon')
  }

  // As the morph grows the orb, the home text fades out and slides aside (early,
  // so the screen is clear before the orb is large). 0 → 1 across morph 0.08–0.32.
  const textOut = (() => {
    const t = Math.min(1, Math.max(0, (morph - 0.08) / 0.24))
    return t * t * (3 - 2 * t)
  })()

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
  // black, then eases back to near-black so the hiking photo behind it reads
  // as a barely-there texture rather than flat black.
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
      background = 'rgba(0,0,0,0.88)'
      transition = 'background 1.4s ease'
    }
    return { background, transition }
  })()

  // Typographic anchor — countdown corner reuses the value/meta treatment
  const anchorValue = {
    color: 'rgb(157,174,194)', fontSize: 20, fontWeight: 400,
    letterSpacing: '-0.8px', margin: '0 0 8px',
  }
  const anchorMeta = {
    color: 'rgb(153,153,153)', fontSize: 16, fontWeight: 500, margin: 0,
  }
  const anchorButton = {
    background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
  }
  const countdownText = `${days} : ${String(hrs).padStart(2, '0')} : ${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`

  // On very narrow viewports the countdown corner would collide with the nav;
  // drop it there. TODO mobile pass — a future prompt will redesign mobile nav.
  const showCountdown = viewportWidth >= 400

  const activePhoto = playablePhotos.length > 0
    ? photoIndex % playablePhotos.length
    : -1

  return (
    <div onClick={handlePageActivate} style={{
      background: 'rgb(0,0,0)',
      height: '100dvh',
      width: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Rest-state background — hiking shot, sits under everything and only
          shows through the near-black overlay once the intro settles. Toggled
          while hidden behind the fully-black overlay, so no visible pop. On mobile
          the orb reveals it around the edges (see BakedOrb revealBackground). */}
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

      {/* Darkening overlay (solid black, alpha animates via CSS transition) */}
      <div
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
        <div style={{
          position: 'absolute', inset: 0, zIndex: 10,
          opacity: boatVisible ? 1 : 0, transition: 'opacity 0.8s ease',
          pointerEvents: uiVisible ? 'auto' : 'none',
        }}>
          {/* Mobile: an evenly-faded sailing photo sits behind the orb, in the SAME
              layer so the orb's screen-blend lands on it (drops the video's black). */}
          {embedded && (
            <>
              <img
                src={hikingBgMobile}
                alt=""
                aria-hidden="true"
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.8)' }} />
            </>
          )}
          <BakedOrb
            ref={bakedRef}
            prefersReducedMotion={prefersReducedMotion}
            revealBackground={embedded}
            onMorphEnd={() => {
              // morph ends on the globe → fade the rest of the home to black but KEEP
              // the globe (the bridge shows the globe-on-black poster), then swap routes
              // underneath. Coming Soon lifts the bridge once loaded (App's onGlobeReady
              // → blackBridge.fadeOut), revealing its globe at the same pose.
              blackBridge.fadeIn(450, { image: GLOBE_POSTER })
              setTimeout(() => onNavigate('Coming Soon'), 480)
            }}
          />
        </div>
      ) : (
        <button
          onClick={() => onNavigate('Coming Soon')}
          aria-label="Coming soon — see the road to LA 2028"
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
          Clicking it (window-level hit-test) plays the morph → Coming Soon. */}

      {/* Desktop "grabbing hand" cursor over the orb (over the z40 orb canvas,
          under the z50 app nav). The whole home is click-to-enter (handled at the
          root), so this is purely the affordance: a grab cursor on the round orb,
          confined to the circle by clip-path. */}
      {showOrb && (
        <div
          className="orb-grab"
          aria-hidden="true"
          style={{
            position: 'fixed', top: '50%', left: '50%',
            width: ORB_DIAMETER, height: ORB_DIAMETER,
            marginTop: -ORB_DIAMETER / 2, marginLeft: -ORB_DIAMETER / 2,
            borderRadius: '50%',
            clipPath: 'circle(50%)', // confine the grab cursor to the round orb
            cursor: 'grab',
            zIndex: 45,
            pointerEvents:
              uiVisible && phase === 'rest' && morph === 0 ? 'auto' : 'none',
          }}
        />
      )}

      {/* Bottom-left persistent nav — always visible after intro */}
      <nav
        aria-label="Primary"
        data-orb-skip
        style={{
          position: embedded ? 'absolute' : 'fixed',
          bottom: 32,
          left: 32,
          display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start',
          gap: 20,
          opacity: (uiVisible ? 1 : 0) * (1 - textOut),
          transform: `translateX(${-28 * textOut}px)`,
          transition: 'opacity 0.6s ease',
          pointerEvents: uiVisible && textOut < 0.05 ? 'auto' : 'none',
          zIndex: 20,
          maxWidth: 380,
        }}
      >
        {/* Nav row with dot separators */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
          flexWrap: 'wrap',
        }}>
          {[
            ['BIOGRAPHY', 'Biography'],
            ['PATH & TEAM', 'Path'],
            ['CONTACT', 'Contact'],
          ].map(([label, route], i, arr) => (
            <span key={route} style={{ display: 'inline-flex', alignItems: 'center' }}>
              <HomeNavLink label={label} onClick={() => onNavigate(route)} />
              {i < arr.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 8, margin: '0 16px', userSelect: 'none' }}>●</span>
              )}
            </span>
          ))}
        </div>

        {/* SUPPORT → */}
        <HomeNavLink label="SUPPORT →" onClick={() => onNavigate('Support')} isSupport />

        {/* Blurb */}
        <p style={{
          color: 'rgba(255,255,255,0.4)',
          fontSize: 11,
          lineHeight: 1.5,
          margin: 0,
          fontWeight: 400,
          letterSpacing: '-0.1px',
          maxWidth: 320,
        }}>
          Robby Meek is a sailor for the US Sailing Team attending Harvard University working to compete and excel at the 2028 Olympic Games.
        </p>
      </nav>

      {/* Top-right countdown corner — clickable, fades in with the nav */}
      {showCountdown && (
        <CountdownCorner
          onNavigate={onNavigate}
          uiVisible={uiVisible}
          morphOut={textOut}
          hoverNavOpen={hoverNavOpen}
          embedded={embedded}
          anchorButton={anchorButton}
          anchorValue={anchorValue}
          anchorMeta={anchorMeta}
          countdownText={countdownText}
        />
      )}
    </div>
  )
}

// Top-right countdown corner — LA 2028 hovers royal blue and click-throughs
// to Event Calendar. The countdown line below is a non-interactive sibling.
function CountdownCorner({ onNavigate, uiVisible, morphOut = 0, hoverNavOpen, embedded, anchorButton, anchorValue, anchorMeta, countdownText }) {
  const [hover, setHover] = useState(false)
  return (
    <div data-orb-skip style={{
      position: embedded ? 'absolute' : 'fixed',
      top: hoverNavOpen ? 72 : 32,
      right: 32,
      textAlign: 'right',
      opacity: (uiVisible ? 1 : 0) * (1 - morphOut),
      transform: `translateX(${28 * morphOut}px)`,
      transition: 'opacity 0.6s ease, top 0.3s ease',
      pointerEvents: uiVisible && morphOut < 0.05 ? 'auto' : 'none',
      zIndex: 20,
    }}>
      <button
        onClick={() => onNavigate('Event Calendar')}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{ ...anchorButton, textAlign: 'right' }}
      >
        <h1 style={{
          ...anchorValue,
          marginTop: 0,
          color: hover ? '#1E40FF' : anchorValue.color,
          transition: 'color 0.25s ease',
        }}>LA 2028</h1>
      </button>
      <p style={anchorMeta}>{countdownText}</p>
    </div>
  )
}

// Small stateful nav link: color transitions to royal blue on hover.
function HomeNavLink({ label, onClick, isSupport }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
      style={{
        background: 'none',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        color: hover ? '#1E40FF' : 'rgba(255,255,255,0.75)',
        fontSize: isSupport ? 14 : 13,
        fontWeight: isSupport ? 500 : 400,
        letterSpacing: isSupport ? '1px' : '-0.2px',
        fontFamily: 'inherit',
        transition: 'color 0.25s ease',
      }}
    >
      {label}
    </button>
  )
}
