import { useRef, useState, useEffect } from 'react'

const BASE = import.meta.env.BASE_URL

// ============================================================================
//  SailingBanner — the cinematic strip that bridges the Biography page's white
//  hero into the deep-blue stats/bio section below it.
// ============================================================================
//  A muted, autoplaying, looping sailing trailer (built from real footage, cut
//  in iMovie, graded + web-encoded by scripts/encode-trailer.mjs). Video handling
//  mirrors BakedOrb.jsx: <source webm> → <source mp4>, objectFit cover, a poster
//  for instant paint, and a prefers-reduced-motion fallback to the still poster.
//
//  Two gradient "seam" overlays make it read as a SEPARATOR rather than a boxed
//  rectangle: the top fades out of the hero's near-white (rgb(230,235,240)) and
//  the bottom sinks into the blue section (rgb(18,0,120)).
//
//  Browsers only autoplay MUTED video, so an unmute button (bottom-right) lets a
//  visitor turn the music on with a click. An IntersectionObserver pauses the
//  clip while it's scrolled off-screen to save battery/CPU.
//
//  Assets (produced by `npm run trailer:encode`):
//    public/trailer/trailer.webm, trailer.mp4, trailer-poster.jpg
//  Until those exist the container's light→blue gradient shows through, so the
//  page never looks broken while the trailer is still being cut.
// ============================================================================

const SRC = `${BASE}trailer/trailer` //          .webm + .mp4
const POSTER = `${BASE}trailer/trailer-poster.jpg`

const HERO = 'rgb(230,235,240)' // light hero above
const BLUE = 'rgb(18,0,120)' //     blue section below
const ACCENT = 'rgb(0,80,255)' //   site electric blue

function SpeakerIcon({ muted }) {
  const common = {
    width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round',
  }
  return muted ? (
    <svg {...common} aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  ) : (
    <svg {...common} aria-hidden="true">
      <path d="M11 5 6 9H2v6h4l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M19.1 5a9 9 0 0 1 0 14" />
    </svg>
  )
}

export default function SailingBanner({ isMobile = false }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const [muted, setMuted] = useState(true)
  const [hoverBtn, setHoverBtn] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [posterOk, setPosterOk] = useState(true)
  // Only show the unmute button once the trailer can actually play — until the
  // encoded clips exist (see header comment) the button would be a dead control
  // floating over the fallback gradient.
  const [canPlay, setCanPlay] = useState(false)

  // Respect prefers-reduced-motion → show the still poster, no autoplay.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const set = () => setReduced(mq.matches)
    set()
    mq.addEventListener?.('change', set)
    return () => mq.removeEventListener?.('change', set)
  }, [])

  // Pause while scrolled off-screen; resume when it comes back into view.
  useEffect(() => {
    if (reduced) return undefined
    const v = videoRef.current
    const c = containerRef.current
    if (!v || !c || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const p = v.play()
          if (p && p.catch) p.catch(() => {})
        } else {
          v.pause()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(c)
    return () => io.disconnect()
  }, [reduced])

  const toggleMute = () => {
    const v = videoRef.current
    if (!v) return
    const next = !muted
    v.muted = next
    if (!next) {
      v.volume = 1
      const p = v.play() // a click is a user gesture → sound is allowed
      if (p && p.catch) p.catch(() => {})
    }
    setMuted(next)
  }

  const height = isMobile ? 'clamp(240px, 52vh, 460px)' : 'clamp(340px, 65vh, 720px)'

  const container = {
    position: 'relative',
    width: '100%',
    height,
    overflow: 'hidden',
    lineHeight: 0,
    // Fallback shown until the encoded clips exist (and behind letterboxing).
    background: `linear-gradient(to bottom, ${HERO}, ${BLUE})`,
    zIndex: 4,
  }
  const media = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', display: 'block',
  }
  // Seam overlays: emerge from the white hero, sink into the blue section.
  const topFade = {
    position: 'absolute', top: 0, left: 0, right: 0, height: '30%',
    background: `linear-gradient(to bottom, ${HERO} 0%, rgba(230,235,240,0) 100%)`,
    pointerEvents: 'none', zIndex: 2,
  }
  const bottomFade = {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '42%',
    background: `linear-gradient(to top, ${BLUE} 0%, rgba(18,0,120,0) 100%)`,
    pointerEvents: 'none', zIndex: 2,
  }
  const btnSize = isMobile ? 40 : 46
  const button = {
    position: 'absolute',
    bottom: isMobile ? 14 : 22, right: isMobile ? 14 : 22,
    zIndex: 3,
    width: btnSize, height: btnSize, borderRadius: '50%',
    border: '1px solid rgba(255,255,255,0.25)',
    background: hoverBtn ? ACCENT : 'rgba(0,0,0,0.45)',
    color: '#fff', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
    transition: 'background 0.2s ease, transform 0.2s ease',
    transform: hoverBtn ? 'scale(1.06)' : 'scale(1)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
  }

  // Reduced motion: just the graded still, framed by the same seam gradients.
  if (reduced) {
    return (
      <section aria-label="Sailing highlights" style={container}>
        {posterOk && (
          <img src={POSTER} alt="Robby Meek sailing" style={media} onError={() => setPosterOk(false)} />
        )}
        <div style={topFade} />
        <div style={bottomFade} />
      </section>
    )
  }

  return (
    <section ref={containerRef} aria-label="Sailing highlights" style={container}>
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        preload="none"
        poster={posterOk ? POSTER : undefined}
        onError={() => setPosterOk(false)}
        onCanPlay={() => setCanPlay(true)}
        style={media}
      >
        <source src={`${SRC}.webm`} type="video/webm" />
        <source src={`${SRC}.mp4`} type="video/mp4" />
      </video>

      <div style={topFade} />
      <div style={bottomFade} />

      {canPlay && (
        <button
          type="button"
          onClick={toggleMute}
          onMouseEnter={() => setHoverBtn(true)}
          onMouseLeave={() => setHoverBtn(false)}
          aria-label={muted ? 'Unmute video' : 'Mute video'}
          aria-pressed={!muted}
          style={button}
        >
          <SpeakerIcon muted={muted} />
        </button>
      )}
    </section>
  )
}
