// Shared "Donate and Support" lockup — a cursive "Donate / and" stack beside a shorter
// "SUPPORT" over three flat/long chevrons that span the S→T of the word. Used in the mobile
// sticky bar (App.jsx) and the desktop home top bar (MainView.jsx). The chevrons nudge DOWN
// on hover + press via CSS (.donate-lockup:hover/:active .donate-arrows in index.css).
//
// `color` defaults to var(--fg) (the mobile bar sets it, adapting per page); pass an explicit
// colour where there's no --fg (e.g. the desktop home). `style` merges placement overrides.
export default function DonateLockup({ onClick, color = 'var(--fg)', style }) {
  return (
    <button
      className="donate-lockup"
      onClick={onClick}
      aria-label="Donate and Support"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 9,
        background: 'none', border: 'none', cursor: 'pointer', padding: '6px 12px',
        color, fontFamily: 'inherit', whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {/* Column 1: cursive Donate / and, right-aligned */}
      <span aria-hidden="true" style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', lineHeight: 1.0,
        fontFamily: 'Georgia, "Times New Roman", serif', fontStyle: 'italic', fontWeight: 400, fontSize: 13,
      }}>
        <span>Donate</span>
        <span>and</span>
      </span>
      {/* Column 2: shorter SUPPORT over three flat/long chevrons spanning S→T. ONE SVG,
          absolutely filling a full-width box whose width is set by SUPPORT (so it can't bloat
          the layout). preserveAspectRatio:none flattens/stretches the chevrons; non-scaling-
          stroke keeps the line weight even. Outer edges land under S and T. */}
      <span aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: 2 }}>
        <span style={{ fontSize: 15, fontWeight: 400, letterSpacing: '1px', textTransform: 'uppercase', lineHeight: 1, textAlign: 'center' }}>Support</span>
        <span className="donate-arrows" style={{ position: 'relative', width: '100%', height: 7, display: 'block' }}>
          <svg viewBox="0 0 100 10" preserveAspectRatio="none" fill="none"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
            <path d="M0 2 L13 8 L26 2 M37 2 L50 8 L63 2 M74 2 L87 8 L100 2"
              stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
              vectorEffect="non-scaling-stroke" />
          </svg>
        </span>
      </span>
    </button>
  )
}
