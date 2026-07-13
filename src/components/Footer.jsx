import { MENU_PAGES } from './DesktopBanner'
import rmBlack from '../assets/footer/rm-black.png'
import rmWhite from '../assets/footer/rm-white.png'

// Footer — the site-wide closing block: the RM waterline monogram beside a
// three-column index (Explore / Follow / Contact), then a hairline legal
// line. Two skins: light (white sheet, black mark) for the editorial pages,
// dark (pure black, white mark) for the pages that end on black. Pure
// function of props — The Road renders it on both of its paths, so no
// hooks, listeners, or context here.

// The footer index = the desktop menu's pages + Support (the sticky banner's
// Donate CTA owns Support there; an index lists it). Deriving from
// MENU_PAGES keeps this in lockstep with the menus — the old hand-rolled
// list had drifted and lost The Road.
const PAGES = [...MENU_PAGES, 'Support']

const INSTAGRAM_URL = 'https://www.instagram.com/robbysailing/'

// Same content lane as the editorial pages, so the columns align with the
// page copy above the footer.
const WRAP = { maxWidth: 1200, margin: '0 auto', padding: '0 clamp(24px, 5vw, 64px)' }

const THEME = {
  light: {
    bg: '#fff',
    hairline: 'rgba(20,28,54,0.14)',
    kicker: '#646262',
    link: 'rgba(20,28,54,0.78)',
    legal: '#646262',
    mark: rmBlack,
  },
  dark: {
    // Pure black, not the old rgb(10,12,18): Biography and The Road end on
    // rgb(0,0,0), where a near-black step reads as a rendering artifact —
    // the top hairline is the one intentional seam (mirroring the light
    // variant's white-on-white logic).
    bg: 'rgb(0,0,0)',
    hairline: 'rgba(255,255,255,0.16)',
    kicker: 'rgba(255,255,255,0.6)',
    link: 'rgba(255,255,255,0.82)',
    legal: 'rgba(255,255,255,0.6)',
    mark: rmWhite,
  },
}

function Col({ title, color, children }) {
  return (
    <div>
      <h2 style={{
        fontSize: 11, fontWeight: 700, letterSpacing: '2.2px',
        textTransform: 'uppercase', color, margin: '0 0 14px',
      }}>
        {title}
      </h2>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>{children}</ul>
    </div>
  )
}

export default function Footer({ variant, onNavigate }) {
  const dark = variant !== 'light'
  const t = dark ? THEME.dark : THEME.light
  const ftClass = `ft-link ${dark ? 'ft-link-dark' : 'ft-link-light'}`
  const linkStyle = {
    display: 'inline-flex', padding: '6px 0', background: 'none', border: 'none',
    cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
    lineHeight: 1.4, letterSpacing: '0.2px', color: t.link,
    textDecoration: 'none', textAlign: 'left',
  }

  return (
    <footer style={{ background: t.bg, borderTop: `1px solid ${t.hairline}` }}>
      <div style={WRAP}>
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start',
          gap: 'clamp(36px, 6vw, 96px)',
          padding: 'clamp(48px, 8vh, 76px) 0 clamp(40px, 6vh, 64px)',
        }}>
          <img
            src={t.mark}
            alt="RM — Robby Meek"
            width={1079}
            height={530}
            style={{
              width: 'clamp(150px, 15vw, 200px)', height: 'auto',
              display: 'block', flex: '0 0 auto',
            }}
          />
          <nav
            aria-label="Footer"
            style={{
              flex: '1 1 440px', minWidth: 0,
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '32px clamp(24px, 4vw, 56px)',
            }}
          >
            <Col title="Explore" color={t.kicker}>
              {PAGES.map((page) => (
                <li key={page}>
                  <button
                    type="button"
                    className={ftClass}
                    style={linkStyle}
                    onClick={() => onNavigate(page)}
                  >
                    {page}
                  </button>
                </li>
              ))}
            </Col>
            <Col title="Follow" color={t.kicker}>
              <li>
                <a
                  className={ftClass}
                  style={linkStyle}
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Instagram
                </a>
              </li>
            </Col>
            <Col title="Contact" color={t.kicker}>
              {/* No target="_blank" on mailtos — it strands a blank tab when
                  the OS mail handler intercepts the navigation. */}
              <li>
                <a className={ftClass} style={linkStyle} href="mailto:info@robbysailing.com">
                  info@robbysailing.com
                </a>
              </li>
              <li>
                <a className={ftClass} style={linkStyle} href="mailto:robby@robbysailing.com">
                  robby@robbysailing.com
                </a>
              </li>
            </Col>
          </nav>
        </div>
        <div style={{ borderTop: `1px solid ${t.hairline}`, padding: '18px 0 clamp(32px, 5vh, 44px)' }}>
          <p style={{ fontSize: 12, letterSpacing: '0.3px', color: t.legal, margin: 0 }}>
            © {new Date().getFullYear()} Robby Meek’s Official Site
          </p>
        </div>
      </div>
    </footer>
  )
}
