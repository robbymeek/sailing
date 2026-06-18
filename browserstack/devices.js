// ============================================================================
//  DEVICE / BROWSER MATRIX  —  the home-orb cross-device check
// ============================================================================
//  These are the surfaces the Phase 0 diagnosis flagged as INFERRED (we can't
//  reproduce them on a Mac): real Windows desktop browsers + real iPhone Safari
//  + an Android Chrome control. Run a subset with BS_ONLY=win-chrome,iphone15.
//
//  Caps are W3C + bstack:options (BrowserStack's vendor namespace). browserVersion
//  'latest' floats to the newest stable. Real mobile devices use deviceName +
//  osVersion (realMobile is implied by a real deviceName on Automate).
//
//  Update device names against the live list:
//    https://www.browserstack.com/list-of-browsers-and-platforms/automate
// ============================================================================

export const DEVICES = [
  // --- Real Windows 11 desktop (the headline "flat-boat-instead-of-orb" suspects)
  {
    id: 'win-chrome',
    label: 'Windows 11 · Chrome (latest)',
    caps: { browserName: 'Chrome', 'bstack:options': { os: 'Windows', osVersion: '11', browserVersion: 'latest' } },
  },
  {
    id: 'win-edge',
    label: 'Windows 11 · Edge (latest)',
    caps: { browserName: 'Edge', 'bstack:options': { os: 'Windows', osVersion: '11', browserVersion: 'latest' } },
  },
  {
    id: 'win-firefox',
    label: 'Windows 11 · Firefox (latest)',
    caps: { browserName: 'Firefox', 'bstack:options': { os: 'Windows', osVersion: '11', browserVersion: 'latest' } },
  },

  // --- macOS Safari (the desktop browser most likely to differ from the dev's Chrome)
  {
    id: 'mac-safari',
    label: 'macOS Sonoma · Safari (latest)',
    caps: { browserName: 'Safari', 'bstack:options': { os: 'OS X', osVersion: 'Sonoma', browserVersion: 'latest' } },
  },

  // --- Real iPhone Safari (the device the orb experience is actually for)
  {
    id: 'iphone15',
    label: 'iPhone 15 · iOS 17 · Safari',
    caps: { browserName: 'safari', 'bstack:options': { deviceName: 'iPhone 15', osVersion: '17' } },
  },
  {
    id: 'iphone13',
    label: 'iPhone 13 · iOS 16 · Safari',
    caps: { browserName: 'safari', 'bstack:options': { deviceName: 'iPhone 13', osVersion: '16' } },
  },

  // --- Android Chrome control
  {
    id: 'pixel7',
    label: 'Google Pixel 7 · Android 13 · Chrome',
    caps: { browserName: 'chrome', 'bstack:options': { deviceName: 'Google Pixel 7', osVersion: '13.0' } },
  },
]

export function selectDevices(only) {
  if (!only) return DEVICES
  const ids = String(only).split(',').map((s) => s.trim()).filter(Boolean)
  const picked = DEVICES.filter((d) => ids.includes(d.id))
  const unknown = ids.filter((id) => !DEVICES.some((d) => d.id === id))
  if (unknown.length) console.warn(`[devices] unknown ids ignored: ${unknown.join(', ')}`)
  return picked
}
