import exitHome from '../assets/exit-cards/exit-home.jpg'
import exitBio from '../assets/exit-cards/exit-bio.jpg'
import exitPath from '../assets/exit-cards/exit-path.jpg'
import exitContact from '../assets/home-intro/p1177244.jpeg'

// ============================================================================
//  Canonical "where to next" cards — ONE definition per destination so every
//  page's ExitNav (Biography, Event Calendar, Coming Soon) shows the same
//  card. Pages compose the subset they need from EXIT_CARDS; the Support card
//  goes LAST everywhere (far right on desktop, bottom of the mobile stack).
//
//  • home      — fleet aerial photo
//  • biography — solo shot of Robby
//  • path      — team photo (2025 ICSA Open Team Race National Champions)
//  • support   — white card, black text (ExitNav renders via `light`)
//  • contact   — sailing photo (unchanged)
// ============================================================================

export const EXIT_CARDS = {
  home: { label: 'Home', page: 'Home', img: exitHome },
  biography: { label: 'Biography', page: 'Biography', img: exitBio },
  path: { label: 'Path & Team', page: 'Path', img: exitPath },
  support: { label: 'Support', page: 'Support', light: true },
  contact: { label: 'Contact', page: 'Contact', img: exitContact },
}
