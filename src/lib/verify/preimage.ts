/** Checks that a preimage hashes to a payment hash (SHA-256). */
import { bytesToHex, isHex, hexToBytes, utf8Encode } from '../util/bytes';
import { sha256 } from '../util/hash';

export interface PreimageCheck {
    /** How the input was read: 64 hex characters as 32 bytes, anything else as UTF-8 text. */
    interpretedAs: 'hex' | 'text';
    preimageHex: string;
    computedHash: string;
    matches: boolean;
}

export function checkPreimage(
    preimage: string,
    paymentHash: string
): PreimageCheck {
    const input = preimage.trim();
    const asHex = input.length === 64 && isHex(input);
    const bytes = asHex ? hexToBytes(input) : utf8Encode(input);
    const computedHash = bytesToHex(sha256(bytes));
    return {
        interpretedAs: asHex ? 'hex' : 'text',
        preimageHex: bytesToHex(bytes),
        computedHash,
        matches: computedHash === paymentHash.trim().toLowerCase()
    };
}
