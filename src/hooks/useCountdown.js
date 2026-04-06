import { useState, useEffect } from 'react'

export default function useCountdown(target) {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const d = Math.max(0, target - now)

  return {
    days: Math.floor(d / 864e5),
    hrs: Math.floor((d % 864e5) / 36e5),
    mins: Math.floor((d % 36e5) / 6e4),
    secs: Math.floor((d % 6e4) / 1e3),
  }
}
