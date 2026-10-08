import { describe, expect, it } from 'vitest';
import {
    computeMerkleRoot,
    decodeBolt12 as oracleDecode,
    parseTlvStream as oracleParse
} from 'bolt12-utils';
import offers from '../../../test/fixtures/offers-test.json';
import formatStrings from '../../../test/fixtures/format-string-test.json';
import signatureVectors from '../../../test/fixtures/signature-test.json';
import { bytesToHex, hexToBytes } from '../util/bytes';
import { bytesToWords, wordsToChars } from '../util/bech32';
import { decodeBolt12, formatOfferAmount, type Bolt12Result } from './decode';
import { decodeBolt12String } from './bech32';
import { parseTlvStream } from './tlv';
import { merkleRoot, signatureMessage } from './merkle';

function tryDecode(s: string): Bolt12Result | Error {
    try {
        return decodeBolt12(s);
    } catch (e) {
        return e as Error;
    }
}

function expectSegmentsCover(r: Bolt12Result) {
    let cursor = 0;
    for (const s of r.segments) {
        expect(s.start).toBe(cursor);
        cursor = s.end;
    }
    expect(cursor).toBe(r.normalized.length);
}

describe('bolts offers-test.json', () => {
    const valid = offers.filter((v) => v.valid);
    const invalid = offers.filter((v) => !v.valid);

    it.each(valid.map((v) => [v.description, v]))('valid: %s', (_d, v) => {
        const r = decodeBolt12(v.bolt12);
        expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
        expect(r.valid).toBe(true);
        expect(r.message).toBe('offer');
        expect(
            r.records.map((x) => ({
                type: Number(x.type),
                length: x.length,
                hex: x.hex
            }))
        ).toEqual(v.fields);
        expectSegmentsCover(r);
    });

    it.each(invalid.map((v) => [v.description, v.bolt12]))(
        'invalid: %s',
        (_d, s) => {
            const r = tryDecode(s);
            if (r instanceof Error) {
                expect(r.message.length).toBeGreaterThan(0);
            } else {
                expect(r.valid).toBe(false);
                expect(r.issues.some((i) => i.severity === 'error')).toBe(true);
            }
        }
    );
});

describe('decoded offer fields', () => {
    const byDesc = (d: string) =>
        offers.find((v) => v.description === d)!.bolt12;

    it('decodes the description and issuer id', () => {
        const r = decodeBolt12(byDesc('with description (but no amount)'));
        expect(r.fields.offer_description).toBe('Test vectors');
        expect(r.fields.offer_issuer_id).toBe(
            '02eec7245d6b7d2ccb30380bfbe2a3648cd7a942653f5aa340edcea1f283686619'
        );
        expect(r.chainName).toBe('mainnet');
    });

    it('names chains', () => {
        expect(
            decodeBolt12(byDesc('for testnet')).fields.offer_chains?.[0].name
        ).toBe('testnet');
        const both = decodeBolt12(byDesc('for bitcoin or liquidv1')).fields
            .offer_chains;
        expect(both?.map((c) => c.name)).toEqual(['liquidv1', 'mainnet']);
    });

    it('formats an amount with a currency', () => {
        const r = decodeBolt12(byDesc('with currency'));
        expect(r.fields.offer_currency).toBe('USD');
        expect(formatOfferAmount(r.fields)).toMatch(/ USD$/);
    });

    it('decodes blinded paths, including a sciddir first node', () => {
        const pubkey = decodeBolt12(
            byDesc(
                'with blinded path via Bob (0x424242...), path_key 020202...'
            )
        );
        const path = pubkey.fields.offer_paths![0];
        expect(path.firstNodeId.kind).toBe('pubkey');
        expect(path.firstPathKey).toBe('02' + '02'.repeat(32));
        expect(path.hops.length).toBeGreaterThan(0);

        const sciddir = decodeBolt12(
            byDesc('same, with blinded path first_node_id using sciddir')
        );
        expect(sciddir.fields.offer_paths![0].firstNodeId.kind).toBe('sciddir');

        const second = decodeBolt12(
            byDesc(
                '... and with second blinded path via 1x2x3 (direction 1), path_key 020202...'
            )
        );
        const node = second.fields.offer_paths![1].firstNodeId;
        expect(node).toMatchObject({
            kind: 'sciddir',
            direction: 1,
            shortChannelId: '1x2x3'
        });
    });

    it('keeps unknown odd fields', () => {
        const r = decodeBolt12(byDesc('unknown odd field'));
        const unknown = r.records.find((x) => !x.known);
        expect(unknown).toBeDefined();
        expect(unknown!.type % 2n).toBe(1n);
        expect(r.segments.some((s) => s.kind === 'unknown')).toBe(true);
    });

    it('reports the reason for invalid offers', () => {
        const codes = (d: string) => {
            const r = tryDecode(byDesc(d));
            return r instanceof Error
                ? [r.message]
                : r.issues.map((i) => i.code);
        };
        expect(codes('Malformed: fields out of order')).toContain(
            'malformed_tlv'
        );
        expect(codes('Malformed: unknown even TLV type 78')).toContain(
            'unknown_even_type'
        );
        expect(codes('Contains type >= 80')).toContain('type_out_of_range');
        expect(codes('Contains unknown feature 122')).toContain(
            'unknown_even_feature'
        );
        expect(
            codes('Missing offer_description, but has offer_amount')
        ).toContain('amount_without_description');
        expect(codes('Missing offer_amount with offer_currency')).toContain(
            'currency_without_amount'
        );
        expect(codes('Invalid: zero offer_amount')).toContain('zero_amount');
        expect(codes('Missing offer_issuer_id and no offer_path')).toContain(
            'missing_issuer'
        );
        expect(codes('offer_chains with zero entries')).toContain(
            'empty_chains'
        );
        expect(codes('Malformed: zero num_hops in blinded_path')).toContain(
            'invalid_field'
        );
        expect(codes('Bech32 padding exceeds 4-bit limit')[0]).toMatch(
            /padding/
        );
    });

    it('computes the offer merkle root', () => {
        const r = decodeBolt12(byDesc('Minimal bolt12 offer'));
        expect(r.merkleRoot).toHaveLength(64);
        expect(r.signatureStatus).toBe('not_applicable');
    });
});

