# Chart bake

Authoring-time bake of the nautical charts on the home "Currently here" card. The
site ships only the output; nothing here runs in CI or at build time.

```sh
npm --prefix scripts/charts install              # once (own deps, never the root)
npm --prefix scripts/charts run bake             # bake new or re-framed sheets
npm --prefix scripts/charts run bake -- sydney   # re-bake named place keys
npm --prefix scripts/charts run bake -- --force  # re-bake every sheet
```

- **In:** the places from `src/data/campaignStops.js` + `LOCATION_OVERRIDES`
  (`src/utils/places.js`), framing from `tuning.js`, OpenStreetMap water
  polygons from OpenFreeMap vector tiles (cached in `.cache/charts-tiles/`),
  Natural Earth land for the world locator.
- **Out:** `public/charts/<chartKey>.json`, `public/charts/_world.json`, and the
  generated `src/data/chartManifest.js`. Commit all three.
- **Framing:** `nm` (minor visible span, NM) and `look` (`[eastNm, northNm]`
  offset of the frame from the fix) per chart key in `tuning.js`. Changing
  either re-bakes that sheet on the next run.
- **Budget:** each chart gzips to 40 KB or less (the bake raises its simplify
  tolerance if not); the world outline to 6 KB or less.
- **Licence:** chart data is ODbL 1.0 (OpenStreetMap contributors); see
  `public/charts/LICENSE.md`.
