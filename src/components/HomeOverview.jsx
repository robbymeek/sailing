import { useEffect, useRef, useState } from 'react'
import Footer from './Footer'
import { TOUR_STATS } from '../data/tourChapters'
import { Radar } from './HelmPanel'
import teamPhoto from '../assets/exit-cards/exit-path.jpg'
import wordmark from '../assets/contact/robby-meek-wordmark.png'

const BASE = import.meta.env.BASE_URL

// ============================================================================
//  HomeOverview — four uniform editorial rows below the helm station.
// ============================================================================
//  The pinned hero brightens to the raw photo and the white helm card rides
//  up over it; scrolling on from the card lands here — an index of the
//  campaign as FOUR equally-sized rows, uniformly built: media on the left,
//  text on the right, and the route action always in the same spot at the
//  bottom of the text column (mobile: media, then text, then the action).
//  Biography (the film) · The Team (the crew photo) · The Road (the page's
//  one black row — the helm station's radar, blue on black, sweeping the
//  2026 venues) · Contact (the wordmark, the contact page's own media).
//
//  The interaction signature is the route action: a thin electric-blue rule
//  under each action that extends toward the arrow on hover/focus
//  (.ho-action in index.css — hover/focus states can't be inline).
//
//  Deliberately NOT here: a second live globe (exclusive to /the-road),
//  carousels, parallax, scroll hijacking, text over moving footage.
// ============================================================================

const POSTER = `${BASE}trailer/trailer-poster.jpg`

// ---- page tokens ----
const INK = 'rgb(20,28,54)' //        deep navy ink (Support's NAVY)
const BODY = 'rgba(20,28,54,0.8)' //  body copy on white
const MUTED = '#646262' //            proof lines (Contact/Support grey)
const FRAME_BG = 'rgb(11,14,20)' //   film-frame pre-paint fill
// The accent lives in index.css too (.ho-action underline, chip hover) —
// it is the site's established on-light blue (Support/Team), visually
// identical to The Road's rgb(0,80,255) once it sits on black.

// Shared content lane + spacing rhythm (only these steps, no ad-hoc values).
const WRAP = { maxWidth: 1200, margin: '0 auto', padding: '0 clamp(24px, 5vw, 64px)' }
const GAP_COL = 'clamp(40px, 5vw, 72px)'
// The uniform row: every row's media cell is this tall on desktop, every
// section carries this same vertical padding — four equal beats.
const ROW_MEDIA_H = 'clamp(380px, 56vh, 560px)'
const ROW_PAD = 'clamp(32px, 6vh, 72px) 0'
const ROW_MEDIA_H_MOBILE = 'min(64vw, 380px)'

const FILM_ALT = "Robby Meek's ILCA 7 under sail on open water — Robby Meek, US Sailing Team."

// The Road line is derived, not hard-coded — it tracks the tour data.
// Continents render as a word for the sentence rhythm ("Four continents"),
// with a numeric fallback so a data change can never print "undefined".
const NUM_WORDS = { 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five', 6: 'Six', 7: 'Seven' }
const ROAD_LINE = `${TOUR_STATS.stops} stops. ${NUM_WORDS[TOUR_STATS.continents] || TOUR_STATS.continents} continents. One start line.`

const sectionHeading = {
  fontSize: 'clamp(24px, 2.4vw, 32px)', fontWeight: 700,
  letterSpacing: '-0.6px', lineHeight: 1.15, color: INK, margin: '0 0 14px',
}
const bodyCopy = { fontSize: 17, lineHeight: 1.65, color: BODY, margin: '0 0 18px' }

// The Road row hosts the helm station's Radar OUTSIDE the panel, so the CSS
// vars its classed elements consume (.hp-scope/.hp-sweep/.hp-blip[-tag])
// are re-provided here — blue on black, The Road's own palette. The wrapper
// is a size container because the scope inscribes via min(100cqw, 100cqh).
const ROAD_RADAR_VARS = {
  '--hp-phos': 'rgb(0,80,255)',
  '--hp-phos-rgb': '0, 80, 255',
  '--hp-phos-hi-rgb': '90, 140, 255',
  '--hp-scope-rgb': '6, 26, 90',
  '--hp-scope-deep-rgb': '2, 10, 40',
  '--hp-scope-edge': '#000208',
  '--hp-sweep-s': '4.4s',
  '--hp-mono': "ui-monospace, 'SF Mono', 'Menlo', 'Consolas', monospace",
}
const ROAD_RADAR_COLORS = { phos: 'rgba(0,80,255,', grid: 'rgba(0,80,255,', bone: 'rgba(255,255,255,' }

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return undefined
    const onChange = () => setReduced(mq.matches)
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])
  return reduced
}

