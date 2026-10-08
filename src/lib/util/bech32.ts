/**
 * Bech32 helpers for BOLT 11, LNURL and segwit addresses.
 *
 * Unlike BIP 173 implementations, decodeBech32 has no 90-character limit:
 * Lightning invoices and LNURLs are routinely longer.
 */

export const CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

const CHARSET_REV: Record<string, number> = {};
for (let i = 0; i < CHARSET.length; i++) {
    CHARSET_REV[CHARSET[i]] = i;
}

const GENERATOR = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];

const BECH32_CONST = 1;
const BECH32M_CONST = 0x2bc830a3;

export type Bech32Encoding = 'bech32' | 'bech32m';

function polymod(values: number[]): number {
    let chk = 1;
    for (const v of values) {
        const top = chk >>> 25;
        chk = ((chk & 0x1ffffff) << 5) ^ v;
        for (let i = 0; i < 5; i++) {
            if ((top >>> i) & 1) chk ^= GENERATOR[i];
        }
    }
    return chk >>> 0;
}

function hrpExpand(hrp: string): number[] {
    const out: number[] = [];
    for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
    out.push(0);
    for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
    return out;
}

/** Maps characters to 5-bit words. Throws on characters outside the set. */
export function charsToWords(data: string): number[] {
    const words: number[] = [];
    for (const ch of data) {
        const v = CHARSET_REV[ch];
        if (v === undefined) {
            throw new Error(`Invalid bech32 character '${ch}'`);
        }
        words.push(v);
    }
    return words;
}

export function wordsToChars(words: number[]): string {
    return words.map((w) => CHARSET[w]).join('');
}

export interface Bech32Decoded {
    hrp: string;
    /** Data words without the 6-word checksum. */
    words: number[];
    encoding: Bech32Encoding;
}

/**
 * Decodes a checksummed bech32 or bech32m string of any length. Rejects
 * mixed case, a missing separator, and a bad checksum.
 */
export function decodeBech32(input: string): Bech32Decoded {
    if (input !== input.toLowerCase() && input !== input.toUpperCase()) {
        throw new Error('Mixed-case bech32 string');
    }
    const str = input.toLowerCase();
    const sep = str.lastIndexOf('1');
    if (sep < 1) {
        throw new Error('Missing bech32 separator');
    }
    if (str.length - sep - 1 < 6) {
        throw new Error('Bech32 data part too short');
    }
    const hrp = str.slice(0, sep);
    for (let i = 0; i < hrp.length; i++) {
        const c = hrp.charCodeAt(i);
        if (c < 33 || c > 126) {
            throw new Error('Invalid character in bech32 prefix');
        }
    }
    const data = charsToWords(str.slice(sep + 1));
    const check = polymod([...hrpExpand(hrp), ...data]);
    let encoding: Bech32Encoding;
    if (check === BECH32_CONST) encoding = 'bech32';
    else if (check === BECH32M_CONST) encoding = 'bech32m';
    else throw new Error('Invalid bech32 checksum');
    return { hrp, words: data.slice(0, -6), encoding };
}

export function encodeBech32(
    hrp: string,
    words: number[],
    encoding: Bech32Encoding = 'bech32'
): string {
    const constant = encoding === 'bech32' ? BECH32_CONST : BECH32M_CONST;
    const values = [...hrpExpand(hrp), ...words, 0, 0, 0, 0, 0, 0];
    const mod = polymod(values) ^ constant;
    const checksum: number[] = [];
    for (let i = 0; i < 6; i++) checksum.push((mod >>> (5 * (5 - i))) & 31);
    return `${hrp}1${wordsToChars([...words, ...checksum])}`;
}

/**
 * Regroups 5-bit words into bytes. With `strict`, leftover bits must be
 * fewer than 5 and all zero (BIP 173 rules); otherwise a trailing partial
 * byte is dropped, which is what BOLT 11 tag parsing needs.
 */
export function wordsToBytes(words: number[], strict = false): Uint8Array {
    let acc = 0;
    let bits = 0;
    const out: number[] = [];
    for (const w of words) {
        acc = (acc << 5) | w;
        bits += 5;
        while (bits >= 8) {
            bits -= 8;
            out.push((acc >> bits) & 0xff);
        }
        acc &= (1 << bits) - 1;
    }
    if (strict && (bits >= 5 || acc !== 0)) {
        throw new Error('Invalid padding in bech32 data');
    }
    return Uint8Array.from(out);
}

/**
 * Regroups 5-bit words into bytes, zero-padding a trailing partial byte.
 * BOLT 11 signs the data part in this form.
 */
export function wordsToBytesPadded(words: number[]): Uint8Array {
    let acc = 0;
    let bits = 0;
    const out: number[] = [];
    for (const w of words) {
        acc = (acc << 5) | w;
        bits += 5;
        while (bits >= 8) {
            bits -= 8;
            out.push((acc >> bits) & 0xff);
        }
        acc &= (1 << bits) - 1;
    }
    if (bits > 0) out.push((acc << (8 - bits)) & 0xff);
    return Uint8Array.from(out);
}

/** Regroups bytes into 5-bit words, zero-padding the last word. */
export function bytesToWords(bytes: Uint8Array): number[] {
    let acc = 0;
    let bits = 0;
    const out: number[] = [];
    for (const b of bytes) {
        acc = (acc << 8) | b;
        bits += 8;
        while (bits >= 5) {
            bits -= 5;
            out.push((acc >> bits) & 31);
        }
        acc &= (1 << bits) - 1;
    }
    if (bits > 0) out.push((acc << (5 - bits)) & 31);
    return out;
}

/** Big-endian integer from 5-bit words. */
export function wordsToInt(words: number[]): number {
    let n = 0;
    for (const w of words) n = n * 32 + w;
    return n;
}
