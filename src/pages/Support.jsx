import { useState, useEffect } from 'react'
import '@fontsource-variable/fraunces/wght.css'
import '@fontsource-variable/fraunces/wght-italic.css'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'
import usePageEntrance from '../hooks/usePageEntrance'

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

// Scoped to this page only — see outer container's fontFamily.
const FONT_FAMILY = "'Fraunces Variable', Georgia, serif"

const LABEL = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '2px',
  textTransform: 'uppercase',
}

// Returns visual treatment for a year node based on its status.
function yearStatus(item) {
  if (item.current) {
    return {
      dot: {
        width: 18, height: 18,
        background: 'rgb(220,40,40)',
        boxShadow: '0 0 24px rgba(220,40,40,0.55)',
      },
      yearColor: '#fff',
      yearShadow: '0 0 32px rgba(220,40,40,0.4)',
      milestoneColor: 'rgba(255,255,255,0.95)',
      subColor: 'rgba(255,255,255,0.7)',
    }
  }
  if (item.past) {
    return {
      dot: { width: 8, height: 8, background: '#fff' },
      yearColor: 'rgba(255,255,255,0.55)',
      yearShadow: 'none',
      milestoneColor: 'rgba(255,255,255,0.75)',
      subColor: 'rgba(255,255,255,0.55)',
    }
  }
  return {
    dot: {
      width: 8, height: 8,
      background: 'transparent',
      border: '1.5px solid rgba(255,255,255,0.25)',
      boxSizing: 'border-box',
    },
    yearColor: 'rgba(255,255,255,0.35)',
    yearShadow: 'none',
    milestoneColor: 'rgba(255,255,255,0.35)',
    subColor: 'rgba(255,255,255,0.4)',
  }
}

// ---------- Shared content blocks ----------

