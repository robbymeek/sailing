export default function Contact({ onNavigate }) {
  return (
    <div style={{
      height: '100dvh',
      background: 'rgb(240,240,240)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '0 24px',
      boxSizing: 'border-box',
    }}>
      <div style={{ textAlign: 'center', maxWidth: 520 }}>
        <h1 style={{
          color: 'rgb(15,15,15)',
          fontSize: 'clamp(28px, 3.4vw, 44px)',
          fontWeight: 500,
          margin: '0 0 10px',
          letterSpacing: '-0.8px',
        }}>
          Robby Meek
        </h1>
        <p style={{
          color: 'rgb(110,110,110)',
          fontSize: 14,
          margin: '0 0 36px',
          letterSpacing: '0.3px',
        }}>
          Annapolis, Maryland
        </p>
        <p style={{ color: 'rgb(55,55,55)', fontSize: 14, margin: '0 0 10px' }}>
          Sailing:{' '}
          <a
            href="mailto:robbymeek+LA2028@gmail.com"
            style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            robbymeek+LA2028@gmail.com
          </a>
        </p>
        <p style={{ color: 'rgb(55,55,55)', fontSize: 14, margin: '0 0 40px' }}>
          Personal:{' '}
          <a
            href="mailto:robbymeek@gmail.com"
            style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '3px' }}
          >
            robbymeek@gmail.com
          </a>
        </p>
        <button
          onClick={() => onNavigate('Support')}
          style={{
            display: 'inline-block',
            color: 'rgb(25,25,25)',
            fontSize: 13,
            border: '1px solid rgb(160,160,160)',
            padding: '11px 30px',
            background: 'none',
            cursor: 'pointer',
            letterSpacing: '-0.2px',
            fontFamily: 'inherit',
          }}
        >
          Support the Journey
        </button>
      </div>
    </div>
  )
}
