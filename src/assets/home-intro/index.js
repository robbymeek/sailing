// Explicit, ordered manifest for the home-page cinematic intro flash montage.
//
// (Was an unrestricted `import.meta.glob` that also swept in the rest-state
// background, the mobile background AND an alternate crop — three versions of the
// same shot — and eager-loaded every file it found.) Each frame lists a desktop
// source and, where a smaller derivative exists, a mobile one. MainView selects
// per viewport and skips the montage entirely under Save-Data / slow connections.
import img5854 from './img-5854.jpg'
import img5866 from './img-5866.jpg'
import img5956 from './img-5956.jpg'
import img5957 from './img-5957.jpg'
import img5957m from './img-5957-mobile.jpg'
import img5958 from './img-5958.jpg'
import img5959 from './img-5959.jpg'
import img8856 from './img-8856.jpg'
import p1166617 from './p1166617.jpeg'
import p1177244 from './p1177244.jpeg'
import p1233486 from './p1233486-2.jpg'

// Deliberate flash order (not filesystem order). `m` = a smaller mobile
// derivative where one exists (only the 5957 frame has one today).
const FRAMES = [
  { d: img5854 },
  { d: img5866 },
  { d: p1166617 },
  { d: img5956 },
  { d: img5957, m: img5957m },
  { d: p1177244 },
  { d: img5958 },
  { d: img5959 },
  { d: p1233486 },
  { d: img8856 },
]

// Viewport-appropriate montage URLs. Phones get the small derivative where one
// exists, and never download desktop + mobile + alternate crops of one frame.
export function introPhotos({ isMobile = false } = {}) {
  return FRAMES.map((f) => (isMobile && f.m) || f.d)
}
