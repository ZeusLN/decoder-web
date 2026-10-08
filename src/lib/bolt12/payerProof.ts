/**
 * BOLT 12 payer proofs (`lnp`), a draft in lightning/bolts#1295.
 *
 * A payer proof discloses some fields of a paid invoice plus enough hashes
 * to rebuild the invoice's merkle root, so a third party can check the
 * issuer's invoice signature without seeing the omitted fields. The
 * algorithm follows rust-lightning offers/payer_proof.rs and
 * offers/selective_disclosure.rs and is checked against bolts
 * bolt12/payer-proof-test.json.
 */
import { bytesToHex, hexToBytes } from '../util/bytes';
import { readBigSize } from '../util/bigsize';
import { sha256, taggedHash } from '../util/hash';
import type { Issue } from '../types';
import type { RawTlv } from './tlv';
import {
    branchHash,
    isSignatureType,
    merkleRoot,
    signatureMessage,
    verifyBip340
} from './merkle';

const INVOICE_TYPES_END = 240n;
const EXPERIMENTAL_START = 1_000_000_000n;
const EXPERIMENTAL_INVOICE_END = 4_000_000_000n;

function isProofDataType(type: bigint): boolean {
    return type >= 1001n && type < EXPERIMENTAL_START;
}

/** The marker after `prev`, jumping the signature and proof-data gap. */
export function nextMarker(prev: bigint): bigint {
    const next = prev + 1n;
    return next >= INVOICE_TYPES_END && next < EXPERIMENTAL_START
        ? EXPERIMENTAL_START
        : next;
}

export function parseOmittedTlvs(bytes: Uint8Array): bigint[] {
    const out: bigint[] = [];
    let offset = 0;
    while (offset < bytes.length) {
        const r = readBigSize(bytes, offset);
        out.push(r.value);
        offset += r.size;
    }
    return out;
}

/** Throws if the markers are not a minimized, valid sequence for these included types. */
export function validateOmittedMarkers(
    markers: bigint[],
    included: bigint[]
): void {
    for (const m of markers) {
        if (
            isSignatureType(m) ||
            isProofDataType(m) ||
            m >= EXPERIMENTAL_INVOICE_END
        ) {
            throw new Error(
                `proof_omitted_tlvs contains ${m}, which is outside the allowed ranges`
            );
        }
    }
    const includedSet = new Set(included);
    let expectedNext = nextMarker(0n);
    let prev = 0n;
    let incIndex = 0;
    for (const marker of markers) {
        if (marker === 0n) throw new Error('proof_omitted_tlvs contains 0');
        if (marker <= prev)
            throw new Error('proof_omitted_tlvs is not in ascending order');
        if (includedSet.has(marker)) {
            throw new Error(
                `proof_omitted_tlvs contains ${marker}, which is an included field`
            );
        }
        if (marker !== expectedNext) {
            let found = false;
            while (incIndex < included.length) {
                const inc = included[incIndex++];
                if (nextMarker(inc) === marker) {
                    found = true;
                    break;
                }
                if (inc >= marker) break;
            }
            if (!found)
                throw new Error(
                    `proof_omitted_tlvs marker ${marker} is not minimized`
                );
        }
        expectedNext = nextMarker(marker);
        prev = marker;
    }
}

/** Inclusion map over invoice TLV positions, with type 0 implicitly omitted first. */
function decodePositions(included: bigint[], markers: bigint[]): boolean[] {
    const positions = [false];
    let i = 0;
    let m = 0;
    let prevMarker = 0n;
    while (i < included.length || m < markers.length) {
        if (m >= markers.length) {
            i++;
            positions.push(true);
        } else if (
            i >= included.length ||
            markers[m] === nextMarker(prevMarker)
        ) {
            prevMarker = markers[m++];
            positions.push(false);
        } else {
            prevMarker = included[i++];
            positions.push(true);
        }
    }
    return positions;
}

function reconstruct(
    hashes: (Uint8Array | null)[],
    missing: Uint8Array[],
    cursor: { i: number }
): Uint8Array | null {
    if (hashes.length === 1) return hashes[0];
    let mid = 1;
    while (mid < hashes.length) mid *= 2;
    mid /= 2;
    const left = reconstruct(hashes.slice(0, mid), missing, cursor);
    const right = reconstruct(hashes.slice(mid), missing, cursor);
    if (!left && !right) return null;
    if (left && right) return branchHash(left, right);
    if (cursor.i >= missing.length)
        throw new Error('Not enough proof_missing_hashes');
    const other = missing[cursor.i++];
    return left ? branchHash(left, other) : branchHash(other, right!);
}

export interface PayerProofCheck {
    omittedTlvs: bigint[];
    /** Rebuilt merkle root of the original invoice, hex. */
    invoiceMerkleRoot?: string;
    invoiceSignatureValid: boolean;
    proofSignatureValid: boolean;
    preimageMatchesPaymentHash: boolean;
}

