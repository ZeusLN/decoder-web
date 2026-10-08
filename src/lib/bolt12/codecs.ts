/**
 * Decoders for BOLT 12 field values and subtypes. Each throws an Error
 * with a readable message when the value is malformed; the caller turns
 * that into an issue on the record.
 */
import { secp256k1 } from '@noble/curves/secp256k1.js';
import { bytesToHex, utf8DecodeStrict } from '../util/bytes';
import { readTruncatedUint, readUint } from '../util/bigsize';
import { chainName, type Network } from '../util/chains';
import { encodeFallbackAddress, type AddressType } from '../util/address';
import {
    describeFeatures,
    setBits,
    type FeatureBit,
    type FeatureContext
} from '../features';
import { formatScid } from '../bolt11/tags';

/** Sequential reader over a value's bytes. */
export class Reader {
    offset = 0;

    constructor(
        readonly bytes: Uint8Array,
        readonly what: string
    ) {}

    get remaining(): number {
        return this.bytes.length - this.offset;
    }

    take(n: number, field: string): Uint8Array {
        if (this.remaining < n) {
            throw new Error(
                `Truncated ${this.what}: ${field} needs ${n} bytes, ${this.remaining} left`
            );
        }
        const out = this.bytes.slice(this.offset, this.offset + n);
        this.offset += n;
        return out;
    }

    u8(field: string): number {
        return this.take(1, field)[0];
    }

    u16(field: string): number {
        return Number(readUint(this.take(2, field), 0, 2));
    }

    u32(field: string): number {
        return Number(readUint(this.take(4, field), 0, 4));
    }

    u64(field: string): bigint {
        return readUint(this.take(8, field), 0, 8);
    }

    point(field: string): string {
        return validatePoint(this.take(33, field), field);
    }
}

export function validatePoint(bytes: Uint8Array, field: string): string {
    const hex = bytesToHex(bytes);
    if (bytes.length !== 33) {
        throw new Error(`${field} must be 33 bytes, got ${bytes.length}`);
    }
    try {
        secp256k1.Point.fromHex(hex);
    } catch {
        throw new Error(`${field} is not a valid secp256k1 point`);
    }
    return hex;
}

export function decodeUtf8(bytes: Uint8Array, field: string): string {
    const text = utf8DecodeStrict(bytes);
    if (text === null) {
        throw new Error(`${field} is not valid UTF-8`);
    }
    return text;
}

export function decodeTu64(bytes: Uint8Array): bigint {
    return readTruncatedUint(bytes, 8);
}

export function decodeTu32(bytes: Uint8Array): bigint {
    return readTruncatedUint(bytes, 4);
}

export function decodeSha256(bytes: Uint8Array, field: string): string {
    if (bytes.length !== 32) {
        throw new Error(`${field} must be 32 bytes, got ${bytes.length}`);
    }
    return bytesToHex(bytes);
}

export interface ChainRef {
    hash: string;
    name?: string;
}

export function decodeChains(bytes: Uint8Array): ChainRef[] {
    if (bytes.length % 32 !== 0) {
        throw new Error(
            `offer_chains length ${bytes.length} is not a multiple of 32`
        );
    }
    const chains: ChainRef[] = [];
    for (let i = 0; i < bytes.length; i += 32) {
        const hash = bytesToHex(bytes.slice(i, i + 32));
        chains.push({ hash, name: chainName(hash) });
    }
    return chains;
}

export function decodeChain(bytes: Uint8Array): ChainRef {
    if (bytes.length !== 32) {
        throw new Error(`invreq_chain must be 32 bytes, got ${bytes.length}`);
    }
    const hash = bytesToHex(bytes);
    return { hash, name: chainName(hash) };
}

export function decodeFeatures(
    bytes: Uint8Array,
    context: FeatureContext
): FeatureBit[] {
    return describeFeatures(setBits(bytes), context);
}

export type SciddirOrPubkey =
    | { kind: 'pubkey'; pubkey: string }
    | {
          kind: 'sciddir';
          direction: number;
          shortChannelId: string;
          shortChannelIdHex: string;
      };

export interface BlindedHop {
    blindedNodeId: string;
    encryptedRecipientData: string;
}

export interface BlindedPath {
    firstNodeId: SciddirOrPubkey;
    firstPathKey: string;
    hops: BlindedHop[];
}

function readSciddirOrPubkey(r: Reader): SciddirOrPubkey {
    if (r.remaining < 1) {
        throw new Error(`Truncated ${r.what}: first_node_id missing`);
    }
    const first = r.bytes[r.offset];
    if (first === 0 || first === 1) {
        r.offset += 1;
        const scid = r.take(8, 'first_node_id short_channel_id');
        return {
            kind: 'sciddir',
            direction: first,
            shortChannelId: formatScid(readUint(scid, 0, 8)),
            shortChannelIdHex: bytesToHex(scid)
        };
    }
    if (first === 2 || first === 3) {
        return { kind: 'pubkey', pubkey: r.point('first_node_id') };
    }
    throw new Error(
        `first_node_id has an invalid prefix byte 0x${first.toString(16).padStart(2, '0')}`
    );
}

