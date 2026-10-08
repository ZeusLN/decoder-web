import { describe, expect, it } from 'vitest';
import lightBolt11 from 'light-bolt11-decoder';
import vectors from '../../../test/fixtures/bolt11-vectors.json';
import { encodeBech32, bytesToWords } from '../util/bech32';
import { hexToBytes, utf8Encode } from '../util/bytes';
import { decodeBolt11, isExpired, parseAmount } from './decode';

const SPEC_PAYMENT_HASH =
    '0001020304050607080900010203040506070809000102030405060708090102';
const SPEC_NODE_ID =
    '03e7156ae33b0a208d0744199163177e909e80176e55d97a2f221ede0f934dd9ad';

function vector(prefix: string): string {
    const all = [...vectors.valid, ...vectors.invalid];
    const found = all.find((v) => v.description.startsWith(prefix));
    if (!found) throw new Error(`No vector starting with '${prefix}'`);
    return found.invoice;
}

describe('BOLT 11 spec examples', () => {
    // Every valid example except the one bolts#1357 reclassifies (below).
    const valid = vectors.valid.filter(
        (v) => !v.description.startsWith('Same, but including fields')
    );

    it.each(valid.map((v) => [v.description.slice(0, 70), v.invoice]))(
        'decodes: %s',
        (_desc, invoice) => {
            const r = decodeBolt11(invoice);
            expect(r.valid).toBe(true);
            expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
            expect(r.signatureStatus).toBe('recovered');
        }
    );

    it('donation: amountless, description, default expiry and cltv', () => {
        const r = decodeBolt11(vector('Please make a donation'));
        expect(r.amountMsat).toBe(null);
        expect(r.paymentHash).toBe(SPEC_PAYMENT_HASH);
        expect(r.nodeId).toBe(SPEC_NODE_ID);
        expect(r.description).toBe('Please consider supporting this project');
        expect(r.expiry).toBe(3600);
        expect(r.expiryDefaulted).toBe(true);
        expect(r.minFinalCltvExpiry).toBe(18);
        expect(r.minFinalCltvExpiryDefaulted).toBe(true);
        expect(r.paymentSecret).toBe('11'.repeat(32));
        expect(r.features?.bits.map((b) => b.bit)).toEqual([8, 14]);
        expect(r.timestamp).toBe(1496314658);
    });

    it('coffee: 2500u amount and 60 second expiry', () => {
        const r = decodeBolt11(vector('Please send $3 for a cup of coffee'));
        expect(r.amountMsat).toBe(250_000_000n);
        expect(r.amountText).toBe('2500u');
        expect(r.description).toBe('1 cup coffee');
        expect(r.expiry).toBe(60);
        expect(r.expiryDefaulted).toBe(false);
        expect(r.expiresAt).toBe(r.timestamp + 60);
    });

    it('decodes a UTF-8 description', () => {
        const r = decodeBolt11(vector('Please send 0.0025 BTC'));
        expect(r.description).toBe('ナンセンス 1杯');
    });

    it('decodes a description hash', () => {
        const r = decodeBolt11(vector('Now send $24'));
        expect(r.description).toBeUndefined();
        expect(r.descriptionHash).toBe(
            '3925b6f67e2c340036ed12093dd44e0368df1b6ea26c53dbe4811f58fd5db8c1'
        );
        expect(r.amountMsat).toBe(2_000_000_000n);
    });

    it('decodes a testnet P2PKH fallback', () => {
        const r = decodeBolt11(vector('The same, on testnet'));
        expect(r.network.name).toBe('testnet');
        expect(r.fallbackAddresses).toEqual([
            {
                version: 17,
                programHex: '3172b5654f6683c8fb146959d347ce303cae4ca7',
                address: 'mk2QpYatsKicvFVuTAQLBryyccRXMUaGHP',
                type: 'p2pkh'
            }
        ]);
    });

    it('decodes route hints and a mainnet fallback', () => {
        const r = decodeBolt11(
            vector('On mainnet, with fallback address 1Rusty')
        );
        expect(r.fallbackAddresses[0].address).toBe(
            '1RustyRX2oai4EYYDpQGWvEL62BBGqN9T'
        );
        expect(r.routeHints).toEqual([
            [
                {
                    pubkey: '029e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
                    shortChannelId: '66051x263430x1800',
                    shortChannelIdHex: '0102030405060708',
                    feeBaseMsat: 1,
                    feeProportionalMillionths: 20,
                    cltvExpiryDelta: 3
                },
                {
                    pubkey: '039e03a901b85534ff1e92c43c74431f7ce72046060fcf7a95c37e148f78c77255',
                    shortChannelId: '197637x395016x2314',
                    shortChannelIdHex: '030405060708090a',
                    feeBaseMsat: 2,
                    feeProportionalMillionths: 30,
                    cltvExpiryDelta: 4
                }
            ]
        ]);
    });

    it.each([
        [
            'On mainnet, with fallback (P2SH)',
            '3EktnHQD7RiAE6uzMj2ZifT9YgRrkSgzQX',
            'p2sh'
        ],
        [
            'On mainnet, with fallback (P2WPKH)',
            'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
            'p2wpkh'
        ],
        [
            'On mainnet, with fallback (P2WSH)',
            'bc1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3qccfmv3',
            'p2wsh'
        ],
        [
            'On mainnet, with fallback (P2TR)',
            'bc1pptdvg0d2nj99568qn6ssdy4cygnwuxgw2ukmnwgwz7jpqjz2kszse2s3lm',
            'p2tr'
        ]
    ])('decodes fallback: %s', (prefix, address, type) => {
        const r = decodeBolt11(vector(prefix));
        expect(r.fallbackAddresses[0].address).toBe(address);
        expect(r.fallbackAddresses[0].type).toBe(type);
    });

    it('decodes a pico-BTC amount, one-week expiry and cltv 10', () => {
        const r = decodeBolt11(vector('Please send 0.00967878534 BTC'));
        expect(r.amountMsat).toBe(967_878_534n);
        expect(r.expiry).toBe(604800);
        expect(r.minFinalCltvExpiry).toBe(10);
        expect(r.routeHints[0][0].shortChannelId).toBe('589390x3312x1');
    });

    it('decodes features 8, 14 and 99, and upper-case input', () => {
        const lower = decodeBolt11(vector('Please send $30 for coffee beans'));
        const upper = decodeBolt11(vector('Same, but all upper case'));
        expect(lower.features?.bits.map((b) => b.bit)).toEqual([8, 14, 99]);
        expect(lower.features?.bits[2].unknownRequired).toBe(false);
        expect(upper.paymentHash).toBe(lower.paymentHash);
        expect(upper.normalized).toBe(upper.normalized.toLowerCase());
    });

    it('decodes payment metadata', () => {
        const r = decodeBolt11(
            vector('Please send 0.01 BTC with payment metadata')
        );
        expect(r.metadata).toBe('01fafaf0');
        expect(r.features?.bits.map((b) => b.bit)).toContain(48);
    });

    it('recovers the payee from a high-S signature without an n field', () => {
        const r = decodeBolt11(vector('Public-key recovery with high-S'));
        expect(r.signatureHighS).toBe(true);
        expect(r.signatureStatus).toBe('recovered');
        expect(r.valid).toBe(true);
    });

    it('rejects the "fields which must be ignored" example (lightning/bolts#1357)', () => {
        // This example pads wrong-length `p` fields around the real one.
        // bolts#1357 and lnd#11190 reject any second `p` field, so this
        // decoder does too. The current spec text still lists it as valid.
        expect(() =>
            decodeBolt11(vector('Same, but including fields'))
        ).toThrow('Invoice contains multiple payment hashes');
    });
});

