import useCountdown from '../hooks/useCountdown'

// LA 2028 countdown, shown FADED in the centre of the sticky nav bars on HOME only
// (the mobile bar in App.jsx and the desktop banner in DesktopBanner.jsx render the
// same instance so the two read identically). Colour tracks --fg (set by the enclosing
// bar); absolutely non-interactive (aria-hidden, pointerEvents none).
const OLYMPICS_TARGET = Date.parse('2028-07-14T00:00:00')

export default function BarCountdown() {
  const { days, hrs, mins, secs } = useCountdown(OLYMPICS_TARGET)
  const timer = `${days} : ${String(hrs).padStart(2, '0')} : ${String(mins).padStart(2, '0')} : ${String(secs).padStart(2, '0')}`
  return (
    <span aria-hidden="true" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
      lineHeight: 1.2, whiteSpace: 'nowrap', pointerEvents: 'none',
      color: 'var(--fg)', opacity: 0.5,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px' }}>LA 2028</span>
      <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '1.5px' }}>OLYMPICS</span>
      <span style={{ fontSize: 8, fontWeight: 500, letterSpacing: '0.2px', fontVariantNumeric: 'tabular-nums' }}>{timer}</span>
    </span>
  )
}
