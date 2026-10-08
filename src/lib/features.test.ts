import { describe, expect, it } from 'vitest';
import {
    describeFeatures,
    featureDescription,
    featureName,
    setBits
} from './features';
import { hexToBytes } from './util/bytes';

describe('features', () => {
    it('lists set bits from a big-endian vector', () => {
        // 0x0200 sets bit 9, 0x4100 -> bits 8 and 14.
        expect(setBits(hexToBytes('0200'))).toEqual([9]);
        expect(setBits(hexToBytes('4100'))).toEqual([8, 14]);
        expect(setBits(hexToBytes(''))).toEqual([]);
    });

    it('names both bits of a pair', () => {
        expect(featureName(14)).toBe('payment_secret');
        expect(featureName(15)).toBe('payment_secret');
        expect(featureName(101)).toBeUndefined();
    });

    it('flags unknown even bits per context', () => {
        const [known, odd, unknownEven] = describeFeatures(
            [14, 101, 100],
            'bolt11'
        );
        expect(known.unknownRequired).toBe(false);
        expect(odd.unknownRequired).toBe(false);
        expect(odd.name).toBe('unknown feature 101');
        expect(unknownEven.unknownRequired).toBe(true);
    });

    it('describes known and unknown bits', () => {
        const [secret, odd, even] = describeFeatures([15, 101, 100], 'bolt11');
        expect(secret.description).toMatch(/payment secret/);
        expect(odd.description).toMatch(/optional/);
        expect(even.description).toMatch(/must not pay/);
        expect(featureDescription(9)).toBe(featureDescription(8));
    });
});
