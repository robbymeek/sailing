import { useRef, useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

// ============================================================================
//  SailingBanner — the silent, cool-graded sailing film strip.
// ============================================================================
//  Since Jul 2026 it is the OPENING HERO of /biography (owner request): it sits
//  at the very top of the page with the site nav floating over it (App.jsx
//  'overlay-clear' mode), so it also carries a top scrim for nav legibility.
//  It still renders mid-page inside the mobile home embed, where none of the
//  hero affordances apply — the `hero` prop switches the two behaviours.
//
//  Modes:
//   hero   → preload='auto' (it IS the first paint), top scrim for the nav,
//            no top rule (flush with the page edge), bottom rule kept.
//   inert  → App's hidden <Biography preload /> copy. Renders NO <video> at
//            all (an offscreen video's play() can still start a multi-MB fetch
//            on every route — real bug, do not "simplify" this away) and skips
//            every effect; it still shows the poster so the JPG cache warms.
//
//  Loading ladder (bottom layer → top): solid deep-blue + HERO→BLUE gradient
//  (pure CSS, instant) → wordmark.png (small, "as a pause" branding while
//  nothing else has painted, and the backup if media errors) → poster JPG →
//  the video itself → hero scrim. Each layer only improves on the one below,
//  so any failure degrades gracefully.
//
//  Sources (produced by scripts/grade-banner.mjs → encode-trailer.mjs,
//  H.264-only — VP9 measured LARGER on this water):
//     public/trailer/trailer.mp4         desktop, 1152w (~7.5MB)
//     public/trailer/trailer-mobile.mp4  phones,   720w (~3.6MB)
//     public/trailer/trailer-poster.jpg  graded badge frame
//     public/trailer/wordmark.png        ROBBY MEEK wordmark fallback
//  The source is LATCHED at mount — a desktop window dragged across the 700px
//  breakpoint must not restart the film from frame 0.
//
//  The container carries a SOLID backgroundColor (not just the gradient):
//  App's compact-mode hamburger samples the first opaque backgroundColor
//  behind it to pick black/white — gradients are background-image and would
//  let the sample fall through to the page's light root (black hamburger over
//  dark video). Do not fold the color into the gradient.
// ============================================================================

const POSTER = `${BASE}trailer/trailer-poster.jpg`
const WORDMARK = `${BASE}trailer/wordmark.png`

const HERO = 'rgb(230,235,240)' // near-white hero below
const BLUE = 'rgb(18,0,120)' //     deep royal-blue section further down
const RULE = 4 //                   hard white rule thickness (px)

export default function SailingBanner({ isMobile = false, hero = false, inert = false }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [lite, setLite] = useState(false) //   reduced-motion / save-data / slow net → poster only
  const [posterOk, setPosterOk] = useState(true)
  const [wordmarkOk, setWordmarkOk] = useState(true)
  // Latch the source once: phones get the 720w file, desktop the 1152w one.
  const [src] = useState(() =>
    `${BASE}trailer/${isMobile ? 'trailer-mobile.mp4' : 'trailer.mp4'}`)

  // Poster-only mode: reduced-motion, Save-Data, or a slow (2g) connection. These
  // visitors (and iOS Low-Power-Mode, which blocks autoplay) get the still, no video.
  useEffect(() => {
    if (inert || typeof window === 'undefined') return undefined
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const conn = navigator.connection || navigator.webkitConnection || navigator.mozConnection
    const evaluate = () => {
      const reduce = !!mq?.matches
      const saveData = !!conn?.saveData
      const slow = /(^|-)2g$/.test(conn?.effectiveType || '')
      setLite(reduce || saveData || slow)
    }
    evaluate()
    mq?.addEventListener?.('change', evaluate)
    conn?.addEventListener?.('change', evaluate)
    return () => {
      mq?.removeEventListener?.('change', evaluate)
      conn?.removeEventListener?.('change', evaluate)
    }
  }, [inert])

  // React does not reliably render the `muted` attribute, and iOS/Chrome refuse to
  // autoplay a non-muted element — so force it on the DOM node and kick off play.
  useEffect(() => {
    if (inert || lite) return undefined
    const v = videoRef.current
    if (!v) return undefined
    v.muted = true
    const p = v.play()
    if (p && p.catch) p.catch(() => {}) // autoplay may be deferred until in-view; that's fine
    return undefined
  }, [inert, lite])

  // Early warm (embedded mobile-home mode only — hero already ships
  // preload='auto'): non-hero preload is 'none' so cold loads of the mobile
  // home never pull the multi-MB film from visitors who don't scroll. But a
  // fast flick down used to reach the strip before any fetch started and land
  // on the poster. This one-shot observer arms ~1.5 viewports out — the first
  // scroll gesture past the home frame starts the fetch, and the title-card
  // bridge above the strip buys the download that extra screen of runway.
  // Declared BEFORE the play/pause observer: same-batch IntersectionObserver
  // callbacks fire in creation order, so on a jump straight into view the
  // load() lands before play() rather than resetting it.
  useEffect(() => {
    if (inert || lite || hero) return undefined
    const c = containerRef.current
    const v = videoRef.current
    if (!c || !v || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        // Already fetching or playing (e.g. autoplay kicked in first) — a
        // load() here would reset the element mid-stream.
        if (!v.paused || v.readyState > 0) return
        v.preload = 'auto'
        v.load()
      },
      { rootMargin: '150% 0px' }
    )
    io.observe(c)
    return () => io.disconnect()
  }, [inert, lite, hero])

  // Battery nicety only: pause when the strip is fully off-screen, resume in view.
  // Never gates loading — if IO never fires, native muted-autoplay still plays it.
  useEffect(() => {
    if (inert || lite) return undefined
    const c = containerRef.current
    const v = videoRef.current
    if (!c || !v || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const p = v.play()
          if (p && p.catch) p.catch(() => {})
        } else {
          v.pause()
        }
      },
      { rootMargin: '200px 0px', threshold: 0.01 }
    )
    io.observe(c)
    return () => io.disconnect()
  }, [inert, lite])

  // Pause while the tab is hidden (CPU/battery), resume when it returns.
  useEffect(() => {
    if (inert || lite) return undefined
    const onVis = () => {
      const v = videoRef.current
      if (!v) return
      if (document.hidden) v.pause()
      else { const p = v.play(); if (p && p.catch) p.catch(() => {}) }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [inert, lite])

  // Hero fade-off (owner-tuned): the film stays solid until about a third of it
  // has scrolled off the top, then washes out on a stepped ramp that deepens as
  // it leaves, capping at a 60% fade (opacity floor 0.40). Read as "how much of
  // the video is still on screen": 65% left → fade begins, 50% left → ~30%,
  // 25% left → ~40%, none left → 60%. Pure closed form of the section's scroll
  // position, so scrolling back up reverses it exactly. Only the standalone video
  // hero fades; the inert preload copy and the lite / reduced-motion posters are
  // left untouched. Tweak the effect by editing FADE_STOPS.
  useEffect(() => {
    if (!hero || inert || lite) return undefined
    const el = containerRef.current
    if (!el || typeof window === 'undefined') return undefined
    // [fraction of the hero scrolled off the top edge, fade amount] control
    // points; fade is linearly interpolated between them.
    const FADE_STOPS = [
      [0.35, 0.00], // 65% still showing — fade begins
      [0.50, 0.30], // 50% still showing — ~30% faded
      [0.75, 0.40], // 25% still showing — ~40% faded
      [1.00, 0.60], // fully gone        — 60% faded (the cap)
    ]
    const LAST = FADE_STOPS.length - 1
    let queued = false
    const apply = () => {
      queued = false
      const r = el.getBoundingClientRect()
      // fraction of the hero scrolled above the viewport's top edge (0 → 1)
      const hidden = r.height > 0 ? Math.min(1, Math.max(0, -r.top / r.height)) : 0
      let fade = FADE_STOPS[0][1] // below the first stop: no fade
      if (hidden >= FADE_STOPS[LAST][0]) {
        fade = FADE_STOPS[LAST][1]
      } else {
        for (let i = 0; i < LAST; i++) {
          const [h0, f0] = FADE_STOPS[i]
          const [h1, f1] = FADE_STOPS[i + 1]
          if (hidden >= h0 && hidden <= h1) {
            fade = f0 + (f1 - f0) * ((hidden - h0) / (h1 - h0))
            break
          }
        }
      }
      el.style.opacity = String(1 - fade)
    }
    const onScroll = () => {
      if (queued) return
      queued = true
      requestAnimationFrame(apply)
    }
    apply()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      el.style.opacity = ''
    }
  }, [hero, inert, lite])

  const container = {
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    // Matched to the clip's CONTENT box, not its nominal 1920:886 frame: the
    // recurring tack-anchor footage has ~41px letterbox bars baked into the
    // master (content ≈ 2.39:1, rows 41-844), so this aspect shows 100% of the
    // anchor and always crops the bars; full-frame clips give up a symmetric
    // ~5% per edge (badge/titles/monogram all verified clear).
    aspectRatio: '1920 / 804',
    minHeight: isMobile ? 220 : 260,
    maxHeight: '88vh',
    overflow: 'hidden',
    lineHeight: 0,
    // Hard WHITE rule lines — the "harsh line" separators (no gradient). In
    // hero mode the strip is flush with the top of the page, so no top rule.
    borderTop: hero ? 'none' : `${RULE}px solid #ffffff`,
    borderBottom: `${RULE}px solid #ffffff`,
    // Layer 0: solid colour (hamburger sampler — see header) + the page's own
    // white→blue transition as a gradient, so a pre-media flash reads as
    // intentional.
    backgroundColor: BLUE,
    backgroundImage: `linear-gradient(to bottom, ${HERO}, ${BLUE})`,
    // Below the intro hero (z2): its parallax bars/photo fly UP and OVER the
    // film as you scroll (owner: "3D space above the banner video").
    zIndex: 1,
  }
  const media = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', display: 'block',
    // Centered: with the container matched to the clip's content aspect,
    // cover-fit shows the whole frame; any clamp-induced crop splits evenly.
  }

  // Layer 1: the wordmark "pause card" — beneath poster/video, visible only
  // while nothing above it has painted (or if media errors out entirely).
  const wordmark = wordmarkOk && (
    <img
      src={WORDMARK}
      alt=""
      aria-hidden="true"
      onError={() => setWordmarkOk(false)}
      style={{
        position: 'absolute', left: '50%', top: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(60%, 690px)', height: 'auto',
        pointerEvents: 'none',
      }}
    />
  )

  // Hero mode: a soft dark scrim across the top edge so the floating white
  // nav (App's 'overlay-clear' mode) stays legible over bright sky/sails.
  const scrim = hero && (
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 140,
      background: 'linear-gradient(to bottom, rgba(0,10,40,0.5), transparent)',
      pointerEvents: 'none', zIndex: 2,
    }} />
  )

  // Inert (App's hidden preload copy) and lite (reduced-motion / save-data)
  // both render still layers only — no <video> element exists at all.
  if (inert || lite) {
    return (
      <section aria-label="Sailing highlights" style={container}>
        {wordmark}
        {posterOk && (
          <img src={POSTER} alt="Robby Meek sailing" style={{ ...media, position: 'absolute' }} onError={() => setPosterOk(false)} />
        )}
        {!inert && scrim}
      </section>
    )
  }

  return (
    <section ref={containerRef} aria-label="Sailing highlights" style={container}>
      {wordmark}
      <video
        ref={videoRef}
        className="sailing-banner-video"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload={hero ? 'auto' : 'none'}
        poster={posterOk ? POSTER : undefined}
        disablePictureInPicture
        onError={() => setPosterOk(false)}
        style={media}
      />
      {scrim}
    </section>
  )
}
