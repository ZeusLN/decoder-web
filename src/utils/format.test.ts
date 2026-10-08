import { describe, expect, it } from 'vitest';
import {
    formatBtc,
    formatDuration,
    formatMsat,
    formatSats,
    relativeTime,
    toJson
} from './format';

describe('format', () => {
    it('formats amounts', () => {
        expect(formatSats(250_000_000n)).toBe('250,000 sat');
        expect(formatSats(967_878_534n)).toBe('967,878.534 sat');
        expect(formatSats(1_500n)).toBe('1.5 sat');
        expect(formatMsat(1_000n)).toBe('1,000 msat');
        expect(formatBtc(250_000_000n)).toBe('0.0025 BTC');
        expect(formatBtc(100_000_000_000n)).toBe('1 BTC');
        expect(formatBtc(967_878_534n)).toBe('0.00967878534 BTC');
    });

    it('formats durations', () => {
        expect(formatDuration(3600)).toBe('1 hour');
        expect(formatDuration(604800)).toBe('7 days');
        expect(formatDuration(60)).toBe('1 minute');
        expect(formatDuration(90)).toBe('90 seconds');
    });

    it('formats relative times', () => {
        expect(relativeTime(1000 + 3600, 1000)).toMatch(/1 hour|in 1/);
        expect(relativeTime(1000 - 2 * 86400, 1000)).toMatch(/2 days ago/);
    });

    it('serializes bigints and bytes', () => {
        expect(toJson({ a: 1n, b: Uint8Array.of(1, 255) })).toContain(
            '"a": "1"'
        );
        expect(toJson({ b: Uint8Array.of(1, 255) })).toContain('"01ff"');
    });
});
