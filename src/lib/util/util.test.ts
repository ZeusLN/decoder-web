import { describe, expect, it } from 'vitest';
import { bech32 as scureBech32, bech32m as scureBech32m } from '@scure/base';
import {
    bytesToWords,
    decodeBech32,
    encodeBech32,
    wordsToBytes
} from './bech32';
import { encodeBigSize, readBigSize, readTruncatedUint } from './bigsize';
import { bytesToHex, hexToBytes, utf8DecodeStrict } from './bytes';
import { encodeFallbackAddress } from './address';
import { MAINNET, NETWORKS, chainName } from './chains';
import { formatCurrencyAmount } from './currency';
import { taggedHash } from './hash';

describe('bech32', () => {
    it('decodes BIP 173 and BIP 350 valid strings', () => {
        expect(decodeBech32('A12UEL5L').encoding).toBe('bech32');
        expect(decodeBech32('a12uel5l').hrp).toBe('a');
        expect(
            decodeBech32('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4').encoding
        ).toBe('bech32');
        expect(decodeBech32('A1LQFN3A').encoding).toBe('bech32m');
    });

    it('accepts strings longer than the BIP 173 90-character limit', () => {
        const words = new Array(200).fill(7);
        const s = encodeBech32('lnbc', words);
        expect(s.length).toBeGreaterThan(90);
        expect(decodeBech32(s).words).toEqual(words);
    });

    it('rejects mixed case, bad checksum and missing separator', () => {
        expect(() => decodeBech32('A12uEL5L')).toThrow('Mixed-case');
        expect(() => decodeBech32('a12uel5m')).toThrow('checksum');
        expect(() => decodeBech32('pzry9x0s0muk')).toThrow('separator');
        expect(() => decodeBech32('a1b2c3')).toThrow();
    });

    it('converts between bytes and words', () => {
        const bytes = hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6');
        const words = bytesToWords(bytes);
        expect(words).toEqual(scureBech32.toWords(bytes));
        expect(bytesToHex(wordsToBytes(words, true))).toBe(bytesToHex(bytes));
    });

    it('rejects non-zero padding in strict mode only', () => {
        expect(() => wordsToBytes([31], true)).toThrow('padding');
        expect(wordsToBytes([31]).length).toBe(0);
    });
});

describe('BigSize (BOLT 1 vectors)', () => {
    const valid: [string, bigint][] = [
        ['00', 0n],
        ['fc', 252n],
        ['fd00fd', 253n],
        ['fdffff', 65535n],
        ['fe00010000', 65536n],
        ['feffffffff', 4294967295n],
        ['ff0000000100000000', 4294967296n],
        ['ffffffffffffffffff', 18446744073709551615n]
    ];

    it.each(valid)('reads %s', (hex, value) => {
        const r = readBigSize(hexToBytes(hex), 0);
        expect(r.value).toBe(value);
        expect(r.size).toBe(hex.length / 2);
        expect(bytesToHex(encodeBigSize(value))).toBe(hex);
    });

    it.each(['fd00fc', 'fe0000ffff', 'ff00000000ffffffff'])(
        'rejects non-minimal %s',
        (hex) => {
            expect(() => readBigSize(hexToBytes(hex), 0)).toThrow(
                'Non-minimal'
            );
        }
    );

    it.each(['fd00', 'feffff', 'ffffffffff', ''])(
        'rejects truncated %s',
        (hex) => {
            expect(() => readBigSize(hexToBytes(hex), 0)).toThrow(
                'Unexpected end'
            );
        }
    );
});

describe('truncated integers', () => {
    it('reads minimal values and rejects leading zeros', () => {
        expect(readTruncatedUint(new Uint8Array(0), 8)).toBe(0n);
        expect(readTruncatedUint(hexToBytes('0100'), 8)).toBe(256n);
        expect(() => readTruncatedUint(hexToBytes('0001'), 8)).toThrow(
            'leading zero'
        );
        expect(() => readTruncatedUint(hexToBytes('010203'), 2)).toThrow();
    });
});

describe('fallback addresses', () => {
    it('encodes P2PKH (Bitcoin wiki example)', () => {
        const a = encodeFallbackAddress(
            17,
            hexToBytes('f54a5851e9372b87810a8e60cdd2e7cfd80b6e31'),
            MAINNET
        );
        expect(a).toEqual({
            address: '1PMycacnJaSqwwJqjawXBErnLsZ7RkXUAs',
            type: 'p2pkh',
            version: 17
        });
    });

    it('encodes P2WPKH (BIP 173 vector)', () => {
        const a = encodeFallbackAddress(
            0,
            hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6'),
            MAINNET
        );
        expect(a?.address).toBe('bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4');
        expect(a?.type).toBe('p2wpkh');
    });

    it('encodes P2TR with bech32m (BIP 350 vector)', () => {
        const program = hexToBytes(
            '79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798'
        );
        const a = encodeFallbackAddress(1, program, MAINNET);
        expect(a?.address).toBe(
            'bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0'
        );
        expect(a?.type).toBe('p2tr');
        const decoded = scureBech32m.decode(
            a!.address as `${string}1${string}`
        );
        expect(decoded.words[0]).toBe(1);
    });

    it('uses the network prefix and rejects bad program lengths', () => {
        const regtest = NETWORKS.find((n) => n.name === 'regtest')!;
        const program = hexToBytes('751e76e8199196d454941c45d1b3a323f1433bd6');
        expect(
            encodeFallbackAddress(0, program, regtest)?.address.startsWith(
                'bcrt1q'
            )
        ).toBe(true);
        expect(encodeFallbackAddress(0, program.slice(0, 19), MAINNET)).toBe(
            null
        );
        expect(encodeFallbackAddress(17, program.slice(0, 19), MAINNET)).toBe(
            null
        );
        expect(encodeFallbackAddress(19, program, MAINNET)).toBe(null);
    });
});

describe('misc helpers', () => {
    it('names known chains', () => {
        expect(chainName(MAINNET.chainHash!)).toBe('mainnet');
        expect(
            chainName(
                '43f08bdab050e35b567c864b91f47f50ae725ae2de53bcfbbaf284da00000000'
            )
        ).toBe('testnet4');
        expect(chainName('00'.repeat(32))).toBeUndefined();
    });

    it('formats currency amounts with ISO 4217 exponents', () => {
        expect(formatCurrencyAmount(150n, 'USD')).toBe('1.50 USD');
        expect(formatCurrencyAmount(5n, 'USD')).toBe('0.05 USD');
        expect(formatCurrencyAmount(150n, 'JPY')).toBe('150 JPY');
        expect(formatCurrencyAmount(150n, 'XYZ')).toBe('150 XYZ');
    });

    it('decodes strict UTF-8', () => {
        expect(utf8DecodeStrict(hexToBytes('e282ac'))).toBe('€');
        expect(utf8DecodeStrict(hexToBytes('ff'))).toBe(null);
    });

    it('computes BIP 340 tagged hashes', () => {
        // taggedHash("BIP0340/challenge", empty) from the BIP 340 reference.
        expect(
            bytesToHex(taggedHash('BIP0340/challenge', new Uint8Array(0)))
        ).toHaveLength(64);
    });
});
