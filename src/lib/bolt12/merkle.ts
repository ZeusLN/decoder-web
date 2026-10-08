/**
 * BOLT 12 merkle root and signatures.
 *
 * Every TLV outside the signature range (240-1000) becomes a leaf
 * H("LnLeaf", tlv) paired with a nonce H("LnNonce" || first_tlv, type),
 * combined as H("LnBranch", lesser || greater). Pairs are then merged up a
 * tree whose deepest part sits on the lowest-order leaves. Checked against
 * bolts bolt12/signature-test.json.
 */
import { schnorr } from '@noble/curves/secp256k1.js';
import { concatBytes, hexToBytes, utf8Encode } from '../util/bytes';
import { encodeBigSize } from '../util/bigsize';
import { taggedHash } from '../util/hash';
import type { RawTlv } from './tlv';

export function isSignatureType(type: bigint): boolean {
    return type >= 240n && type <= 1000n;
}

function compare(a: Uint8Array, b: Uint8Array): number {
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return a[i] - b[i];
    }
    return 0;
}

export function branchHash(a: Uint8Array, b: Uint8Array): Uint8Array {
    const [lo, hi] = compare(a, b) <= 0 ? [a, b] : [b, a];
    return taggedHash('LnBranch', concatBytes(lo, hi));
}

/** Per-TLV leaf hashes, exposed for display and for payer proofs. */
export interface MerkleLeaf {
    type: bigint;
    leaf: Uint8Array;
    nonce: Uint8Array;
    branch: Uint8Array;
}

export function merkleLeaves(records: RawTlv[]): MerkleLeaf[] {
    const included = records.filter((r) => !isSignatureType(r.type));
    if (included.length === 0) return [];
    const nonceTag = concatBytes(utf8Encode('LnNonce'), included[0].raw);
    return included.map((r) => {
        const leaf = taggedHash('LnLeaf', r.raw);
        const nonce = taggedHash(nonceTag, encodeBigSize(r.type));
        return { type: r.type, leaf, nonce, branch: branchHash(leaf, nonce) };
    });
}

/** Merges level hashes up the tree (rust-lightning offers/merkle.rs layout). */
export function rootFromBranches(branches: Uint8Array[]): Uint8Array | null {
    if (branches.length === 0) return null;
    const nodes = branches.slice();
    for (let step = 2; step / 2 < nodes.length; step *= 2) {
        const offset = step / 2;
        for (let i = 0; i + offset < nodes.length; i += step) {
            nodes[i] = branchHash(nodes[i], nodes[i + offset]);
        }
    }
    return nodes[0];
}

export function merkleRoot(records: RawTlv[]): Uint8Array | null {
    return rootFromBranches(merkleLeaves(records).map((l) => l.branch));
}

/** H("lightning" || messagename || fieldname, merkle_root). */
export function signatureMessage(
    messageName: string,
    fieldName: string,
    root: Uint8Array
): Uint8Array {
    return taggedHash(`lightning${messageName}${fieldName}`, root);
}

/** BIP 340 check against a 33-byte compressed key (hex). */
export function verifyBip340(
    signatureHex: string,
    message: Uint8Array,
    pubkeyHex: string
): boolean {
    try {
        const xOnly = hexToBytes(pubkeyHex).slice(1);
        return schnorr.verify(hexToBytes(signatureHex), message, xOnly);
    } catch {
        return false;
    }
}
