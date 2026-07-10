import exitHome from '../assets/exit-cards/exit-home.jpg'
import exitBio from '../assets/exit-cards/exit-bio.jpg'
import exitPath from '../assets/exit-cards/exit-path.jpg'
import exitRoad from '../assets/home-intro/img-5956.jpg'

// ============================================================================
//  Canonical "where to next" cards — ONE definition per destination so every
//  page's ExitNav (Biography, The Team, The Road) shows the same
//  card. Pages compose the subset they need from EXIT_CARDS; the Support card
//  goes LAST everywhere (far right on desktop, bottom of the mobile stack).
//
//  • home      — fleet aerial photo
//  • biography — solo shot of Robby
//  • team      — team photo (2025 ICSA Open Team Race National Champions)
//  • road      — a fleet stretched toward the open horizon (the journey ahead)
//  • support   — white card, black text (ExitNav renders via `light`)
// ============================================================================

export const EXIT_CARDS = {
  home: { label: 'Home', page: 'Home', img: exitHome },
  biography: { label: 'Biography', page: 'Biography', img: exitBio },
  team: { label: 'The Team', page: 'The Team', img: exitPath },
  road: { label: 'The Road', page: 'The Road', img: exitRoad },
  support: { label: 'Donate and Support', page: 'Support', light: true },
}
