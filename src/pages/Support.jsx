import { useState, useEffect } from 'react'
import usePageEntrance from '../hooks/usePageEntrance'
import Footer from '../components/Footer'

const PAGE_BG = '#fff'
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
  borderRadius: 0,
  boxSizing: 'border-box',
  fontFamily: 'inherit',
  outline: 'none',
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
  const entrance = usePageEntrance(3, { staggerMs: 100, initialDelayMs: 50 })

  // Add top padding when the compact hamburger menu replaces the static nav
  const [compactNav, setCompactNav] = useState(window.innerWidth <= 900)
  useEffect(() => {
    const h = () => setCompactNav(window.innerWidth <= 900)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  const [amount, setAmount] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
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

  const handleSubmit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Support Contribution - ${firstName} ${lastName}`)
    const body = encodeURIComponent(
      [
        `Amount: ${amount}`,
        `Name: ${firstName} ${lastName}`,
        `Address: ${street}${addressLine2 ? ', ' + addressLine2 : ''}, ${city}, ${stateProv} ${zip}`,
        `Email: ${email}`,
        honorName ? `In honor/memory of: ${honorName}` : '',
        message ? `Message: ${message}` : '',
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
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="$"
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
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>First</span>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Last</span>
              </div>
            </div>

            {/* 2c. Address */}
            <div style={SECTION_HEADING}>Address</div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                style={INPUT_STYLE}
              />
              <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Street Address</span>
            </div>
            <div style={{ marginBottom: 12 }}>
              <input
                type="text"
                value={addressLine2}
                onChange={(e) => setAddressLine2(e.target.value)}
                style={INPUT_STYLE}
              />
              <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Address Line 2</span>
            </div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>City</span>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="text"
                  value={stateProv}
                  onChange={(e) => setStateProv(e.target.value)}
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>State / Province</span>
              </div>
            </div>
            <div style={{ maxWidth: 300 }}>
              <input
                type="text"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                style={INPUT_STYLE}
              />
              <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Postal / Zip Code</span>
            </div>

            {/* 2d. Email */}
            <div style={SECTION_HEADING}>Email</div>
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Enter Email</span>
              </div>
              <div style={{ flex: '1 1 200px' }}>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  style={INPUT_STYLE}
                />
                <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Confirm Email</span>
              </div>
            </div>

            {/* 2e. Optional - In Honor */}
            <div style={SECTION_HEADING}>Optional - In Honor</div>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 16, marginTop: 0 }}>
              If you would like to honor an individual through your gift,
              please provide the recipient's name.
            </p>
            <div style={{ maxWidth: 300, marginBottom: 16 }}>
              <input
                type="text"
                value={honorName}
                onChange={(e) => setHonorName(e.target.value)}
                style={INPUT_STYLE}
              />
              <span style={{ ...LABEL_STYLE, marginTop: 4 }}>Recipient Name</span>
            </div>

            <div style={{ ...SECTION_HEADING, fontSize: 13, marginTop: 24 }}>Message to Recipient</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              style={{ ...INPUT_STYLE, minHeight: 100, resize: 'vertical' }}
            />

            {/* 2f. Submit */}
            <div>
              <button
                type="submit"
                onMouseEnter={() => setSubmitHover(true)}
                onMouseLeave={() => setSubmitHover(false)}
                style={{
                  background: submitHover ? 'rgb(160,30,30)' : SUBMIT_RED,
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
