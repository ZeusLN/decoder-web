/**
 * BOLT 12 decoder for offers (lno), invoice requests (lnr), invoices (lni)
 * and payer proofs (lnp). Reader rules follow BOLT 12 and lnd's
 * bolt12/validate.go; anything a reader must reject is reported as an
 * error-severity issue rather than a thrown exception, so the fields that
 * did parse can still be shown.
 */
import { bytesToHex } from '../util/bytes';
import { networkByChainHash, MAINNET, type Network } from '../util/chains';
import { formatCurrencyAmount, isIso4217Shape } from '../util/currency';
import type { FeatureBit } from '../features';
import { hasErrors, type Issue, type Segment } from '../types';
import { decodeBolt12String } from './bech32';
import { parseTlvStream, type RawTlv } from './tlv';
import {
    HRP_MESSAGES,
    fieldSpec,
    isAllowedType,
    isKnownType,
    type Bolt12Message
} from './schema';
import {
    decodeBip353Name,
    decodeBlindedPaths,
    decodeBlindedPayInfos,
    decodeChain,
    decodeChains,
    decodeFallbacks,
    decodeFeatures,
    decodeSha256,
    decodeSignature,
    decodeTu32,
    decodeTu64,
    decodeUtf8,
    validatePoint,
    type Bip353Name,
    type BlindedPath,
    type BlindedPayInfo,
    type Bolt12Fallback,
    type ChainRef
} from './codecs';
import { merkleRoot, signatureMessage, verifyBip340 } from './merkle';
import { bolt12Segments } from './spans';
import { verifyPayerProof, type PayerProofCheck } from './payerProof';

export const DEFAULT_INVOICE_RELATIVE_EXPIRY = 7200;

export interface Bolt12Record {
    index: number;
    type: bigint;
    /** Field name, or `unknown` for types this decoder does not know. */
    name: string;
    known: boolean;
    length: number;
    hex: string;
    /** Byte offsets of the whole record (type, length and value). */
    start: number;
    end: number;
    /** Decoded value, if the field is known and well formed. */
    value?: unknown;
    /** Short human-readable value for tables. */
    display: string;
    error?: string;
}

/** Decoded field values, keyed by BOLT 12 field name. */
export interface Bolt12Fields {
    invreq_metadata?: string;
    offer_chains?: ChainRef[];
    offer_metadata?: string;
    offer_currency?: string;
    offer_amount?: bigint;
    offer_description?: string;
    offer_features?: FeatureBit[];
    offer_absolute_expiry?: bigint;
    offer_paths?: BlindedPath[];
    offer_issuer?: string;
    offer_quantity_max?: bigint;
    offer_issuer_id?: string;
    invreq_chain?: ChainRef;
    invreq_amount?: bigint;
    invreq_features?: FeatureBit[];
    invreq_quantity?: bigint;
    invreq_payer_id?: string;
    invreq_payer_note?: string;
    invreq_paths?: BlindedPath[];
    invreq_bip_353_name?: Bip353Name;
    invoice_paths?: BlindedPath[];
    invoice_blindedpay?: BlindedPayInfo[];
    invoice_created_at?: bigint;
    invoice_relative_expiry?: bigint;
    invoice_payment_hash?: string;
    invoice_amount?: bigint;
    invoice_fallbacks?: Bolt12Fallback[];
    invoice_features?: FeatureBit[];
    invoice_node_id?: string;
    signature?: string;
    proof_signature?: string;
    proof_preimage?: string;
    proof_omitted_tlvs?: bigint[];
    proof_missing_hashes?: string[];
    proof_leaf_hashes?: string[];
    proof_note?: string;
}

export type Bolt12SignatureStatus =
    'valid' | 'invalid' | 'missing' | 'not_applicable';

export interface Bolt12Result {
    kind: 'bolt12';
    message: Bolt12Message;
    input: string;
    normalized: string;
    hrp: string;
    valid: boolean;
    issues: Issue[];
    segments: Segment[];
    records: Bolt12Record[];
    fields: Bolt12Fields;
    /** Network implied by the chain fields (mainnet when absent). */
    network: Network | undefined;
    chainName: string;
    /** Merkle root of the non-signature TLVs, hex. */
    merkleRoot?: string;
    signatureStatus: Bolt12SignatureStatus;
    /** Unix seconds after which the offer or invoice should not be used. */
    expiresAt?: number;
    /** Payer proof verification details (lnp strings only). */
    payerProof?: PayerProofCheck;
}