describe('BOLT 11 spec invalid examples', () => {
    it.each([
        ['Bech32 checksum is invalid', 'checksum'],
        ['Malformed bech32 string (no 1)', 'separator'],
        ['Malformed bech32 string (mixed case)', 'Mixed-case'],
        ['String is too short', 'too short'],
        ['Invalid multiplier', 'multiplier'],
        ['Invalid sub-millisatoshi precision', 'sub-millisatoshi']
    ])('throws: %s', (prefix, message) => {
        expect(() => decodeBolt11(vector(prefix))).toThrow(message);
    });

    it.each([
        [
            'Same, but adding invalid unknown feature 100',
            'unknown_required_feature'
        ],
        ['Signature is not recoverable', 'signature_not_recoverable'],
        ['Missing required `s` field', 'missing_payment_secret'],
        [
            "Non canonical signature (high-S) with 'n' field defined",
            'high_s_with_payee'
        ]
    ])('decodes but marks invalid: %s', (prefix, code) => {
        const r = decodeBolt11(vector(prefix));
        expect(r.valid).toBe(false);
        expect(r.issues.map((i) => i.code)).toContain(code);
    });
});

describe('route hints and features match light-bolt11-decoder', () => {
    it.each(
        vectors.valid
            .filter(
                (v) => !v.description.startsWith('Same, but including fields')
            )
            .map((v) => [v.description.slice(0, 50), v.invoice])
    )('%s', (_d, invoice) => {
        const ours = decodeBolt11(invoice);
        const theirs = lightBolt11.decode(invoice.toLowerCase());
        const routing = theirs.sections.filter(
            (s) => s.name === 'route_hint'
        ) as unknown as { value: unknown[] }[];
        expect(ours.routeHints.length).toBe(routing.length);
        routing.forEach((section, i) => {
            expect(
                ours.routeHints[i].map((h) => ({
                    pubkey: h.pubkey,
                    short_channel_id: h.shortChannelIdHex,
                    fee_base_msat: h.feeBaseMsat,
                    fee_proportional_millionths: h.feeProportionalMillionths,
                    cltv_expiry_delta: h.cltvExpiryDelta
                }))
            ).toEqual(section.value);
        });
    });
});

