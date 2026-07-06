import { Component } from 'react'

// Matches the various runtime messages browsers/bundlers use when a dynamic
// import() can't fetch its chunk — the classic "stale hash after redeploy"
// case: an already-open tab holds the old index.html and navigates to a lazy
// route (e.g. /the-road) whose chunk hash no longer exists on the server.
const CHUNK_ERROR_RE =
  /Loading chunk|Loading CSS chunk|dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch/i

const isChunkError = (error) =>
  error?.name === 'ChunkLoadError' || CHUNK_ERROR_RE.test(error?.message || '')

/**
 * Top-level error boundary. Without one, any render/commit throw anywhere in
 * the tree unmounts the whole app and leaves an empty #root (blank screen).
 *
 * Props:
 *   silent — render nothing (null) on error instead of the fallback UI. Used to
 *     isolate the off-screen preload copy so its failure can never blank the
 *     visible page.
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // One-shot reload on a stale-chunk error re-fetches the fresh index.html +
    // current hashes and recovers automatically. Guard against reload loops.
    if (!this.props.silent && isChunkError(error)) {
      try {
        if (!sessionStorage.getItem('rm-chunk-reloaded')) {
          sessionStorage.setItem('rm-chunk-reloaded', '1')
          window.location.reload()
          return
        }
      } catch {
        /* sessionStorage may be unavailable (private mode) — fall through */
      }
    }
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info?.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.silent) return null
    return (
      <div
        role="alert"
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1.25rem',
          padding: '2rem',
          textAlign: 'center',
          background: 'rgb(19,23,31)',
          color: '#fff',
          fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        }}
      >
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Something went wrong</h1>
        <p style={{ margin: 0, maxWidth: '34ch', lineHeight: 1.5, opacity: 0.7 }}>
          The page hit an unexpected error. Reloading usually fixes it.
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '0.7rem 1.6rem',
            background: 'rgb(10,85,235)',
            color: '#fff',
            border: 'none',
            borderRadius: '999px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
      </div>
    )
  }
}