function amountDisplay(msat: bigint): string {
    return `${msat} msat`;
}

function pathsDisplay(paths: BlindedPath[]): string {
    return `${paths.length} blinded path${paths.length === 1 ? '' : 's'}`;
}

function featuresDisplay(bits: FeatureBit[]): string {
    return bits.length === 0 ? '(none)' : bits.map((b) => b.bit).join(', ');
}

function dateDisplay(seconds: bigint): string {
    const ms = Number(seconds) * 1000;
    return Number.isFinite(ms) && ms < 8.64e15
        ? `${new Date(ms).toISOString()} (${seconds})`
        : String(seconds);
}

function readHashList(bytes: Uint8Array, field: string): string[] {
    if (bytes.length % 32 !== 0) {
        throw new Error(
            `${field} length ${bytes.length} is not a multiple of 32`
        );
    }
    const out: string[] = [];
    for (let i = 0; i < bytes.length; i += 32)
        out.push(bytesToHex(bytes.slice(i, i + 32)));
    return out;
}

/** Decodes one known field. Throws with a readable message when malformed. */
function decodeField(
    name: string,
    value: Uint8Array,
    network: Network | undefined
): { value: unknown; display: string } {
    switch (name) {
        case 'invreq_metadata':
        case 'offer_metadata':
            return { value: bytesToHex(value), display: bytesToHex(value) };
        case 'offer_chains': {
            const chains = decodeChains(value);
            return {
                value: chains,
                display: chains.map((c) => c.name ?? c.hash).join(', ')
            };
        }
        case 'invreq_chain': {
            const chain = decodeChain(value);
            return { value: chain, display: chain.name ?? chain.hash };
        }
        case 'offer_currency':
        case 'offer_description':
        case 'offer_issuer':
        case 'invreq_payer_note':
        case 'proof_note': {
            const text = decodeUtf8(value, name);
            return { value: text, display: text };
        }
        case 'offer_amount':
        case 'invreq_amount':
        case 'invoice_amount': {
            const amount = decodeTu64(value);
            return { value: amount, display: amountDisplay(amount) };
        }
        case 'offer_quantity_max':
        case 'invreq_quantity': {
            const q = decodeTu64(value);
            return { value: q, display: String(q) };
        }
        case 'offer_absolute_expiry':
        case 'invoice_created_at': {
            const t = decodeTu64(value);
            return { value: t, display: dateDisplay(t) };
        }
        case 'invoice_relative_expiry': {
            const t = decodeTu32(value);
            return { value: t, display: `${t} seconds` };
        }
        case 'offer_features':
        case 'invreq_features':
        case 'invoice_features': {
            const context =
                name === 'offer_features'
                    ? 'offer'
                    : name === 'invreq_features'
                      ? 'invreq'
                      : 'bolt12invoice';
            const bits = decodeFeatures(value, context);
            return { value: bits, display: featuresDisplay(bits) };
        }
        case 'offer_paths':
        case 'invreq_paths':
        case 'invoice_paths': {
            const paths = decodeBlindedPaths(value, name);
            return { value: paths, display: pathsDisplay(paths) };
        }
        case 'offer_issuer_id':
        case 'invreq_payer_id':
        case 'invoice_node_id': {
            const key = validatePoint(value, name);
            return { value: key, display: key };
        }
        case 'invreq_bip_353_name': {
            const n = decodeBip353Name(value);
            return { value: n, display: `₿${n.name}@${n.domain}` };
        }
        case 'invoice_blindedpay': {
            const infos = decodeBlindedPayInfos(value);
            return {
                value: infos,
                display: `${infos.length} payinfo${infos.length === 1 ? '' : 's'}`
            };
        }
        case 'invoice_payment_hash':
        case 'proof_preimage': {
            const h = decodeSha256(value, name);
            return { value: h, display: h };
        }
        case 'invoice_fallbacks': {
            const f = decodeFallbacks(value, network);
            return {
                value: f,
                display: f
                    .map((x) => x.address ?? `v${x.version}:${x.programHex}`)
                    .join(', ')
            };
        }
        case 'signature':
        case 'proof_signature': {
            const s = decodeSignature(value);
            return { value: s, display: s };
        }
        case 'proof_omitted_tlvs': {
            // A list of BigSize markers; parsed fully by the payer proof module.
            return { value: bytesToHex(value), display: bytesToHex(value) };
        }
        case 'proof_missing_hashes':
        case 'proof_leaf_hashes': {
            const hashes = readHashList(value, name);
            return {
                value: hashes,
                display: `${hashes.length} hash${hashes.length === 1 ? '' : 'es'}`
            };
        }
        default:
            return { value: bytesToHex(value), display: bytesToHex(value) };
    }
}