function BioBlock() {
  return (
    <div>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.55)', marginBottom: 18 }}>
        Who I Am
      </div>
      <p style={{
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 1.65,
        color: 'rgba(255,255,255,0.82)',
        margin: '0 0 28px',
      }}>
        Sailing since age nine, racing the ILCA since twelve. Six national championships and three continental titles. Studying Applied Mathematics and Economics at Harvard College while serving as Team Captain.
      </p>
      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
        {BIO_STATS.map(([n, l]) => (
          <div key={l}>
            <div style={{
              fontSize: 'clamp(36px, 5vw, 64px)',
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: '-1.5px',
              color: '#fff',
            }}>{n}</div>
            <div style={{
              ...LABEL,
              fontSize: 11,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 8,
            }}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function BodyBlock() {
  return (
    <div style={{
      fontSize: 'clamp(17px, 1.6vw, 20px)',
      fontWeight: 400,
      lineHeight: 1.65,
      color: 'rgba(255,255,255,0.88)',
    }}>
      <p style={{ margin: '0 0 1.1em' }}>
        There is no shortcut. The only way to improve is to race the top sailors under the same conditions, on the same water, at the same time.
      </p>
      <p style={{ margin: 0 }}>
        That means traveling to wherever the best regattas are happening — and doing it year-round.
      </p>
    </div>
  )
}

function CostBlock({ isMobile }) {
  const numeralSize = isMobile
    ? 'clamp(56px, 14vw, 96px)'
    : 'clamp(72px, 11vw, 180px)'
  return (
    <div>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.55)', marginBottom: 24 }}>
        Where Your Support Goes
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {COSTS.map((item) => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              minWidth: '2.4em',
            }}>
              <span style={{
                fontSize: numeralSize,
                fontWeight: 700,
                lineHeight: 0.85,
                letterSpacing: '-4px',
                color: '#fff',
              }}>{item.pct}</span>
              <span style={{
                fontSize: 'clamp(20px, 2vw, 32px)',
                fontWeight: 500,
                color: 'rgba(255,255,255,0.4)',
                marginLeft: 6,
                marginTop: '0.12em',
              }}>%</span>
            </div>
            <div style={{
              ...LABEL,
              color: 'rgba(255,255,255,0.55)',
              marginLeft: 'clamp(18px, 2vw, 32px)',
            }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PullQuote() {
  return (
    <div>
      <div style={{
        fontSize: 'clamp(22px, 2.8vw, 36px)',
        fontWeight: 400,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 1.4,
      }}>
        &ldquo;Whether it&rsquo;s financial support, advice, a connection, or simply following along — it all matters.&rdquo;
      </div>
      <div style={{
        ...LABEL,
        color: 'rgba(255,255,255,0.55)',
        marginTop: 18,
      }}>
        — Robby
      </div>
    </div>
  )
}

function FinalCTA({ isMobile, days }) {
  const [ctaHover, setCtaHover] = useState(false)
  const numeralSize = isMobile
    ? 'clamp(64px, 16vw, 120px)'
    : 'clamp(80px, 14vw, 220px)'
  return (
    <>
      <div style={{
        fontSize: numeralSize,
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-6px',
        color: '#fff',
      }}>
        2028
      </div>
      <div style={{
        ...LABEL,
        color: 'rgba(255,255,255,0.55)',
        marginTop: 20,
      }}>
        LA Olympics
      </div>
      <div style={{
        marginTop: 32,
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 14,
      }}>
        <span style={{
          fontSize: 'clamp(36px, 5vw, 72px)',
          fontWeight: 700,
          color: '#fff',
          lineHeight: 1,
          letterSpacing: '-1.5px',
        }}>{days}</span>
        <span style={{
          ...LABEL,
          fontSize: 14,
          color: 'rgba(255,255,255,0.55)',
        }}>Days</span>
      </div>
      <div style={{ marginTop: 48 }}>
        <a
          href="mailto:robbymeek+LA2028@gmail.com?subject=Supporting%20Your%20Olympic%20Campaign"
          onMouseEnter={() => setCtaHover(true)}
          onMouseLeave={() => setCtaHover(false)}
          style={{
            display: 'inline-block',
            fontSize: 'clamp(22px, 2.8vw, 40px)',
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
            color: 'rgba(255,255,255,0.55)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}
        >
          or reach out about anything else
        </a>
      </div>
    </>
  )
}

// ---------- Hero ----------

function HeroSection({ entrance, isMobile }) {
  const headlineSize = isMobile
    ? 'clamp(40px, 11vw, 72px)'
    : 'clamp(44px, 9vw, 130px)'
  return (
    <section style={{
      position: 'relative',
      width: '100%',
      minHeight: 'clamp(480px, 85vh, 780px)',
      padding: 'clamp(60px, 12vh, 140px) clamp(32px, 6vw, 120px) clamp(40px, 6vh, 80px)',
      boxSizing: 'border-box',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        top: 'clamp(28px, 5vh, 56px)',
        right: 'clamp(32px, 6vw, 120px)',
        ...LABEL,
        color: 'rgba(255,255,255,0.5)',
      }}>
        Support the Campaign
      </div>

      <h1 style={{
        ...entrance.style(0),
        color: '#fff',
        fontSize: headlineSize,
        fontWeight: 700,
        lineHeight: 0.95,
        letterSpacing: '-3px',
        margin: 0,
      }}>
        THE ROAD TO LA<br />
        RUNS THROUGH<br />
        EVERY REGATTA<br />
        IN BETWEEN.
      </h1>

      <p style={{
        ...entrance.style(0),
        color: 'rgba(255,255,255,0.82)',
        fontSize: 'clamp(18px, 2vw, 24px)',
        fontWeight: 400,
        lineHeight: 1.5,
        letterSpacing: '-0.3px',
        maxWidth: 560,
        marginTop: 'clamp(24px, 4vh, 48px)',
        marginBottom: 0,
      }}>
        I&rsquo;m campaigning for the 2028 Olympic Games in the ILCA 7. This is how I get there — and why I need you with me.
      </p>
    </section>
  )
}

// ---------- Desktop spine pieces ----------

function YearLabel({ item, textAlign }) {
  const { yearColor, yearShadow, milestoneColor, subColor } = yearStatus(item)
  return (
    <div style={{ textAlign }}>
      <div style={{
        fontSize: 'clamp(28px, 4vw, 56px)',
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-1.5px',
        color: yearColor,
        textShadow: yearShadow,
        marginBottom: 10,
      }}>
        {item.year}
      </div>
      <div style={{
        fontSize: 15,
        fontWeight: 400,
        lineHeight: 1.45,
        color: milestoneColor,
      }}>
        {item.main}
      </div>
      {item.sub && item.sub.map((s, i) => (
        <div key={i} style={{
          fontSize: 13,
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
        top: 12,
        transform: 'translate(-50%, 0)',
        borderRadius: '50%',
        zIndex: 2,
        ...dot,
      }} />
      <div style={{
        flex: 1,
        paddingRight: 'clamp(32px, 3.5vw, 56px)',
        minWidth: 0,
      }}>
        {side === 'left' && <YearLabel item={item} textAlign="right" />}
      </div>
      <div style={{
        flex: 1,
        paddingLeft: 'clamp(32px, 3.5vw, 56px)',
        minWidth: 0,
      }}>
        {side === 'right' && <YearLabel item={item} textAlign="left" />}
      </div>
    </div>
  )
}

function DesktopContentRow({ side, marginTop, maxWidth, children, style }) {
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
        {side === 'left' && (
          <div style={{ maxWidth, width: '100%' }}>{children}</div>
        )}
      </div>
      <div style={{
        flex: 1,
        paddingLeft: 'clamp(36px, 4vw, 72px)',
        minWidth: 0,
      }}>
        {side === 'right' && (
          <div style={{ maxWidth }}>{children}</div>
        )}
      </div>
    </div>
  )
}

function SpineDesktop({ entrance, days }) {
  const years = TIMELINE_DATA.filter((y) => y.year !== '2028')

  // Alternating sides by year parity — even year numbers on the right,
  // odd on the left. Produces the zig-zag reading rhythm.
  const getSide = (yearStr) => (parseInt(yearStr, 10) % 2 === 0 ? 'right' : 'left')

  const rows = []
  years.forEach((item, i) => {
    const side = getSide(item.year)
    // Tight base spacing; 2027 gets extra whitespace (it follows the cost block)
    // to reinforce the "time stretches toward LA" rhythm.
    const marginTop =
      i === 0
        ? 0
        : item.year === '2027'
          ? 'clamp(80px, 10vh, 140px)'
          : 'clamp(60px, 8vh, 100px)'

    rows.push(
      <DesktopYearRow
        key={item.year}
        item={item}
        side={side}
        marginTop={marginTop}
      />
    )

    // Bio pinned into the 2019–2021 region, opposite those left-side labels.
    if (item.year === '2019') {
      rows.push(
        <DesktopContentRow
          key="bio"
          side="right"
          marginTop={'clamp(44px, 5vh, 72px)'}
          maxWidth={380}
          style={entrance.style(1)}
        >
          <BioBlock />
        </DesktopContentRow>
      )
    }

    // Body copy + cost block both live on the LEFT of the spine at the 2026→2027
    // stretch, opposite 2026's right-side label. Pull-quote lives on the right.
    if (item.year === '2026') {
      rows.push(
        <DesktopContentRow
          key="body"
          side="left"
          marginTop={'clamp(60px, 7vh, 90px)'}
          maxWidth={420}
          style={entrance.style(2)}
        >
          <BodyBlock />
        </DesktopContentRow>
      )
      rows.push(
        <DesktopContentRow
          key="cost"
          side="left"
          marginTop={'clamp(60px, 7vh, 100px)'}
          maxWidth={480}
          style={entrance.style(3)}
        >
          <CostBlock isMobile={false} />
        </DesktopContentRow>
      )
    }

    if (item.year === '2027') {
      rows.push(
        <DesktopContentRow
          key="quote"
          side="right"
          marginTop={'clamp(60px, 7vh, 90px)'}
          maxWidth={480}
          style={entrance.style(4)}
        >
          <PullQuote />
        </DesktopContentRow>
      )
    }
  })

  return (
    <div style={{
      position: 'relative',
      maxWidth: 1200,
      margin: '0 auto',
      padding: 'clamp(60px, 10vh, 120px) 0 clamp(80px, 12vh, 160px)',
    }}>
      {/* Spine — a single flat line, center of the container, full height */}
      <div style={{
        position: 'absolute',
        left: '50%',
        transform: 'translateX(-1px)',
        top: 0,
        bottom: 0,
        width: 2,
        background: 'rgba(255,255,255,0.22)',
      }} />

      {rows}

      {/* 2028 breaks the alternating rule: centered on the spine, biggest numeral on the page */}
      <div style={{
        ...entrance.style(5),
        marginTop: 'clamp(100px, 14vh, 200px)',
        position: 'relative',
        textAlign: 'center',
      }}>
        <FinalCTA isMobile={false} days={days} />
      </div>
    </div>
  )
}

// ---------- Mobile spine ----------

function MobileYearLabel({ item }) {
  const { yearColor, yearShadow, milestoneColor, subColor } = yearStatus(item)
  return (
    <div>
      <div style={{
        fontSize: 'clamp(32px, 8vw, 48px)',
        fontWeight: 600,
        lineHeight: 1,
        letterSpacing: '-1.2px',
        color: yearColor,
        textShadow: yearShadow,
        marginBottom: 8,
      }}>
        {item.year}
      </div>
      <div style={{
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 1.45,
        color: milestoneColor,
      }}>
        {item.main}
      </div>
      {item.sub && item.sub.map((s, i) => (
        <div key={i} style={{
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

function SpineMobile({ entrance, days }) {
  const SPINE_LEFT = 24
  const CONTENT_PAD_LEFT = 52

  const rows = []
  TIMELINE_DATA.forEach((item, i) => {
    if (item.year === '2028') return

    const { dot } = yearStatus(item)
    const marginTop =
      i === 0
        ? 0
        : item.year === '2027'
          ? 'clamp(64px, 9vh, 110px)'
          : 'clamp(40px, 5vh, 72px)'

    rows.push(
      <div key={item.year} style={{
        position: 'relative',
        marginTop,
        paddingLeft: CONTENT_PAD_LEFT,
      }}>
        <div style={{
          position: 'absolute',
          left: SPINE_LEFT,
          top: 10,
          transform: 'translate(-50%, 0)',
          borderRadius: '50%',
          zIndex: 2,
          ...dot,
        }} />
        <MobileYearLabel item={item} />
      </div>
    )

    const contentWrap = (key, idx, child) => (
      <div key={key} style={{
        ...entrance.style(idx),
        marginTop: 'clamp(32px, 5vh, 56px)',
        paddingLeft: CONTENT_PAD_LEFT,
        paddingRight: 12,
      }}>
        {child}
      </div>
    )

    if (item.year === '2019') rows.push(contentWrap('bio', 1, <BioBlock />))
    if (item.year === '2026') {
      rows.push(contentWrap('body', 2, <BodyBlock />))
      rows.push(contentWrap('cost', 3, <CostBlock isMobile={true} />))
    }
    if (item.year === '2027') rows.push(contentWrap('quote', 4, <PullQuote />))
  })

  return (
    <div style={{
      position: 'relative',
      padding: 'clamp(48px, 8vh, 80px) 20px clamp(60px, 10vh, 100px)',
    }}>
      {/* Left-rail spine */}
      <div style={{
        position: 'absolute',
        left: SPINE_LEFT,
        top: 0,
        bottom: 0,
        width: 2,
        background: 'rgba(255,255,255,0.22)',
        transform: 'translateX(-1px)',
      }} />

      {rows}

      {/* 2028 anchor — on mobile it still sits right of the spine in the same column */}
      <div style={{
        ...entrance.style(5),
        marginTop: 'clamp(80px, 12vh, 160px)',
        paddingLeft: CONTENT_PAD_LEFT,
        paddingRight: 12,
      }}>
        <FinalCTA isMobile={true} days={days} />
      </div>
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

  // 6 staggered entrance beats:
  //   0 hero, 1 bio, 2 body copy, 3 cost block, 4 pull-quote, 5 final CTA + close
  const entrance = usePageEntrance(6, { staggerMs: 120, initialDelayMs: 60 })

  const { days } = useCountdown(new Date('2028-07-14T00:00:00'))

  return (
    <div style={{
      minHeight: '100vh',
      background: 'rgb(20,110,240)',
      // Fraunces is scoped to this page only — inherited by every descendant.
      fontFamily: FONT_FAMILY,
    }}>
      <HeroSection entrance={entrance} isMobile={isMobile} />

      {isMobile
        ? <SpineMobile entrance={entrance} days={days} />
        : <SpineDesktop entrance={entrance} days={days} />}

      <div style={{
        ...entrance.style(5),
        textAlign: 'center',
        fontSize: 'clamp(20px, 2.4vw, 32px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.7)',
        maxWidth: 680,
        margin: '0 auto',
        padding: 'clamp(40px, 6vh, 80px) 20px',
        lineHeight: 1.4,
      }}>
        Thank you for being part of this.
      </div>

      <Footer variant="blue" onNavigate={onNavigate} />
    </div>
  )
}
