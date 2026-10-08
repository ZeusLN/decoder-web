/**
 * BOLT 12 string encoding: bech32 characters without a checksum. A `+`
 * followed by optional whitespace may join two parts of the string
 * anywhere, so long offers can be split across lines. Ported from lnd
 * bolt12/bech32.go and checked against bolts format-string-test.json.
 */
import { charsToWords, wordsToBytes } from '../util/bech32';

export interface Bolt12String {
    /** Lowercased input with joins kept; segment offsets refer to it. */
    normalized: string;
    /** `lno`, `lnr`, `lni` or `lnp`. */
    hrp: string;
    bytes: Uint8Array;
    /**
     * For each character of the joined string (hrp + '1' + data), its
     * offset in `normalized`.
     */
    offsets: number[];
    /** Offsets in `normalized` of `+` characters and the whitespace after them. */
    continuations: number[];
}

const BECH32_CHARS = /^[qpzry9x8gf2tvdw0s3jn54khce6mua7l]$/;

function isWhitespace(ch: string): boolean {
    return /\s/.test(ch);
}

export function decodeBolt12String(input: string): Bolt12String {
    const trimmed = input.trim();
    const letters = trimmed.replace(/[^a-zA-Z]/g, '');
    if (
        letters !== letters.toLowerCase() &&
        letters !== letters.toUpperCase()
    ) {
        throw new Error('Mixed-case BOLT 12 string');
    }
    const normalized = trimmed.toLowerCase();

    // Strip `+` joins, keeping a map back to the original offsets.
    let joined = '';
    const offsets: number[] = [];
    const continuations: number[] = [];
    let i = 0;
    while (i < normalized.length) {
        const ch = normalized[i];
        if (ch === '+') {
            const prev = normalized[i - 1];
            if (prev === undefined || prev === '+' || isWhitespace(prev)) {
                throw new Error("'+' must follow a character of the string");
            }
            continuations.push(i);
            i++;
            while (i < normalized.length && isWhitespace(normalized[i])) {
                continuations.push(i);
                i++;
            }
            if (i >= normalized.length || normalized[i] === '+') {
                throw new Error("'+' must be followed by more of the string");
            }
            continue;
        }
        if (isWhitespace(ch)) {
            throw new Error("Whitespace is only allowed after a '+' join");
        }
        joined += ch;
        offsets.push(i);
        i++;
    }

    const sep = joined.indexOf('1');
    if (sep < 1) {
        throw new Error('Missing separator after the BOLT 12 prefix');
    }
    const hrp = joined.slice(0, sep);
    const data = joined.slice(sep + 1);
    for (const ch of data) {
        if (!BECH32_CHARS.test(ch)) {
            throw new Error(`Invalid character '${ch}' in BOLT 12 string`);
        }
    }
    let bytes: Uint8Array;
    try {
        bytes = wordsToBytes(charsToWords(data), true);
    } catch {
        throw new Error('Invalid padding: more than 4 bits or non-zero');
    }
    return { normalized, hrp, bytes, offsets, continuations };
}
