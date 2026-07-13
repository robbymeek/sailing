import { useEffect, useRef } from 'react'

// Real focus management for a modal surface (the results dialog + the nav menu
// overlays), so keyboard and screen-reader users aren't stranded:
//   • captures the element that was focused when the surface opened,
//   • moves focus inside on open,
//   • contains Tab / Shift+Tab within the surface (wrapping at both ends),
//   • Escape calls onClose,
//   • restores focus to the opener when it closes,
//   • optionally locks body scroll (with scrollbar-width compensation so the
//     page behind the backdrop doesn't jump on desktop).
//
// Not ARIA theatre — this is the behaviour. The consumer still supplies
// role="dialog" / aria-modal / an accessible name on the container.
//
// `active` toggles the trap (works for both a kept-mounted overlay that fades,
// and a mount/unmount modal — unmount runs the cleanup, restoring focus).
// Callbacks are read through a ref so a new onClose identity each render doesn't
// re-run the effect (which would recapture focus from INSIDE the dialog).

const FOCUSABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function useFocusTrap(containerRef, { active, onClose, initialFocusRef, lockScroll = false } = {}) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!active) return undefined
    const container = containerRef.current
    if (!container) return undefined

    const previouslyFocused = document.activeElement
    let prevOverflow, prevPadRight
    if (lockScroll) {
      const sbw = window.innerWidth - document.documentElement.clientWidth
      prevOverflow = document.body.style.overflow
      prevPadRight = document.body.style.paddingRight
      document.body.style.overflow = 'hidden'
      if (sbw > 0) document.body.style.paddingRight = `${sbw}px` // avoid the scrollbar-gone jump
    }

    const focusables = () =>
      Array.from(container.querySelectorAll(FOCUSABLE)).filter(
        // Skip the aria-hidden backdrop-dismiss button (tabindex -1) and anything
        // not currently rendered.
        (el) => el.tabIndex !== -1 && el.getClientRects().length > 0,
      )

    // Move focus in on the next frame (after the surface has painted). Default to
    // the container itself (given a -1 tabindex) so a screen reader reads the
    // dialog from its label; a caller can point at a specific control instead.
    const raf = requestAnimationFrame(() => {
      const target = initialFocusRef?.current || container
      if (target === container && !container.hasAttribute('tabindex')) container.tabIndex = -1
      target.focus?.()
    })

    const onKeyDown = (e) => {
      if (e.key === 'Escape') { onCloseRef.current?.(); return }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const el = document.activeElement
      const onContainer = el === container
      if (e.shiftKey) {
        if (onContainer || el === first || !container.contains(el)) { e.preventDefault(); last.focus() }
      } else if (el === last || (!onContainer && !container.contains(el))) {
        e.preventDefault(); first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown, true)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', onKeyDown, true)
      if (lockScroll) {
        document.body.style.overflow = prevOverflow
        document.body.style.paddingRight = prevPadRight
      }
      // Restore focus to the opener (if it's still in the document).
      if (previouslyFocused && document.contains(previouslyFocused) && previouslyFocused.focus) {
        previouslyFocused.focus()
      }
    }
    // Callbacks flow through refs; containerRef/initialFocusRef are stable ref
    // objects — so this effect runs exactly on the active → inactive edge.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])
}