describe('bolts format-string-test.json', () => {
    it.each(formatStrings.map((v) => [v.comment, v.valid, v.string] as const))(
        '%s',
        (_c, valid, s) => {
            if (valid) {
                const r = decodeBolt12(s);
                expect(r.valid).toBe(true);
                expect(r.fields.offer_description).toBeDefined();
                expectSegmentsCover(r);
            } else {
                expect(() => decodeBolt12String(s)).toThrow();
            }
        }
    );

    it('marks + joins and whitespace as continuation segments', () => {
        const s = formatStrings.find(
            (v) => v.comment === '+ can be followed by whitespace'
        )!.string;
        const r = decodeBolt12(s);
        const joins = r.segments.filter((x) => x.kind === 'continuation');
        expect(joins.length).toBeGreaterThan(0);
        for (const j of joins) {
            expect(/^[+\s]+$/.test(r.normalized.slice(j.start, j.end))).toBe(
                true
            );
        }
    });
});

describe('bolts signature-test.json', () => {
    // The synthetic vectors embed each TLV's bytes in the LnLeaf key.
    const tlvsFromLeaves = (v: {
        leaves: Record<string, string | undefined>[];
    }) =>
        v.leaves.map((leaf) => {
            const key = Object.keys(leaf).find((k) =>
                k.startsWith('H(`LnLeaf`,')
            )!;
            return key.slice('H(`LnLeaf`,'.length, -1);
        });

    it.each(
        signatureVectors
            .filter((v) => !('bolt12' in v))
            .map((v) => [v.comment, v])
    )('merkle root: %s', (_c, v) => {
        const stream = parseTlvStream(hexToBytes(tlvsFromLeaves(v).join('')));
        expect(stream.error).toBeUndefined();
        expect(bytesToHex(merkleRoot(stream.records)!)).toBe(v.merkle);
    });

    it('verifies the invoice_request signature', () => {
        const v = signatureVectors.find((x) => 'bolt12' in x) as unknown as {
            bolt12: string;
            merkle: string;
            signature: string;
            'H(signature_tag,merkle)': string;
        };
        const r = decodeBolt12(v.bolt12);
        expect(r.message).toBe('invoice_request');
        expect(r.merkleRoot).toBe(v.merkle);
        expect(r.fields.signature).toBe(v.signature);
        expect(
            bytesToHex(
                signatureMessage(
                    'invoice_request',
                    'signature',
                    hexToBytes(v.merkle)
                )
            )
        ).toBe(v['H(signature_tag,merkle)']);
        expect(r.signatureStatus).toBe('valid');
        expect(r.valid).toBe(true);
        expect(r.fields.offer_description).toBe('A Mathematical Treatise');
        expect(r.fields.offer_currency).toBe('USD');
        expect(formatOfferAmount(r.fields)).toBe('1.00 USD');
        expect(r.fields.invreq_metadata).toBe('0000000000000000');
    });

    it('rejects a tampered invoice_request signature', () => {
        const v = signatureVectors.find((x) => 'bolt12' in x) as unknown as {
            bolt12: string;
        };
        const original = decodeBolt12String(v.bolt12);
        const desc = parseTlvStream(original.bytes).records.find(
            (x) => x.type === 10n
        )!;
        // Change one byte inside offer_description; lengths stay the same.
        const bytes = original.bytes.slice();
        bytes[desc.end - 1] ^= 0x01;
        const tampered = `lnr1${wordsToChars(bytesToWords(bytes))}`;
        const r = decodeBolt12(tampered);
        expect(r.fields.signature).toBeDefined();
        expect(r.signatureStatus).toBe('invalid');
        expect(r.valid).toBe(false);
        expect(r.issues.map((i) => i.code)).toContain('invalid_signature');
    });
});

describe('differential against bolt12-utils', () => {
    const strings = [
        ...offers.filter((v) => v.valid).map((v) => v.bolt12),
        ...formatStrings.filter((v) => v.valid).map((v) => v.string),
        ...signatureVectors
            .filter((v) => 'bolt12' in v)
            .map((v) => (v as unknown as { bolt12: string }).bolt12)
    ];

    it.each(strings.map((s) => [s.slice(0, 40), s]))('%s', (_p, s) => {
        const ours = decodeBolt12(s);
        const theirs = oracleDecode(s);
        const theirRecords = oracleParse(theirs.data);
        expect(ours.hrp).toBe(theirs.hrp);
        expect(ours.records.map((r) => [r.type, r.hex])).toEqual(
            theirRecords.map((r) => [r.type, bytesToHex(r.value)])
        );
        expect(ours.merkleRoot).toBe(
            bytesToHex(computeMerkleRoot(theirRecords))
        );
    });
});
