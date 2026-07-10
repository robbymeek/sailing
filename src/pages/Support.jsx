import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'
import wordmark from '../assets/contact/robby-meek-wordmark.png'
import bandPhoto from '../assets/support/robby-sailing.jpg'

// Support page — a ROBBY MEEK masthead over a cool action photo and two co-equal
// cards. The navy card leads with a clear "Get in touch" call to action (the
// button opens info@robbysailing.com, the general inquiries address; the email
// link below is robby@robbysailing.com); the white card keeps the full SFNY
// donation flow (6 steps, footnote, checks by mail). Donations happen on the
// external Sailing Foundation of New York platform (501c3), so there is
// intentionally no form here — the page guides the donor there and opens a
// direct line by email.
const PAGE_BG = 'rgb(248,249,251)'
const NAVY = 'rgb(20,28,54)'
const ACCENT = 'rgb(10,85,235)'
const ACCENT_HOVER = 'rgb(8,70,205)'
const DONATE_URL = 'https://www.sfny.org/donate/'
const CONTACT_EMAIL = 'robby@robbysailing.com'
const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('Supporting the LA 2028 campaign')}`
const INFO_EMAIL = 'info@robbysailing.com'
const INFO_MAILTO = `mailto:${INFO_EMAIL}?subject=${encodeURIComponent('Supporting the LA 2028 campaign')}`

// The 6 SFNY steps. Step 4's emphasis is NAVY so it stays legible on the white
// donate card.
const STEPS = [
  'Go to sfny.org/donate',
  'Click "Donate"',
  'Input amount & click "Continue"',
  (
    <>
      Select <strong style={{ fontWeight: 700, color: NAVY }}>"Other Athlete/Organization - Specify"</strong> from
      the drop-down menu, then specify <strong style={{ fontWeight: 700, color: NAVY }}>"Robby Meek."</strong>
    </>
  ),
  'Click "Continue"',
  'Then select payment method: credit card, check, or ACH',
]

// Solid filled button — used for the blue SFNY donate CTA. `external` opens a new
// tab for the outbound donation link.
function CtaButton({ href, label, bg, bgHover, external }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-block', textAlign: 'center', boxSizing: 'border-box',
        background: hover ? bgHover : bg,
        color: '#fff', textDecoration: 'none',
        padding: '13px 28px', fontSize: 13, fontWeight: 700, letterSpacing: '1.4px',
        borderRadius: 3, transition: 'background 0.2s ease', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </a>
  )
}

// Outline button for the DARK contact card — white hairline border, fills white
// on hover.
function OutlineLightButton({ href, label }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'inline-block',
        background: hover ? '#fff' : 'transparent',
        color: hover ? NAVY : '#fff',
        border: `1.5px solid ${hover ? '#fff' : 'rgba(255,255,255,0.65)'}`,
        textDecoration: 'none',
        padding: '11.5px 26.5px', fontSize: 13, fontWeight: 700, letterSpacing: '1.4px',
        borderRadius: 3, transition: 'background 0.2s ease, color 0.2s ease, border-color 0.2s ease', whiteSpace: 'nowrap',
      }}
    >
      {label}
    </a>
  )
}

// The email as a Contact-page-style underlined link that brightens on hover.
function ContactEmail({ href, address, color, hoverColor, weight = 600, size = 14.5 }) {
  const [hover, setHover] = useState(false)
  return (
    <a
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color: hover ? hoverColor : color, fontSize: size, fontWeight: weight,
        textDecoration: 'underline', textUnderlineOffset: '3px',
      }}
    >
      {address}
    </a>
  )
}

// The 6 SFNY steps as a hand-built numbered list (an <ol>'s ::marker can't be
// styled inline). The fixed number column gives a hanging indent so step 4's wrap
// lines align under the text, not the digit.
function StepList() {
  return (
    <div>
      {STEPS.map((s, i) => (
        <div
          key={i}
          style={{
            display: 'flex', gap: 12, alignItems: 'baseline',
            marginBottom: i === STEPS.length - 1 ? 0 : 14,
          }}
        >
          <span style={{
            flex: '0 0 20px', color: ACCENT, fontSize: 13.5,
            fontWeight: 700, fontVariantNumeric: 'tabular-nums', letterSpacing: '0.5px',
          }}>
            {i + 1}
          </span>
          <span style={{ color: 'rgba(20,28,54,0.78)', fontSize: 14.5, lineHeight: 1.6 }}>{s}</span>
        </div>
      ))}
    </div>
  )
}

export default function Support({ onNavigate }) {
  const entrance = usePageEntrance(4, { staggerMs: 90, initialDelayMs: 60 })
  // Arriving from The Team's open-berth input: greet the typed name so the roster
  // gesture lands somewhere real (the donation itself happens on the external SFNY
  // platform, so an acknowledgment is the honest maximum).
  const prefillName = useLocation().state?.prefillName
  const [narrow, setNarrow] = useState(typeof window !== 'undefined' && window.innerWidth <= 900)
  useEffect(() => {
    const h = () => setNarrow(window.innerWidth <= 900)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const doorHeading = { margin: 0, fontSize: 'clamp(24px, 2.6vw, 34px)', fontWeight: 800, letterSpacing: '-0.8px', lineHeight: 1.12 }
  const doorBody = { margin: '14px 0 0', fontSize: 15.5, lineHeight: 1.65 }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: `${narrow ? 56 : 44}px clamp(16px, 4vw, 40px) 0` }}>
        {/* masthead */}
        <div style={{ ...entrance.style(0) }}>
          <img
            src={wordmark}
            alt="Robby Meek"
            style={{ display: 'block', width: 'clamp(220px, 34vw, 460px)', maxWidth: '100%', height: 'auto', margin: '0 auto' }}
          />
          <div style={{ height: 1, background: 'rgba(20,28,54,0.14)', marginTop: 'clamp(20px, 3vw, 32px)' }} />
        </div>

        {/* cool-graded photo band */}
        <div style={{
          ...entrance.style(1), position: 'relative', overflow: 'hidden',
          marginTop: 'clamp(40px, 5vw, 64px)',
          height: narrow ? 'clamp(180px, 34vh, 300px)' : 'clamp(200px, 30vh, 360px)',
          boxShadow: '0 16px 44px rgba(20,28,54,0.10)',
        }}>
          <img
            src={bandPhoto}
            alt="Robby Meek sailing his ILCA"
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover', objectPosition: 'center 32%',
              filter: 'saturate(0.85) brightness(0.96) contrast(1.03)',
            }}
          />
          <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'linear-gradient(rgba(20,28,54,0.12), rgba(20,28,54,0.22))' }} />
        </div>

        {/* two doors */}
        <div style={{
          display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr',
          gap: 'clamp(20px, 2.4vw, 32px)', marginTop: 'clamp(40px, 5vw, 64px)', alignItems: 'stretch',
        }}>
          {/* contact card (primary) */}
          <div style={{
            ...entrance.style(2), background: NAVY, boxShadow: '0 24px 60px rgba(20,28,54,0.22)',
            padding: 'clamp(36px, 4vw, 52px)', display: 'flex', flexDirection: 'column', justifyContent: 'center',
          }}>
            {prefillName && (
              <p style={{ margin: '0 0 12px', fontSize: 14, color: 'rgba(255,255,255,0.7)' }}>
                A berth is reserved for <strong style={{ color: '#fff', fontWeight: 600 }}>{prefillName}</strong>.
              </p>
            )}
            <h2 style={{ ...doorHeading, color: '#fff' }}>Get in touch</h2>
            <p style={{ ...doorBody, color: 'rgba(255,255,255,0.82)' }}>
              The best support starts with a conversation. Ask about sponsorship, partnership, or anything else, and we will find the right way for you to join the road to LA.
            </p>
            <div style={{ marginTop: 24 }}>
              <OutlineLightButton href={INFO_MAILTO} label="CONTACT →" />
            </div>
            <div style={{ marginTop: 18 }}>
              <ContactEmail href={CONTACT_MAILTO} address={CONTACT_EMAIL} color="rgba(255,255,255,0.9)" hoverColor="#fff" />
            </div>
          </div>

          {/* donate card (co-equal) */}
          <div style={{
            ...entrance.style(3), background: '#fff', border: '1px solid rgba(20,28,54,0.10)',
            boxShadow: '0 16px 44px rgba(20,28,54,0.10)', padding: 'clamp(30px, 3.4vw, 44px)',
          }}>
            <h2 style={{ ...doorHeading, color: NAVY }}>Donate to the campaign</h2>
            <p style={{ ...doorBody, color: 'rgba(20,28,54,0.72)' }}>
              Gifts are handled by the Sailing Foundation of New York, a 501(c)(3), so your donation is tax deductible.
            </p>
            <div style={{ margin: '24px 0' }}>
              <CtaButton href={DONATE_URL} label="DONATE AT SFNY.ORG →" bg={ACCENT} bgHover={ACCENT_HOVER} external />
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '0.3px', color: NAVY, marginBottom: 12 }}>
              Once you are on the donation page:
            </div>
            <StepList />
            <p style={{ margin: '20px 0 0', fontSize: 13, fontStyle: 'italic', lineHeight: 1.6, color: 'rgba(20,28,54,0.55)' }}>
              The credit card processing fee is optional. You can set it to $0; it is a voluntary contribution to the platform on top of your gift.
            </p>
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: NAVY, marginBottom: 4 }}>Prefer to mail a check?</div>
              <div style={{ fontSize: 14, lineHeight: 1.6, color: 'rgba(20,28,54,0.7)' }}>
                Sailing Foundation of New York<br />
                PO Box 124<br />
                Rye, NY 10580
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 'clamp(56px, 6vw, 80px)' }}>
        <Footer variant="light" onNavigate={onNavigate} />
      </div>
    </div>
  )
}
