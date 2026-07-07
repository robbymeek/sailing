import { useState, useEffect } from 'react'

export default function useCountdown(target, enabled = true) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    // `enabled: false` (e.g. the off-screen <Biography preload> copy) skips the
    // 1s tick entirely, so a never-seen instance doesn't re-render every second.
    if (!enabled) return
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [enabled])

  const d = Math.max(0, target - now)

  return {
    days: Math.floor(d / 864e5),
    hrs: Math.floor((d % 864e5) / 36e5),
    mins: Math.floor((d % 36e5) / 6e4),
    secs: Math.floor((d % 6e4) / 1e3),
  }
}
