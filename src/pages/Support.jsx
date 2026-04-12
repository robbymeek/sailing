import { useState, useEffect, useRef, useCallback } from 'react'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'

const BASE = import.meta.env.BASE_URL

// ---------- Data ----------

const TIMELINE_DATA = [
  { year: '2017', main: 'Started racing', sub: null, past: true },
  { year: '2018', main: 'First Youth Champs', sub: null, past: true },
  { year: '2019', main: '5th at HS Nationals', sub: ['Freshman year'], past: true },
  { year: '2020', main: 'Covid', sub: null, past: true },
  { year: '2021', main: 'HS National Champion', sub: ['Orange Bowl Champion', '9th at Youth Worlds', 'North American Champion'], past: true },
  { year: '2022', main: 'HS National Champion', sub: ['5th at Youth Worlds'], past: true },
  { year: '2023', main: 'Harvard Sailing', sub: ['North American Champion'], past: true },
  { year: '2024', main: 'CrossnoKaye', sub: ['Train and work'], past: true },
  { year: '2025', main: 'North American Champion', sub: ['Top American at Europeans'], past: true },
  { year: '2026', main: 'Olympic training', sub: null, current: true },
  { year: '2027', main: 'World Champs contender', sub: null },
  { year: '2028', main: 'LA Olympics', sub: null },
]

const YEAR_PHOTOS = {
  '2017': 'IMG_5343.jpeg',
  '2018': 'IMG_0062.JPG',
  '2019': 'Screen Shot 2022-01-18 at 6.25.56 PM.png',
  '2020': 'IMG_3867.jpeg',
  '2021': 'IMG_4733.jpeg',
  '2022': 'IMG_8481.jpeg',
  '2023': 'IMG_5956.JPG',
  '2024': 'IMG_5957.JPG',
  '2025': 'P1233011 (1).JPG',
  '2026': 'IMG_6285.JPG',
}

const FACT_BOXES = {
  '2017': { label: 'AGE 9', text: 'Started sailing on Long Island Sound. Fell in love with the speed, the strategy, and the solitude of singlehanded racing.' },
  '2019': { label: 'FRESHMAN', text: '5th at HS Nationals as a freshman — the youngest sailor in the top 10.' },
  '2021': { label: 'BREAKTHROUGH', text: 'Won the HS National Championship, the Orange Bowl, and placed 9th at Youth Worlds — all in the same year. Three continental titles would follow.' },
  '2023': { label: 'HARVARD', text: 'Joined Harvard Sailing as Team Captain while studying Applied Mathematics and Economics. Won North Americans again.' },
  '2025': { label: 'TOP AMERICAN', text: 'North American Champion for the third time. Top American finisher at the European Championships — a statement on the world stage.' },
  '2026': { label: 'NOW', text: 'Full-time Olympic training. Every day is focused on one goal: making the US team for LA 2028.' },
}

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

// Section scroll heights (in vh units) — early years fast, later years linger
const SECTION_HEIGHTS = {
  '2017': { desktop: 50, mobile: 35 },
  '2018': { desktop: 50, mobile: 35 },
  '2019': { desktop: 50, mobile: 35 },
  '2020': { desktop: 40, mobile: 30 },
  '2021': { desktop: 55, mobile: 40 },
  '2022': { desktop: 50, mobile: 35 },
  '2023': { desktop: 120, mobile: 80 },
  '2024': { desktop: 120, mobile: 80 },
  '2025': { desktop: 130, mobile: 90 },
  '2026': { desktop: 140, mobile: 100 },
  '2027': { desktop: 100, mobile: 80 },
  '2028': { desktop: 100, mobile: 80 },
}

const LABEL = {
  fontSize: 12,
  fontWeight: 500,
  letterSpacing: '2px',
  textTransform: 'uppercase',
}

// ---------- Sailboat SVG ----------

