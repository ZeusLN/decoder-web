import { createBase58check, bech32, bech32m } from '@scure/base';
import { sha256 } from './hash';
import type { Network } from './chains';

const base58check = createBase58check(sha256);

export type AddressType =
    'p2pkh' | 'p2sh' | 'p2wpkh' | 'p2wsh' | 'p2tr' | 'segwit';

export interface DecodedAddress {
    address: string;
    type: AddressType;
    /** Witness version for segwit outputs, or 17/18 for BOLT 11 P2PKH/P2SH codes. */
    version: number;
}

/**
 * Encodes a fallback on-chain address from its version and program, as found
 * in BOLT 11 `f` tags (17 = P2PKH, 18 = P2SH, 0-16 = witness version) and
 * BOLT 12 `invoice_fallbacks` (witness version only). Returns null when the
 * program length is invalid for the version.
 */
export function encodeFallbackAddress(
    version: number,
    program: Uint8Array,
    network: Network
): DecodedAddress | null {
    if (version === 17 || version === 18) {
        if (program.length !== 20) return null;
        const prefix = version === 17 ? network.pubKeyHash : network.scriptHash;
        const payload = new Uint8Array(21);
        payload[0] = prefix;
        payload.set(program, 1);
        return {
            address: base58check.encode(payload),
            type: version === 17 ? 'p2pkh' : 'p2sh',
            version
        };
    }
    if (version < 0 || version > 16) return null;
    if (program.length < 2 || program.length > 40) return null;
    if (version === 0 && program.length !== 20 && program.length !== 32) {
        return null;
    }
    const words = [version, ...bech32.toWords(program)];
    const coder = version === 0 ? bech32 : bech32m;
    const type: AddressType =
        version === 0
            ? program.length === 20
                ? 'p2wpkh'
                : 'p2wsh'
            : version === 1 && program.length === 32
              ? 'p2tr'
              : 'segwit';
    return {
        address: coder.encode(network.bech32, words, false),
        type,
        version
    };
}