// One-shot reveal: fade + small rise when the block first enters the viewport
// (the site's canonical IO shape — see TheRoad's stats count-up). Reduced
// motion renders the children with NO opacity/transform/transition at all —
// not a faster fade — per "no decorative reveals".
function Reveal({ children, delay = 0, style }) {
  const reduced = useReducedMotion()
  const ref = useRef(null)
  const [on, setOn] = useState(false)
  useEffect(() => {
    if (reduced) { setOn(true); return undefined }
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') { setOn(true); return undefined }
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect() } },
      { threshold: 0.05 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [reduced])
  return (
    <div ref={ref} style={{
      ...style,
      ...(reduced ? null : {
        opacity: on ? 1 : 0,
        transform: on ? 'none' : 'translateY(12px)',
        transition: `opacity 0.55s ease ${delay}ms, transform 0.55s ease ${delay}ms`,
      }),
    }}>{children}</div>
  )
}

// Horizontal inset matching WRAP's padding — for indenting content that sits
// inside a full-bleed (unpadded) mobile section.
const LANE_PAD = '0 clamp(24px, 5vw, 64px)'

// A route action: label + arrow over the extending accent underline
// (.ho-action::after in index.css). The arrow is decoration — the accessible
// name is just the label.
function RouteAction({ label, onClick, dark = false, style }) {
  return (
    <button type="button" className="ho-action" onClick={onClick} style={{
      position: 'relative',
      display: 'inline-flex', alignItems: 'baseline', gap: 8,
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '2px 0 9px',
      fontFamily: 'inherit', fontSize: 15, fontWeight: 600, letterSpacing: '0.3px',
      color: dark ? '#fff' : INK,
      ...style,
    }}>
      {label}
      <span aria-hidden="true" style={{ fontWeight: 500 }}>→</span>
    </button>
  )
}

