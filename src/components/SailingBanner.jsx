import { useRef, useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

// ============================================================================
//  SailingBanner — a silent, cinematic-wide sailing strip that separates the
//  Biography page's near-white hero from the deep-blue stats/bio section below.
// ============================================================================
//  Design (owner brief): a hard-edged CINEMATIC band, framed by sharp WHITE rule
//  lines top and bottom (NO gradient melt), reading as:
//      white hero ─ hard white line ─ wide cool video ─ hard white line ─ blue bio
//  The clip is a COOL-graded, muted, autoplaying, looping H.264 (no audio track,
//  no unmute control). The site is sharp-edged (no border-radius), so square
//  corners + solid white rules are on-brand — they REPLACE the old gradient seams.
//
//  Video handling mirrors BakedOrb.jsx: autoPlay muted loop playsInline, poster
//  for instant paint, objectFit cover full-bleed, and a reduced-motion fallback
//  to the still poster. It is kept OFF the first-paint critical path with
//  preload="none": browsers natively defer the download until the muted-autoplay
//  clip scrolls into view, so no IntersectionObserver is needed just to load it.
//  An IO is layered on only as a battery nicety (pause fully off-screen), and it
//  can never *prevent* playback — native muted-autoplay is the source of truth.
//
//  Assets (produced by `npm run trailer:encode`, H.264-only — WebM/VP9 came out
//  LARGER than H.264 on this high-motion water, so it is intentionally dropped):
//     public/trailer/trailer.mp4        (cool-graded, silent, ~24fps loop)
//     public/trailer/trailer-poster.jpg (cool-graded still)
//  Until those exist the container's HERO→BLUE gradient shows through, so the page
//  never looks broken while the clip is still being encoded.
// ============================================================================

const MP4 = `${BASE}trailer/trailer.mp4`
const POSTER = `${BASE}trailer/trailer-poster.jpg`

const HERO = 'rgb(230,235,240)' // near-white hero above
const BLUE = 'rgb(18,0,120)' //     deep royal-blue section below
const RULE = 4 //                   hard white rule thickness (px)

export default function SailingBanner({ isMobile = false }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [lite, setLite] = useState(false) //   reduced-motion / save-data / slow net → poster only
  const [posterOk, setPosterOk] = useState(true)

  // Poster-only mode: reduced-motion, Save-Data, or a slow (2g) connection. These
  // visitors (and iOS Low-Power-Mode, which blocks autoplay) get the still, no video.
  useEffect(() => {
    if (typeof window === 'undefined') return undefined
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
  }, [])

  // React does not reliably render the `muted` attribute, and iOS/Chrome refuse to
  // autoplay a non-muted element — so force it on the DOM node and kick off play.
  useEffect(() => {
    if (lite) return undefined
    const v = videoRef.current
    if (!v) return undefined
    v.muted = true
    const p = v.play()
    if (p && p.catch) p.catch(() => {}) // autoplay may be deferred until in-view; that's fine
    return undefined
  }, [lite])

  // Battery nicety only: pause when the strip is fully off-screen, resume in view.
  // Never gates loading — if IO never fires, native muted-autoplay still plays it.
  useEffect(() => {
    if (lite) return undefined
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
  }, [lite])

  // Pause while the tab is hidden (CPU/battery), resume when it returns.
  useEffect(() => {
    if (lite) return undefined
    const onVis = () => {
      const v = videoRef.current
      if (!v) return
      if (document.hidden) v.pause()
      else { const p = v.play(); if (p && p.catch) p.catch(() => {}) }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [lite])

  const container = {
    position: 'relative',
    width: '100%',
    boxSizing: 'border-box',
    // Cinematic-wide strip: a 2.35:1 letterbox, floored on mobile and capped tall.
    aspectRatio: '2.35 / 1',
    minHeight: isMobile ? 220 : 260,
    maxHeight: '60vh',
    overflow: 'hidden',
    lineHeight: 0,
    // Hard WHITE rule lines — the "harsh line" separators (no gradient).
    borderTop: `${RULE}px solid #ffffff`,
    borderBottom: `${RULE}px solid #ffffff`,
    // Fallback shown until the encoded clip exists / behind any cover letterboxing:
    // the page's own white→blue transition, so a pre-load flash reads as intentional.
    background: `linear-gradient(to bottom, ${HERO}, ${BLUE})`,
    zIndex: 4,
  }
  const media = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', display: 'block',
  }

  // Poster-only (reduced-motion / save-data / slow net): the still, same white rules.
  if (lite) {
    return (
      <section aria-label="Sailing highlights" style={container}>
        {posterOk && (
          <img src={POSTER} alt="Robby Meek sailing" style={media} onError={() => setPosterOk(false)} />
        )}
      </section>
    )
  }

  return (
    <section ref={containerRef} aria-label="Sailing highlights" style={container}>
      <video
        ref={videoRef}
        src={MP4}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={posterOk ? POSTER : undefined}
        disablePictureInPicture
        onError={() => setPosterOk(false)}
        style={media}
      />
    </section>
  )
}
