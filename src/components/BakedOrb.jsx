import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react'

const BASE = import.meta.env.BASE_URL

// ============================================================================
//  BakedOrb — the PHONE path's pixel-identical orb + morph.
// ============================================================================
//  The desktop home runs the live WebGL orb (src/lib/glassOrbScene.js). Phones
//  can't run it reliably (Three.js 0.180 needs WebGL2; iOS drops contexts; the
//  shader is heavy), so instead we play a VIDEO recorded from the REAL shader on
//  a desktop GPU — see BAKE.md. Because it's the actual rendered frames, it looks
//  identical; because it's opaque H.264/VP9 video, it's bulletproof and light.
//
//  The clips are recorded over the REAL rest backdrop — the sailing photo under
//  the desktop's flat 0.88 rest scrim (see bakeMain.js) — so the orb's interior
//  refraction and rim glow are the genuine desktop pixels, no blend-mode faking.
//  At rest the clip shows through a feathered circular MASK just past the orb's
//  rim; outside it, MainView's BakedOrbBackdrop draws the same photo with the
//  same cover math, so the seam is invisible. The morph clip plays FULL-BLEED
//  (its backdrop + the desktop's fade-to-black are baked in). A short cross-fade
//  bridges rest→morph (the boat's rotation phase won't match exactly across two
//  separate recordings), and the morph ENDS on the globe's hero pose so the land
//  is seamless:  rest ──tap──▶ morph ──ends──▶ /the-road.
//
//  ─── AFFORDANCES ───
//  • TOUCH (iPhone): tapping the orb morphs. The LA 2028 OLYMPICS headline +
//    countdown above the orb live in MainView (MobileOrbHud) and are non-interactive.
//  • DESKTOP-baked (rare: a desktop without WebGL2): the orb grows as the cursor
//    nears the screen centre, mirroring the live orb's proximity scale.
//  Only the orb hotspot (orb + small halo, see the tap-hotspot constants) starts
//  the morph — the rest of the full-bleed video field is DEAD SPACE, so stray
//  background taps never navigate. begin() stays exposed via ref for imperative
//  callers (none in-tree today).
//
//  ─── ACTIVATION ───
//  This is OFF until you record + encode the clips. Until then the mobile home
//  keeps its current boat (so nothing tries to play a missing video). To turn it
//  on: run the bake (BAKE.md) so public/orb/ has the clips, then set
//  BAKED_ORB_READY = true below and ship it. Verify framing + the /the-road
//  hand-off on a real phone first (see BAKE.md).
// ============================================================================

// The single switch. Flip to true ONLY after `npm run bake:encode` has populated
// public/orb/ (see BAKE.md). MainView reads this to decide the phone path.
export const BAKED_ORB_READY = true

// Assets produced by the bake (npm run bake:encode → public/orb/).
const REST = `${BASE}orb/orb-rest` //   .webm + .mp4 (idle loop)
const MORPH = `${BASE}orb/orb-morph` // .webm + .mp4 (one-shot orb→globe)
const REST_POSTER = `${BASE}orb/orb-rest-poster.jpg` // first rest frame (instant paint)

// Proximity scale for the rare desktop-baked path (mirrors glassOrbScene tunables).
const HOVER_MAX_SCALE = 1.3
const HOVER_INFLUENCE_PX = 360
const HOVER_EASE = 0.12

// ---------- baked-clip geometry (tap hotspot + rest mask) ----------
// The orb sits dead-centred in the 1080×1920 recordings with a ~130px radius, and
// the clips render objectFit:cover, so on-screen radius = 130 × max(w/1080, h/1920)
// (same cover math as MainView's BakedOrbBackdrop, which keeps the DOM photo
// pixel-aligned with the clip's baked backdrop).
// Only the orb + CLICK_HALO_PX around it is tappable (mirrors the desktop live
// orb's clickHaloPx); on phones only the orb navigates — the LA 2028 OLYMPICS
// headline above it (MainView's MobileOrbHud) is non-interactive.
const BAKE_W = 1080
const BAKE_H = 1920
const BAKE_ORB_R = 130
const CLICK_HALO_PX = 52
// Rest-clip mask: solid past the orb's rim (room for edge AA + dispersion
// speckle), feathered out a little further. Beyond the rim the clip contains the
// same backdrop the DOM draws, so the feather band blends over matching pixels.
const MASK_SOLID_PX = 10
const MASK_FADE_PX = 26