// ---------- the film ----------
// Same field-proven wiring as SailingBanner (lite fallback, DOM-node muted,
// early-warm IO before the play/pause IO — same-batch IntersectionObserver
// callbacks fire in creation order, so a jump straight into view runs load()
// before play() — visibility pause), plus a quiet pause/play chip. In `fill`
// mode (the uniform rows) the frame covers its media cell edge-to-edge and
// the chip sits on a small white square in the frame's bottom-left corner —
// the one deliberate exception to "chip never over the footage", since the
// uniform row leaves no white margin beneath the frame. `userPausedRef`
// keeps the visitor's explicit pause authoritative over the auto-resumes.
function FilmBlock({ isMobile, bleed = false, fill = false }) {
  const videoRef = useRef(null)
  const frameRef = useRef(null)
  const [lite, setLite] = useState(false) // reduced-motion / save-data / slow net → poster only
  const [posterOk, setPosterOk] = useState(true)
  const [playing, setPlaying] = useState(false) // driven by the media events, so the label is truthful
  const userPausedRef = useRef(false)
  // Latch the source once: phones get the 720w file, desktop the 1152w one.
  const [src] = useState(() =>
    `${BASE}trailer/${isMobile ? 'trailer-mobile.mp4' : 'trailer.mp4'}`)

  // Poster-only mode: reduced-motion, Save-Data, or a slow (2g) connection.
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

  // React does not reliably render the `muted` attribute, and iOS/Chrome
  // refuse to autoplay a non-muted element — force it and kick off play.
  useEffect(() => {
    if (lite) return undefined
    const v = videoRef.current
    if (!v) return undefined
    v.muted = true
    const p = v.play()
    if (p && p.catch) p.catch(() => {}) // autoplay may be deferred until in-view; that's fine
    return undefined
  }, [lite])

  // Early warm: preload is 'none' so cold loads never pull the multi-MB film
  // from visitors who don't scroll; this one-shot observer arms ~1.5
  // viewports out so the first scroll gesture starts the fetch.
  useEffect(() => {
    if (lite) return undefined
    const c = frameRef.current
    const v = videoRef.current
    if (!c || !v || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        io.disconnect()
        // Already fetching or playing — a load() here would reset it mid-stream.
        if (!v.paused || v.readyState > 0) return
        v.preload = 'auto'
        v.load()
      },
      { rootMargin: '150% 0px' }
    )
    io.observe(c)
    return () => io.disconnect()
  }, [lite])

  // Battery nicety only: pause fully off-screen, resume in view — unless the
  // visitor paused it themselves. Never gates loading.
  useEffect(() => {
    if (lite) return undefined
    const c = frameRef.current
    const v = videoRef.current
    if (!c || !v || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (userPausedRef.current) return
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

  // Pause while the tab is hidden, resume when it returns (unless user-paused).
  useEffect(() => {
    if (lite) return undefined
    const onVis = () => {
      const v = videoRef.current
      if (!v) return
      if (document.hidden) v.pause()
      else if (!userPausedRef.current) { const p = v.play(); if (p && p.catch) p.catch(() => {}) }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [lite])

  const toggle = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      userPausedRef.current = false
      const p = v.play()
      if (p && p.catch) p.catch(() => {})
    } else {
      userPausedRef.current = true
      v.pause()
    }
  }

  const frame = fill
    ? {
      position: 'absolute', inset: 0,
      overflow: 'hidden', lineHeight: 0, background: FRAME_BG,
    }
    : {
      position: 'relative',
      // Matched to the clip's CONTENT box (see SailingBanner): the master has
      // ~41px letterbox bars baked top+bottom; this aspect + cover always
      // crops the bars. No minHeight on the mobile banner — forcing one against
      // the aspect box blows the footage up past its frame on narrow screens.
      aspectRatio: '1920 / 804',
      minHeight: isMobile ? 0 : 260,
      overflow: 'hidden',
      lineHeight: 0,
      background: FRAME_BG,
    }
  const media = {
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', display: 'block',
  }

  // Lite renders the still only — no <video> element at all (an offscreen
  // video's play() can still start a multi-MB fetch — same bug SailingBanner
  // documents), and no chip (nothing to control).
  if (lite) {
    return (
      <div style={frame}>
        {posterOk && (
          <img src={POSTER} alt={FILM_ALT} style={media} onError={() => setPosterOk(false)} />
        )}
      </div>
    )
  }

  const chip = (
    <button
      type="button"
      className="ho-film-chip"
      aria-label={playing ? 'Pause the film' : 'Play the film'}
      onClick={toggle}
      style={{
        width: 34, height: 34,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: fill ? '#fff' : 'none',
        border: fill ? 'none' : `1px solid rgba(20,28,54,0.35)`, color: INK,
        cursor: 'pointer', padding: 0,
        ...(fill ? { position: 'absolute', left: 0, bottom: 0, zIndex: 2 } : null),
      }}
    >
      {playing ? (
        <svg width="10" height="11" viewBox="0 0 10 11" aria-hidden="true">
          <rect x="1" width="3" height="11" fill="currentColor" />
          <rect x="6" width="3" height="11" fill="currentColor" />
        </svg>
      ) : (
        <svg width="11" height="12" viewBox="0 0 11 12" aria-hidden="true" style={{ marginLeft: 2 }}>
          <path d="M0 0 L11 6 L0 12 Z" fill="currentColor" />
        </svg>
      )}
    </button>
  )

  const video = (
    <video
      ref={videoRef}
      className="ho-film-video"
      src={src}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
      poster={posterOk ? POSTER : undefined}
      disablePictureInPicture
      onPlay={() => setPlaying(true)}
      onPause={() => setPlaying(false)}
      onError={() => setPosterOk(false)}
      style={media}
    />
  )

  if (fill) {
    return (
      <div style={{ position: 'absolute', inset: 0 }}>
        <div ref={frameRef} style={frame}>{video}</div>
        {chip}
      </div>
    )
  }

  return (
    <div>
      <div ref={frameRef} style={frame}>{video}</div>
      <div style={{ marginTop: 12, ...(bleed ? { padding: LANE_PAD } : null) }}>
        {chip}
      </div>
    </div>
  )
}

// ---------- the uniform row ----------
// One shape for all four beats: media left, text right, and the route action
// anchored to the SAME spot — the bottom of the text column — on every row
// (marginTop:auto in the stretched column). Mobile: media, text, action, in
// flow. `dark` flips the row to the page's one black note (The Road).
function Row({ title, body, extra, actionLabel, onAction, media, dark = false, isMobile }) {
  const fg = dark ? '#fff' : INK
  const bodyC = dark ? 'rgba(255,255,255,0.82)' : BODY
  if (isMobile) {
    return (
      <section aria-label={title} style={{ background: dark ? '#000' : '#fff', padding: 'clamp(28px, 5vh, 48px) 0' }}>
        <Reveal style={{ position: 'relative', overflow: 'hidden', height: ROW_MEDIA_H_MOBILE }}>
          {media}
        </Reveal>
        <Reveal delay={120} style={{ padding: LANE_PAD, paddingTop: 24 }}>
          <h3 style={{ ...sectionHeading, color: fg }}>{title}</h3>
          <p style={{ ...bodyCopy, color: bodyC }}>{body}</p>
          {extra}
          <RouteAction dark={dark} label={actionLabel} onClick={onAction} />
        </Reveal>
      </section>
    )
  }
  return (
    <section aria-label={title} style={{ background: dark ? '#000' : '#fff', padding: ROW_PAD }}>
      <div style={{
        ...WRAP,
        display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 1fr)',
        columnGap: GAP_COL, alignItems: 'stretch',
      }}>
        <Reveal style={{ position: 'relative', overflow: 'hidden', minHeight: ROW_MEDIA_H }}>
          {media}
        </Reveal>
        <Reveal delay={120} style={{ display: 'flex', flexDirection: 'column', padding: 'clamp(28px, 4vh, 44px) 0' }}>
          <h3 style={{ ...sectionHeading, color: fg }}>{title}</h3>
          <p style={{ ...bodyCopy, color: bodyC, maxWidth: 480 }}>{body}</p>
          {extra}
          <RouteAction dark={dark} label={actionLabel} onClick={onAction} style={{ marginTop: 'auto', alignSelf: 'flex-start' }} />
        </Reveal>
      </div>
    </section>
  )
}

export default function HomeOverview({
  onNavigate,
  isMobile = typeof window !== 'undefined' && window.innerWidth < 700,
}) {
  return (
    <div style={{ background: '#FFFFFF', color: INK, paddingTop: 'clamp(40px, 7vh, 80px)' }}>

      <Row
        isMobile={isMobile}
        title="Biography"
        body="Racing since nine. Now working toward LA 2028 in the ILCA 7."
        extra={
          <p style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '1.8px',
            textTransform: 'uppercase', color: MUTED, margin: '0 0 26px',
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>6 national titles</span>
            {' · '}
            <span style={{ whiteSpace: 'nowrap' }}>3 continental titles</span>
          </p>
        }
        actionLabel="Read biography"
        onAction={() => onNavigate('Biography')}
        media={<FilmBlock isMobile={isMobile} fill />}
      />

      <Row
        isMobile={isMobile}
        title="The Team"
        body="A singlehanded boat. A team effort."
        actionLabel="Meet the team"
        onAction={() => onNavigate('The Team')}
        media={
          <div className="ho-zoom-frame" style={{ position: 'absolute', inset: 0, overflow: 'hidden', lineHeight: 0 }}>
            <img
              src={teamPhoto}
              alt="Robby with the Harvard sailing team on the dock after a regatta, holding trophies and the team burgee."
              className="ho-media-zoom"
              loading="lazy"
              decoding="async"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          </div>
        }
      />

      <Row
        isMobile={isMobile}
        dark
        title="The Road"
        body={ROAD_LINE}
        actionLabel="See the road"
        onAction={() => onNavigate('The Road')}
        media={
          <div
            aria-hidden="true"
            style={{
              position: 'absolute', inset: '6%',
              containerType: 'size',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              ...ROAD_RADAR_VARS,
            }}
          >
            <Radar colors={ROAD_RADAR_COLORS} />
          </div>
        }
      />

      <Row
        isMobile={isMobile}
        title="Contact"
        body="I'm campaigning to represent the United States in the ILCA 7 at LA 2028. This site follows the work, the people, and the road ahead. Every gift gives this campaign more room to train, travel, and compete at its best."
        actionLabel="Contact Robby"
        onAction={() => onNavigate('Contact')}
        media={
          <div style={{
            position: 'absolute', inset: 0, background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <img
              src={wordmark}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              style={{ width: 'min(70%, 480px)', height: 'auto' }}
            />
          </div>
        }
      />

      <Footer variant="light" onNavigate={onNavigate} />
    </div>
  )
}
