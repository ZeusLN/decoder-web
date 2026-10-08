/**
 * BOLT 1 integer encodings used by BOLT 12 TLV streams: BigSize for TLV
 * types and lengths, fixed-width big-endian integers, and truncated
 * integers (tu16/tu32/tu64) that must not carry leading zero bytes.
 */

export interface BigSizeRead {
    value: bigint;
    size: number;
}

/**
 * Reads a BigSize at `offset`. Rejects non-minimal encodings and reads past
 * the end of the buffer, both of which BOLT 1 requires readers to fail on.
 */
export function readBigSize(bytes: Uint8Array, offset: number): BigSizeRead {
    if (offset >= bytes.length) {
        throw new Error('Unexpected end of data reading BigSize');
    }
    const first = bytes[offset];
    const width =
        first < 0xfd ? 0 : first === 0xfd ? 2 : first === 0xfe ? 4 : 8;
    if (width === 0) {
        return { value: BigInt(first), size: 1 };
    }
    if (offset + 1 + width > bytes.length) {
        throw new Error('Unexpected end of data reading BigSize');
    }
    let value = 0n;
    for (let i = 0; i < width; i++) {
        value = (value << 8n) | BigInt(bytes[offset + 1 + i]);
    }
    const minimum = width === 2 ? 0xfdn : width === 4 ? 0x10000n : 0x100000000n;
    if (value < minimum) {
        throw new Error('Non-minimal BigSize encoding');
    }
    return { value, size: 1 + width };
}

export function encodeBigSize(value: bigint): Uint8Array {
    if (value < 0xfdn) return Uint8Array.of(Number(value));
    const width = value <= 0xffffn ? 2 : value <= 0xffffffffn ? 4 : 8;
    const out = new Uint8Array(1 + width);
    out[0] = width === 2 ? 0xfd : width === 4 ? 0xfe : 0xff;
    let v = value;
    for (let i = width; i >= 1; i--) {
        out[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return out;
}

/** Fixed-width big-endian unsigned integer. */
export function readUint(
    bytes: Uint8Array,
    offset: number,
    width: number
): bigint {
    if (offset + width > bytes.length) {
        throw new Error(`Unexpected end of data reading u${width * 8}`);
    }
    let value = 0n;
    for (let i = 0; i < width; i++) {
        value = (value << 8n) | BigInt(bytes[offset + i]);
    }
    return value;
}

/**
 * Truncated unsigned integer (tu16/tu32/tu64): the whole value, big-endian,
 * with no leading zero bytes. An empty value is zero.
 */
export function readTruncatedUint(bytes: Uint8Array, maxWidth: number): bigint {
    if (bytes.length > maxWidth) {
        throw new Error(`Truncated integer longer than ${maxWidth} bytes`);
    }
    if (bytes.length > 0 && bytes[0] === 0) {
        throw new Error('Truncated integer has a leading zero byte');
    }
    return readUint(bytes, 0, bytes.length);
}
