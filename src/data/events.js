// ============================================================================
//  EVENTS  —  single source of truth for the results calendar.
// ============================================================================
//  Past regattas + results, newest first. FUTURE events are intentionally NOT
//  here: the 2026 → 2028 campaign lives on the Coming Soon globe tour
//  (src/data/campaignStops.js), so a stop that's on the tour is deliberately
//  left off this list. The calendar's one forward-looking row is the chrome
//  "Full-Time Olympic Training" bridge (OLYMPIC_BRIDGE), which links to the
//  Coming Soon page instead of opening a modal.
//
//  Shared by the standalone Event Calendar page and the Biography events section
//  so the two never drift. Add past results here as they happen.

// The chrome-shimmer "door" into the future tour. Rendered specially (BridgeRow
// in components/eventUI.jsx): LA 2028-style chrome text; click → Coming Soon.
export const OLYMPIC_BRIDGE = {
  id: 'olympic-training',
  n: 'Upcoming: Full-Time Olympic Training',
  d: '2026 – 2028',
}

const EVENTS = [
  {
    n: 'ILCA 7 European Championships',
    d: 'May 2026',
    summary:
      'The ILCA 7 Senior European Championships in Split, Croatia. A critical event for fleet racing experience at the highest international level, bringing together top sailors from across Europe and beyond.',
    url: 'https://eurilca.org/',
  },
  {
    n: 'Trofeo Princesa Sofía — Palma',
    d: 'March 2026',
    summary:
      'The 55th Trofeo Princesa Sofia in Palma de Mallorca, opening the 2026 Sailing Grand Slam season. One of the largest ILCA 7 fleets of the year with sailors from across all continents racing on the Bay of Palma.',
    url: 'https://www.trofeoprincesasofia.org/en/default/races/race',
  },
  {
    n: 'Miami Training Block',
    d: 'November 2025',
    summary:
      'Intensive training block in Miami focused on boat speed, fitness, and race preparation with members of the US Sailing Team in Biscayne Bay conditions.',
  },
  {
    n: 'Vilamoura Grand-Prix',
    d: 'November 2025',
    summary:
      'International ILCA 7 grand-prix regatta in Vilamoura, Portugal. A high-level European fleet racing event with strong Atlantic Ocean conditions.',
    url: 'https://www.vilamourasailing.com/events',
  },
  {
    n: 'College Single-Handed National Championship \u{1F947}',
    d: 'November 2025',
    summary:
      'The ICSA College Singlehanded National Championship hosted by Old Dominion University. Won the Open National Championship title representing Harvard.',
    url: 'https://collegesailing.org/championships/national-championships',
  },
  {
    n: 'Miami Training',
    d: 'November 2025',
    summary:
      'Continuation of Miami-based training with focus on starts, upwind speed, and tactical decision-making in shifty bay conditions.',
  },
  {
    n: 'ILCA 7 European Championship \u{1F4AA}',
    d: 'August 2025',
    summary:
      'The ILCA 7 Senior European Championships in Marstrand, Sweden. I was really happy with my performance here among the best in the world. A great learning experience racing against the top fleet on the international stage.',
    url: 'https://eurilca.org/2025-ilca-senior-european-championships-final-results/',
  },
  {
    n: 'Long Beach Olympic Classes',
    d: 'July 2025',
    summary:
      'ILCA 7 Olympic classes regatta on the 2028 Olympic venue waters in Long Beach, California. Critical for learning the local conditions ahead of LA 2028.',
  },
  {
    n: 'Kiel Week',
    d: 'June 2025',
    summary:
      "One of the world's largest and most prestigious sailing events, held annually in Kiel, Germany. Raced in the ILCA 7 fleet alongside world-class competition across all Olympic classes.",
    url: 'https://www.kieler-woche.de/en/sailing.php',
  },
  {
    n: 'ILCA 7 North American Championship \u{1F947}',
    d: 'June 2025',
    summary:
      'The ILCA 7 North American Championship hosted by Alamitos Bay Yacht Club. Won the title of top North American in the 45-boat ILCA 7 fleet.',
    url: 'https://ilcanasailing.org/major-regattas',
  },
  {
    n: 'LA Training',
    d: 'June 2025',
    summary:
      'Training in Los Angeles waters to build familiarity with the Olympic venue. Focused on the unique thermal breeze and current patterns of the LA coast.',
  },
]

export default EVENTS
