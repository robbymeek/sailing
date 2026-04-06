export default function Marquee({ items, speed = 30, color = 'rgba(255,255,255,0.15)', fontSize = 14 }) {
  const text = items.join('   \u2022   ')

  return (
    <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', width: '100%' }}>
      <div style={{
        display: 'inline-block',
        animation: `marquee ${speed}s linear infinite`,
        color, fontSize, fontWeight: 700,
        letterSpacing: 2, textTransform: 'uppercase',
      }}>
        {text}&nbsp;&nbsp;\u2022&nbsp;&nbsp;{text}&nbsp;&nbsp;\u2022&nbsp;&nbsp;{text}
      </div>
    </div>
  )
}