// Hand-assembled invoices for tag-level rules. The signature block is all
// zeros, so these decode with a signature_not_recoverable error; the tests
// look only at the tag loop. Ported from ZEUS utils/Bolt11Utils.test.ts.
describe('duplicate and malformed tags', () => {
    const HASH_A = 'aa'.repeat(32);
    const HASH_B = 'bb'.repeat(32);
    const PAYEE_A = '02' + 'ab'.repeat(32);
    const PAYEE_B = '03' + 'cd'.repeat(32);
    const hexToWords = (hex: string) => bytesToWords(hexToBytes(hex));
    const utf8ToWords = (text: string) => bytesToWords(utf8Encode(text));
    const tag = (code: number, words: number[]): number[] => [
        code,
        words.length >> 5,
        words.length & 31,
        ...words
    ];
    const buildInvoice = (tags: number[][]): string => {
        const words: number[] = [0, 0, 0, 0, 0, 0, 1];
        for (const t of tags) words.push(...t);
        words.push(...new Array(104).fill(0));
        return encodeBech32('lnbcrt', words);
    };

    it('throws when the payment_hash tag is duplicated', () => {
        expect(() =>
            decodeBolt11(
                buildInvoice([
                    tag(1, hexToWords(HASH_A)),
                    tag(1, hexToWords(HASH_B))
                ])
            )
        ).toThrow('Invoice contains multiple payment hashes');
    });

    it('throws when the same payment_hash appears twice', () => {
        expect(() =>
            decodeBolt11(
                buildInvoice([
                    tag(1, hexToWords(HASH_A)),
                    tag(1, hexToWords(HASH_A))
                ])
            )
        ).toThrow('Invoice contains multiple payment hashes');
    });

    it('throws on a wrong-length payment_hash followed by a valid one', () => {
        expect(() =>
            decodeBolt11(
                buildInvoice([
                    tag(1, hexToWords('cc'.repeat(20))),
                    tag(1, hexToWords(HASH_B))
                ])
            )
        ).toThrow('Invoice contains multiple payment hashes');
    });

    it('throws when no payment_hash tag is present', () => {
        expect(() =>
            decodeBolt11(buildInvoice([tag(13, utf8ToWords('memo'))]))
        ).toThrow('No valid payment hash found');
    });

    it('throws when the only payment_hash tag has the wrong length', () => {
        expect(() =>
            decodeBolt11(buildInvoice([tag(1, hexToWords('cc'.repeat(20)))]))
        ).toThrow('No valid payment hash found');
    });

    it('keeps the first payment_secret, description_hash, description and payee', () => {
        const r = decodeBolt11(
            buildInvoice([
                tag(1, hexToWords(HASH_A)),
                tag(16, hexToWords(HASH_A)),
                tag(16, hexToWords(HASH_B)),
                tag(13, utf8ToWords('first memo')),
                tag(13, utf8ToWords('second memo')),
                tag(19, hexToWords(PAYEE_A)),
                tag(19, hexToWords(PAYEE_B))
            ])
        );
        expect(r.paymentSecret).toBe(HASH_A);
        expect(r.description).toBe('first memo');
        expect(r.payee).toBe(PAYEE_A);
        expect(
            r.issues.filter((i) => i.code === 'duplicate_field')
        ).toHaveLength(3);
        expect(r.tags.filter((t) => t.ignored)).toHaveLength(3);
    });

    it('skips a wrong-length payee and uses the next valid one', () => {
        const r = decodeBolt11(
            buildInvoice([
                tag(1, hexToWords(HASH_A)),
                tag(19, hexToWords('02' + 'ab'.repeat(31))),
                tag(19, hexToWords(PAYEE_B))
            ])
        );
        expect(r.payee).toBe(PAYEE_B);
        expect(r.issues.map((i) => i.code)).toContain('wrong_length_field');
    });

    it('keeps the first expiry and derives expiresAt from it', () => {
        const r = decodeBolt11(
            buildInvoice([
                tag(1, hexToWords(HASH_A)),
                tag(6, [3, 16, 16]),
                tag(6, [1])
            ])
        );
        expect(r.expiry).toBe(3600);
        expect(r.expiresAt).toBe(r.timestamp + 3600);
        expect(isExpired(r, r.timestamp + 3599)).toBe(false);
        expect(isExpired(r, r.timestamp + 3600)).toBe(true);
    });

    it('flags a non-minimal expiry encoding', () => {
        const r = decodeBolt11(
            buildInvoice([tag(1, hexToWords(HASH_A)), tag(6, [0, 1])])
        );
        expect(r.issues.map((i) => i.code)).toContain('non_minimal_field');
    });

    it('records every occurrence in tags and segments', () => {
        const r = decodeBolt11(
            buildInvoice([
                tag(1, hexToWords(HASH_A)),
                tag(23, hexToWords(HASH_A)),
                tag(23, hexToWords(HASH_B))
            ])
        );
        expect(
            r.tags.filter((t) => t.name === 'description_hash')
        ).toHaveLength(2);
        expect(r.descriptionHash).toBe(HASH_A);
    });

    it('keeps unknown tags with their raw data', () => {
        const r = decodeBolt11(
            buildInvoice([tag(1, hexToWords(HASH_A)), tag(2, [1, 2, 3, 4])])
        );
        const unknown = r.tags.find((t) => t.code === 2);
        expect(unknown?.name).toBe('unknown');
        expect(unknown?.letter).toBe('z');
    });

    it('throws on a truncated tag', () => {
        const words: number[] = [0, 0, 0, 0, 0, 0, 1, 1, 1, 20, 1, 2];
        words.push(...new Array(104).fill(0));
        expect(() => decodeBolt11(encodeBech32('lnbc', words))).toThrow(
            'Truncated'
        );
    });
});

describe('segments', () => {
    it('cover the whole normalized string without gaps or overlaps', () => {
        for (const v of vectors.valid.filter(
            (x) => !x.description.startsWith('Same, but including fields')
        )) {
            const r = decodeBolt11(v.invoice);
            let cursor = 0;
            for (const s of r.segments) {
                expect(s.start).toBe(cursor);
                expect(s.end).toBeGreaterThan(s.start);
                cursor = s.end;
            }
            expect(cursor).toBe(r.normalized.length);
        }
    });
});

describe('parseAmount', () => {
    it.each([
        ['1', 100_000_000_000n],
        ['2500u', 250_000_000n],
        ['20m', 2_000_000_000n],
        ['9678785340p', 967_878_534n],
        ['10n', 1_000n]
    ])('%s', (text, msat) => {
        expect(parseAmount(text)).toBe(msat);
    });

    it('rejects amounts above 21 million BTC', () => {
        expect(() => parseAmount('21000001')).toThrow('21 million');
    });
});
