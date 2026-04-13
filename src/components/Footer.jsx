export default function Footer({ variant, onNavigate }) {
  const dark = variant !== 'light'
  const bg = variant === 'light' ? '#c0c0c0' : variant === 'blue' ? 'rgb(10,0,80)' : 'rgb(10,12,18)'
  const tc = dark ? 'rgba(255,255,255,0.5)' : '#555'

  return (
    <div style={{ background: bg, padding: '40px 20px 30px', textAlign: 'center' }}>
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        gap: 8, marginBottom: 16, flexWrap: 'wrap',
      }}>
        {[
          ['Home', 'Home'],
          ['Biography', 'Biography'],
          ['Path', 'Path & Team'],
          ['Contact', 'Contact'],
          ['Support', 'Support'],
        ].map(([key, label], i, arr) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => onNavigate(key)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: tc, fontSize: 12,
              }}
            >
              {label}
            </button>
            {i < arr.length - 1 && <span style={{ color: tc, fontSize: 12 }}>|</span>}
          </div>
        ))}
      </div>
      <p style={{ color: tc, fontSize: 11, margin: '8px 0' }}>
        Contact: robbymeek+LA2028@gmail.com
      </p>
      <p style={{ color: tc, fontSize: 10, margin: '4px 0' }}>
        Regarding sponsorships or other inquiries.{' '}
        <button
          onClick={() => onNavigate('Support')}
          style={{
            background: 'none', border: 'none', color: tc,
            textDecoration: 'underline', cursor: 'pointer', fontSize: 10,
          }}
        >
          Join the team
        </button>
      </p>
      <div style={{
        marginTop: 20,
        borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
        paddingTop: 16,
      }}>
        <p style={{ color: tc, fontSize: 10 }}>Robby Meek | Official Website</p>
        <p style={{ color: tc, fontSize: 9, opacity: 0.6 }}>Website designed and made by Robby Meek</p>
      </div>
    </div>
  )
}