function SailboatIcon({ glow }) {
  return (
    <svg width="22" height="26" viewBox="0 0 22 26" fill="none" xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: glow ? 'drop-shadow(0 0 8px rgba(220,40,40,0.5))' : 'none',
        transition: 'filter 0.4s ease',
      }}
    >
      {/* Mast */}
      <line x1="11" y1="2" x2="11" y2="20" stroke="rgba(255,255,255,0.9)" strokeWidth="1.2" />
      {/* Main sail */}
      <path d="M11 3 L11 18 L4 18 Z" fill="rgba(255,255,255,0.7)" />
      {/* Jib */}
      <path d="M11 3 L11 14 L16 14 Z" fill="rgba(255,255,255,0.5)" />
      {/* Hull */}
      <path d="M3 20 L19 20 L17 24 L5 24 Z" fill="rgba(255,255,255,0.85)" />
    </svg>
  )
}

// ---------- Hero ----------

function HeroSection({ isMobile }) {
  return (
    <section style={{
      position: 'relative',
      width: '100%',
      minHeight: isMobile ? '70vh' : '80vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'flex-end',
      overflow: 'hidden',
      background: 'rgb(12,14,18)',
    }}>
      {/* Background photo — 2017 with heavy wash */}
      <img
        src={`${BASE}sailing-photos/IMG_5343.jpeg`}
        alt=""
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          filter: 'grayscale(0.2) contrast(1.1) brightness(0.65)',
        }}
      />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)' }} />

      <div style={{
        position: isMobile ? 'relative' : 'absolute',
        bottom: isMobile ? 'auto' : 'clamp(48px, 8vh, 100px)',
        left: isMobile ? 'auto' : 'clamp(32px, 6vw, 100px)',
        zIndex: 1,
        padding: isMobile ? 'clamp(100px, 20vh, 160px) 24px clamp(48px, 8vh, 80px)' : 0,
      }}>
        <div style={{ ...LABEL, color: 'rgba(255,255,255,0.4)', marginBottom: 'clamp(16px, 3vh, 32px)' }}>
          Support the Campaign
        </div>
        <h1 style={{
          color: '#fff',
          fontSize: isMobile ? 'clamp(36px, 10vw, 64px)' : 'clamp(36px, 7.5vw, 110px)',
          fontWeight: 700,
          lineHeight: 0.95,
          letterSpacing: '-2px',
          margin: 0,
          maxWidth: 900,
        }}>
          JOIN THE TEAM<br />
          BEHIND IT ALL.
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.78)',
          fontSize: 'clamp(16px, 1.6vw, 21px)',
          fontWeight: 400,
          lineHeight: 1.55,
          maxWidth: 520,
          marginTop: 'clamp(16px, 3vh, 32px)',
          marginBottom: 0,
        }}>
          I&rsquo;m campaigning for the 2028 Olympic Games in the ILCA 7. Here&rsquo;s where I&rsquo;ve been, where I&rsquo;m going, and how you can be part of it.
        </p>
      </div>
    </section>
  )
}

// ---------- Bio ----------

