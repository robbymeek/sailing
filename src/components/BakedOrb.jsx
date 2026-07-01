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
//  The clips are recorded on an OPAQUE BLACK field (the desktop morph already
//  blacks the page out, so there's no transparency to fake). A short cross-fade
//  bridges rest→morph (the boat's rotation phase won't match exactly across two
//  separate recordings), and the morph ENDS on the globe's hero pose so the land
//  is seamless:  rest ──tap──▶ morph ──ends──▶ /coming-soon.
//
//  ─── AFFORDANCES ───
//  • TOUCH (iPhone): a small, faded "Click here to learn more" caption curves
//    around the orb's lower rim — the tap target hint. Tapping the orb morphs.
//  • DESKTOP-baked (rare: a desktop without WebGL2): the orb grows as the cursor
//    nears the screen centre, mirroring the live orb's proximity scale.
//  begin() is exposed via ref so MainView's click-anywhere handler can start the
//  morph on the desktop-baked path too.
//
//  ─── ACTIVATION ───
//  This is OFF until you record + encode the clips. Until then the mobile home
//  keeps its current boat (so nothing tries to play a missing video). To turn it
//  on: run the bake (BAKE.md) so public/orb/ has the clips, then set
//  BAKED_ORB_READY = true below and ship it. Verify framing + the /coming-soon
//  hand-off on a real phone first (see BAKE.md).
// ============================================================================

// The single switch. Flip to true ONLY after `npm run bake:encode` has populated
// public/orb/ (see BAKE.md). MainView reads this to decide the phone path.
export const BAKED_ORB_READY = true

// Assets produced by the bake (npm run bake:encode → public/orb/).
const REST = `${BASE}orb/orb-rest` //   .webm + .mp4 (idle loop)
const MORPH = `${BASE}orb/orb-morph` // .webm + .mp4 (one-shot orb→globe)
const REST_POSTER = `${BASE}orb/orb-rest-poster.jpg` // first rest frame (instant paint)

// ---------- touch "Click here to learn more" caption ----------
// Curved along the orb's lower rim (SVG textPath, bottom arc → upright, reads L→R).
// CAP_R is in viewBox units; the SVG is sized in vw so the ring scales with the
// phone. CALIBRATE CAP_R / the rendered width to hug the baked orb on a real device.
// Two-line label under the orb. Measured from the baked clip: the orb is ~260px
// wide in the 1080×1920 source → ~57px radius on a ~390px phone (cover-fit), centred
// just below the viewport middle, so its bottom rim sits ~65px below centre.
const CAPTION_L1 = 'Click here to'
const CAPTION_L2 = 'learn more'
const CAP_OFFSET_Y = 64 // px below viewport centre for the label's top → just under the orb (tune to taste)

// Proximity scale for the rare desktop-baked path (mirrors glassOrbScene tunables).
const HOVER_MAX_SCALE = 1.3
const HOVER_INFLUENCE_PX = 360
const HOVER_EASE = 0.12

