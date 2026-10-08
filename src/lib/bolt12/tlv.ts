/**
 * TLV stream parsing (BOLT 1): BigSize type and length, strictly
 * increasing types, and no reads past the end. Each record keeps its byte
 * offsets so the UI can map it back to characters of the string.
 */
import { readBigSize } from '../util/bigsize';

export interface RawTlv {
    type: bigint;
    value: Uint8Array;
    /** Byte offset of the record's first byte (its type). */
    start: number;
    /** Byte offset just past the record's value. */
    end: number;
    /** Encoded record bytes (type, length and value). */
    raw: Uint8Array;
}

export interface TlvStream {
    records: RawTlv[];
    /** Set when the stream is malformed; `records` holds what parsed before it. */
    error?: string;
}

export function parseTlvStream(bytes: Uint8Array): TlvStream {
    const records: RawTlv[] = [];
    let offset = 0;
    let last: bigint | undefined;
    while (offset < bytes.length) {
        const start = offset;
        let type: bigint;
        let length: bigint;
        try {
            const t = readBigSize(bytes, offset);
            type = t.value;
            offset += t.size;
            const l = readBigSize(bytes, offset);
            length = l.value;
            offset += l.size;
        } catch (e) {
            return { records, error: (e as Error).message };
        }
        if (last !== undefined && type <= last) {
            return {
                records,
                error: `TLV type ${type} is not greater than the previous type ${last}`
            };
        }
        if (BigInt(bytes.length - offset) < length) {
            return {
                records,
                error: `TLV type ${type} declares ${length} bytes but only ${bytes.length - offset} remain`
            };
        }
        const end = offset + Number(length);
        records.push({
            type,
            value: bytes.slice(offset, end),
            start,
            end,
            raw: bytes.slice(start, end)
        });
        last = type;
        offset = end;
    }
    return { records };
}