function BioSection({ isMobile }) {
  return (
    <section style={{
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

// ---------- Scroll-driven Timeline ----------

function TimelineSection({ isMobile, days }) {
  const outerRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const [sailboatProgress, setSailboatProgress] = useState(0)
  const rafRef = useRef(null)

  // Compute cumulative breakpoints
  const sectionHeights = TIMELINE_DATA.map(item => {
    const h = SECTION_HEIGHTS[item.year] || { desktop: 80, mobile: 60 }
    return isMobile ? h.mobile : h.desktop
  })
  const totalVh = sectionHeights.reduce((a, b) => a + b, 0)

  // Cumulative boundaries as fractions of total
  const boundaries = []
  let cumulative = 0
  for (let i = 0; i < sectionHeights.length; i++) {
    boundaries.push(cumulative / totalVh)
    cumulative += sectionHeights[i]
  }

  const handleScroll = useCallback(() => {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      const outer = outerRef.current
      if (!outer) return

      const rect = outer.getBoundingClientRect()
      const outerHeight = outer.offsetHeight
      const viewportH = window.innerHeight
      // scrolled = how far past the top of the outer container
      const scrolled = -rect.top
      // progress 0→1 across the full scroll region
      const progress = Math.max(0, Math.min(1, scrolled / (outerHeight - viewportH)))

      setSailboatProgress(progress)

      // Find active year
      let idx = 0
      for (let i = boundaries.length - 1; i >= 0; i--) {
        if (progress >= boundaries[i]) {
          idx = i
          break
        }
      }
      setActiveIndex(idx)
    })
  }, [boundaries, totalVh])

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [handleScroll])

  const activeYear = TIMELINE_DATA[activeIndex]?.year
  const spineLeft = isMobile ? 24 : '50%'

  return (
    <div
      ref={outerRef}
      style={{
        position: 'relative',
        height: `${totalVh}vh`,
      }}
    >
      {/* Sticky viewport frame */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: 'rgb(12,14,18)',
      }}>
        {/* Background photos — stacked, crossfading */}
        {TIMELINE_DATA.map((item, i) => {
          const photo = YEAR_PHOTOS[item.year]
          if (!photo) return null
          const isActive = activeYear === item.year
          return (
            <img
              key={item.year}
              src={`${BASE}sailing-photos/${photo}`}
              alt=""
              loading={i < 2 ? 'eager' : 'lazy'}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center',
                filter: 'grayscale(0.2) contrast(1.1) brightness(0.65)',
                opacity: isActive ? 1 : 0,
                transition: 'opacity 0.8s ease',
                willChange: 'opacity',
                zIndex: 0,
              }}
            />
          )
        })}

        {/* Dark overlay */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 1,
        }} />

        {/* Spine line */}
        <div style={{
          position: 'absolute',
          left: spineLeft,
          top: '10%',
          bottom: '10%',
          width: 1,
          background: 'rgba(255,255,255,0.15)',
          transform: isMobile ? 'none' : 'translateX(-0.5px)',
          zIndex: 2,
        }} />

        {/* Sailboat indicator */}
        <div
          className="sail-bob"
          style={{
            position: 'absolute',
            left: spineLeft,
            top: `${10 + sailboatProgress * 80}%`,
            transform: 'translate(-50%, -50%)',
            zIndex: 3,
            transition: 'top 0.1s linear',
          }}
        >
          <SailboatIcon glow={activeYear === '2026'} />
        </div>

        {/* Year content */}
        <div style={{
          position: 'absolute',
          inset: 0,
          zIndex: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          {TIMELINE_DATA.map((item, i) => {
            const isActive = activeIndex === i
            const is2028 = item.year === '2028'
            const isLeft = isMobile ? false : (i % 2 === 0)
            const factBox = FACT_BOXES[item.year]
            const isPast = item.past
            const isCurrent = item.current
            const isFuture = !isPast && !isCurrent

            // Year numeral styling
            let yearColor = 'rgba(255,255,255,0.7)'
            let yearShadow = 'none'
            if (isCurrent) {
              yearColor = '#fff'
              yearShadow = '0 0 30px rgba(220,40,40,0.35)'
            } else if (isFuture) {
              yearColor = 'rgba(255,255,255,0.4)'
            }

            if (is2028) {
              return (
                <div key={item.year} style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: isActive ? 1 : 0,
                  transform: isActive ? 'translateY(0)' : 'translateY(8px)',
                  transition: 'opacity 0.5s ease, transform 0.5s ease',
                  pointerEvents: isActive ? 'auto' : 'none',
                  padding: isMobile ? '0 24px' : 0,
                }}>
                  <div style={{
                    fontSize: isMobile ? 'clamp(56px, 14vw, 100px)' : 'clamp(72px, 13vw, 200px)',
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-3px',
                    color: '#fff',
                    textAlign: 'center',
                  }}>
                    2028
                  </div>
                  <div style={{ ...LABEL, color: 'rgba(255,255,255,0.5)', marginTop: 20, textAlign: 'center' }}>
                    LA Olympics
                  </div>
                  <div style={{
                    marginTop: 36,
                    display: 'flex',
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
                  <CTABlock isMobile={isMobile} />
                </div>
              )
            }

            // Regular year
            return (
              <div key={item.year} style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: isMobile ? 'center' : 'center',
                justifyContent: 'center',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'translateY(0)' : 'translateY(8px)',
                transition: 'opacity 0.5s ease, transform 0.5s ease',
                pointerEvents: 'none',
              }}>
                {/* Desktop layout: year on one side, fact on other */}
                {isMobile ? (
                  <div style={{
                    position: 'absolute',
                    left: 48,
                    right: 20,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}>
                    <div style={{
                      fontSize: 'clamp(32px, 8vw, 56px)',
                      fontWeight: 700,
                      lineHeight: 1,
                      letterSpacing: '-1px',
                      color: yearColor,
                      textShadow: yearShadow,
                      marginBottom: 8,
                    }}>
                      {item.year}
                    </div>
                    <div style={{
                      fontSize: 'clamp(14px, 1.2vw, 18px)',
                      fontWeight: 400,
                      color: isPast ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)',
                      lineHeight: 1.5,
                    }}>
                      {item.main}
                    </div>
                    {item.sub && item.sub.map((s, si) => (
                      <div key={si} style={{
                        fontSize: 13,
                        fontStyle: 'italic',
                        color: isPast ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)',
                        lineHeight: 1.5,
                        marginTop: 3,
                      }}>{s}</div>
                    ))}
                    {factBox && (
                      <div style={{
                        marginTop: 20,
                        maxWidth: 'calc(100vw - 80px)',
                        padding: '16px 20px',
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8,
                        borderLeft: isCurrent ? '2px solid rgba(220,40,40,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 500 }}>
                          {factBox.label}
                        </div>
                        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
                          {factBox.text}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Left column */}
                    <div style={{
                      position: 'absolute',
                      right: 'calc(50% + 40px)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      textAlign: 'right',
                      maxWidth: 340,
                    }}>
                      {isLeft ? (
                        <YearContent item={item} yearColor={yearColor} yearShadow={yearShadow} isPast={isPast} />
                      ) : factBox ? (
                        <FactBoxContent factBox={factBox} isCurrent={isCurrent} align="right" />
                      ) : null}
                    </div>
                    {/* Right column */}
                    <div style={{
                      position: 'absolute',
                      left: 'calc(50% + 40px)',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      textAlign: 'left',
                      maxWidth: 340,
                    }}>
                      {!isLeft ? (
                        <YearContent item={item} yearColor={yearColor} yearShadow={yearShadow} isPast={isPast} />
                      ) : factBox ? (
                        <FactBoxContent factBox={factBox} isCurrent={isCurrent} align="left" />
                      ) : null}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function YearContent({ item, yearColor, yearShadow, isPast }) {
  return (
    <>
      <div style={{
        fontSize: 'clamp(48px, 7vw, 100px)',
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: '-2px',
        color: yearColor,
        textShadow: yearShadow,
        marginBottom: 10,
      }}>
        {item.year}
      </div>
      <div style={{
        fontSize: 'clamp(14px, 1.2vw, 18px)',
        fontWeight: 400,
        color: isPast ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)',
        lineHeight: 1.5,
      }}>
        {item.main}
      </div>
      {item.sub && item.sub.map((s, si) => (
        <div key={si} style={{
          fontSize: 13,
          fontStyle: 'italic',
          color: isPast ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.3)',
          lineHeight: 1.5,
          marginTop: 3,
        }}>{s}</div>
      ))}
    </>
  )
}

function FactBoxContent({ factBox, isCurrent, align }) {
  return (
    <div style={{
      maxWidth: 280,
      padding: '16px 20px',
      background: 'rgba(255,255,255,0.06)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 8,
      borderLeft: isCurrent ? '2px solid rgba(220,40,40,0.5)' : '1px solid rgba(255,255,255,0.08)',
      marginLeft: align === 'right' ? 'auto' : 0,
      marginRight: align === 'left' ? 'auto' : 0,
    }}>
      <div style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 500 }}>
        {factBox.label}
      </div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
        {factBox.text}
      </div>
    </div>
  )
}

function CTABlock({ isMobile }) {
  const [ctaHover, setCtaHover] = useState(false)
  return (
    <>
      <div style={{ marginTop: 48, textAlign: 'center' }}>
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
            pointerEvents: 'auto',
          }}
        >
          EMAIL ROBBY &rarr;
        </a>
      </div>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <a
          href="mailto:robbymeek+LA2028@gmail.com?subject=Connecting"
          style={{
            fontSize: 13,
            fontStyle: 'italic',
            color: 'rgba(255,255,255,0.5)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            pointerEvents: 'auto',
          }}
        >
          or reach out about anything else
        </a>
      </div>
    </>
  )
}

// ---------- Cost Breakdown ----------

function CostBreakdown({ isMobile }) {
  return (
    <section style={{
      background: 'rgba(255,255,255,0.03)',
      padding: 'clamp(60px, 10vh, 120px) clamp(24px, 5vw, 80px)',
    }}>
      <div style={{
        ...LABEL,
        color: 'rgba(255,255,255,0.35)',
        textAlign: 'center',
        marginBottom: 'clamp(40px, 6vh, 64px)',
      }}>
        Where Your Support Goes
      </div>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: isMobile ? 'clamp(16px, 4vw, 32px)' : 'clamp(32px, 4vw, 64px)',
        flexWrap: 'wrap',
        maxWidth: 1000,
        margin: '0 auto',
      }}>
        {COSTS.map((item) => (
          <div key={item.label} style={{
            textAlign: 'center',
            minWidth: isMobile ? 'calc(45% - 16px)' : 'auto',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center' }}>
              <span style={{
                fontSize: isMobile ? 'clamp(40px, 10vw, 72px)' : 'clamp(48px, 7vw, 100px)',
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
              marginTop: 8,
            }}>{item.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ---------- Close ----------

function CloseSection() {
  return (
    <div style={{ textAlign: 'center', maxWidth: 600, margin: '0 auto', padding: 'clamp(40px, 6vh, 80px) 20px' }}>
      <div style={{
        fontSize: 'clamp(20px, 2.4vw, 32px)',
        fontWeight: 400,
        fontStyle: 'italic',
        color: 'rgba(255,255,255,0.85)',
        lineHeight: 1.45,
        marginBottom: 16,
      }}>
        &ldquo;Whether it&rsquo;s financial support, advice, a connection, or simply following along &mdash; it all matters.&rdquo;
      </div>
      <div style={{ ...LABEL, color: 'rgba(255,255,255,0.4)', marginBottom: 'clamp(32px, 4vh, 56px)' }}>
        &mdash; Robby
      </div>
      <div style={{
        fontSize: 'clamp(18px, 2.2vw, 28px)',
        fontWeight: 400,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 1.4,
      }}>
        Thank you for being part of this.
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

  const { days } = useCountdown(new Date('2028-07-14T00:00:00'))

  return (
    <div style={{ minHeight: '100vh', background: 'rgb(12,14,18)' }}>
      <HeroSection isMobile={isMobile} />
      <BioSection isMobile={isMobile} />
      <TimelineSection isMobile={isMobile} days={days} />
      <CostBreakdown isMobile={isMobile} />
      <CloseSection />
      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