// BakedOrb({ onMorphEnd, prefersReducedMotion, style }, ref)
//   onMorphEnd          fired when the morph clip finishes — navigate to /coming-soon
//   prefersReducedMotion shows the static poster only (no autoplay); tap → onMorphEnd
//   style               merged onto the full-bleed container
//   ref.begin()         start the morph imperatively (MainView click-anywhere)
const BakedOrb = forwardRef(function BakedOrb(
  { onMorphEnd, prefersReducedMotion = false, style },
  ref
) {
  const [morphing, setMorphing] = useState(false)
  const morphRef = useRef(null)
  const endedRef = useRef(false)
  const boxRef = useRef(null) //   container we proximity-scale on desktop-baked
  const morphingRef = useRef(false) // freeze the scale once the morph starts

  // Coarse pointer (touch) → show the wrapped caption instead of the cursor scale.
  const [touch, setTouch] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    setTouch(window.matchMedia('(pointer: coarse)').matches)
  }, [])

  const finish = () => {
    if (endedRef.current) return
    endedRef.current = true
    if (onMorphEnd) onMorphEnd()
  }

  // Tap / click-anywhere: cross-fade to the preloaded morph and play it once. The
  // morph's poster is the rest frame, so a correct first frame always paints
  // instantly; a short opacity cross-fade (not a hard cut) hides the boat's
  // rotation-phase difference between the two recordings. reduced-motion skips
  // straight to the page; a blocked autoplay still navigates.
  const begin = () => {
    if (morphing || endedRef.current) return
    morphingRef.current = true
    if (boxRef.current) boxRef.current.style.transform = 'scale(1)' // drop any hover scale before the morph
    if (prefersReducedMotion) { finish(); return }
    setMorphing(true)
    const v = morphRef.current
    if (!v) { finish(); return }
    v.currentTime = 0
    const p = v.play()
    if (p && p.catch) p.catch(() => finish())
  }

  // Let MainView start the morph (its desktop click-anywhere handler calls this).
  useImperativeHandle(ref, () => ({ begin }))

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin() }
  }

  // Desktop-baked only: grow the orb as the cursor nears the screen centre. Skipped
  // on touch (no cursor → caption instead) and for reduced motion. Ref-driven on a
  // rAF — never React state — so there are no per-mousemove re-renders.
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

  const box = {
    position: 'relative', width: '100%', height: '100%',
    background: '#000', overflow: 'hidden', cursor: 'pointer',
    transformOrigin: 'center center', willChange: 'transform',
    ...style,
  }
  const layer = (extra) => ({
    position: 'absolute', inset: 0, width: '100%', height: '100%',
    objectFit: 'cover', display: 'block', ...extra,
  })
  const a11y = {
    onClick: begin, onKeyDown: onKey, tabIndex: 0, role: 'button',
    'aria-label': 'Coming soon — the road to LA 2028',
  }

  // The faded caption wrapped around the orb (touch only, hidden during the morph).
  const caption = touch && !morphing ? (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, ${CAP_OFFSET_Y}px)`,
        textAlign: 'center', pointerEvents: 'none', zIndex: 2,
        color: 'rgba(255,255,255,0.5)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 14, lineHeight: 1.3, letterSpacing: '0.4px', fontWeight: 400,
        textShadow: '0 1px 4px rgba(0,0,0,0.5)',
      }}
    >
      {CAPTION_L1}<br />{CAPTION_L2}
    </div>
  ) : null

  if (prefersReducedMotion) {
    return (
      <div ref={boxRef} style={box} {...a11y}>
        <img src={REST_POSTER} alt="" aria-hidden="true" style={layer()} />
        {caption}
      </div>
    )
  }

  return (
    <div ref={boxRef} style={box} {...a11y}>
      {/* REST — autoplaying idle loop. */}
      <video
        autoPlay muted loop playsInline preload="auto" poster={REST_POSTER}
        style={layer({ opacity: morphing ? 0 : 1, transition: 'opacity 150ms linear' })}
      >
        <source src={`${REST}.webm`} type="video/webm" />
        <source src={`${REST}.mp4`} type="video/mp4" />
      </video>

      {/* MORPH — preloaded; poster is the rest frame so the cross-fade always paints
          a correct first frame instantly. Plays once on tap, ends on the globe hero
          pose, then hands off to /coming-soon. */}
      <video
        ref={morphRef}
        muted playsInline preload="auto" poster={REST_POSTER}
        onEnded={finish}
        style={layer({ opacity: morphing ? 1 : 0, transition: 'opacity 150ms linear' })}
      >
        <source src={`${MORPH}.webm`} type="video/webm" />
        <source src={`${MORPH}.mp4`} type="video/mp4" />
      </video>

      {caption}
    </div>
  )
})

export default BakedOrb
