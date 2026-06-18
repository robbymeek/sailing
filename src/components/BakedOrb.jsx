import { useRef, useState } from 'react'

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
//  ─── ACTIVATION ───
//  This is OFF until you record + encode the clips. Until then the mobile home
//  keeps its current boat (so nothing tries to play a missing video). To turn it
//  on: run the bake (BAKE.md) so public/orb/ has the clips, then set
//  BAKED_ORB_READY = true below and ship it. Verify framing + the /coming-soon
//  hand-off on a real phone first (see BAKE.md).
// ============================================================================

// The single switch. Flip to true ONLY after `npm run bake:encode` has populated
// public/orb/ (see BAKE.md). MainView reads this to decide the phone path.
export const BAKED_ORB_READY = false

// Assets produced by the bake (npm run bake:encode → public/orb/).
const REST = `${BASE}orb/orb-rest` //   .webm + .mp4 (idle loop)
const MORPH = `${BASE}orb/orb-morph` // .webm + .mp4 (one-shot orb→globe)
const REST_POSTER = `${BASE}orb/orb-rest-poster.jpg` // first rest frame (instant paint)

// BakedOrb({ onMorphEnd, prefersReducedMotion, style })
//   onMorphEnd          fired when the morph clip finishes — navigate to /coming-soon
//   prefersReducedMotion shows the static poster only (no autoplay); tap → onMorphEnd
//   style               merged onto the full-bleed container
export default function BakedOrb({ onMorphEnd, prefersReducedMotion = false, style }) {
  const [morphing, setMorphing] = useState(false)
  const morphRef = useRef(null)
  const endedRef = useRef(false)

  const finish = () => {
    if (endedRef.current) return
    endedRef.current = true
    if (onMorphEnd) onMorphEnd()
  }

  // Tap: cross-fade to the preloaded morph and play it once. The morph's poster is
  // the rest frame, so a correct first frame always paints instantly; a short
  // opacity cross-fade (not a hard cut) hides the boat's rotation-phase difference
  // between the two recordings. reduced-motion skips straight to the page; a
  // blocked autoplay still navigates.
  const begin = () => {
    if (morphing || endedRef.current) return
    if (prefersReducedMotion) { finish(); return }
    setMorphing(true)
    const v = morphRef.current
    if (!v) { finish(); return }
    v.currentTime = 0
    const p = v.play()
    if (p && p.catch) p.catch(() => finish())
  }

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); begin() }
  }

  const box = {
    position: 'relative', width: '100%', height: '100%',
    background: '#000', overflow: 'hidden', cursor: 'pointer',
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

  if (prefersReducedMotion) {
    return (
      <div style={box} {...a11y}>
        <img src={REST_POSTER} alt="" aria-hidden="true" style={layer()} />
      </div>
    )
  }

  return (
    <div style={box} {...a11y}>
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
    </div>
  )
}
