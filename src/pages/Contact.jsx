import Nav from '../components/Nav'

export default function Contact({ onNavigate }) {
  return (
    <div style={{ background: 'rgb(224,224,224)', minHeight: '100vh' }}>
      <Nav current="Contact" onNavigate={onNavigate} variant="light" />

      {/* Purple/blue header bar */}
      <div style={{
        background: 'linear-gradient(135deg, rgb(100,100,180), rgb(120,120,200))',
        height: 80,
      }} />

      {/* Main content */}
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <h1 style={{
          color: 'rgb(60,60,60)', fontSize: 22, fontWeight: 600, margin: '0 0 6px',
        }}>Robby Meek</h1>
        <p style={{ color: 'rgb(120,120,120)', fontSize: 14, margin: '0 0 24px' }}>
          Annapolis, Maryland
        </p>
        <p style={{ color: 'rgb(100,100,100)', fontSize: 13, margin: '0 0 6px' }}>
          Correspondence related to sailing: robbymeek+LA2028@gmail.com
        </p>
        <p style={{ color: 'rgb(100,100,100)', fontSize: 13, margin: '0 0 24px' }}>
          Personal: robbymeek@gmail.com
        </p>
        <button
          onClick={() => onNavigate('Team')}
          style={{
            display: 'inline-block', color: 'rgb(80,80,80)', fontSize: 13,
            border: '1px solid rgb(160,160,160)', padding: '10px 24px',
            background: 'none', cursor: 'pointer',
          }}
        >
          Support the journey
        </button>
      </div>

      {/* Purple/blue footer bar */}
      <div style={{
        background: 'linear-gradient(135deg, rgb(100,100,180), rgb(120,120,200))',
        height: 200,
      }} />
    </div>
  )
}
