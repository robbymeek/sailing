import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'

const PAGE_BG = 'rgb(240,240,240)'
const HEADING_COLOR = 'rgb(20,60,160)'
const ACCENT = 'rgb(10,85,235)'
const BODY_COLOR = 'rgba(0,0,0,0.75)'
const MUTED = 'rgba(0,0,0,0.5)'
const SUBMIT_RED = 'rgb(180,40,40)'

const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  fontSize: 15,
  border: '1px solid #ccc',
  borderRadius: 4,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
  background: '#fff',
  transition: 'border-color 0.2s ease',
}

const LABEL_STYLE = {
  fontSize: 13,
  fontWeight: 600,
  color: 'rgba(0,0,0,0.6)',
  marginBottom: 4,
  display: 'block',
}

const SECTION_HEADING = {
  fontSize: 14,
  fontWeight: 700,
  color: 'rgba(0,0,0,0.8)',
  textTransform: 'uppercase',
  marginBottom: 12,
  marginTop: 32,
}

function formatAmount(raw) {
  if (!raw) return '$0.00'
  const stripped = raw.replace(/[^0-9.]/g, '')
  if (!stripped) return '$0.00'
  const num = parseFloat(stripped)
  if (isNaN(num)) return '$0.00'
  return '$' + num.toFixed(2)
}

