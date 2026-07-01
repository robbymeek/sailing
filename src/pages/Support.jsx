import { useState, useEffect } from 'react'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'
import portrait from '../assets/support/portrait.jpg'

// Donation page — a clean two-panel "how to give through SFNY" layout: deep-navy
// instructions panel + a full-height portrait sailing photo. Donations are handled
// on the Sailing Foundation of New York platform (501c3), so this page just guides
// the donor there; there is intentionally no form.
const PAGE_BG = 'rgb(248,249,251)'
const NAVY = 'rgb(20,28,54)'
const ACCENT = 'rgb(10,85,235)'
const DONATE_URL = 'https://www.sfny.org/donate/'

const STEPS = [
  'Go to sfny.org/donate',
  'Click "Donate"',
  'Input amount & click "Continue"',
  (
    <>
      Select <strong style={{ fontWeight: 700, color: '#fff' }}>"Other Athlete/Organization - Specify"</strong> from
      the drop-down menu, then specify <strong style={{ fontWeight: 700, color: '#fff' }}>"Robby Meek."</strong>
    </>
  ),
  'Click "Continue"',
  'Then select payment method: credit card, check, or ACH',
]

function DonateButton() {
  const [hover, setHover] = useState(false)
  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-block',
        background: hover ? 'rgb(8,70,205)' : ACCENT,
        color: '#fff', textDecoration: 'none',
        padding: '13px 26px', fontSize: 13.5, fontWeight: 700, letterSpacing: '0.8px',
        borderRadius: 3, transition: 'background 0.2s ease', whiteSpace: 'nowrap',
      }}
    >
      DONATE AT SFNY.ORG →
    </a>
  )
}

export default function Support({ onNavigate }) {
  const entrance = usePageEntrance(1, { staggerMs: 100, initialDelayMs: 60 })
  const [narrow, setNarrow] = useState(typeof window !== 'undefined' && window.innerWidth <= 900)
  useEffect(() => {
    const h = () => setNarrow(window.innerWidth <= 900)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <div style={{ maxWidth: 1180, margin: '0 auto', padding: `${narrow ? 64 : 48}px clamp(16px, 4vw, 40px) 64px` }}>
        <div
          style={{
            ...entrance.style(0),
            display: 'flex',
            flexDirection: narrow ? 'column-reverse' : 'row',
            alignItems: 'stretch',
            background: NAVY,
            boxShadow: '0 24px 60px rgba(20,28,54,0.22)',
            overflow: 'hidden',
          }}
        >
          {/* ---------- Instructions panel ---------- */}
          <div style={{
            flex: narrow ? '1 1 auto' : '1.06 1 0',
            minWidth: 0,
            padding: 'clamp(32px, 4vw, 56px)',
            display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            <h1 style={{
              color: '#fff', fontSize: 'clamp(30px, 4vw, 50px)', fontWeight: 800,
              letterSpacing: '-1.5px', lineHeight: 1.05, margin: '0 0 20px',
            }}>
              Donate to the<br />LA 2028 Campaign
            </h1>

            <p style={{ color: '#fff', fontSize: 15.5, fontWeight: 600, lineHeight: 1.5, margin: '0 0 14px' }}>
              For 501(c)(3) tax-deductible donations to Robby's Olympic campaign:
            </p>

            <ol style={{ margin: '0 0 26px', paddingLeft: 22, color: 'rgba(255,255,255,0.9)', fontSize: 15, lineHeight: 1.85 }}>
              {STEPS.map((s, i) => (
                <li key={i} style={{ marginBottom: 5, paddingLeft: 4 }}>{s}</li>
              ))}
            </ol>

            <p style={{
              color: 'rgba(255,255,255,0.6)', fontSize: 13.5, fontStyle: 'italic',
              lineHeight: 1.6, margin: '0 0 30px', maxWidth: 470,
            }}>
              *The credit card processing fee is optional and can be edited to $0 — a
              voluntary, additional contribution to the platform.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-start' }}>
              <DonateButton />
              <div style={{ color: 'rgba(255,255,255,0.82)', fontSize: 14, lineHeight: 1.6 }}>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: 3 }}>Checks can be mailed to:</div>
                Sailing Foundation of New York<br />
                PO Box 124<br />
                Rye, NY 10580
              </div>
            </div>
          </div>

          {/* ---------- Portrait photo ---------- */}
          <div style={{
            flex: narrow ? '1 1 auto' : '1 1 0',
            minWidth: 0, position: 'relative',
            minHeight: narrow ? 380 : 0, overflow: 'hidden',
          }}>
            <img
              src={portrait}
              alt="Robby Meek sailing"
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: '100%',
                objectFit: 'cover', objectPosition: 'center', display: 'block',
              }}
            />
          </div>
        </div>
      </div>

      <Footer variant="light" onNavigate={onNavigate} />
    </div>
  )
}