export interface PayerProofInputs {
    payerId?: string;
    nodeId?: string;
    paymentHash?: string;
    invoiceSignature?: string;
    proofSignature?: string;
    preimage?: string;
    leafHashes?: string[];
    missingHashes?: string[];
}

export function verifyPayerProof(
    records: RawTlv[],
    f: PayerProofInputs,
    issues: Issue[]
): PayerProofCheck {
    const fail = (code: string, message: string, type?: number) =>
        issues.push({ code, severity: 'error', message, type });
    const check: PayerProofCheck = {
        omittedTlvs: [],
        invoiceSignatureValid: false,
        proofSignatureValid: false,
        preimageMatchesPaymentHash: false
    };

    const required: [unknown, string, number][] = [
        [f.payerId, 'invreq_payer_id', 88],
        [f.paymentHash, 'invoice_payment_hash', 168],
        [f.nodeId, 'invoice_node_id', 176],
        [f.invoiceSignature, 'signature', 240],
        [f.proofSignature, 'proof_signature', 241],
        [f.preimage, 'proof_preimage', 1001],
        [f.missingHashes, 'proof_missing_hashes', 1003],
        [f.leafHashes, 'proof_leaf_hashes', 1004]
    ];
    for (const [value, name, type] of required) {
        if (value === undefined)
            fail('missing_field', `${name} is missing.`, type);
    }
    if (records.some((r) => r.type === 0n)) {
        fail(
            'contains_invreq_metadata',
            'A payer proof must not disclose invreq_metadata.',
            0
        );
    }

    if (f.preimage && f.paymentHash) {
        check.preimageMatchesPaymentHash =
            bytesToHex(sha256(hexToBytes(f.preimage))) === f.paymentHash;
        if (!check.preimageMatchesPaymentHash) {
            fail(
                'wrong_preimage',
                'proof_preimage does not hash to invoice_payment_hash.',
                1001
            );
        }
    }

    const omittedRecord = records.find((r) => r.type === 1002n);
    try {
        check.omittedTlvs = omittedRecord
            ? parseOmittedTlvs(omittedRecord.value)
            : [];
    } catch (e) {
        fail(
            'invalid_omitted_tlvs',
            `proof_omitted_tlvs: ${(e as Error).message}`,
            1002
        );
        return check;
    }

    const included = records.filter(
        (r) => !isSignatureType(r.type) && !isProofDataType(r.type)
    );
    const includedTypes = included.map((r) => r.type);
    try {
        validateOmittedMarkers(check.omittedTlvs, includedTypes);
    } catch (e) {
        fail('invalid_omitted_tlvs', (e as Error).message, 1002);
        return check;
    }
    if (!f.leafHashes || !f.missingHashes) return check;
    if (f.leafHashes.length !== included.length) {
        fail(
            'leaf_hash_count',
            `proof_leaf_hashes has ${f.leafHashes.length} entries for ${included.length} disclosed fields.`,
            1004
        );
        return check;
    }

    let root: Uint8Array | null;
    try {
        const positions = decodePositions(includedTypes, check.omittedTlvs);
        let inc = 0;
        const hashes = positions.map((isIncluded) => {
            if (!isIncluded) return null;
            const leaf = taggedHash('LnLeaf', included[inc].raw);
            const nonce = hexToBytes(f.leafHashes![inc]);
            inc++;
            return branchHash(leaf, nonce);
        });
        const missing = f.missingHashes.map(hexToBytes);
        const cursor = { i: 0 };
        root = reconstruct(hashes, missing, cursor);
        if (cursor.i !== missing.length) {
            throw new Error(
                `${missing.length - cursor.i} unused proof_missing_hashes`
            );
        }
        if (!root)
            throw new Error(
                'No disclosed fields to rebuild the merkle root from'
            );
    } catch (e) {
        fail('invalid_missing_hashes', (e as Error).message, 1003);
        return check;
    }
    check.invoiceMerkleRoot = bytesToHex(root);

    if (f.invoiceSignature && f.nodeId) {
        check.invoiceSignatureValid = verifyBip340(
            f.invoiceSignature,
            signatureMessage('invoice', 'signature', root),
            f.nodeId
        );
        if (!check.invoiceSignatureValid) {
            fail(
                'invalid_signature',
                'The invoice signature does not verify against invoice_node_id.',
                240
            );
        }
    }
    if (f.proofSignature && f.payerId) {
        // The payer signs the merkle root of the proof itself; the merkle
        // tree skips the signature range, so neither signature is covered.
        const proofRoot = merkleRoot(records);
        check.proofSignatureValid =
            !!proofRoot &&
            verifyBip340(
                f.proofSignature,
                signatureMessage('payer_proof', 'proof_signature', proofRoot),
                f.payerId
            );
        if (!check.proofSignatureValid) {
            fail(
                'invalid_proof_signature',
                'proof_signature does not verify against invreq_payer_id.',
                241
            );
        }
    }
    return check;
}
