// ============================================================================
//  RESULTS  —  single source of truth for the Biography RESULTS section.
// ============================================================================
//  Mirrors the sailing résumé (public/resume/Robby-Meek-Sailing-Resume.pdf,
//  regenerated from ~/Desktop/Sailing Resume Docs/): every row of the résumé's
//  Results table, grouped by era (ILCA 7 → ILCA 6 → College → High School).
//  When the résumé changes, update this file to match.
//
//  A curated HIGHLIGHTS group leads the list — the athlete's best-of reel and
//  the one group that starts EXPANDED (Biography's openGroups). Its rows are
//  intentional DUPLICATES of the strongest rows from the era groups below (so
//  they render + open modals identically); keep each copy in sync with its
//  source row. It is not a résumé section — it exists only for this page.
//
//  Deliberate deviations from the résumé's wording (display polish only —
//  places, fleets, years are exact):
//    - "OCR" expanded to "Olympic Classes Regatta"; "World Sailing
//      Championship" shortened to "World Championship".
//    - "(High School)" qualifiers dropped inside the High School group.
//    - The résumé's "Top American –" prefix on College rows is NOT rendered
//      as a chip there: an all-college fleet is all-American, so the chip
//      carries no information. The two College results that also appear in
//      the ILCA 7 group DO keep the chip in that international context.
//    - "(Incl. Douglas, Riley, Rose)" / "(2nd to Rose)" live in modal-only
//      fleetNote fields.
//    - The résumé's "Enrolled at Harvard and worked at a start-up" narrative
//      line is not rendered (owner request, Jul 2026).
//
//  Row shape (uniform — the UI in components/eventUI.jsx depends on it):
//    place      finishing place (number) — drives the medal-tinted badge
//    fleet      fleet size (number) — rendered as "of N"
//    event      regatta name, no placement/class baked into the string
//    year       season (number)
//    tag        national-distinction chip, e.g. 'Top American' (optional)
//    classNote  class qualifier shown inline, e.g. 'ILCA 7' (optional)
//    fleetNote  competitive context shown in the modal only (optional)
//    summary    modal paragraph (optional — modal falls back to the stats)
//    url        official event page (optional)
//
//  FUTURE events are intentionally NOT here: the 2026 → 2028 campaign lives on
//  The Road globe tour (src/data/campaignStops.js).

