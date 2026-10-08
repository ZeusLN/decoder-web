import { sha256 as nobleSha256 } from '@noble/hashes/sha2.js';
import { concatBytes, utf8Encode } from './bytes';

export function sha256(data: Uint8Array): Uint8Array {
    return nobleSha256(data);
}

/** BIP 340 tagged hash: SHA256(SHA256(tag) || SHA256(tag) || msg). */
export function taggedHash(
    tag: string | Uint8Array,
    ...msgs: Uint8Array[]
): Uint8Array {
    const tagHash = sha256(typeof tag === 'string' ? utf8Encode(tag) : tag);
    return sha256(concatBytes(tagHash, tagHash, ...msgs));
}
