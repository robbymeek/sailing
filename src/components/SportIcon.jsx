// ============================================================================
//  SportIcon — the little sport glyph on the home card's "Last workout" tile.
// ============================================================================
//  24×24 hairline stroke icons in the site's ink (currentColor), one per
//  icon family in ../data/sportTypes.js. Decorative: the tile always prints
//  the sport's name next to it, so these are aria-hidden.
const PATHS = {
  // ILCA-style single-sail dinghy: hull, mast, the one sail
  sail: 'M3 17.5h18l-2.5 3h-13z M10 3.5v14 M10 4.5c4.2 2.6 7.3 7.3 8 12h-8',
  bike:
    'M2.5 16a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 M14.5 16a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0-7 0 ' +
    'M6 16L9.5 9h6L18 16 M6 16h5l4.5-7 M11 16L9.5 9 M8.2 9h2.6 M15.5 9l-.9-2.3h2',
  run:
    'M13.75 4.5a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0 M14 8l-2.5 5 M14 8l-3.5 1.5-2 2.5 ' +
    'M14 8l2.5 3 2.5.5 M11.5 13l3 2.5-1 5 M11.5 13l-2 3.5-4 1',
  walk:
    'M12.25 4.25a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0 M13.5 8l-1.5 6 M13.5 8l2.5 3.5 2.5 1 ' +
    'M13.5 8l-3 2.5-.5 3 M12 14l2.5 3 .5 3.5 M12 14l-2 3.5-2.5 2.5',
  swim:
    'M15.25 8a1.75 1.75 0 1 0 3.5 0a1.75 1.75 0 1 0-3.5 0 M4 13.5l5-4.5 4 3.5 ' +
    'M3 16.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 ' +
    'M3 20c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1',
  // an oar: loom + spoon
  row: 'M4.5 19.5L15 9 M13.2 7.2l3.6 3.6 3.2-3.2c.9-.9.9-2.7 0-3.6s-2.7-.9-3.6 0z',
  // double-bladed paddle
  paddle: 'M6 18L18 6 M3.5 16.8l2.3-.8 2.2 2.2-.8 2.3-1.5.5-2.7-2.7z M20.5 7.2l-2.3.8-2.2-2.2.8-2.3 1.5-.5 2.7 2.7z',
  // dumbbell
  strength: 'M3.5 10v4 M6.5 7.5v9 M17.5 7.5v9 M20.5 10v4 M6.5 12h11',
  // arms-up stretch
  mobility: 'M10.5 4.5a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0-3 0 M12 7v6 M12 8.5L7.5 5.5 M12 8.5l4.5-3 M12 13l-4 7 M12 13l4 7',
  // stopwatch
  generic: 'M5 13.5a7 7 0 1 0 14 0a7 7 0 1 0-14 0 M12 13.5V9.5 M10 2.5h4 M12 2.5v4 M17.6 7.4l1.4-1.4',
}

export default function SportIcon({ icon = 'generic', className, style }) {
  const d = PATHS[icon] || PATHS.generic
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}
