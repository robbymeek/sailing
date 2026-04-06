import Nav from '../components/Nav'
import Footer from '../components/Footer'
import Marquee from '../components/Marquee'

const SUPPORTERS = [
  ['The Strom Family', 'The Ziskind Family', '- - - - - - -'],
  ['The Callahan Family', 'Parabh Gill', '- - - - - - -'],
  ['- - - - - - -', 'Annapolis YC', '- - - - - - -'],
]

export default function Team({ onNavigate }) {
  return (
    <div style={{ background: 'rgb(18,0,120)', minHeight: '100vh' }}>
      <Nav current="Team" onNavigate={onNavigate} variant="blue" />

      {/* Sponsor grid */}
      <div style={{ maxWidth: 1000, margin: '20px auto', padding: '0 40px' }}>
        <div style={{ border: '2px solid rgba(50,50,150,0.6)', background: 'rgba(150,150,200,0.12)' }}>
          {/* Top row - 3 sponsors */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            borderBottom: '2px solid rgba(50,50,150,0.6)',
          }}>
            <div style={{
              padding: '40px 20px', textAlign: 'center', background: 'rgb(0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 140, borderRight: '2px solid rgba(50,50,150,0.6)',
            }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>
                AA ENT<br />&amp; Facial Plastic Surgery
              </span>
            </div>
            <div style={{
              padding: '40px 20px', textAlign: 'center', background: 'rgb(20,40,60)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 140, borderRight: '2px solid rgba(50,50,150,0.6)',
            }}>
              <span style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>US Sailing Team</span>
            </div>
            <div style={{
              padding: '40px 20px', textAlign: 'center', background: 'rgb(255,255,255)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140,
            }}>
              <span style={{ color: 'rgb(0,0,120)', fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>
                Sailing Foundation<br />of New York
              </span>
            </div>
          </div>

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr' }}>
            <div style={{
              padding: '40px 20px', textAlign: 'center', background: 'rgb(255,255,255)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 140, borderRight: '2px solid rgba(50,50,150,0.6)',
            }}>
              <span style={{ color: 'rgb(0,0,60)', fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
                CHARTER<br />Financial Group
              </span>
            </div>
            <div style={{ background: 'rgb(18,0,120)', padding: '20px 30px' }}>
              {SUPPORTERS.map((row, ri) => (
                <div key={ri} style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 10, marginBottom: ri < 2 ? 10 : 0,
                }}>
                  {row.map((name, ci) => (
                    <span key={ci} style={{
                      color: name.includes('-') ? 'rgba(255,255,255,0.3)' : '#fff',
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

      {/* Thank you section */}
      <div style={{ marginTop: 40, overflow: 'hidden' }}>
        <div style={{ padding: '40px 0' }}>
          <Marquee
            items={['THANK YOU', 'THANK YOU', 'THANK YOU', 'THANK YOU']}
            speed={20} color="rgba(255,255,255,0.08)" fontSize={70}
          />
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 40px 60px' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Thank you for the support I've received from sponsors, my family, friends, and coaches. Your belief in me has made this Olympic campaign possible. Sailing is a uniquely demanding sport; it's not enough to train hard in isolation. To truly improve, you have to compete directly against the best — in the same waters, in the same wind, in the same moment.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Because sailing is so variable, with conditions constantly shifting — wind strength, wave patterns, current — the only way to measure progress is by testing yourself against others under identical conditions. That means traveling to wherever the best sailors and the most competitive regattas are happening. Without the financial and emotional support I've received, I wouldn't have been able to reach those starting lines, let alone perform at my highest level.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            I'm especially thankful for the people in my corner — my friends and family, who've supported me through long days and setbacks, and my coaches, whose guidance and belief have shaped my growth as both a sailor and a person. This campaign is a team effort, and I'm constantly reminded how lucky I am to have such a strong team behind me.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, lineHeight: 1.8, marginBottom: 4 }}>
            Thank you. Sincerely,
          </p>
          <p style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>Robby</p>
        </div>
      </div>

      <Footer variant="blue" onNavigate={onNavigate} />
    </div>
  )
}
