import { useEffect, useRef, useState } from 'react'

// The Contact row's media: Robby's headshot as a navy/electric-blue DUOTONE under
// thin scan-strips that drift with scroll — an editorial/broadcast frame rather
// than a bare portrait. On hover the treatment lifts: the duotone and strips fade
// out and the image un-desaturates to the clear, full-colour photo.
// The image is a PUBLIC asset (string URL, not an import) so a missing file just
// shows a blank frame instead of breaking the home page build.
const BASE = import.meta.env.BASE_URL
const PHOTO = `${BASE}contact/robby-meek-headshot.jpg`
const ALT = 'Robby Meek, US Sailing Team.'

// Keeps his face in frame when the cell crops tall.
const FOCUS = 'center 24%'

// 0..1 as the frame travels bottom -> top of the viewport — drives the strip
// drift. rAF-throttled scroll/resize.
function useScrollProgress(ref) {
  const [p, setP] = useState(0.5)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const update = () => {
      raf = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight || 1
      setP(Math.max(0, Math.min(1, (vh - r.top) / (vh + r.height))))
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [ref])
  return p
}

const cover = { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: FOCUS, display: 'block' }
const EASE = 'opacity 480ms ease, filter 480ms ease'

export default function ContactPhoto() {
  const ref = useRef(null)
  const p = useScrollProgress(ref)
  const [hovered, setHovered] = useState(false)
  const treat = hovered ? 0 : 1 // treatment opacity: 0 = clear photo

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#0a1230' }}
    >
      <img
        src={PHOTO} alt={ALT} loading="lazy" decoding="async"
        style={{
          ...cover,
          filter: hovered ? 'grayscale(0) contrast(1.02) brightness(1)' : 'grayscale(1) contrast(1.07) brightness(1.03)',
          transition: EASE,
        }}
      />
      {/* duotone: highlights -> electric blue, shadows -> deep navy */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,80,255,0.60), rgba(9,16,44,0.85))', mixBlendMode: 'color', opacity: treat, transition: EASE, pointerEvents: 'none' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'rgba(4,10,32,0.22)', mixBlendMode: 'multiply', opacity: treat, transition: EASE, pointerEvents: 'none' }} />
      {/* fine scan-strips, drifting with scroll */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, top: '-25%', height: '150%',
        background: 'repeating-linear-gradient(0deg, rgba(255,255,255,0) 0px, rgba(255,255,255,0) 12px, rgba(255,255,255,0.07) 12px, rgba(255,255,255,0.07) 14px)',
        transform: `translateY(${(p - 0.5) * 60}px)`, opacity: treat, transition: EASE, pointerEvents: 'none',
      }} />
      {/* bolder blue bands for rhythm */}
      <div aria-hidden style={{
        position: 'absolute', left: 0, right: 0, top: '-25%', height: '150%',
        background: 'repeating-linear-gradient(0deg, rgba(0,80,255,0) 0px, rgba(0,80,255,0) 78px, rgba(120,170,255,0.14) 78px, rgba(120,170,255,0.14) 82px)',
        transform: `translateY(${(p - 0.5) * 120}px)`, opacity: treat, transition: EASE, pointerEvents: 'none',
      }} />
    </div>
  )
}
