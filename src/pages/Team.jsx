import Footer from '../components/Footer'
import usePageEntrance from '../hooks/usePageEntrance'

const BASE = import.meta.env.BASE_URL

const SUPPORTERS = [
  ['The Strom Family', 'The Ziskind Family', '- - - - - - -'],
  ['The Callahan Family', 'Parabh Gill', '- - - - - - -'],
  ['- - - - - - -', 'Annapolis YC', '- - - - - - -'],
]

export default function Team({ onNavigate }) {
  const entrance = usePageEntrance(4, { staggerMs: 120, initialDelayMs: 50 })

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Full page background photo */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <img
          src={`${BASE}IMG_5854.JPG`}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 30%',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(18,0,120,0.88)',
        }} />
      </div>

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', padding: '60px 20px 80px' }}>
          <h1 style={{
            color: '#fff', fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: 800,
            letterSpacing: '-2px', margin: '0 0 12px', textTransform: 'uppercase',
          }}>The Team</h1>
          <p style={{
            color: 'rgba(255,255,255,0.5)', fontSize: 14, maxWidth: 500,
            margin: '0 auto', lineHeight: 1.6,
          }}>
            The sponsors, families, and supporters who make this Olympic campaign possible.
          </p>
        </div>

        {/* Sponsor grid */}
        <div style={{ ...entrance.style(1), maxWidth: 1000, margin: '0 auto', padding: '0 40px' }}>
          <div style={{
            border: '1px solid rgba(255,255,255,0.1)',
            overflow: 'hidden',
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
              <div style={{
                padding: '24px', textAlign: 'center', background: 'rgb(0,0,0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 140, borderRight: '1px solid rgba(255,255,255,0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <img src={`${BASE}AAENT-Logo.png`} alt="AA ENT & Facial Plastic Surgery" style={{ maxWidth: '80%', maxHeight: 100, objectFit: 'contain' }} />
              </div>
              <div style={{
                padding: '24px', textAlign: 'center', background: 'rgb(15,25,50)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 140,
                borderRight: '1px solid rgba(255,255,255,0.1)',
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <img src={`${BASE}us-sailing-team-logo.png`} alt="US Sailing Team" style={{ maxWidth: '80%', maxHeight: 100, objectFit: 'contain' }} />
              </div>
              <div style={{
                padding: '24px', textAlign: 'center', background: 'rgb(255,255,255)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 140,
                borderBottom: '1px solid rgba(255,255,255,0.1)',
              }}>
                <img src={`${BASE}sfny-logo.png`} alt="Sailing Foundation of New York" style={{ maxWidth: '80%', maxHeight: 100, objectFit: 'contain' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr' }}>
              <div style={{
                padding: '16px', textAlign: 'center', background: 'rgb(255,255,255)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                minHeight: 140, borderRight: '1px solid rgba(255,255,255,0.1)',
              }}>
                <img src={`${BASE}charter-financial-logo.jpeg`} alt="Charter Financial Group" style={{ width: '100%', maxHeight: 130, objectFit: 'contain' }} />
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.03)', padding: '24px 30px',
                display: 'flex', alignItems: 'center',
              }}>
                <div style={{ width: '100%' }}>
                  {SUPPORTERS.map((row, ri) => (
                    <div key={ri} style={{
                      display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                      gap: 10, marginBottom: ri < 2 ? 10 : 0,
                    }}>
                      {row.map((name, ci) => (
                        <span key={ci} style={{
                          color: name.includes('-') ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.85)',
                          fontSize: 14, fontWeight: name.includes('-') ? 400 : 600,
                          padding: '10px 0',
                        }}>{name}</span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Thank you letter */}
        <div style={{ ...entrance.style(2), maxWidth: 800, margin: '0 auto', padding: '60px 40px 60px' }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Thank you for the support I have received from sponsors, my family, friends, and coaches. Your belief in me has made this Olympic campaign possible. Sailing is a uniquely demanding sport. It is not enough to train hard on your own. To truly improve, you have to compete directly against the best, in the same waters, in the same wind, at the same time.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Because conditions on the water are always changing, the only real way to measure progress is by racing against others in identical conditions. That means traveling to wherever the best sailors and the most competitive regattas are. Without the financial and emotional support I have received, I would not have been able to make it to those starting lines, let alone compete at my best.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            I am especially thankful for the people in my corner. My friends and family have supported me through long days and tough setbacks. My coaches have shaped my growth as both a sailor and a person. This campaign is a team effort, and I am constantly reminded how lucky I am to have such a strong team behind me.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.8, marginBottom: 4 }}>
            Thank you. Sincerely,
          </p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.8 }}>Robby</p>
        </div>

        <div style={entrance.style(3)}>
          <Footer variant="blue" onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  )
}