// ---------- idle breathing pulse (mirrors the desktop live orb; glassOrbScene TUNE) ----------
// A slow, near-subliminal swell + brightness breath so the orb reads as the one
// living thing on the page, plus one deeper one-shot "inhale" when the rest loop
// first plays (the phone's equivalent of the desktop settling to rest). Applied as
// CSS transform+filter on the rest <video>, so it composes with the desktop-baked
// proximity scale on boxRef and needs no re-bake. Kept in sync with glassOrbScene's
// pulse* / inhale* TUNE values so both paths breathe on the same rhythm.
const PULSE_SCALE = 0.015 // peak swell of the idle breath (× rest)
const PULSE_GLOW = 0.06 // brightness lift at the breath peak
const PULSE_PERIOD_MS = 6000 // one full breath (swell out + relax back)
const INHALE_SCALE = 0.03 // extra one-shot swell on the first settle
const INHALE_GLOW = 0.1 // extra brightness on that first inhale
const INHALE_MS = 2200 // duration of the one-shot inhale envelope

// Morph stall guards. The clip normally starts within a frame or two of play();
// if it hasn't, we re-check every 900ms while data is still arriving (readyState ≥
// HAVE_METADATA) up to MORPH_START_MAX_CHECKS — skipping on the first check would
// drop the morph for exactly the slow networks the preloading targets — then skip
// straight to the hand-off. A duration-based ceiling (start allowance included)
// guards a clip that stalls mid-play, so the user can never be stranded.
const MORPH_START_TIMEOUT_MS = 900
const MORPH_START_MAX_CHECKS = 3
const MORPH_TOTAL_TIMEOUT_PAD_MS = 1500

