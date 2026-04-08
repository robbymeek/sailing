import { useEffect } from 'react'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import Marquee from '../components/Marquee'

const BASE = import.meta.env.BASE_URL

const SUPPORTERS = [
  ['The Strom Family', 'The Ziskind Family', '- - - - - - -'],
  ['The Callahan Family', 'Parabh Gill', '- - - - - - -'],
  ['- - - - - - -', 'Annapolis YC', '- - - - - - -'],
]

export default function Team({ onNavigate }) {
  useEffect(() => { document.body.style.background = 'rgb(18,0,120)' }, [])

  return (
    <div style={{ background: 'rgb(18,0,120)', minHeight: '100vh' }}>
      {/* Hero section with photo background */}
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Background photo */}
        <div style={{
          position: 'absolute', inset: 0,
        }}>
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
            background: 'linear-gradient(180deg, rgba(18,0,120,0.6) 0%, rgba(18,0,120,0.85) 60%, rgb(18,0,120) 100%)',
          }} />
        </div>

        {/* Nav + hero content */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <Nav current="Team" onNavigate={onNavigate} variant="blue" />

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
        </div>
      </div>

      {/* Sponsor grid */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 40px' }}>
        <div style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          {/* Top row - 3 sponsors */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          }}>
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
              minHeight: 140, borderRight: '1px solid rgba(255,255,255,0.1)',
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

          {/* Bottom row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr' }}>
            <div style={{
              padding: '24px', textAlign: 'center', background: 'rgb(255,255,255)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              minHeight: 140, borderRight: '1px solid rgba(255,255,255,0.1)',
            }}>
              <img src={`${BASE}charter-financial-logo.jpeg`} alt="Charter Financial Group" style={{ maxWidth: '80%', maxHeight: 100, objectFit: 'contain' }} />
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

      {/* Divider photo strip */}
      <div style={{
        margin: '60px 0 0',
        height: 200,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <img
          src={`${BASE}P1166617.jpeg`}
          alt=""
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center 60%',
          }}
        />
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgb(18,0,120) 0%, rgba(18,0,120,0.3) 40%, rgba(18,0,120,0.3) 60%, rgb(18,0,120) 100%)',
        }} />
      </div>

      {/* Thank you section */}
      <div style={{ overflow: 'hidden' }}>
        <div style={{ padding: '40px 0' }}>
          <Marquee
            items={['THANK YOU', 'THANK YOU', 'THANK YOU', 'THANK YOU']}
            speed={20} color="rgba(255,255,255,0.06)" fontSize={70}
          />
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '0 40px 60px' }}>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Thank you for the support I've received from sponsors, my family, friends, and coaches. Your belief in me has made this Olympic campaign possible. Sailing is a uniquely demanding sport; it's not enough to train hard in isolation. To truly improve, you have to compete directly against the best — in the same waters, in the same wind, in the same moment.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
            Because sailing is so variable, with conditions constantly shifting — wind strength, wave patterns, current — the only way to measure progress is by testing yourself against others under identical conditions. That means traveling to wherever the best sailors and the most competitive regattas are happening. Without the financial and emotional support I've received, I wouldn't have been able to reach those starting lines, let alone perform at my highest level.
          </p>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 14, lineHeight: 1.8, marginBottom: 16 }}>
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
