import { useRef } from 'react'
import useFocusTrap from '../hooks/useFocusTrap'

// A modal dialog with genuine focus management (via useFocusTrap): role="dialog"
// + aria-modal, focus moved inside on open, Tab/Shift+Tab contained, Escape to
// close, focus restored to the trigger on close, body scroll locked, and the
// background made non-interactive by the fixed backdrop. The caller supplies an
// accessible name (`label` or `labelledBy`) and the panel content; open/close
// state stays with the caller (it only mounts this while open).
//
// Backdrop dismissal is a real, aria-hidden, tab-excluded <button> filling the
// overlay BEHIND the panel — a mouse convenience that is never the only way to
// close (Escape + the caller's close button also do). Using a native button
// (not a div with onClick) keeps it keyboard-safe and lint-clean.
export default function AccessibleDialog({
  onClose, label, labelledBy, describedBy,
  overlayStyle, panelStyle, initialFocusRef, children,
}) {
  const panelRef = useRef(null)
  useFocusTrap(panelRef, { active: true, onClose, initialFocusRef, lockScroll: true })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        ...overlayStyle,
      }}
    >
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        style={{
          position: 'absolute', inset: 0,
          background: 'transparent', border: 'none', padding: 0, margin: 0,
          cursor: 'default',
        }}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        style={{ position: 'relative', ...panelStyle }}
      >
        {children}
      </div>
    </div>
  )
}