function readBlindedPath(r: Reader): BlindedPath {
    const firstNodeId = readSciddirOrPubkey(r);
    const firstPathKey = r.point('first_path_key');
    const numHops = r.u8('num_hops');
    if (numHops === 0) {
        throw new Error('blinded_path has num_hops 0');
    }
    const hops: BlindedHop[] = [];
    for (let i = 0; i < numHops; i++) {
        const blindedNodeId = r.point(`hop ${i} blinded_node_id`);
        const len = r.u16(`hop ${i} enclen`);
        const data = r.take(len, `hop ${i} encrypted_recipient_data`);
        hops.push({ blindedNodeId, encryptedRecipientData: bytesToHex(data) });
    }
    return { firstNodeId, firstPathKey, hops };
}

/** A sequence of blinded paths filling the whole value. */
export function decodeBlindedPaths(
    bytes: Uint8Array,
    field: string
): BlindedPath[] {
    const r = new Reader(bytes, field);
    const paths: BlindedPath[] = [];
    while (r.remaining > 0) {
        paths.push(readBlindedPath(r));
    }
    if (paths.length === 0) {
        throw new Error(`${field} is empty`);
    }
    return paths;
}

export interface BlindedPayInfo {
    feeBaseMsat: number;
    feeProportionalMillionths: number;
    cltvExpiryDelta: number;
    htlcMinimumMsat: bigint;
    htlcMaximumMsat: bigint;
    features: FeatureBit[];
}

export function decodeBlindedPayInfos(bytes: Uint8Array): BlindedPayInfo[] {
    const r = new Reader(bytes, 'invoice_blindedpay');
    const infos: BlindedPayInfo[] = [];
    while (r.remaining > 0) {
        const feeBaseMsat = r.u32('fee_base_msat');
        const feeProportionalMillionths = r.u32('fee_proportional_millionths');
        const cltvExpiryDelta = r.u16('cltv_expiry_delta');
        const htlcMinimumMsat = r.u64('htlc_minimum_msat');
        const htlcMaximumMsat = r.u64('htlc_maximum_msat');
        const flen = r.u16('flen');
        const features = decodeFeatures(r.take(flen, 'features'), 'blindedHop');
        infos.push({
            feeBaseMsat,
            feeProportionalMillionths,
            cltvExpiryDelta,
            htlcMinimumMsat,
            htlcMaximumMsat,
            features
        });
    }
    return infos;
}

export interface Bolt12Fallback {
    version: number;
    programHex: string;
    address?: string;
    type?: AddressType;
}

export function decodeFallbacks(
    bytes: Uint8Array,
    network: Network | undefined
): Bolt12Fallback[] {
    const r = new Reader(bytes, 'invoice_fallbacks');
    const out: Bolt12Fallback[] = [];
    while (r.remaining > 0) {
        const version = r.u8('version');
        const len = r.u16('len');
        const program = r.take(len, 'address');
        const fallback: Bolt12Fallback = {
            version,
            programHex: bytesToHex(program)
        };
        if (network && version <= 16) {
            const encoded = encodeFallbackAddress(version, program, network);
            if (encoded) {
                fallback.address = encoded.address;
                fallback.type = encoded.type;
            }
        }
        out.push(fallback);
    }
    return out;
}

export interface Bip353Name {
    name: string;
    domain: string;
}

const BIP353_ALPHABET = /^[0-9a-zA-Z._-]*$/;

export function decodeBip353Name(bytes: Uint8Array): Bip353Name {
    const r = new Reader(bytes, 'invreq_bip_353_name');
    const name = decodeUtf8(r.take(r.u8('name_len'), 'name'), 'bip_353 name');
    const domain = decodeUtf8(
        r.take(r.u8('domain_len'), 'domain'),
        'bip_353 domain'
    );
    if (r.remaining > 0) {
        throw new Error(
            `invreq_bip_353_name has ${r.remaining} trailing bytes`
        );
    }
    if (!BIP353_ALPHABET.test(name) || !BIP353_ALPHABET.test(domain)) {
        throw new Error(
            'invreq_bip_353_name contains characters outside 0-9, a-z, A-Z, -, _ and .'
        );
    }
    return { name, domain };
}

export function decodeSignature(bytes: Uint8Array): string {
    if (bytes.length !== 64) {
        throw new Error(`signature must be 64 bytes, got ${bytes.length}`);
    }
    return bytesToHex(bytes);
}