export default function Support({ onNavigate }) {
  const location = useLocation()
  const entrance = usePageEntrance(3, { staggerMs: 100, initialDelayMs: 50 })

  // Add top padding when the compact hamburger menu replaces the static nav
  const [compactNav, setCompactNav] = useState(window.innerWidth <= 900)
  useEffect(() => {
    const h = () => setCompactNav(window.innerWidth <= 900)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // Pre-fill name from router state (e.g. from Path page "Your Name" slots)
  const prefill = location.state?.prefillName || ''
  const [amount, setAmount] = useState('')
  const [firstName, setFirstName] = useState(prefill.split(' ')[0] || '')
  const [lastName, setLastName] = useState(prefill.split(' ').slice(1).join(' ') || '')
  const [street, setStreet] = useState('')
  const [addressLine2, setAddressLine2] = useState('')
  const [city, setCity] = useState('')
  const [stateProv, setStateProv] = useState('')
  const [zip, setZip] = useState('')
  const [email, setEmail] = useState('')
  const [confirmEmail, setConfirmEmail] = useState('')
  const [honorName, setHonorName] = useState('')
  const [inHonor, setInHonor] = useState('')
  const [giftMessage, setGiftMessage] = useState('')
  const [message, setMessage] = useState('')
  const [submitHover, setSubmitHover] = useState(false)
  const [wantUpdates, setWantUpdates] = useState(false)
  const [wantTeam, setWantTeam] = useState(false)
  const [formError, setFormError] = useState('')

  const isFormValid = amount.trim() && firstName.trim() && lastName.trim() && email.trim() && confirmEmail.trim()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!amount.trim() || !firstName.trim() || !lastName.trim() || !email.trim() || !confirmEmail.trim()) {
      setFormError('Please fill in all required fields.')
      return
    }
    if (email !== confirmEmail) {
      setFormError('Email addresses do not match.')
      return
    }
    setFormError('')
    const subject = encodeURIComponent(`Support Contribution - ${firstName} ${lastName}`)
    const body = encodeURIComponent(
      [
        `Amount: ${amount}`,
        `Name: ${firstName} ${lastName}`,
        `Address: ${street}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${stateProv} ${zip}`,
        `Email: ${email}`,
        giftMessage ? `Message with gift: ${giftMessage}` : '',
        honorName ? `In honor of: ${honorName}` : '',
        message ? `Message to recipient: ${message}` : '',
        wantUpdates ? 'Would like to receive email updates about the campaign.' : '',
        wantTeam ? 'Would like to be listed on the Team section of the site.' : '',
      ].filter(Boolean).join('\n')
    )
    window.location.href = `mailto:robbymeek+LA2028@gmail.com?subject=${subject}&body=${body}`
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <div style={{
        maxWidth: 780,
        margin: '0 auto',
        padding: `${compactNav ? 64 : 24}px clamp(24px, 5vw, 60px) 60px`,
      }}>
        {/* Section 0 — Intro */}
        <div style={entrance.style(0)}>
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
            Your support makes this Olympic campaign possible. By contributing, you
            directly fund training, travel, equipment, coaching, and competition entry
            fees. Every contribution continues to allow me and the US to compete at the
            highest level.
          </p>
        </div>

        {/* Section 2 — The Form */}
        <div style={entrance.style(1)}>
          <form onSubmit={handleSubmit}>
            {/* 2a. Amount */}
            <div style={SECTION_HEADING}>Amount of My/Our Gift</div>
            <div style={{ maxWidth: 300 }}>
              <input
                className="support-input"
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                style={INPUT_STYLE}
              />
            </div>
            <div style={{ fontSize: 13, color: MUTED, fontStyle: 'italic', marginTop: 8 }}>
              I/we would like to make a difference in this Olympic campaign.
            </div>
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={LABEL_STYLE}>Total Gift</span>
              <span style={{ color: 'rgb(40,160,80)', fontSize: 16, fontWeight: 600 }}>
                {formatAmount(amount)}
              </span>
            </div>

            <div style={{ marginTop: 16 }}>
              <textarea
                className="support-input"
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="Add a message with your gift..."
                style={{ ...INPUT_STYLE, minHeight: 80, resize: 'vertical' }}
              />
              <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Message (optional)</span>
            </div>

            {/* 2b. Name */}
            <div style={SECTION_HEADING}>Name</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  className="support-input"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Required"
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>First</span>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  className="support-input"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Required"
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Last</span>
              </div>
            </div>

            {/* 2c. Address */}
            <div style={SECTION_HEADING}>Address <span style={{ fontWeight: 400, color: 'rgba(0,0,0,0.35)', textTransform: 'none' }}>(optional)</span></div>
            <div style={{
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '16px 16px 12px',
            }}>
              <input
                className="support-input"
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                placeholder="Street Address"
                style={{ ...INPUT_STYLE, border: 'none', borderBottom: '1px solid #e0e0e0', borderRadius: 0, background: 'transparent', padding: '8px 0' }}
              />
              <input
                className="support-input"
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                placeholder="Address Line 2"
                style={{ ...INPUT_STYLE, border: 'none', borderBottom: '1px solid #e0e0e0', borderRadius: 0, background: 'transparent', padding: '8px 0' }}
              />
              <div style={{ display: 'flex', gap: 16 }}>
                <input
                  className="support-input"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  style={{ ...INPUT_STYLE, flex: 1, border: 'none', borderBottom: '1px solid #e0e0e0', borderRadius: 0, background: 'transparent', padding: '8px 0' }}
                />
                <input
                  className="support-input"
                  type="text"
                  value={stateProv}
                  onChange={(e) => setStateProv(e.target.value)}
                  placeholder="State / Province"
                  style={{ ...INPUT_STYLE, flex: 1, border: 'none', borderBottom: '1px solid #e0e0e0', borderRadius: 0, background: 'transparent', padding: '8px 0' }}
                />
              </div>
              <input
                className="support-input"
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="Postal / Zip Code"
                style={{ ...INPUT_STYLE, border: 'none', borderRadius: 0, background: 'transparent', padding: '8px 0', maxWidth: 200 }}
              />
            </div>

            {/* 2d. Email */}
            <div style={SECTION_HEADING}>Email</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  className="support-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Required"
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Enter Email</span>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  className="support-input"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder="Required"
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Confirm Email</span>
              </div>
            </div>

            {/* 2e. Optional - In Honor */}
            <div style={SECTION_HEADING}>In Honor <span style={{ fontWeight: 400, color: 'rgba(0,0,0,0.35)', textTransform: 'none' }}>(optional)</span></div>
            <div style={{
              background: '#fff',
              border: '1px solid #ccc',
              borderRadius: 4,
              padding: '16px 16px 12px',
            }}>
              <p style={{ fontSize: 13, color: MUTED, margin: '0 0 12px' }}>
                If you would like to honor an individual through your gift,
                please provide the recipient's name.
              </p>
              <input
                className="support-input"
                type="text"
                value={honorName}
                onChange={(e) => setHonorName(e.target.value)}
                placeholder="Recipient Name"
                style={{ ...INPUT_STYLE, border: 'none', borderBottom: '1px solid #e0e0e0', borderRadius: 0, background: 'transparent', padding: '8px 0' }}
              />
              <textarea
                className="support-input"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message to Recipient"
                style={{ ...INPUT_STYLE, border: 'none', borderRadius: 0, background: 'transparent', padding: '8px 0', minHeight: 70, resize: 'vertical', marginTop: 4 }}
              />
            </div>

            {/* 2f. Preferences */}
            <div style={{ marginTop: 32, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={wantUpdates}
                  onChange={(e) => setWantUpdates(e.target.checked)}
                  style={{ marginTop: 3, accentColor: ACCENT }}
                />
                <span style={{ fontSize: 14, color: BODY_COLOR, lineHeight: 1.5 }}>
                  I would like to receive email updates about the campaign
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={wantTeam}
                  onChange={(e) => setWantTeam(e.target.checked)}
                  style={{ marginTop: 3, accentColor: ACCENT }}
                />
                <span style={{ fontSize: 14, color: BODY_COLOR, lineHeight: 1.5 }}>
                  I would like to be considered for the Team section of the site
                </span>
              </label>
            </div>

            {/* 2g. Submit */}
            {formError && (
              <p style={{ color: SUBMIT_RED, fontSize: 13, marginTop: 16, marginBottom: 0 }}>
                {formError}
              </p>
            )}
            <div>
              <button
                type="submit"
                disabled={!isFormValid}
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => setSubmitHover(false)}
                style={{
                  background: !isFormValid ? 'rgba(0,0,0,0.2)' : submitHover ? 'rgb(160,30,30)' : SUBMIT_RED,
                  color: '#fff',
                  border: 'none',
                  padding: '14px 40px',
                  fontSize: 15,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                  cursor: 'pointer',
                  marginTop: 36,
                  transition: 'background 0.2s ease',
                }}
              >
                Submit
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Section 3 — Footer */}
      <div style={entrance.style(2)}>
        <Footer variant="light" onNavigate={onNavigate} />
      </div>
    </div>
  )
}
