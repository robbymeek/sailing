import { useEffect } from 'react'
import { hasWebGL2 } from '../lib/webglSupport'

// Bootstrap for the LA 2028 sea-spray dissolve (lib/textSpray). Keeps the
// heavy module out of the page chunk: watches scroll until the headline comes
// within two viewports, dynamic-imports the effect, then boots it during idle
// time so context creation never hitches mid-scroll. Bails entirely — the
// headline just scrolls away plain, still un-sticky — for reduced motion,
// Save-Data, non-WebGL2 browsers, and the hidden preload copies App mounts
// off-screen (their rects sit permanently "near the top" and would otherwise
// boot a zombie WebGL loop).
export default function useTextSpray(h1Ref, { enabled = true, palette = 'white', containerRef, zIndex = 20, fadeRefs = [], pausedRef, releaseLine = 0 } = {}) {
  useEffect(() => {
    if (!enabled) return undefined
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined
    if (navigator.connection?.saveData) return undefined
    if (!hasWebGL2()) return undefined

    let disposed = false
    let armed = false
    let spray = null
    let idleId = 0
    let raf = 0

    const stopWatch = () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }

    const boot = async () => {
      try {
        const { createTextSpray } = await import('../lib/textSpray')
        if (disposed) return
        const init = () => {
          if (disposed || !h1Ref.current) return
          try {
            spray = createTextSpray(h1Ref.current, {
              palette,
              container: containerRef?.current || undefined,
              zIndex,
              fadeEls: fadeRefs.map((r) => r.current),
              isPaused: pausedRef ? () => !!pausedRef.current : null,
              releaseLine,
            })
          } catch (err) {
            console.warn('textSpray failed to start; headline scrolls away plain', err)
          }
        }
        idleId = window.requestIdleCallback
          ? window.requestIdleCallback(init, { timeout: 800 })
          : setTimeout(init, 120)
      } catch (err) {
        console.warn('textSpray failed to load', err)
      }
    }

    const onScroll = () => {
      if (raf || armed) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const h1 = h1Ref.current
        if (!h1 || armed || disposed) return
        // The preload copy is aria-hidden/visibility:hidden for its whole
        // lifetime — never arm it.
        if (h1.closest('[aria-hidden="true"]') || (h1.checkVisibility && !h1.checkVisibility())) {
          stopWatch()
          return
        }
        if (h1.getBoundingClientRect().top < window.innerHeight * 2) {
          armed = true
          stopWatch()
          boot()
        }
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    onScroll()

    return () => {
      disposed = true
      stopWatch()
      if (raf) cancelAnimationFrame(raf)
      if (idleId) (window.cancelIdleCallback || clearTimeout)(idleId)
      if (spray) spray.dispose()
    }
    // Refs are stable and palette/zIndex are per-page constants.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])
}
