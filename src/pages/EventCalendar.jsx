import Nav from '../components/Nav'
import Footer from '../components/Footer'
import useCountdown from '../hooks/useCountdown'

const EVENTS = [
  { n: 'Upcoming: European Championships (July)', d: 'November 2025', upcoming: true },
  { n: 'Upcoming: Midwinters Easy (Feb)', d: 'November 2025', upcoming: true },
  { n: 'Past: Miami Training Block', d: 'November 2025' },
  { n: 'Past: Vilamoura Grand-Prix', d: 'November 2025' },
  { n: 'Past: College Single-handed National Championship \u{1F947}', d: 'November 2025' },
  { n: 'Past: Miami Training', d: 'November 2025' },
  { n: 'Past: European Championship (\u{1F947} American)', d: 'August 2025' },
  { n: 'Past: Long Beach Olympic Classes', d: 'July 2025' },
  { n: 'Past: Kiel Week', d: 'June 2025' },
  { n: 'Past: North American Championship (\u{1F947} North American)', d: 'June 2025' },
  { n: 'Past: LA Training', d: 'June 2025' },
]

export default function EventCalendar({ onNavigate }) {
  const target = new Date('2028-07-14T00:00:00')
  const { days, hrs, mins, secs } = useCountdown(target)

  return (
    <div style={{ background: 'rgb(0,0,0)', minHeight: '100vh' }}>
      <Nav current="Event Calendar" onNavigate={onNavigate} variant="dark" />

      <div style={{ textAlign: 'center', padding: '40px 20px 20px' }}>
        <h1 style={{
          color: '#fff', fontSize: 100, fontWeight: 800,
          letterSpacing: '-4px', margin: '0 0 10px',
        }}>LA 2028</h1>
        <p style={{
          color: 'rgb(153,153,153)', fontSize: 18, fontWeight: 500, margin: '0 0 8px',
        }}>
          {days} : {String(hrs).padStart(2, '0')} : {String(mins).padStart(2, '0')} : {String(secs).padStart(2, '0')}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, margin: 0 }}>
          Click on event to learn more.
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: '40px auto', padding: '0 40px' }}>
        {EVENTS.map((e, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '18px 0', borderBottom: '1px solid rgba(255,255,255,0.1)',
            ...(i === 0 ? { borderTop: '1px solid rgba(255,255,255,0.1)' } : {}),
            cursor: 'pointer',
          }}>
            <span style={{
              color: e.upcoming ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.75)',
              fontSize: 14, fontWeight: e.upcoming ? 500 : 400,
            }}>{e.n}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>{e.d}</span>
          </div>
        ))}
      </div>

      <Footer variant="dark" onNavigate={onNavigate} />
    </div>
  )
}