function chainFromRecords(records: RawTlv[]): {
    network: Network | undefined;
    name: string;
} {
    const chainRecord =
        records.find((r) => r.type === 80n) ??
        records.find((r) => r.type === 2n);
    if (!chainRecord || chainRecord.value.length < 32) {
        return { network: MAINNET, name: 'mainnet' };
    }
    const hash = bytesToHex(chainRecord.value.slice(0, 32));
    const network = networkByChainHash(hash);
    return {
        network,
        name: network?.name ?? `unknown chain ${hash.slice(0, 16)}…`
    };
}

export function decodeBolt12(input: string): Bolt12Result {
    const str = decodeBolt12String(input);
    const message = HRP_MESSAGES[str.hrp];
    if (!message) {
        throw new Error(`Unknown BOLT 12 prefix '${str.hrp}'`);
    }
    const issues: Issue[] = [];
    const stream = parseTlvStream(str.bytes);
    if (stream.error) {
        issues.push({
            code: 'malformed_tlv',
            severity: 'error',
            message: stream.error
        });
    }
    const { network, name: chainName } = chainFromRecords(stream.records);

    const fields: Bolt12Fields = {};
    const records: Bolt12Record[] = stream.records.map((raw, index) => {
        const spec = fieldSpec(raw.type);
        const known = isKnownType(raw.type, message);
        const record: Bolt12Record = {
            index,
            type: raw.type,
            name: spec?.name ?? 'unknown',
            known,
            length: raw.value.length,
            hex: bytesToHex(raw.value),
            start: raw.start,
            end: raw.end,
            display: bytesToHex(raw.value)
        };
        if (!isAllowedType(raw.type, message)) {
            issues.push({
                code: 'type_out_of_range',
                severity: 'error',
                message: `TLV type ${raw.type} is outside the ranges allowed in ${message.replace('_', ' ')}s.`,
                type: Number(raw.type)
            });
        } else if (!known && raw.type % 2n === 0n) {
            issues.push({
                code: 'unknown_even_type',
                severity: 'error',
                message: `Unknown even TLV type ${raw.type}; readers must reject it.`,
                type: Number(raw.type)
            });
        }
        if (spec && known) {
            try {
                const decoded = decodeField(spec.name, raw.value, network);
                record.value = decoded.value;
                record.display = decoded.display;
                (fields as Record<string, unknown>)[spec.name] = decoded.value;
            } catch (e) {
                record.error = (e as Error).message;
                issues.push({
                    code: 'invalid_field',
                    severity: 'error',
                    message: `${spec.name}: ${(e as Error).message}`,
                    type: Number(raw.type)
                });
            }
        }
        return record;
    });

    validate(message, fields, records, issues);

    // Merkle root and signature.
    const root = stream.error ? null : merkleRoot(stream.records);
    let signatureStatus: Bolt12SignatureStatus = 'not_applicable';
    if (message === 'invoice_request' || message === 'invoice') {
        const key =
            message === 'invoice_request'
                ? fields.invreq_payer_id
                : fields.invoice_node_id;
        if (!fields.signature) {
            signatureStatus = 'missing';
            issues.push({
                code: 'missing_signature',
                severity: 'error',
                message: `The ${message.replace('_', ' ')} has no signature.`,
                type: 240
            });
        } else if (root && key) {
            const ok = verifyBip340(
                fields.signature,
                signatureMessage(message, 'signature', root),
                key
            );
            signatureStatus = ok ? 'valid' : 'invalid';
            if (!ok) {
                issues.push({
                    code: 'invalid_signature',
                    severity: 'error',
                    message: `The signature does not verify against ${message === 'invoice' ? 'invoice_node_id' : 'invreq_payer_id'}.`,
                    type: 240
                });
            }
        } else {
            signatureStatus = 'invalid';
        }
    }

    let payerProof: PayerProofCheck | undefined;
    if (message === 'payer_proof') {
        issues.push({
            code: 'draft_spec',
            severity: 'info',
            message:
                'Payer proofs are a draft (lightning/bolts#1295) and may change.'
        });
        payerProof = verifyPayerProof(
            stream.records,
            {
                payerId: fields.invreq_payer_id,
                nodeId: fields.invoice_node_id,
                paymentHash: fields.invoice_payment_hash,
                invoiceSignature: fields.signature,
                proofSignature: fields.proof_signature,
                preimage: fields.proof_preimage,
                leafHashes: fields.proof_leaf_hashes,
                missingHashes: fields.proof_missing_hashes
            },
            issues
        );
        signatureStatus =
            payerProof.invoiceSignatureValid && payerProof.proofSignatureValid
                ? 'valid'
                : 'invalid';
    }

    let expiresAt: number | undefined;
    if (fields.offer_absolute_expiry !== undefined && message === 'offer') {
        expiresAt = Number(fields.offer_absolute_expiry);
    }
    if (message === 'invoice' && fields.invoice_created_at !== undefined) {
        expiresAt =
            Number(fields.invoice_created_at) +
            Number(
                fields.invoice_relative_expiry ??
                    BigInt(DEFAULT_INVOICE_RELATIVE_EXPIRY)
            );
    }

    return {
        kind: 'bolt12',
        message,
        input,
        normalized: str.normalized,
        hrp: str.hrp,
        valid: !hasErrors(issues),
        issues,
        segments: bolt12Segments(str, stream.records, records),
        records,
        fields,
        network,
        chainName,
        // For payer proofs, the rebuilt root of the original invoice.
        merkleRoot:
            message === 'payer_proof'
                ? payerProof?.invoiceMerkleRoot
                : root
                  ? bytesToHex(root)
                  : undefined,
        signatureStatus,
        expiresAt,
        payerProof
    };
}

