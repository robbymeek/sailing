import { useState, useEffect } from 'react'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'

const BASE = import.meta.env.BASE_URL

const TIMELINE_DATA = [
  { year: '2017', main: 'Started racing', past: true },
  { year: '2018', main: 'First Youth Champs', past: true },
  { year: '2019', main: '5th at HS Nationals', sub: ['Freshman year'], past: true },
  { year: '2020', main: 'Covid', past: true },
  { year: '2021', main: 'HS National Champion', sub: ['Orange Bowl Champion', '9th at Youth Worlds', 'North American Champion'], past: true },
  { year: '2022', main: 'HS National Champion', sub: ['5th at Youth Worlds'], past: true },
  { year: '2023', main: 'Harvard Sailing', sub: ['North American Champion'], past: true },
  { year: '2024', main: 'CrossnoKaye', sub: ['Train and work'], past: true },
  { year: '2025', main: 'North American Champion', sub: ['Top American at Europeans'], past: true },
  { year: '2026', main: 'Olympic training', current: true },
  { year: '2027', main: 'World Champs contender' },
  { year: '2028', main: 'LA Olympics' },
]

const COSTS = [
  { label: 'Training', pct: 50 },
  { label: 'Equipment', pct: 20 },
  { label: 'Travel', pct: 15 },
  { label: 'Coaching', pct: 10 },
  { label: 'Entry Fees', pct: 5 },
]

const BIO_STATS = [
  ['6x', 'National Champ'],
  ['3x', 'Continental Champ'],
  ['9+', 'Years in ILCA'],
]

const LABEL = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '2px',
  textTransform: 'uppercase',
}

function yearStatus(item) {
  if (item.current) {
    return {
      dot: {
        width: 14, height: 14,
        background: 'rgb(220,40,40)',
        boxShadow: '0 0 20px rgba(220,40,40,0.5), 0 0 60px rgba(220,40,40,0.15)',
      },
      yearColor: '#fff',
      yearShadow: '0 0 30px rgba(220,40,40,0.35)',
      milestoneColor: 'rgba(255,255,255,0.9)',
      subColor: 'rgba(255,255,255,0.7)',
    }
  }
  if (item.past) {
    return {
      dot: { width: 6, height: 6, background: 'rgba(255,255,255,0.5)' },
      yearColor: 'rgba(255,255,255,0.55)',
      yearShadow: 'none',
      milestoneColor: 'rgba(255,255,255,0.65)',
      subColor: 'rgba(255,255,255,0.45)',
    }
  }
  return {
    dot: {
      width: 6, height: 6,
      background: 'transparent',
      border: '1px solid rgba(255,255,255,0.25)',
      boxSizing: 'border-box',
    },
    yearColor: 'rgba(255,255,255,0.35)',
    yearShadow: 'none',
    milestoneColor: 'rgba(255,255,255,0.4)',
    subColor: 'rgba(255,255,255,0.3)',
  }
}

// ---------- Content blocks ----------

function BodyBlock({ style }) {
  return (
    <div style={style}>
      <p style={{
        fontSize: 'clamp(16px, 1.4vw, 19px)',
        fontWeight: 400,
        lineHeight: 1.7,
        color: 'rgba(255,255,255,0.75)',
        margin: '0 0 1.1em',
      }}>
        There is no shortcut. The only way to improve is to race the top sailors under the same conditions, on the same water, at the same time.
      </p>
      <p style={{
        fontSize: 'clamp(16px, 1.4vw, 19px)',
        fontWeight: 400,
        lineHeight: 1.7,
        color: 'rgba(255,255,255,0.75)',
        margin: 0,
      }}>
        That means traveling to wherever the best regattas are happening — and doing it year-round.
      </p>
    </div>
  )
}

