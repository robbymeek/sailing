// ============================================================================
//  HomeNowCard — the home page's white card: where Robby is right now.
// ============================================================================
//  Replaced the Helm Station instrument console (Sep 2026, owner: "just my
//  last workout, and where I am training now"). Three tiles, one card:
//
//    · Currently here (the big tile) — NowChart: a monochrome nautical chart of
//      the venue, the title, what he's working on. WHERE comes from The Road
//      by date (../utils/whereNow.js) plus the owner's dated overrides
//      (../data/station.js).
//    · Conditions — live wind + a 12 h forecast at that spot from MET Norway,
//      fetched in the browser (../utils/metWeather.js), knots + °F.
//    · Last workout — sport icon, plain name, duration. Nothing else (no
//      date, no map, no heart rate). Published by the Strava pipeline to
//      /data/last-workout.json (../utils/lastWorkout.js, STRAVA.md). The tile
//      steps aside (Conditions takes its slot) until there's a recent one.
//
//  Layout is driven by CONTAINER QUERIES on the card's own box (homeNowCard.css)
//  — wide, stacked (tablet/phone) or one short row — never by device sniffing.
//  Network data is validated inside the hooks; every tile also sits in its own
//  error boundary, so a bad payload can only ever blank that one tile.
import { Component, useEffect, useRef, useState } from 'react'
import NowChart from './NowChart'
import SportIcon from './SportIcon'
import { useWhereNow } from '../utils/whereNow'
import { useConditions, localClock, WEATHER_ATTRIBUTION } from '../utils/metWeather'
import { useLastWorkout } from '../utils/lastWorkout'
import './homeNowCard.css'

const BASE = import.meta.env.BASE_URL

// { near: within half a viewport (start fetching), on: 30% visible once
// (the one-shot power-on), visible: on screen now (runs the fix's ping) }
function useInView(ref) {
  const [st, setSt] = useState({ near: false, on: false, visible: false })
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setSt({ near: true, on: true, visible: true })
      return undefined
    }
    const near = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSt((s) => (s.near ? s : { ...s, near: true })); near.disconnect() }
    }, { rootMargin: '50% 0px 50% 0px' })
    const vis = new IntersectionObserver(([e]) => {
      const visible = e.isIntersecting
      const on = e.intersectionRatio >= 0.3
      setSt((s) => ({ near: s.near || visible, on: s.on || on, visible }))
    }, { threshold: [0, 0.3] })
    near.observe(el)
    vis.observe(el)
    return () => { near.disconnect(); vis.disconnect() }
  }, [ref])
  return st
}

// A render error in one tile blanks that tile only — never the home page (the
// app-level boundary would replace the whole site, and reloads on "Failed to
// fetch"-shaped messages).
class TileBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error) {
    // eslint-disable-next-line no-console
    if (import.meta.env.DEV) console.error('[HomeNowCard tile]', error)
  }
  render() {
    if (this.state.failed) return <div className={this.props.className} aria-hidden="true" />
    return this.props.children
  }
}