function error(issues: Issue[], code: string, message: string, type?: number) {
    issues.push({ code, severity: 'error', message, type });
}

function checkFeatureBits(
    bits: FeatureBit[] | undefined,
    field: string,
    type: number,
    issues: Issue[]
) {
    for (const b of bits ?? []) {
        if (b.unknownRequired) {
            error(
                issues,
                'unknown_even_feature',
                `${field} sets unknown required feature bit ${b.bit}.`,
                type
            );
        }
    }
}

function validateOfferFields(
    f: Bolt12Fields,
    records: Bolt12Record[],
    issues: Issue[]
) {
    const has = (type: bigint) => records.some((r) => r.type === type);
    if (f.offer_chains && f.offer_chains.length === 0) {
        error(issues, 'empty_chains', 'offer_chains is present but empty.', 2);
    }
    if (has(8n) && !has(10n)) {
        error(
            issues,
            'amount_without_description',
            'offer_amount is set but offer_description is missing.',
            10
        );
    }
    if (f.offer_amount === 0n) {
        error(
            issues,
            'zero_amount',
            'offer_amount must be greater than zero.',
            8
        );
    }
    if (has(6n) && !has(8n)) {
        error(
            issues,
            'currency_without_amount',
            'offer_currency is set but offer_amount is missing.',
            6
        );
    }
    if (f.offer_currency !== undefined && !isIso4217Shape(f.offer_currency)) {
        error(
            issues,
            'invalid_currency',
            `offer_currency '${f.offer_currency}' is not an ISO 4217 code.`,
            6
        );
    }
    checkFeatureBits(f.offer_features, 'offer_features', 12, issues);
}

