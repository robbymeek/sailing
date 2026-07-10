import { useEffect, useRef, useState } from 'react'
import Footer from './Footer'
import { TOUR_STATS } from '../data/tourChapters'
import teamPhoto from '../assets/exit-cards/exit-path.jpg'

const BASE = import.meta.env.BASE_URL

// ============================================================================
//  HomeOverview — the white editorial index below the home prologue.
// ============================================================================
//  MainView's exit veil fades the dark orb frame to pure white and lands
//  here: a quiet index of the campaign in three editorial moments — the film
//  (Biography), the crew (The Team), and the world (The Road, the page's one
//  dark interruption) — closed by a personal campaign note and the light
//  footer. Mostly white, hairline rules, sharp corners, a single accent.
//
//  The interaction signature is the route action: a thin electric-blue rule
//  under each action that extends toward the arrow on hover/focus
//  (.ho-action in index.css — hover/focus states can't be inline).
//
//  Deliberately NOT here: a second live globe (exclusive to /the-road),
//  carousels, parallax, scroll hijacking, text over moving footage.
// ============================================================================

const POSTER = `${BASE}trailer/trailer-poster.jpg`
const GLOBE_POSTER = `${BASE}orb/orb-globe-poster.webp`

// ---- page tokens ----
const INK = 'rgb(20,28,54)' //        deep navy ink (Support's NAVY)
const BODY = 'rgba(20,28,54,0.8)' //  body copy on white
const MUTED = '#646262' //            proof lines (Contact/Support grey)
const HAIR = 'rgba(20,28,54,0.14)' // hairline rules
const FRAME_BG = 'rgb(11,14,20)' //   film-frame pre-paint fill
// The accent lives in index.css too (.ho-action underline, chip hover) —
// it is the site's established on-light blue (Support/Team), visually
// identical to The Road's rgb(0,80,255) once it sits on black.