function CostBlock({ isMobile, style }) {
  const numSize = isMobile ? 'clamp(40px, 10vw, 72px)' : 'clamp(48px, 8vw, 120px)'
  return (
    <div style={style}>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.35)', marginBottom: 28 }}>
        Where Your Support Goes
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {COSTS.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start' }}>
              <span style={{
                fontSize: numSize,
                fontWeight: 700,
                lineHeight: 0.9,
                letterSpacing: '-2px',
                color: '#fff',
              }}>{item.pct}</span>
              <span style={{
                fontSize: 'clamp(14px, 1.5vw, 22px)',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.3)',
                marginLeft: 4,
                marginTop: '0.08em',
              }}>%</span>
            </div>
            <div style={{
              ...LABEL,
              fontSize: 11,
              color: 'rgba(255,255,255,0.4)',
              marginLeft: 'clamp(14px, 2vw, 28px)',
            }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PullQuote({ style }) {
  return (
    <div style={style}>
      <div style={{
        fontSize: 'clamp(20px, 2.4vw, 32px)',
        fontWeight: 400,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.45,
      }}>
        &ldquo;Whether it&rsquo;s financial support, advice, a connection, or simply following along — it all matters.&rdquo;
      </div>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.4)', marginTop: 20 }}>
        — Robby
      </div>
    </div>
  )
}

function FinalCTA({ isMobile, days, style }) {
  const [ctaHover, setCtaHover] = useState(false)
  const numSize = isMobile ? 'clamp(56px, 14vw, 100px)' : 'clamp(72px, 13vw, 200px)'
  return (
    <div style={{ textAlign: isMobile ? 'left' : 'center', ...style }}>
      <div style={{
        fontSize: numSize,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-3px',
        color: '#fff',
      }}>
        2028
      </div>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.5)', marginTop: 20 }}>
        LA Olympics
      </div>
      <div style={{
        marginTop: 36,
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 14,
      }}>
        <span style={{
          fontSize: 'clamp(32px, 4.5vw, 64px)',
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-1px',
        }}>{days}</span>
        <span style={{ ...LABEL, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Days</span>
      </div>
      <div style={{ marginTop: 48 }}>
        <a
          href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          style={{
            display: 'inline-block',
            fontSize: 'clamp(20px, 2.5vw, 36px)',
            fontWeight: 500,
            color: ctaHover ? '#fff' : 'rgba(255,255,255,0.92)',
            textDecoration: 'none',
            borderBottomStyle: 'solid',
            borderBottomWidth: ctaHover ? 3 : 2,
            borderBottomColor: 'rgb(220,40,40)',
            paddingBottom: 6,
            transition: 'color 0.2s ease, border-bottom-width 0.2s ease',
            letterSpacing: '-0.3px',
          }}
        >
          EMAIL ROBBY →
        </a>
      </div>
      <div style={{ marginTop: 24 }}>
        <a
          href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting"
          style={{
            fontSize: 13,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          or reach out about anything else
        </a>
      </div>
    </div>
  )
}

// ---------- Section 1: Cinematic Hero ----------

function HeroSection({ entrance, isMobile }) {
  return (
    <section style={{
      position: 'relative',
      width: '100%',
      minHeight: isMobile ? '70dvh' : '100dvh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      overflow: 'hidden',
    }}>
      {/* Background photo */}
      <img
        src={`${BASE}P1177244.jpeg`}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center 30%',
          filter: 'grayscale(0.15) contrast(1.1)',
        }}
      />
      {/* Dark wash */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />
      {/* Cool tint */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,85,235,0.06)' }} />

      {/* Content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        padding: isMobile
          ? 'clamp(80px, 16vh, 120px) 24px clamp(48px, 8vh, 80px)'
          : 'clamp(60px, 10vh, 120px) clamp(32px, 6vw, 100px) clamp(60px, 10vh, 120px)',
      }}>
        {/* Small label */}
        <div style={{
          ...LABEL,
          color: 'rgba(255,255,255,0.4)',
          marginBottom: 'clamp(24px, 4vh, 48px)',
        }}>
          Support the Campaign
        </div>

        <h1 style={{
          ...entrance.style(0),
          color: '#fff',
          fontSize: isMobile ? 'clamp(36px, 10vw, 64px)' : 'clamp(36px, 7.5vw, 110px)',
          fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: '-2px',
          margin: 0,
          maxWidth: 900,
        }}>
          THE ROAD TO LA<br />
          RUNS THROUGH<br />
          EVERY REGATTA<br />
          IN BETWEEN.
        </h1>

        <p style={{
          ...entrance.style(0),
          color: 'rgba(255,255,255,0.78)',
          fontSize: 'clamp(16px, 1.6vw, 21px)',
          fontWeight: 400,
          lineHeight: 1.55,
          maxWidth: 520,
          marginTop: 'clamp(16px, 3vh, 32px)',
          marginBottom: 0,
        }}>
          I&rsquo;m campaigning for the 2028 Olympic Games in the ILCA 7. This is how I get there — and why I need you with me.
        </p>
      </div>
    </section>
  )
}

// ---------- Section 2: Bio / credentials ----------

function BioSection({ entrance, isMobile }) {
  return (
    <section style={{
      ...entrance.style(1),
      maxWidth: 900,
      margin: '0 auto',
      padding: 'clamp(60px, 10vh, 120px) clamp(24px, 5vw, 80px)',
      textAlign: 'center',
    }}>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.4)', marginBottom: 24 }}>
        Who I Am
      </div>
      <p style={{
        fontSize: 'clamp(17px, 1.8vw, 22px)',
        fontWeight: 400,
        lineHeight: 1.65,
        color: 'rgba(255,255,255,0.82)',
        maxWidth: 640,
        margin: '0 auto clamp(36px, 5vh, 56px)',
      }}>
        Sailing since age nine, racing the ILCA since twelve. Six national championships and three continental titles. Studying Applied Mathematics and Economics at Harvard College while serving as Team Captain.
      </p>
      <div style={{
        display: 'flex',
        gap: isMobile ? 32 : 72,
        justifyContent: 'center',
        flexWrap: 'wrap',
      }}>
        {BIO_STATS.map(([n, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: 'clamp(40px, 5.5vw, 72px)',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-1px',
              color: '#fff',
            }}>{n}</div>
            <div style={{
              ...LABEL,
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 10,
            }}>{l}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Section 3: Photo break ----------

function PhotoBreak({ entrance, isMobile }) {
  return (
    <div style={entrance.style(2)}>
      <img
        src={`${BASE}IMG_5854.JPG`}
        alt=""
        style={{
          width: '100%',
          height: isMobile ? 'clamp(200px, 30vh, 320px)' : 'clamp(280px, 40vh, 480px)',
          objectFit: 'cover',
          objectPosition: 'center 40%',
          filter: 'grayscale(0.6) contrast(1.3) brightness(0.55)',
          display: 'block',
        }}
      />
    </div>
  )
}

// ---------- Section 4: Spine ----------

function YearLabel({ item, textAlign }) {
  const { yearColor, yearShadow, milestoneColor, subColor } = yearStatus(item)
  return (
    <div style={{ textAlign }}>
      <div style={{
        fontSize: 'clamp(24px, 3.5vw, 48px)',
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-1px',
        color: yearColor,
        textShadow: yearShadow,
        marginBottom: 8,
      }}>
        {item.year}
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.5,
        color: milestoneColor,
      }}>
        {item.main}
      </div>
      {item.sub && item.sub.map((s, si) => (
        <div key={si} style={{
          fontSize: 12,
          fontStyle: 'italic',
          color: subColor,
          lineHeight: 1.5,
          marginTop: 3,
        }}>{s}</div>
      ))}
    </div>
  )
}

function DesktopYearRow({ item, side, marginTop }) {
  const { dot } = yearStatus(item)
  return (
    <div style={{
      position: 'relative',
      marginTop,
      display: 'flex',
      alignItems: 'flex-start',
    }}>
      <div style={{
        position: 'absolute',
        left: '50%',
        top: item.current ? 8 : 12,
        transform: 'translate(-50%, 0)',
        borderRadius: '50%',
        zIndex: 2,
        ...dot,
      }} />
      <div style={{ flex: 1, paddingRight: 'clamp(32px, 3.5vw, 56px)', minWidth: 0 }}>
        {side === 'left' && <YearLabel item={item} textAlign="right" />}
      </div>
      <div style={{ flex: 1, paddingLeft: 'clamp(32px, 3.5vw, 56px)', minWidth: 0 }}>
        {side === 'right' && <YearLabel item={item} textAlign="left" />}
      </div>
    </div>
  )
}

function ContentRow({ side, marginTop, maxWidth, children, style }) {
  return (
    <div style={{
      position: 'relative',
      marginTop,
      display: 'flex',
      alignItems: 'flex-start',
      ...style,
    }}>
      <div style={{
        flex: 1,
        paddingRight: 'clamp(36px, 4vw, 72px)',
        minWidth: 0,
        display: 'flex',
        justifyContent: 'flex-end',
      }}>
        {side === 'left' && <div style={{ maxWidth, width: '100%' }}>{children}</div>}
      </div>
      <div style={{ flex: 1, paddingLeft: 'clamp(36px, 4vw, 72px)', minWidth: 0 }}>
        {side === 'right' && <div style={{ maxWidth }}>{children}</div>}
      </div>
    </div>
  )
}

// Compute the spacing for each year based on its position in the timeline.
function getYearSpacing(year, i) {
  if (i === 0) return 0
  if (year === '2025') return 'clamp(64px, 9vh, 100px)'
  if (year === '2026') return 'clamp(80px, 11vh, 140px)'
  if (year === '2027') return 'clamp(120px, 16vh, 220px)'
  return 'clamp(48px, 7vh, 80px)' // 2017–2024 tight
}

function SpineDesktop({ entrance, days }) {
  const years = TIMELINE_DATA.filter((y) => y.year !== '2028')
  // Even array-index → right, odd → left
  const getSide = (_year, idx) => (idx % 2 === 0 ? 'right' : 'left')
  const oppositeSide = (s) => (s === 'left' ? 'right' : 'left')

  const rows = []
  years.forEach((item, i) => {
    const side = getSide(item.year, i)
    rows.push(
      <DesktopYearRow key={item.year} item={item} side={side} marginTop={getYearSpacing(item.year, i)} />
    )

    // Body copy after 2025, on the opposite side
    if (item.year === '2025') {
      rows.push(
        <ContentRow key="body" side={oppositeSide(side)} marginTop="clamp(40px, 5vh, 64px)" maxWidth={400}>
          <BodyBlock style={entrance.style(3)} />
        </ContentRow>
      )
    }

    // Cost breakdown in the 2026→2027 gap, on the left
    if (item.year === '2026') {
      rows.push(
        <ContentRow key="cost" side="left" marginTop="clamp(60px, 8vh, 100px)" maxWidth={440}>
          <CostBlock isMobile={false} style={entrance.style(3)} />
        </ContentRow>
      )
    }

    // Pull-quote after 2027, on the opposite side
    if (item.year === '2027') {
      rows.push(
        <ContentRow key="quote" side={oppositeSide(side)} marginTop="clamp(48px, 6vh, 80px)" maxWidth={440}>
          <PullQuote style={entrance.style(4)} />
        </ContentRow>
      )
    }
  })

  return (
    <div style={{
      position: 'relative',
      maxWidth: 1200,
      margin: '0 auto',
      padding: 'clamp(80px, 12vh, 160px) 0 clamp(60px, 8vh, 100px)',
    }}>
      {/* Spine line */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-0.5px)',
        top: 0,
        bottom: 0,
        width: 1,
        background: 'rgba(10,85,235,0.3)',
      }} />

      {rows}

      {/* 2028 — centered, straddling the spine */}
      <FinalCTA
        isMobile={false}
        days={days}
        style={{ ...entrance.style(5), marginTop: 'clamp(140px, 18vh, 260px)' }}
      />
    </div>
  )
}

// ---------- Mobile spine ----------

function MobileYearLabel({ item }) {
  const { yearColor, yearShadow, milestoneColor, subColor } = yearStatus(item)
  return (
    <div>
      <div style={{
        fontSize: 'clamp(24px, 7vw, 40px)',
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-0.5px',
        color: yearColor,
        textShadow: yearShadow,
        marginBottom: 6,
      }}>
        {item.year}
      </div>
      <div style={{ fontSize: 13, fontWeight: 400, lineHeight: 1.5, color: milestoneColor }}>
        {item.main}
      </div>
      {item.sub && item.sub.map((s, si) => (
        <div key={si} style={{
          fontSize: 11,
          fontStyle: 'italic',
          color: subColor,
          lineHeight: 1.5,
          marginTop: 2,
        }}>{s}</div>
      ))}
    </div>
  )
}

function SpineMobile({ entrance, days }) {
  const SPINE_LEFT = 24
  const PAD_LEFT = 48

  const rows = []
  TIMELINE_DATA.forEach((item, i) => {
    if (item.year === '2028') return
    const { dot } = yearStatus(item)

    rows.push(
      <div key={item.year} style={{
        position: 'relative',
        marginTop: getYearSpacing(item.year, i),
        paddingLeft: PAD_LEFT,
      }}>
        <div style={{
          position: 'absolute',
          left: SPINE_LEFT,
          top: item.current ? 6 : 10,
          transform: 'translate(-50%, 0)',
          borderRadius: '50%',
          zIndex: 2,
          ...dot,
        }} />
        <MobileYearLabel item={item} />
      </div>
    )

    const wrap = (key, idx, child) => (
      <div key={key} style={{
        ...entrance.style(idx),
        marginTop: 'clamp(28px, 4vh, 48px)',
        paddingLeft: PAD_LEFT,
        paddingRight: 16,
      }}>
        {child}
      </div>
    )

    if (item.year === '2025') rows.push(wrap('body', 3, <BodyBlock style={{}} />))
    if (item.year === '2026') rows.push(wrap('cost', 3, <CostBlock isMobile={true} style={{}} />))
    if (item.year === '2027') rows.push(wrap('quote', 4, <PullQuote style={{}} />))
  })

  return (
    <div style={{
      position: 'relative',
      padding: 'clamp(60px, 10vh, 100px) 20px clamp(48px, 7vh, 80px)',
    }}>
      {/* Left-rail spine */}
      <div style={{
        position: 'absolute',
        left: SPINE_LEFT,
        top: 0,
        bottom: 0,
        width: 1,
        background: 'rgba(10,85,235,0.3)',
        transform: 'translateX(-0.5px)',
      }} />

      {rows}

      <FinalCTA
        isMobile={true}
        days={days}
        style={{
          ...entrance.style(5),
          marginTop: 'clamp(80px, 12vh, 160px)',
          paddingLeft: PAD_LEFT,
          paddingRight: 16,
        }}
      />
    </div>
  )
}

// ---------- Page ----------

export default function Support({ onNavigate }) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 700
  )
  useEffect(() => {
    const h = () => setIsMobile(window.innerWidth < 700)
    window.addEventListener('resize', h)
    return () => window.removeEventListener('resize', h)
  }, [])

  // 6 entrance beats: hero, bio, photo, body+cost, quote, CTA+close
  const entrance = usePageEntrance(6, { staggerMs: 120, initialDelayMs: 60 })
  const { days } = useCountdown(new Date('2028-07-14T00:00:00'))

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(12,14,18)' }}>
      <HeroSection entrance={entrance} isMobile={isMobile} />
      <BioSection entrance={entrance} isMobile={isMobile} />
      <PhotoBreak entrance={entrance} isMobile={isMobile} />

      {isMobile
        ? <SpineMobile entrance={entrance} days={days} />
        : <SpineDesktop entrance={entrance} days={days} />}

      <div style={{
        ...entrance.style(5),
        textAlign: 'center',
        fontSize: 'clamp(18px, 2.2vw, 28px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.6)',
        maxWidth: 600,
        margin: '0 auto',
        padding: 'clamp(40px, 6vh, 80px) 20px',
        lineHeight: 1.4,
      }}>
        Thank you for being part of this.
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