// BakedOrb({ onMorphBegin, onMorphEnd, prefersReducedMotion, style }, ref)
//   onMorphBegin        fired the instant a tap starts the morph — preload hook
//   onMorphEnd          fired when the morph clip finishes — navigate to /the-road
//   prefersReducedMotion shows the static poster only (no autoplay); tap → onMorphEnd
//   style               merged onto the full-bleed container
//   ref.begin()         start the morph imperatively
const BakedOrb = forwardRef(function BakedOrb(
  { onMorphBegin, onMorphEnd, prefersReducedMotion = false, style },
  ref
) {
  const [morphing, setMorphing] = useState(false)
  const morphRef = useRef(null)
  const restRef = useRef(null)
  // Autoplay refused or playback paused outside the morph (iOS Low Power Mode,
  // Data Saver, app backgrounding). While frozen the rest VIDEO is hidden and the
  // poster <img> shows instead, so iOS's native play glyph can never appear on a
  // stalled video. Cleared automatically when playback (re)starts.
  const [restFrozen, setRestFrozen] = useState(false)
  const endedRef = useRef(false)
  const boxRef = useRef(null) //   container we proximity-scale on desktop-baked
  const morphingRef = useRef(false) // freeze the scale once the morph starts
  const watchdogsRef = useRef([]) // morph stall timers, cleared on unmount

  // Coarse pointer (touch) → skip the cursor-proximity scale (no cursor on mobile).
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    setTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  // Never show a native play glyph on the rest loop. React doesn't render the
  // `muted` ATTRIBUTE (only sets the property — same quirk SailingBanner works
  // around), and iOS judges autoplay eligibility by the attribute, so set it by
  // hand; then drive play() ourselves so a refusal (Low Power Mode, Data Saver)
  // is observable → freeze to the poster instead of leaving a paused video for
  // Safari to decorate. Any later touch / return-to-foreground retries, since a
  // user gesture re-permits playback in Low Power Mode.
  useEffect(() => {
    if (prefersReducedMotion) return undefined // poster-only branch, no video
    const v = restRef.current
    if (!v) return undefined
    v.muted = true
    v.defaultMuted = true
    v.setAttribute('muted', '')
    let cancelled = false
    const tryPlay = () => {
      const p = v.play()
      if (p && p.then) {
        p.then(
          () => { if (!cancelled) setRestFrozen(false) },
          () => { if (!cancelled) setRestFrozen(true) }
        )
      }
    }
    // A pause outside the morph (backgrounding, OS media interruption) would
    // strand a paused video → freeze to the poster until a retry succeeds.
    const onPause = () => { if (!morphingRef.current) setRestFrozen(true) }
    const onPlaying = () => { if (!cancelled) setRestFrozen(false) }
    const retry = () => { if (!morphingRef.current && v.paused) tryPlay() }
    const onVisible = () => { if (!document.hidden) retry() }
    v.addEventListener('pause', onPause)
    v.addEventListener('playing', onPlaying)
    window.addEventListener('touchstart', retry, { passive: true })
    window.addEventListener('pointerdown', retry, { passive: true }) // desktop-baked / occluded-window recovery
    document.addEventListener('visibilitychange', onVisible)
    tryPlay()
    return () => {
      cancelled = true
      v.removeEventListener('pause', onPause)
      v.removeEventListener('playing', onPlaying)
      window.removeEventListener('touchstart', retry)
      window.removeEventListener('pointerdown', retry)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [prefersReducedMotion])

  // Idle breathing pulse on the rest loop — matches the desktop orb's rhythm. One
  // rAF writes transform+filter to the rest <video> (composing with any boxRef
  // proximity scale on the desktop-baked path); frozen during the morph and skipped
  // for reduced motion. The one-shot "inhale" fires when playback first starts (the
  // phone's equivalent of the page settling to rest). Amplitude is tiny — the rim
  // stays inside the mask feather and the tap hotspot (a separate circle) is unmoved.
  useEffect(() => {
    if (prefersReducedMotion) return undefined
    const v = restRef.current
    if (!v) return undefined
    const ss = (t) => t * t * (3 - 2 * t) // smoothstep 0→1
    let raf = 0
    let inhaleStart = 0
    let woke = false
    const onPlaying = () => { if (!woke) { woke = true; inhaleStart = performance.now() } }
    v.addEventListener('playing', onPlaying)
    const tick = () => {
      raf = requestAnimationFrame(tick)
      if (morphingRef.current) return // orb frozen; the morph clip owns the frame
      const now = performance.now()
      const breathT = 0.5 - 0.5 * Math.cos((now / PULSE_PERIOD_MS) * Math.PI * 2)
      let swell = PULSE_SCALE * breathT
      let glow = PULSE_GLOW * breathT
      if (inhaleStart) {
        const u = (now - inhaleStart) / INHALE_MS
        if (u >= 1) inhaleStart = 0
        else {
          const env = u < 0.3 ? ss(u / 0.3) : 1 - ss((u - 0.3) / 0.7)
          swell += INHALE_SCALE * env
          glow += INHALE_GLOW * env
        }
      }
      v.style.transform = `scale(${(1 + swell).toFixed(4)})`
      v.style.filter = `brightness(${(1 + glow).toFixed(4)})`
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      v.removeEventListener('playing', onPlaying)
      v.style.transform = ''
      v.style.filter = ''
    }
  }, [prefersReducedMotion])

  const finish = () => {
    if (endedRef.current) return
    endedRef.current = true
    if (onMorphEnd) onMorphEnd()
  }

  // Tap on the orb hotspot: cross-fade to the preloaded morph and play it once. The
  // morph's poster is the rest frame, so a correct first frame always paints
  // instantly; a short opacity cross-fade (not a hard cut) hides the boat's
  // rotation-phase difference between the two recordings. reduced-motion skips
  // straight to the page; a blocked autoplay still navigates.
  const begin = () => {
    if (morphing || endedRef.current) return
    if (onMorphBegin) onMorphBegin() // preload hook — fire before any early return
    morphingRef.current = true
    if (boxRef.current) boxRef.current.style.transform = 'scale(1)' // drop any hover scale before the morph
    if (prefersReducedMotion) { finish(); return }
    setMorphing(true)
    const v = morphRef.current
    if (!v) { finish(); return }
    v.muted = true // same React muted-attribute quirk as the rest loop
    v.defaultMuted = true
    v.setAttribute('muted', '')
    v.currentTime = 0
    const p = v.play()
    if (p && p.catch) p.catch(() => finish())
    // Stall guards (finish() is idempotent): if the clip never starts rendering
    // frames, or never reaches its end, hand off anyway — the black-bridge curtain
    // makes the skip look intentional. Never leave the user on a frozen orb.
    let startChecks = 0
    const checkStart = () => {
      if (endedRef.current || v.currentTime > 0.05) return // playing — onEnded owns the rest
      startChecks += 1
      if (startChecks < MORPH_START_MAX_CHECKS && v.readyState >= 1) {
        watchdogsRef.current.push(setTimeout(checkStart, MORPH_START_TIMEOUT_MS))
      } else {
        finish()
      }
    }
    watchdogsRef.current.push(
      setTimeout(checkStart, MORPH_START_TIMEOUT_MS),
      setTimeout(
        finish,
        (((isFinite(v.duration) && v.duration) || 6) * 1000)
          + MORPH_START_MAX_CHECKS * MORPH_START_TIMEOUT_MS + MORPH_TOTAL_TIMEOUT_PAD_MS
      )
    )
  }

  // Imperative escape hatch — begin() stays reachable via ref (no in-tree callers).
  useImperativeHandle(ref, () => ({ begin }))

  // Clear any pending morph watchdogs when the component unmounts (route swapped).
  useEffect(() => () => { watchdogsRef.current.forEach(clearTimeout) }, [])

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin() }
  }

  // Desktop-baked only: grow the orb as the cursor nears the screen centre. Skipped
  // on touch (no cursor) and for reduced motion. Ref-driven on a rAF — never React
  // state — so there are no per-mousemove re-renders.
  useEffect(() => {
    if (prefersReducedMotion || touch) return undefined
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    if (!window.matchMedia('(pointer: fine)').matches) return undefined
    let raf = 0
    let cur = 1
    let target = 1
    const onMove = (e) => {
      const d = Math.hypot(e.clientX - window.innerWidth / 2, e.clientY - window.innerHeight / 2)
      const t = Math.max(0, Math.min(1, (HOVER_INFLUENCE_PX - d) / HOVER_INFLUENCE_PX))
      const eased = t * t * (3 - 2 * t)
      target = 1 + (HOVER_MAX_SCALE - 1) * eased
    }
    const tick = () => {
      cur += (target - cur) * HOVER_EASE
      if (boxRef.current && !morphingRef.current) {
        boxRef.current.style.transform = `scale(${cur.toFixed(3)})`
      }
      raf = requestAnimationFrame(tick)
    }
    window.addEventListener('pointermove', onMove)
    raf = requestAnimationFrame(tick)
    return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf) }
  }, [prefersReducedMotion, touch])

  // Viewport-tracked orb radius → the tap hotspot's size. The box is full-bleed
  // and viewport-sized in both uses (mobile home hero, desktop no-WebGL2 home),
  // so window dimensions are the cover-fit reference — same math as the scrim.
  const [vp, setVp] = useState(() => ({
    w: typeof window !== 'undefined' ? window.innerWidth : 390,
    h: typeof window !== 'undefined' ? window.innerHeight : 844,
  }))
  useEffect(() => {
    const h = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])
  const orbR = BAKE_ORB_R * Math.max(vp.w / BAKE_W, vp.h / BAKE_H)
  const hotspotSize = 2 * (orbR + CLICK_HALO_PX)
  // Feathered circle over the orb — the rest clip (and its frozen-poster stand-in)
  // renders only through this; everything outside is the DOM backdrop.
  const maskImage = `radial-gradient(circle at 50% 50%, #000 ${Math.round(orbR + MASK_SOLID_PX)}px, transparent ${Math.round(orbR + MASK_FADE_PX)}px)`
  const restMask = { WebkitMaskImage: maskImage, maskImage }

  // Transparent box: at rest only the masked orb circle paints (the DOM backdrop
  // shows everywhere else); during the morph the full-bleed clip covers it —
  // its backdrop and fade-to-black are baked in, no blend modes anywhere.
  const box = {
    position: 'relative', width: '100%', height: '100%',
    background: 'transparent',
    overflow: 'hidden',
    transformOrigin: 'center center', willChange: 'transform',
    ...style,
  }
  const layer = (extra) => ({
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', display: 'block', ...extra,
  })
  // The tap target: a circle over the orb (+ halo), NOT the full-bleed box — taps
  // on the background around it are dead space. It lives inside the proximity-
  // scaled box, so on desktop-baked it grows with the orb automatically. z3: above
  // the videos.
  const hotspot = (
    <div
      onClick={begin}
      onKeyDown={onKey}
      tabIndex={0}
      role="button"
      aria-label="The Road — see the road to LA 2028"
      style={{
        position: 'absolute', top: '50%', left: '50%',
        width: hotspotSize, height: hotspotSize,
        transform: 'translate(-50%, -50%)',
        borderRadius: '50%', cursor: 'pointer', zIndex: 3,
      }}
    />
  )

  if (prefersReducedMotion) {
    return (
      <div ref={boxRef} style={box}>
        <img src={REST_POSTER} alt="" aria-hidden="true" style={layer(restMask)} />
        {hotspot}
      </div>
    )
  }

  return (
    <div ref={boxRef} style={box}>
      {/* REST — autoplaying idle loop, visible only through the orb-rim mask.
          Hidden while restFrozen (autoplay refused / paused): the poster <img>
          below shows the same first frame through the same mask instead, so the
          OS can never paint a play glyph over a stalled video. */}
      <video
        ref={restRef}
        className="baked-orb-video"
        autoPlay muted loop playsInline preload="auto" poster={REST_POSTER}
        style={layer({ opacity: morphing || restFrozen ? 0 : 1, transition: 'opacity 150ms linear', ...restMask })}
      >
        <source src={`${REST}.webm`} type="video/webm" />
        <source src={`${REST}.mp4`} type="video/mp4" />
      </video>
      {restFrozen && !morphing && (
        <img src={REST_POSTER} alt="" aria-hidden="true" style={layer(restMask)} />
      )}

      {/* MORPH — preloaded, FULL-BLEED (unmasked: its backdrop + fade-to-black are
          baked in, and frame 0 matches the composed rest state because the DOM
          backdrop uses the same cover math). Poster is the rest frame so the
          cross-fade always paints a correct first frame instantly. Plays once on
          tap, ends on the globe hero pose, then hands off to /the-road. */}
      <video
        ref={morphRef}
        className="baked-orb-video"
        muted playsInline preload="auto" poster={REST_POSTER}
        onEnded={finish}
        style={layer({ opacity: morphing ? 1 : 0, transition: 'opacity 150ms linear' })}
      >
        <source src={`${MORPH}.webm`} type="video/webm" />
        <source src={`${MORPH}.mp4`} type="video/mp4" />
      </video>

      {hotspot}
    </div>
  )
})

export default BakedOrb