export default function HomeNowCard({ flow = false }) {
  const rootRef = useRef(null)
  const view = useInView(rootRef)
  const here = useWhereNow()
  const wx = useConditions(here?.place ?? null, { enabled: view.near })
  const work = useLastWorkout({ enabled: view.near })
  // The workout tile only takes space once a recent workout exists — decided
  // on the prefetch (half a viewport early), so the card doesn't reflow in view.
  const hasWorkout = work.status === 'ready' && !!work.workout

  const cls = ['nc-root']
  if (!hasWorkout) cls.push('nc-root--solo')
  if (flow) cls.push('nc-root--flow')
  if (view.on) cls.push('is-on')
  if (view.visible) cls.push('is-visible')

  return (
    <div ref={rootRef} className={cls.join(' ')}>
      <h2 className="nc-sr">Where Robby is now</h2>
      <div className="nc-grid">
        <TileBoundary className="nc-tile nc-tile--chart">
          <section className="nc-tile nc-tile--chart" aria-label="Currently here">
            <NowChart here={here} visible={view.visible} />
          </section>
        </TileBoundary>
        <TileBoundary className="nc-tile nc-tile--cond">
          <ConditionsTile here={here} wx={wx} visible={view.visible} />
        </TileBoundary>
        {hasWorkout && (
          <TileBoundary className="nc-tile nc-tile--work">
            <WorkoutTile workout={work.workout} />
          </TileBoundary>
        )}
        <p className="nc-credits">
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">Chart © OpenStreetMap</a>
          <a href={WEATHER_ATTRIBUTION.href} target="_blank" rel="noopener noreferrer">Weather: {WEATHER_ATTRIBUTION.label}</a>
          {hasWorkout && <img className="nc-strava" src={`${BASE}brand/powered-by-strava.svg`} alt="Powered by Strava" />}
        </p>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Conditions: wind now (big, blue = live), where it's from, air temp, and the
// next 12 h in four 3-hour steps. Arrows point DOWNWIND (the way the wind
// blows), the sailing-app convention.
// ---------------------------------------------------------------------------
function ConditionsTile({ here, wx, visible }) {
  const place = here?.place
  const clock = useClock(place?.tz, visible)
  const { status, data } = wx
  const now = data?.now
  const ready = (status === 'ready' || status === 'stale') && now && Number.isFinite(now.kn)
  const elsewhere = here && here.mode !== 'stop' && here.mode !== 'override'
  return (
    <section className={`nc-tile nc-tile--cond${status === 'stale' ? ' is-stale' : ''}`} aria-labelledby="nc-cond-h">
      <div className="nc-head">
        <h3 id="nc-cond-h" className="nc-label">{elsewhere && place ? `Conditions in ${place.cityDisplay || place.city}` : 'Conditions'}</h3>
        {clock && <span className="nc-meta">{clock.time} {clock.abbr}</span>}
      </div>
      {ready ? (
        <>
          <div className="nc-cond-body">
            <div className="nc-now">
              <Dial dir={now.dir} />
              <p className="nc-wind">
                <span className="nc-big">{now.kn}</span>
                <abbr className="nc-unit" title="knots">kn</abbr>
              </p>
              <p className="nc-sub">
                {Number.isFinite(now.dir) && <span className="nc-dir"><span className="nc-from">from </span>{now.compass} <span className="nc-deg">{String(now.dir).padStart(3, '0')}°</span></span>}
                {Number.isFinite(now.tempF) && <span className="nc-temp">{now.tempF}°F</span>}
              </p>
            </div>
            {data.fc?.length > 0 && (
              <ol className="nc-fc" aria-label="Forecast, next 12 hours">
                {data.fc.map((f) => (
                  <li key={f.label}>
                    <span className="nc-fc-t">{f.label}</span>
                    {Number.isFinite(f.dir) && (
                      <svg className="nc-fc-arrow" viewBox="-6 -6 12 12" aria-hidden="true" style={{ transform: `rotate(${f.dir + 180}deg)` }}>
                        <path d="M0 4.5V-4.5M-2.6 -1.8L0 -4.5 2.6 -1.8" />
                      </svg>
                    )}
                    <span className="nc-fc-s">
                    {Number.isFinite(f.kn) ? f.kn : '--'}
                    <span className="nc-sr"> knots{f.compass ? ` from ${f.compass}` : ''}</span>
                  </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {status === 'stale' && (data.fetchedAt || data.updatedAt) && (
            <p className="nc-stale">Last updated {staleLabel(data.fetchedAt || data.updatedAt, place?.tz)}</p>
          )}
        </>
      ) : status === 'error' ? (
        <p className="nc-empty">Live wind isn&rsquo;t available right now.</p>
      ) : (
        <div className="nc-now nc-now--loading" aria-hidden="true">
          <Dial />
          <p className="nc-wind"><span className="nc-big">--</span><span className="nc-unit">kn</span></p>
        </div>
      )}
      <a className="nc-attr" href={WEATHER_ATTRIBUTION.href} target="_blank" rel="noopener noreferrer">
        Weather: {WEATHER_ATTRIBUTION.label}
      </a>
    </section>
  )
}

function staleLabel(ms, tz) {
  const c = localClock(tz, new Date(ms))
  return c ? `${c.time} ${c.abbr}` : ''
}

// Venue-local clock, ticking only while the card is on screen.
function useClock(tz, visible) {
  const [c, setC] = useState(() => (tz ? localClock(tz) : null))
  useEffect(() => {
    if (!tz) { setC(null); return undefined }
    setC(localClock(tz))
    if (!visible) return undefined
    const id = setInterval(() => setC(localClock(tz)), 30000)
    return () => clearInterval(id)
  }, [tz, visible])
  return c
}

// Hairline wind dial: a ring with a north tick; the blue needle points the
// way the wind is blowing (from-bearing + 180°) and swings in once on reveal.
function Dial({ dir }) {
  const has = Number.isFinite(dir)
  // Unwrap against the last angle drawn so an update takes the SHORT way
  // round (355° → 5° turns 10°, not 350° backwards). StrictMode's second
  // render sees a zero delta, so it's idempotent.
  const last = useRef(null)
  let to = has ? dir + 180 : 0
  if (has && last.current != null) to = last.current + ((((to - last.current) % 360) + 540) % 360) - 180
  if (has) last.current = to
  return (
    <svg className="nc-dial" viewBox="-20 -20 40 40" aria-hidden="true">
      <circle className="nc-dial-ring" r="17" />
      <line className="nc-dial-n" x1="0" y1="-17" x2="0" y2="-13.5" />
      {has && (
        <g className="nc-dial-needle" style={{ '--wind-to': `${to}deg` }}>
          <path d="M0 12V-12M-4 -7.5L0 -12 4 -7.5" />
        </g>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Last workout: icon, name, duration — exactly that (owner's spec).
// ---------------------------------------------------------------------------
function WorkoutTile({ workout }) {
  return (
    <section className="nc-tile nc-tile--work" aria-labelledby="nc-work-h">
      <div className="nc-head">
        <h3 id="nc-work-h" className="nc-label">Last workout</h3>
      </div>
      <div className="nc-work">
        <span className="nc-medal"><SportIcon icon={workout.icon} /></span>
        <p className="nc-work-text">
          <span className="nc-work-sport">{workout.label}</span>
          <span className="nc-work-dur">{workout.durationLabel}</span>
        </p>
      </div>
      <img className="nc-strava nc-strava--tile" src={`${BASE}brand/powered-by-strava.svg`} alt="Powered by Strava" />
    </section>
  )
}
