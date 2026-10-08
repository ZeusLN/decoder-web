# Test vector provenance

All files come from [lightning/bolts](https://github.com/lightning/bolts) at commit `1aadb719b4007c4cea0ba6e36b08c4fb53788dee` (2026-09-21), licensed CC-BY 4.0.

| File | Source |
|---|---|
| `bolt11-vectors.json` | Extracted from the "Examples" and "Examples of Invalid Invoices" sections of `11-payment-encoding.md` (invoice strings and their headings only). |
| `offers-test.json` | `bolt12/offers-test.json`, unmodified. Identical to the copy vendored in lnd `bolt12/test-vectors/`. |
| `format-string-test.json` | `bolt12/format-string-test.json`, unmodified. |
| `signature-test.json` | `bolt12/signature-test.json`, unmodified. |
| `payer-proof-test.json` | `bolt12/payer-proof-test.json`, unmodified. Payer proofs are a draft (lightning/bolts#1295). |
