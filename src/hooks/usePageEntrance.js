import { useState, useEffect } from 'react'

export default function usePageEntrance(itemCount, { staggerMs = 80, initialDelayMs = 50 } = {}) {
  const [visibleItems, setVisibleItems] = useState(new Set())

  useEffect(() => {
    const timers = []
    for (let i = 0; i < itemCount; i++) {
      timers.push(setTimeout(() => {
        setVisibleItems(prev => new Set([...prev, i]))
      }, initialDelayMs + i * staggerMs))
    }
    return () => timers.forEach(clearTimeout)
  }, [])

  return {
    isVisible: (index) => visibleItems.has(index),
    allVisible: visibleItems.size >= itemCount,
    style: (index) => ({
      opacity: visibleItems.has(index) ? 1 : 0,
      transform: visibleItems.has(index) ? 'translateY(0)' : 'translateY(12px)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }),
  }
}
