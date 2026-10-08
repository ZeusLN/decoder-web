import { CHARSET, wordsToBytes, wordsToInt } from '../util/bech32';
import { bytesToHex } from '../util/bytes';

/** BOLT 11 tagged field types, keyed by 5-bit type value. */
export const TAG_NAMES: Record<number, string> = {
    1: 'payment_hash',
    3: 'route_hint',
    5: 'features',
    6: 'expiry',
    9: 'fallback_address',
    13: 'description',
    16: 'payment_secret',
    19: 'payee',
    23: 'description_hash',
    24: 'min_final_cltv_expiry',
    27: 'metadata'
};

export function tagLetter(code: number): string {
    return CHARSET[code];
}

/** Lengths, in 5-bit words, that fixed-size tags must have (BOLT 11). */
export const FIXED_TAG_WORDS: Record<number, number> = {
    1: 52,
    16: 52,
    23: 52,
    19: 53
};

export interface RouteHop {
    pubkey: string;
    /** Short channel id as block x tx x output. */
    shortChannelId: string;
    shortChannelIdHex: string;
    feeBaseMsat: number;
    feeProportionalMillionths: number;
    cltvExpiryDelta: number;
}

export function formatScid(scid: bigint): string {
    const block = scid >> 40n;
    const tx = (scid >> 16n) & 0xffffffn;
    const out = scid & 0xffffn;
    return `${block}x${tx}x${out}`;
}

/**
 * Parses an `r` tag: one route, as a list of 51-byte hops. Returns the hops
 * and the number of trailing bytes that did not form a whole hop.
 */
export function parseRouteHint(words: number[]): {
    hops: RouteHop[];
    leftoverBytes: number;
} {
    const bytes = wordsToBytes(words);
    const hops: RouteHop[] = [];
    let offset = 0;
    while (bytes.length - offset >= 51) {
        const hop = bytes.slice(offset, offset + 51);
        const view = new DataView(hop.buffer, hop.byteOffset, hop.length);
        const scid = view.getBigUint64(33);
        hops.push({
            pubkey: bytesToHex(hop.slice(0, 33)),
            shortChannelId: formatScid(scid),
            shortChannelIdHex: bytesToHex(hop.slice(33, 41)),
            feeBaseMsat: view.getUint32(41),
            feeProportionalMillionths: view.getUint32(45),
            cltvExpiryDelta: view.getUint16(49)
        });
        offset += 51;
    }
    return { hops, leftoverBytes: bytes.length - offset };
}

/** Set bits of a BOLT 11 `9` field. Bit 0 is the low bit of the last word. */
export function featureBitsFromWords(words: number[]): number[] {
    const bits: number[] = [];
    for (let i = 0; i < words.length; i++) {
        const word = words[words.length - 1 - i];
        for (let j = 0; j < 5; j++) {
            if (word & (1 << j)) bits.push(i * 5 + j);
        }
    }
    return bits;
}

export { wordsToInt };