function validate(
    message: Bolt12Message,
    f: Bolt12Fields,
    records: Bolt12Record[],
    issues: Issue[]
) {
    const has = (type: bigint) => records.some((r) => r.type === type);
    if (records.length === 0) {
        error(issues, 'empty', 'The string contains no fields.');
    }
    validateOfferFields(f, records, issues);

    if (message === 'offer') {
        if (!has(22n) && !has(16n)) {
            error(
                issues,
                'missing_issuer',
                'An offer needs offer_issuer_id or offer_paths.',
                22
            );
        }
        return;
    }

    // invoice_request rules, which invoices also mirror.
    checkFeatureBits(f.invreq_features, 'invreq_features', 84, issues);
    if (message === 'invoice_request') {
        if (!has(88n))
            error(
                issues,
                'missing_payer_id',
                'invreq_payer_id is missing.',
                88
            );
        if (!has(0n))
            error(issues, 'missing_metadata', 'invreq_metadata is missing.', 0);
        const isResponse = has(22n) || has(16n);
        if (isResponse) {
            if (has(20n)) {
                if (!has(86n)) {
                    error(
                        issues,
                        'missing_quantity',
                        'offer_quantity_max is set but invreq_quantity is missing.',
                        86
                    );
                } else if (
                    f.offer_quantity_max !== undefined &&
                    f.invreq_quantity !== undefined
                ) {
                    const max = f.offer_quantity_max;
                    if (
                        max !== 0n &&
                        (f.invreq_quantity === 0n || f.invreq_quantity > max)
                    ) {
                        error(
                            issues,
                            'invalid_quantity',
                            `invreq_quantity ${f.invreq_quantity} is outside 1 to ${max}.`,
                            86
                        );
                    }
                }
            } else if (has(86n)) {
                error(
                    issues,
                    'unexpected_quantity',
                    'invreq_quantity is set but the offer has no offer_quantity_max.',
                    86
                );
            }
            if (!has(8n) && !has(82n)) {
                error(
                    issues,
                    'missing_amount',
                    'The offer has no amount, so invreq_amount is required.',
                    82
                );
            }
        } else {
            if (has(2n) || has(12n) || has(20n)) {
                error(
                    issues,
                    'offer_fields_without_offer',
                    'offer_chains, offer_features and offer_quantity_max are not allowed without offer_issuer_id or offer_paths.'
                );
            }
            if (has(86n))
                error(
                    issues,
                    'unexpected_quantity',
                    'invreq_quantity is not allowed here.',
                    86
                );
            if (!has(82n))
                error(
                    issues,
                    'missing_amount',
                    'invreq_amount is required.',
                    82
                );
        }
        return;
    }

    // Payer proofs disclose a subset of invoice fields; payerProof.ts
    // checks the ones a proof requires.
    if (message === 'invoice') {
        if (!has(170n))
            error(issues, 'missing_amount', 'invoice_amount is missing.', 170);
        if (f.invoice_amount === 0n)
            error(
                issues,
                'zero_amount',
                'invoice_amount must be greater than zero.',
                170
            );
        if (!has(164n))
            error(
                issues,
                'missing_created_at',
                'invoice_created_at is missing.',
                164
            );
        if (!has(168n))
            error(
                issues,
                'missing_payment_hash',
                'invoice_payment_hash is missing.',
                168
            );
        if (!has(176n))
            error(
                issues,
                'missing_node_id',
                'invoice_node_id is missing.',
                176
            );
        if (message === 'invoice') {
            if (!has(160n))
                error(
                    issues,
                    'missing_paths',
                    'invoice_paths is missing.',
                    160
                );
            if (!has(162n))
                error(
                    issues,
                    'missing_blindedpay',
                    'invoice_blindedpay is missing.',
                    162
                );
            if (
                f.invoice_paths &&
                f.invoice_blindedpay &&
                f.invoice_paths.length !== f.invoice_blindedpay.length
            ) {
                error(
                    issues,
                    'blindedpay_mismatch',
                    `invoice_blindedpay has ${f.invoice_blindedpay.length} entries for ${f.invoice_paths.length} paths.`,
                    162
                );
            }
        }
        checkFeatureBits(f.invoice_features, 'invoice_features', 174, issues);
        if (
            f.offer_issuer_id &&
            f.invoice_node_id &&
            f.offer_issuer_id !== f.invoice_node_id
        ) {
            error(
                issues,
                'node_id_mismatch',
                'invoice_node_id differs from offer_issuer_id.',
                176
            );
        }
    }
}

/** Formats an offer amount with its currency, or as msat. */
export function formatOfferAmount(f: Bolt12Fields): string | undefined {
    if (f.offer_amount === undefined) return undefined;
    return f.offer_currency
        ? formatCurrencyAmount(f.offer_amount, f.offer_currency)
        : amountDisplay(f.offer_amount);
}
