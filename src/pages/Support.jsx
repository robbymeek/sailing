import { useState } from 'react'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'

const HEADING_COLOR = 'rgb(20,60,160)'
const ACCENT = 'rgb(10,85,235)'
const BODY_COLOR = 'rgba(0,0,0,0.75)'
const MUTED = 'rgba(0,0,0,0.5)'

const SUPPORT_WAYS = [
  {
    title: 'Financial Support',
    desc: 'Direct contribution to the campaign fund — training, travel, equipment, and competition entry fees.',
    mailto: true,
  },
  {
    title: 'Equipment & Gear',
    desc: 'Sponsorship of sailing equipment, boat maintenance, sails, and technical gear.',
  },
  {
    title: 'Travel & Housing',
    desc: 'Help with travel logistics and housing for international regattas and training camps.',
  },
  {
    title: 'Professional Services',
    desc: 'Coaching, training analysis, sports medicine, nutrition, and mental performance.',
  },
  {
    title: 'Spread the Word',
    desc: 'Share the campaign with your network — every connection helps.',
  },
]

export default function Support({ onNavigate }) {
  const entrance = usePageEntrance(5, { staggerMs: 100, initialDelayMs: 50 })
  const [ctaHover, setCtaHover] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#fff' }}>
      <div style={{
        maxWidth: 760,
        margin: '0 auto',
        padding: 'clamp(80px, 12vw, 140px) clamp(24px, 5vw, 60px) 60px',
      }}>
        {/* Header */}
        <div style={entrance.style(0)}>
          <h1 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 700,
            color: HEADING_COLOR,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            margin: 0,
          }}>
            Support
          </h1>
          <div style={{
            height: 3,
            background: ACCENT,
            width: '100%',
            marginTop: 16,
            marginBottom: 40,
          }} />
        </div>

        {/* Intro */}
        <div style={entrance.style(1)}>
          <h2 style={{
            fontSize: 'clamp(20px, 2.5vw, 28px)',
            fontWeight: 600,
            color: ACCENT,
            margin: '0 0 16px',
          }}>
            Supporting the Olympic Campaign
          </h2>
          <p style={{
            fontSize: 15,
            lineHeight: 1.7,
            color: BODY_COLOR,
            maxWidth: 720,
            margin: '0 0 48px',
          }}>
            Your support makes this Olympic campaign possible. Whether through financial
            contributions, equipment partnerships, or professional expertise — every form
            of support helps close the gap between where I am and where I need to be.
            Contributions go directly toward training, travel, equipment, and competition
            entry fees.
          </p>
        </div>

        {/* Ways to support */}
        <div style={entrance.style(2)}>
          <h3 style={{
            fontSize: 'clamp(18px, 2vw, 22px)',
            fontWeight: 600,
            color: HEADING_COLOR,
            margin: '0 0 24px',
          }}>
            How to Support
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 48 }}>
            {SUPPORT_WAYS.map((item) => (
              <div key={item.title} style={{
                padding: '16px 20px',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 6,
                borderLeft: `3px solid ${ACCENT}`,
              }}>
                <div style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: HEADING_COLOR,
                  marginBottom: 4,
                }}>
                  {item.title}
                </div>
                <div style={{
                  fontSize: 14,
                  color: 'rgba(0,0,0,0.65)',
                  lineHeight: 1.5,
                }}>
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Contact CTA */}
        <div style={entrance.style(3)}>
          <h3 style={{
            fontSize: 'clamp(18px, 2vw, 22px)',
            fontWeight: 600,
            color: HEADING_COLOR,
            margin: '0 0 16px',
          }}>
            Get In Touch
          </h3>
          <p style={{
            fontSize: 15,
            color: BODY_COLOR,
            margin: '0 0 20px',
            lineHeight: 1.6,
          }}>
            Reach out directly to discuss how you can support the campaign.
          </p>
          <a
            href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
            onMouseEnter={() => setCtaHover(true)}
            onMouseLeave={() => setCtaHover(false)}
            style={{
              display: 'inline-block',
              background: ctaHover ? 'rgb(8,70,200)' : ACCENT,
              color: '#fff',
              padding: '12px 32px',
              borderRadius: 4,
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
              transition: 'background 0.2s ease',
            }}
          >
            robbymeek+LA2028@gmail.com
          </a>
          <p style={{
            fontSize: 13,
            color: MUTED,
            marginTop: 12,
          }}>
            All inquiries are welcome. Robby personally reads every message.
          </p>
        </div>
      </div>

      {/* Footer */}
      <div style={entrance.style(4)}>
        <Footer variant="light" onNavigate={onNavigate} />
      </div>
    </div>
  )
}
