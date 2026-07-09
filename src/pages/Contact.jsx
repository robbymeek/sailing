import wordmark from '../assets/contact/robby-meek-wordmark.png'

// Contact — modeled on pfcap.com: white page, large wordmark + a small,
// tightly-stacked contact block, both centred as one unit (visual weight sits
// in the middle of the screen). pfcap's measured spec (matched here, but in the
// site's own font): logo ~50vw, text 1vw #646262, email links #032784, white bg.
// Single screen, no internal scroll — but we deliberately DON'T set
// overscroll-behavior, so the page keeps its native elastic "budge" on
// scroll/drag. The bounce shows white because App syncs <html>'s bg per route.
const LINK = '#032784'   // pfcap deep-navy link
const MUTED = '#646262'  // pfcap grey text
const TEXT_SIZE = 'clamp(12px, 1vw, 16px)'
const LOGO_W = 'clamp(260px, 50vw, 820px)'

function MailLink({ address }) {
  return (
    <a
      href={`mailto:${address}`}
      style={{ color: LINK, textDecoration: 'underline', textUnderlineOffset: '3px' }}
    >
      {address}
    </a>
  )
}

export default function Contact() {
  return (
    <div style={{
      height: '100dvh',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      padding: '0 24px',
      boxSizing: 'border-box',
      textAlign: 'center',
    }}>
      {/* Logo + contact block are centred together as one unit. */}
      <h1 style={{ margin: 0, width: '100%' }}>
        <img
          src={wordmark}
          alt="Robby Meek"
          style={{ display: 'block', width: LOGO_W, maxWidth: '100%', height: 'auto', margin: '0 auto' }}
        />
      </h1>

      <div style={{ marginTop: 'clamp(24px, 4vw, 60px)', lineHeight: 1.6, fontSize: TEXT_SIZE }}>
        <p style={{ color: MUTED, letterSpacing: '0.2px', margin: 0 }}>
          Annapolis, Maryland
        </p>
        <p style={{ margin: 0 }}><MailLink address="info@robbysailing.com" /></p>
        <p style={{ margin: 0 }}><MailLink address="robby@robbysailing.com" /></p>
      </div>
    </div>
  )
}
