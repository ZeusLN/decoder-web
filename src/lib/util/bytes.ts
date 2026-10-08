/** Byte helpers shared by every decoder. No DOM or Node APIs. */

const HEX = '0123456789abcdef';

export function bytesToHex(bytes: Uint8Array): string {
    let out = '';
    for (const b of bytes) {
        out += HEX[b >> 4] + HEX[b & 15];
    }
    return out;
}

export function hexToBytes(hex: string): Uint8Array {
    const clean = hex.toLowerCase();
    if (clean.length % 2 !== 0 || !/^[0-9a-f]*$/.test(clean)) {
        throw new Error('Invalid hex string');
    }
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i++) {
        out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
}

export function isHex(value: string): boolean {
    return value.length % 2 === 0 && /^[0-9a-fA-F]*$/.test(value);
}

const strictUtf8 = new TextDecoder('utf-8', { fatal: true });
const lenientUtf8 = new TextDecoder('utf-8');

/** Decodes UTF-8, returning null instead of replacement characters. */
export function utf8DecodeStrict(bytes: Uint8Array): string | null {
    try {
        return strictUtf8.decode(bytes);
    } catch {
        return null;
    }
}

export function utf8Decode(bytes: Uint8Array): string {
    return lenientUtf8.decode(bytes);
}

export function utf8Encode(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
    const total = parts.reduce((n, p) => n + p.length, 0);
    const out = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) {
        out.set(p, offset);
        offset += p.length;
    }
    return out;
}

export function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}

/** Big-endian unsigned integer from bytes. */
export function bytesToBigInt(bytes: Uint8Array): bigint {
    let n = 0n;
    for (const b of bytes) {
        n = (n << 8n) | BigInt(b);
    }
    return n;
}