const RESULT_GROUPS = [
  {
    // Curated best-of reel — starts expanded, sits above every era group.
    // Ordered most-recent → oldest (owner request). Every row is a verbatim
    // duplicate of a row in the era groups below.
    title: 'HIGHLIGHTS',
    years: 'Career Best',
    results: [
      // ↓ ILCA 7 · 1 of 41 North American Championship 2025
      {
        place: 1, fleet: 41, event: 'North American Championship', year: 2025,
        tag: 'Top American',
        summary:
          'The ILCA 7 North American Championship hosted by Alamitos Bay Yacht Club. Won the title in the 41-boat ILCA 7 fleet.',
        url: 'https://ilcanasailing.org/major-regattas',
      },
      // ↓ ILCA 7 · 1 of 18 College Single-handed National Championship 2025
      {
        place: 1, fleet: 18, event: 'College Single-handed National Championship', year: 2025,
        tag: 'Top American',
        summary:
          'The ICSA College Singlehanded National Championship hosted by Old Dominion University. Won the Open National Championship title representing Harvard.',
        url: 'https://collegesailing.org/championships/national-championships',
      },
      // ↓ ILCA 7 · 1 of 37 Long Beach Olympic Classes Regatta 2023 (LA 2028 venue)
      {
        place: 1, fleet: 37, event: 'Long Beach Olympic Classes Regatta', year: 2023,
        tag: 'Top American',
        summary:
          'Olympic classes regatta in Long Beach, California — the waters that will host sailing at LA 2028. Won the 37-boat ILCA 7 fleet.',
      },
      // ↓ ILCA 6 · 5 of 225 World Championship 2022
      {
        place: 5, fleet: 225, event: 'World Championship', year: 2022,
        tag: 'Top American',
        summary:
          'The 2022 ILCA 6 World Championship — fifth of 225 boats and top American. My final season in the ILCA 6 before moving into the ILCA 7.',
      },
      // ↓ ILCA 6 · 1 of 75 North American Championship 2022
      {
        place: 1, fleet: 75, event: 'North American Championship', year: 2022,
        tag: 'Top American',
      },
      // ↓ ILCA 6 · 1 of 120 Lauderdale Olympic Classes Regatta 2022
      {
        place: 1, fleet: 120, event: 'Lauderdale Olympic Classes Regatta', year: 2022,
        tag: 'Top American', fleetNote: 'Fleet included Douglas, Riley, and Rose.',
      },
      // ↓ ILCA 6 · 9 of 374 World Championship 2021
      {
        place: 9, fleet: 374, event: 'World Championship', year: 2021,
        tag: 'Second American',
        summary:
          'The 2021 ILCA 6 World Championship — ninth of 374 boats, and second American overall.',
      },
    ],
  },
  {
    title: 'ILCA 7',
    years: '2022 – Present',
    results: [
      {
        place: 57, fleet: 171, event: 'European Championship', year: 2026,
        tag: 'Top American',
        summary:
          'The ILCA 7 Senior European Championships in Split, Croatia. Finished 57th of 171 as the top American — holding the U.S. top spot at consecutive European Championships.',
        url: 'https://eurilca.org/',
      },
      {
        place: 48, fleet: 153, event: 'European Championship', year: 2025,
        tag: 'Top American',
        summary:
          'The ILCA 7 Senior European Championships in Marstrand, Sweden. I was really happy with my performance here among the best in the world — 48th of 153 and top American. A great learning experience racing against the top fleet on the international stage.',
        url: 'https://eurilca.org/2025-ilca-senior-european-championships-final-results/',
      },
      {
        place: 1, fleet: 41, event: 'North American Championship', year: 2025,
        tag: 'Top American',
        summary:
          'The ILCA 7 North American Championship hosted by Alamitos Bay Yacht Club. Won the title in the 41-boat ILCA 7 fleet.',
        url: 'https://ilcanasailing.org/major-regattas',
      },
      {
        place: 1, fleet: 18, event: 'College Single-handed National Championship', year: 2025,
        tag: 'Top American',
        summary:
          'The ICSA College Singlehanded National Championship hosted by Old Dominion University. Won the Open National Championship title representing Harvard.',
        url: 'https://collegesailing.org/championships/national-championships',
      },
      {
        place: 1, fleet: 36, event: 'NEISA Championship', year: 2025,
        tag: 'Top American',
      },
      {
        place: 1, fleet: 37, event: 'North American Championship', year: 2023,
        tag: 'Top American',
      },
      {
        place: 1, fleet: 37, event: 'Long Beach Olympic Classes Regatta', year: 2023,
        tag: 'Top American',
        summary:
          'Olympic classes regatta in Long Beach, California — the waters that will host sailing at LA 2028. Won the 37-boat ILCA 7 fleet.',
      },
      {
        place: 3, fleet: 45, event: 'Lauderdale Olympic Classes Regatta', year: 2023,
        tag: 'Third American',
      },
    ],
  },
  {
    title: 'ILCA 6',
    years: '2019 – 2022',
    results: [
      {
        place: 1, fleet: 75, event: 'North American Championship', year: 2022,
        tag: 'Top American',
      },
      {
        place: 1, fleet: 120, event: 'Lauderdale Olympic Classes Regatta', year: 2022,
        tag: 'Top American', fleetNote: 'Fleet included Douglas, Riley, and Rose.',
      },
      {
        place: 5, fleet: 225, event: 'World Championship', year: 2022,
        tag: 'Top American',
        summary:
          'The 2022 ILCA 6 World Championship — fifth of 225 boats and top American. My final season in the ILCA 6 before moving into the ILCA 7.',
      },
      {
        place: 1, fleet: 120, event: 'Midwinters East Regatta', year: 2022,
        tag: 'Top American',
      },
      {
        place: 1, fleet: 54, event: 'San Diego Olympic Classes Regatta', year: 2021,
        tag: 'Top American',
      },
      {
        place: 1, fleet: 92, event: 'Orange Bowl Regatta', year: 2021,
        tag: 'Top American',
      },
      {
        place: 2, fleet: 119, event: 'North American Championship', year: 2021,
        tag: 'Second American', fleetNote: 'Second to Rose.',
      },
      {
        place: 9, fleet: 374, event: 'World Championship', year: 2021,
        tag: 'Second American',
        summary:
          'The 2021 ILCA 6 World Championship — ninth of 374 boats, and second American overall.',
      },
      {
        place: 2, fleet: 74, event: 'Lauderdale Olympic Classes Regatta', year: 2021,
        tag: 'Second American', fleetNote: 'Fleet included Douglas, Riley, and Rose.',
      },
      {
        place: 3, fleet: 94, event: 'Lauderbowl', year: 2020,
        tag: 'Third American',
      },
    ],
  },
  {
    title: 'College',
    years: '2023 – 2026',
    results: [
      { place: 1, fleet: 16, event: 'Team Race National Championship', year: 2026 },
      { place: 1, fleet: 16, event: 'NEISA Team Race Championship', year: 2026 },
      {
        place: 1, fleet: 18, event: 'Single-handed National Championship', year: 2025,
        classNote: 'ILCA 7',
        summary:
          'The ICSA College Singlehanded National Championship hosted by Old Dominion University. Won the Open National Championship title representing Harvard.',
        url: 'https://collegesailing.org/championships/national-championships',
      },
      { place: 1, fleet: 36, event: 'NEISA Championship', year: 2025, classNote: 'ILCA 7' },
      { place: 1, fleet: 16, event: 'Team Race National Championship', year: 2025 },
      { place: 1, fleet: 34, event: 'NEISA Championship', year: 2024, classNote: 'ILCA 7' },
      { place: 2, fleet: 32, event: 'NEISA Championship', year: 2023, classNote: 'ILCA 7' },
    ],
  },
  {
    title: 'High School',
    years: '2019 – 2023',
    results: [
      {
        place: 1, fleet: 18, event: 'Single-handed National Championship', year: 2023,
        classNote: 'ILCA 7',
      },
      { place: 1, fleet: 12, event: 'Team Race National Championship', year: 2023 },
      { place: 2, fleet: 12, event: 'Fleet Race National Championship', year: 2023 },
      {
        place: 1, fleet: 18, event: 'Single-handed National Championship', year: 2022,
        classNote: 'ILCA 6',
      },
      { place: 2, fleet: 20, event: 'Fleet Race National Championship', year: 2022 },
      { place: 2, fleet: 20, event: 'Team Race National Championship', year: 2022 },
      { place: 3, fleet: 20, event: 'Fleet Race National Championship', year: 2021 },
      { place: 3, fleet: 20, event: 'Team Race National Championship', year: 2021 },
      {
        place: 5, fleet: 18, event: 'Single-handed National Championship', year: 2019,
        classNote: 'ILCA 6',
      },
    ],
  },
]

export default RESULT_GROUPS
