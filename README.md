# ZEUS Decoder

Decodes Lightning payment strings in the browser: BOLT 11 invoices, BOLT 12 offers, invoice requests, invoices and payer proofs, LNURLs and lightning addresses. Nothing is sent to a server except LNURL and lightning address lookups, which the browser fetches directly from the service.

## Development

```
yarn install
yarn dev        # http://localhost:5173
yarn test       # vitest (library in node, components in jsdom)
yarn verify     # prettier, eslint, tsc
yarn build      # production bundle in dist/
```

Node 24 and yarn 1.

## Layout

- `src/lib/` is the decoding library. It has no DOM or React dependencies, so other ZEUS projects can reuse it.
  - `index.ts`: `decode(input)` classifies any input and returns a result; it never throws.
  - `bolt11/`: BOLT 11, ported from ZEUS `utils/Bolt11Utils.ts` (including the duplicate payment hash rejection from ZeusLN/zeus#4631).
  - `bolt12/`: BOLT 12 strings, TLV streams, fields, merkle roots, signatures and payer proofs.
  - `lnurl/`: LNURL, LUD-17 URLs and lightning addresses, plus `fetchLnurl`.
  - `verify/preimage.ts`: preimage to payment hash check.
- `src/views/`, `src/components/`, `src/pages/`: the UI, styled with the ZEUS Monochrome theme.
- `test/fixtures/`: BOLT test vectors; see `PROVENANCE.md`.

## Test vectors

All 53 vectors in bolts `offers-test.json`, the 12 in `format-string-test.json`, the merkle and signature vectors in `signature-test.json`, all 28 payer proof vectors and every example in BOLT 11 run as tests. BOLT 12 records and merkle roots are also compared with `bolt12-utils`, and BOLT 11 route hints with `light-bolt11-decoder`.

One BOLT 11 example ("Same, but including fields which must be ignored") is rejected on purpose: it carries extra `p` fields, which bolts#1357 and lnd reject.

## License

The code is AGPL-3.0-or-later, like ZEUS.

The fonts in `src/assets/fonts/` (PP Neue Montreal and Marlide Display) are commercial typefaces used under licence. They are not covered by the AGPL and may not be copied or reused outside this project; see `src/assets/fonts/LICENSE.md`.

See `NOTICE.md` for third-party code and test vectors, and `REUSE.toml` for the licence of each file.
