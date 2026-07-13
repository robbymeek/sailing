import { Link } from 'react-router-dom'

// The designed unknown-route page. GitHub Pages serves 404.html (HTTP 404) for
// any address without a physical file; the SPA's wildcard route renders THIS, so
// the visitor lands on a real page with recovery links instead of being stranded
// on the Loading splash or a blank shell. The document title/description come
// from App's route-meta effect (unmapped path → Not Found metadata), and the
// static 404.html is baked with the same values, so there's no title jump.
//
// Navigation uses React Router <Link> (real in-app nav, no full reload). The
// dark background matches the site's fallback colour (rgb(19,23,31) — the exact
// first-paint colour 404.html uses), so there's no colour flash on hand-off.

const INK = 'rgb(19,23,31)'

const RECOVERY = [
  { to: '/biography', label: 'Biography' },
  { to: '/team', label: 'The Team' },
  { to: '/the-road', label: 'The Road' },
]

export default function NotFound() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        background: INK,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 'clamp(24px, 6vw, 80px)',
        color: '#fff',
      }}
    >
      <p style={{
        color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: 600,
        letterSpacing: '3px', textTransform: 'uppercase', margin: 0,
      }}>
        Error 404
      </p>

      <h1 style={{
        color: '#fff', fontSize: 'clamp(30px, 5vw, 52px)', fontWeight: 800,
        letterSpacing: '-1px', lineHeight: 1.1, margin: '14px 0 0',
      }}>
        Page not found
      </h1>

      <p style={{
        color: 'rgba(255,255,255,0.65)', fontSize: 'clamp(14px, 1.4vw, 16px)',
        lineHeight: 1.7, margin: '16px 0 0', maxWidth: 440,
      }}>
        The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
        Let&rsquo;s get you back on the road to LA 2028.
      </p>

      <Link
        to="/"
        className="nf-home"
        style={{
          marginTop: 'clamp(28px, 4vh, 40px)',
          display: 'inline-block', padding: '13px 30px',
          border: '2px solid #fff', color: '#fff', textDecoration: 'none',
          fontSize: 13, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
        }}
      >
        Back to Home
      </Link>

      <nav
        aria-label="Other pages"
        style={{
          marginTop: 'clamp(22px, 3vh, 30px)',
          display: 'flex', flexWrap: 'wrap', gap: '10px 22px', justifyContent: 'center',
        }}
      >
        {RECOVERY.map((r) => (
          <Link
            key={r.to}
            to={r.to}
            className="nf-link"
            style={{
              color: 'rgba(255,255,255,0.6)', textDecoration: 'none',
              fontSize: 13, letterSpacing: '0.5px',
            }}
          >
            {r.label}
          </Link>
        ))}
      </nav>
    </main>
  )
}
