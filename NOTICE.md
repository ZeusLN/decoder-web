# Notices

The code in this project is licensed under the GNU Affero General Public License, version 3 or (at your option) any later version (see `LICENSE`). The font files in `src/assets/fonts/` are excluded; see below.

`REUSE.toml` records the licence of every file in machine-readable form ([REUSE](https://reuse.software) specification), with the licence texts in `LICENSES/`.

## Code

- The BOLT 11 decoder is ported from ZEUS (`utils/Bolt11Utils.ts`, AGPL-3.0). Its original lineage is [light-bolt11-decoder](https://github.com/nbd-wtf/light-bolt11-decoder) (MIT). The route hint and feature bit parsers follow light-bolt11-decoder 3.2.0.

## Test vectors

- BOLT 12 vectors in `test/fixtures/` come from [lightning/bolts](https://github.com/lightning/bolts) (CC-BY 4.0). See `test/fixtures/PROVENANCE.md` for the source and commit of each file.

## Fonts

The font files in `src/assets/fonts/` are commercial typefaces, not covered by the AGPL, and used under licence by Atlas 21 Inc.:

- PP Neue Montreal, copyright Pangram Pangram Foundry
- Marlide Display, copyright Kontour Type, LLC

They may not be copied, redistributed or reused outside this project. See `src/assets/fonts/LICENSE.md`.

The share image (`public/og-image.png`) and its template (`scripts/og-image.html`) show text set in these typefaces.