// Shared content lane + spacing rhythm (only these steps, no ad-hoc values).
const WRAP = { maxWidth: 1200, margin: '0 auto', padding: '0 clamp(24px, 5vw, 64px)' }
const SECTION_PAD = 'clamp(56px, 9vh, 104px)'
const OPEN_TOP = 'clamp(96px, 15vh, 160px)'
const GAP_COL = 'clamp(40px, 5vw, 72px)'

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
// before play() — visibility pause), plus a quiet pause/play chip on the
// white margin below the frame, never over the footage. `userPausedRef`
// keeps the visitor's explicit pause authoritative over the auto-resumes.
function FilmBlock({ isMobile }) {
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

  const frame = {
    position: 'relative',
    // Matched to the clip's CONTENT box (see SailingBanner): the master has
    // ~41px letterbox bars baked top+bottom; this aspect + cover always
    // crops the bars.
    aspectRatio: '1920 / 804',
    minHeight: isMobile ? 200 : 260,
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

  return (
    <div>
      <div ref={frameRef} style={frame}>
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
      </div>
      <div style={{ marginTop: 12 }}>
        <button
          type="button"
          className="ho-film-chip"
          aria-label={playing ? 'Pause the film' : 'Play the film'}
          onClick={toggle}
          style={{
            width: 34, height: 34,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: `1px solid rgba(20,28,54,0.35)`, color: INK,
            cursor: 'pointer', padding: 0,
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
      </div>
    </div>
  )
}

export default function HomeOverview({
  onNavigate,
  isMobile = typeof window !== 'undefined' && window.innerWidth < 700,
}) {
  return (
    <div style={{ background: '#FFFFFF', color: INK }}>

      {/* Opening — generous white after the fade from the orb. Only the
          eyebrow and the thesis; no supporting copy. */}
      <header style={{ ...WRAP, paddingTop: OPEN_TOP, paddingBottom: 'clamp(64px, 10vh, 112px)' }}>
        <Reveal>
          <p style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '2.2px',
            textTransform: 'uppercase', color: 'rgb(10,85,235)', margin: '0 0 18px',
          }}>LA 2028</p>
          <h2 style={{
            fontSize: 'clamp(34px, 4.6vw, 58px)', fontWeight: 700,
            letterSpacing: '-1.2px', lineHeight: 1.05, color: INK,
            maxWidth: 640, margin: 0,
          }}>The work behind the start line.</h2>
        </Reveal>
      </header>

      {/* 1 — The film. Video dominant, copy in a narrow adjoining column. */}
      <section aria-label="Biography" style={{
        ...WRAP, paddingBottom: SECTION_PAD,
        ...(isMobile ? null : {
          display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 320px',
          columnGap: GAP_COL, alignItems: 'end',
        }),
      }}>
        <Reveal>
          <FilmBlock isMobile={isMobile} />
        </Reveal>
        <Reveal delay={120} style={isMobile ? { paddingTop: 24 } : { paddingBottom: 2 }}>
          <h3 style={sectionHeading}>Biography</h3>
          <p style={bodyCopy}>Racing since nine. Now working toward LA 2028 in the ILCA 7.</p>
          {/* Nowrap per phrase so the narrow column breaks at the separator,
              never mid-phrase. */}
          <p style={{
            fontSize: 12, fontWeight: 600, letterSpacing: '1.8px',
            textTransform: 'uppercase', color: MUTED, margin: '0 0 26px',
          }}>
            <span style={{ whiteSpace: 'nowrap' }}>6 national titles</span>
            {' · '}
            <span style={{ whiteSpace: 'nowrap' }}>3 continental titles</span>
          </p>
          <RouteAction label="Read biography" onClick={() => onNavigate('Biography')} />
        </Reveal>
      </section>

      <div style={WRAP}><div style={{ height: 1, background: HAIR }} /></div>

      {/* 2 — The crew. Mirror of the film section: copy on white, photo
          opposite. The people are the proof — no stats, no overlay. */}
      <section aria-label="The Team" style={{
        ...WRAP, paddingTop: SECTION_PAD, paddingBottom: SECTION_PAD,
        ...(isMobile ? null : {
          display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)',
          columnGap: GAP_COL, alignItems: 'end',
        }),
      }}>
        {isMobile ? (
          <>
            <Reveal>
              <div className="ho-zoom-frame" style={{ aspectRatio: '1000 / 563', overflow: 'hidden', lineHeight: 0 }}>
                <img
                  src={teamPhoto}
                  alt="Robby with the Harvard sailing team on the dock after a regatta, holding trophies and the team burgee."
                  className="ho-media-zoom"
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </Reveal>
            <Reveal delay={120} style={{ paddingTop: 24 }}>
              <h3 style={sectionHeading}>The Team</h3>
              <p style={{ ...bodyCopy, margin: '0 0 26px' }}>A singlehanded boat. A team effort.</p>
              <RouteAction label="Meet the team" onClick={() => onNavigate('The Team')} />
            </Reveal>
          </>
        ) : (
          <>
            <Reveal delay={120} style={{ paddingBottom: 2 }}>
              <h3 style={sectionHeading}>The Team</h3>
              <p style={{ ...bodyCopy, margin: '0 0 26px' }}>A singlehanded boat. A team effort.</p>
              <RouteAction label="Meet the team" onClick={() => onNavigate('The Team')} />
            </Reveal>
            <Reveal>
              <div className="ho-zoom-frame" style={{ aspectRatio: '1000 / 563', overflow: 'hidden', lineHeight: 0 }}>
                <img
                  src={teamPhoto}
                  alt="Robby with the Harvard sailing team on the dock after a regatta, holding trophies and the team burgee."
                  className="ho-media-zoom"
                  loading="lazy"
                  decoding="async"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>
            </Reveal>
          </>
        )}
      </section>

      {/* 3 — The world. The page's one dark note: a sharp full-bleed black
          panel where the globe poster sits oversized and cropped off the
          edge (its own black surround blends into the panel — no seam). The
          live globe stays exclusive to /the-road; this is a still. */}
      {isMobile ? (
        <section aria-label="The Road" style={{
          position: 'relative', overflow: 'hidden', background: '#000',
          marginTop: 'clamp(64px, 10vh, 120px)',
          display: 'flex', flexDirection: 'column', padding: '64px 24px 0',
        }}>
          <Reveal style={{ maxWidth: 420, position: 'relative', zIndex: 1 }}>
            <h3 style={{ ...sectionHeading, color: '#fff' }}>The Road</h3>
            <p style={{ ...bodyCopy, color: 'rgba(255,255,255,0.82)', margin: '0 0 26px' }}>{ROAD_LINE}</p>
            <RouteAction dark label="See the road" onClick={() => onNavigate('The Road')} />
          </Reveal>
          {/* Spacer reserves the globe zone: the disc peaks ~141vw above the
              panel bottom (150vw wide image, centre 38.3% down), so copy in
              flow above it can never collide. */}
          <div aria-hidden="true" style={{ height: '146vw' }} />
          <img
            src={GLOBE_POSTER}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            style={{
              position: 'absolute', left: '50%', bottom: '-96vw',
              width: '150vw', height: 'auto', transform: 'translateX(-50%)',
              pointerEvents: 'none', userSelect: 'none',
            }}
          />
        </section>
      ) : (
        <section aria-label="The Road" style={{
          position: 'relative', overflow: 'hidden', background: '#000',
          marginTop: 'clamp(64px, 10vh, 120px)',
          height: 'clamp(520px, 74vh, 720px)',
        }}>
          {/* Oversized, cropped on the left: ~30% of the disc hangs off the
              edge; translateY centres the disc (38.3% down its own portrait
              image) on the panel's midline. */}
          <img
            src={GLOBE_POSTER}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            style={{
              position: 'absolute',
              width: 'clamp(640px, 54vw, 920px)', height: 'auto',
              left: 'clamp(-285px, -16.7vw, -198px)', top: '52%',
              transform: 'translateY(-38%)',
              pointerEvents: 'none', userSelect: 'none',
            }}
          />
          <div style={{
            ...WRAP, height: '100%', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          }}>
            <Reveal style={{ width: 'min(420px, 100%)' }}>
              <h3 style={{ ...sectionHeading, color: '#fff' }}>The Road</h3>
              <p style={{ ...bodyCopy, color: 'rgba(255,255,255,0.82)', margin: '0 0 26px' }}>{ROAD_LINE}</p>
              <RouteAction dark label="See the road" onClick={() => onNavigate('The Road')} />
            </Reveal>
          </div>
        </section>
      )}

      {/* Campaign note — back to white; a fine rule, one narrow column, and
          the personal hand-off. No Donate button here: the persistent
          banner's Donate and Support CTA owns that job. */}
      <section aria-label="The campaign" style={{ ...WRAP, marginTop: 'clamp(72px, 11vh, 128px)' }}>
        <div style={{ height: 1, background: HAIR }} />
        <Reveal style={{ padding: '40px 0 clamp(80px, 12vh, 140px)' }}>
          <p style={{
            fontSize: 17, lineHeight: 1.7, color: 'rgba(20,28,54,0.85)',
            maxWidth: 560, margin: 0,
          }}>
            I’m campaigning to represent the United States in the ILCA 7 at LA 2028.
            This site follows the work, the people, and the road ahead. Every gift
            gives this campaign more room to train, travel, and compete at its best.
          </p>
          <RouteAction label="Contact Robby" onClick={() => onNavigate('Contact')} style={{ marginTop: 28 }} />
        </Reveal>
      </section>

      <Footer variant="light" onNavigate={onNavigate} />
    </div>
  )
}
