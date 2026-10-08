/**
 * BOLT 11 invoice decoder.
 *
 * Ported from ZEUS utils/Bolt11Utils.ts (duplicate-tag rules from
 * ZeusLN/zeus#4631), with bech32 without a length cap, truncation checks,
 * and route hints, feature bits and fallback addresses added back from
 * light-bolt11-decoder.
 *
 * Inputs that cannot be read at all (bad checksum, bad amount, truncated
 * data, ambiguous payment hash) throw. Spec violations in an otherwise
 * readable invoice become error-severity issues on the result, so the
 * fields can still be shown.
 */
import { secp256k1 } from '@noble/curves/secp256k1.js';
import {
    decodeBech32,
    wordsToBytes,
    wordsToBytesPadded,
    wordsToInt
} from '../util/bech32';
import {
    bytesToHex,
    concatBytes,
    hexToBytes,
    utf8Decode,
    utf8DecodeStrict,
    utf8Encode
} from '../util/bytes';
import { sha256 } from '../util/hash';
import { networkByBolt11Prefix, type Network } from '../util/chains';
import { encodeFallbackAddress, type AddressType } from '../util/address';
import { describeFeatures, type FeatureBit } from '../features';
import type { Issue, Segment } from '../types';
import { hasErrors } from '../types';
import {
    FIXED_TAG_WORDS,
    TAG_NAMES,
    featureBitsFromWords,
    parseRouteHint,
    tagLetter,
    type RouteHop
} from './tags';

export const DEFAULT_EXPIRY_SECONDS = 3600;
export const DEFAULT_MIN_FINAL_CLTV_EXPIRY = 18;

const SIGNATURE_WORDS = 104;
const TIMESTAMP_WORDS = 7;
const MSAT_PER_BTC = 100_000_000_000n;
const MAX_MSAT = 21_000_000n * MSAT_PER_BTC;
const MULTIPLIER_DIVISORS: Record<string, bigint> = {
    m: 1_000n,
    u: 1_000_000n,
    n: 1_000_000_000n,
    p: 1_000_000_000_000n
};

export interface Bolt11Tag {
    index: number;
    code: number;
    letter: string;
    name: string;
    /** Data length in 5-bit words. */
    lengthWords: number;
    /** Tag data as bytes (trailing partial byte dropped), hex encoded. */
    hex: string;
    /** Human-readable value, when the tag type is known. */
    display?: string;
    /** Why this occurrence was not used, if it was not. */
    ignored?: string;
}

export interface Bolt11FallbackAddress {
    version: number;
    programHex: string;
    address?: string;
    type?: AddressType;
}

export type Bolt11SignatureStatus =
    /** Payee recovered from the signature (no `n` field). */
    | 'recovered'
    /** Signature verified against the explicit `n` field. */
    | 'verified'
    /** Signature does not match the explicit `n` field. */
    | 'mismatch'
    /** Signature could not be used at all. */
    | 'invalid';

export interface Bolt11Result {
    kind: 'bolt11';
    input: string;
    /** Lowercased invoice. Segment offsets refer to this string. */
    normalized: string;
    valid: boolean;
    issues: Issue[];
    segments: Segment[];

    /** Human-readable part, e.g. `lnbc2500u`. */
    hrp: string;
    network: Network;
    /** Amount in millisatoshis, or null for an amountless invoice. */
    amountMsat: bigint | null;
    /** Amount as written in the prefix, e.g. `2500u`. */
    amountText: string | null;

    timestamp: number;
    expiry: number;
    expiryDefaulted: boolean;
    /** Unix seconds after which the invoice should not be paid. */
    expiresAt: number;
    minFinalCltvExpiry: number;
    minFinalCltvExpiryDefaulted: boolean;

    paymentHash: string;
    paymentSecret?: string;
    description?: string;
    descriptionHash?: string;
    metadata?: string;
    /** Explicit `n` field, if present. */
    payee?: string;
    /** Public key recovered from the signature, if recovery worked. */
    recoveredPubkey?: string;
    /** The payee: `n` when present, else the recovered key. */
    nodeId?: string;
    /** 64-byte compact signature (r || s), hex. */
    signature: string;
    recoveryFlag: number;
    signatureStatus: Bolt11SignatureStatus;
    signatureHighS: boolean;

    features?: { bits: FeatureBit[] };
    routeHints: RouteHop[][];
    fallbackAddresses: Bolt11FallbackAddress[];
    tags: Bolt11Tag[];
}

export function isExpired(result: Bolt11Result, nowSeconds: number): boolean {
    return nowSeconds >= result.expiresAt;
}

/** Parses the amount in the human-readable part into millisatoshis. */
export function parseAmount(text: string): bigint {
    const match = text.match(/^(\d+)([munp]?)$/);
    if (!match) {
        throw new Error(`Invalid amount '${text}'`);
    }
    const value = BigInt(match[1]);
    const multiplier = match[2];
    let msat: bigint;
    if (multiplier) {
        const divisor = MULTIPLIER_DIVISORS[multiplier];
        if (multiplier === 'p' && value % 10n !== 0n) {
            throw new Error(
                'Invalid sub-millisatoshi amount: pico-BTC amounts must end in 0'
            );
        }
        msat = (value * MSAT_PER_BTC) / divisor;
    } else {
        msat = value * MSAT_PER_BTC;
    }
    if (msat > MAX_MSAT) {
        throw new Error('Amount exceeds 21 million BTC');
    }
    return msat;
}

function wordsAreMinimal(words: number[]): boolean {
    return words.length === 0 || words[0] !== 0;
}

export function decodeBolt11(input: string): Bolt11Result {
    const trimmed = input.trim();
    let decoded;
    try {
        decoded = decodeBech32(trimmed);
    } catch (e) {
        throw new Error(`Invalid bech32 encoding: ${(e as Error).message}`);
    }
    const normalized = trimmed.toLowerCase();
    const hrp = decoded.hrp;
    const issues: Issue[] = [];
    const segments: Segment[] = [];

    // Human-readable part: ln + currency prefix + optional amount.
    const hrpMatch = hrp.match(/^ln([a-z]+?)(\d+[a-z]?)?$/);
    if (!hrpMatch) {
        throw new Error(`Not a BOLT 11 invoice prefix: '${hrp}'`);
    }
    const amountText: string | null = hrpMatch[2] ?? null;
    if (amountText && !/^\d+[munp]?$/.test(amountText)) {
        throw new Error(`Invalid amount multiplier '${amountText.slice(-1)}'`);
    }
    const network = networkByBolt11Prefix(hrpMatch[1]);
    if (!network) {
        throw new Error(`Unknown network prefix 'ln${hrpMatch[1]}'`);
    }
    const currency = network.bolt11Prefix;
    const amountMsat = amountText ? parseAmount(amountText) : null;

    segments.push({
        start: 0,
        end: 2 + currency.length,
        kind: 'prefix',
        label: 'prefix'
    });
    if (amountText) {
        segments.push({
            start: 2 + currency.length,
            end: hrp.length,
            kind: 'amount',
            label: 'amount'
        });
    }
    segments.push({
        start: hrp.length,
        end: hrp.length + 1,
        kind: 'separator',
        label: 'separator'
    });

    const words = decoded.words;
    if (words.length < TIMESTAMP_WORDS + SIGNATURE_WORDS) {
        throw new Error('Invoice is too short');
    }
    const dataWords = words.slice(0, -SIGNATURE_WORDS);
    const sigWords = words.slice(-SIGNATURE_WORDS);
    const dataStart = hrp.length + 1;

    const timestamp = wordsToInt(dataWords.slice(0, TIMESTAMP_WORDS));
    segments.push({
        start: dataStart,
        end: dataStart + TIMESTAMP_WORDS,
        kind: 'timestamp',
        label: 'timestamp'
    });

    const tags: Bolt11Tag[] = [];
    const seen = new Set<number>();
    let paymentHashSeen = false;
    const result: Partial<Bolt11Result> = {};
    const routeHints: RouteHop[][] = [];
    const fallbackAddresses: Bolt11FallbackAddress[] = [];
    let expiry: number | undefined;
    let minFinalCltv: number | undefined;

    let pos = TIMESTAMP_WORDS;
    while (pos < dataWords.length) {
        if (dataWords.length - pos < 3) {
            throw new Error('Truncated tagged field header');
        }
        const code = dataWords[pos];
        const len = wordsToInt(dataWords.slice(pos + 1, pos + 3));
        const tagWords = dataWords.slice(pos + 3, pos + 3 + len);
        if (tagWords.length < len) {
            throw new Error(`Truncated '${tagLetter(code)}' field`);
        }
        const start = dataStart + pos;
        const end = start + 3 + len;
        pos += 3 + len;

        const name = TAG_NAMES[code] ?? 'unknown';
        const index = tags.length;
        const tag: Bolt11Tag = {
            index,
            code,
            letter: tagLetter(code),
            name,
            lengthWords: len,
            hex: bytesToHex(wordsToBytes(tagWords))
        };
        tags.push(tag);
        segments.push({
            start,
            end,
            kind: TAG_NAMES[code] ? 'field' : 'unknown',
            label: name === 'unknown' ? `unknown (${tag.letter})` : name,
            recordIndex: index
        });

        const fixed = FIXED_TAG_WORDS[code];
        if (code === 1) {
            // A second `p` field makes the invoice ambiguous: different
            // readers could settle different hashes (lightning/bolts#1357).
            if (paymentHashSeen) {
                throw new Error('Invoice contains multiple payment hashes');
            }
            paymentHashSeen = true;
        }
        if (fixed !== undefined && len !== fixed) {
            tag.ignored = `wrong length (${len} words, expected ${fixed})`;
            issues.push({
                code: 'wrong_length_field',
                severity: 'warning',
                message: `Ignored '${tag.letter}' field with ${len} words; BOLT 11 requires ${fixed}.`,
                type: code
            });
            continue;
        }
        const singleton = code !== 3 && code !== 9;
        if (singleton && seen.has(code) && TAG_NAMES[code]) {
            tag.ignored = 'duplicate, first occurrence used';
            issues.push({
                code: 'duplicate_field',
                severity: 'warning',
                message: `Ignored a repeated '${tag.letter}' (${name}) field; the first one is used.`,
                type: code
            });
            continue;
        }

        const bytes = wordsToBytes(tagWords);
        switch (code) {
            case 1:
                result.paymentHash = bytesToHex(bytes);
                tag.display = result.paymentHash;
                break;
            case 16:
                result.paymentSecret = bytesToHex(bytes);
                tag.display = result.paymentSecret;
                break;
            case 23:
                result.descriptionHash = bytesToHex(bytes);
                tag.display = result.descriptionHash;
                break;
            case 19:
                result.payee = bytesToHex(bytes);
                tag.display = result.payee;
                break;
            case 13: {
                const text = utf8DecodeStrict(bytes);
                if (text === null) {
                    issues.push({
                        code: 'invalid_utf8',
                        severity: 'warning',
                        message: 'Description is not valid UTF-8.',
                        type: code
                    });
                }
                result.description = text ?? utf8Decode(bytes);
                tag.display = result.description;
                break;
            }
            case 27:
                result.metadata = bytesToHex(bytes);
                tag.display = result.metadata;
                break;
            case 6:
            case 24: {
                if (!wordsAreMinimal(tagWords)) {
                    issues.push({
                        code: 'non_minimal_field',
                        severity: 'error',
                        message: `The '${tag.letter}' field has leading zero words; BOLT 11 says to treat the invoice as invalid.`,
                        type: code
                    });
                }
                const value = wordsToInt(tagWords);
                if (code === 6) expiry = value;
                else minFinalCltv = value;
                tag.display = String(value);
                break;
            }
            case 5: {
                if (!wordsAreMinimal(tagWords)) {
                    issues.push({
                        code: 'non_minimal_field',
                        severity: 'error',
                        message:
                            "The '9' features field has leading zero words; BOLT 11 says to treat the invoice as invalid.",
                        type: code
                    });
                }
                const bits = describeFeatures(
                    featureBitsFromWords(tagWords),
                    'bolt11'
                );
                result.features = { bits };
                tag.display = bits.map((b) => b.bit).join(', ') || '(none)';
                for (const b of bits.filter((f) => f.unknownRequired)) {
                    issues.push({
                        code: 'unknown_required_feature',
                        severity: 'error',
                        message: `Unknown required feature bit ${b.bit}; BOLT 11 says to fail the payment.`,
                        type: code
                    });
                }
                break;
            }
            case 3: {
                const { hops, leftoverBytes } = parseRouteHint(tagWords);
                routeHints.push(hops);
                tag.display = `${hops.length} hop${hops.length === 1 ? '' : 's'}`;
                if (leftoverBytes > 0) {
                    issues.push({
                        code: 'route_hint_trailing_bytes',
                        severity: 'warning',
                        message: `Route hint has ${leftoverBytes} trailing bytes that do not form a hop.`,
                        type: code
                    });
                }
                break;
            }
            case 9: {
                if (tagWords.length === 0) {
                    tag.ignored = 'empty';
                    break;
                }
                const version = tagWords[0];
                const program = wordsToBytes(tagWords.slice(1));
                const encoded = encodeFallbackAddress(
                    version,
                    program,
                    network
                );
                const fallback: Bolt11FallbackAddress = {
                    version,
                    programHex: bytesToHex(program)
                };
                if (encoded) {
                    fallback.address = encoded.address;
                    fallback.type = encoded.type;
                    tag.display = encoded.address;
                } else {
                    tag.ignored = `unknown version ${version} or invalid program length`;
                    issues.push({
                        code: 'invalid_fallback',
                        severity: 'warning',
                        message: `Ignored a fallback address with version ${version} and a ${program.length}-byte program.`,
                        type: code
                    });
                }
                fallbackAddresses.push(fallback);
                break;
            }
            default:
                tag.display = undefined;
        }
        seen.add(code);
    }

    if (result.paymentHash === undefined) {
        throw new Error('No valid payment hash found');
    }
    if (result.paymentSecret === undefined) {
        issues.push({
            code: 'missing_payment_secret',
            severity: 'error',
            message:
                "Missing the required 's' (payment secret) field; BOLT 11 says to fail the payment.",
            type: 16
        });
    }
    if (
        result.description === undefined &&
        result.descriptionHash === undefined
    ) {
        issues.push({
            code: 'missing_description',
            severity: 'error',
            message:
                "Neither a 'd' (description) nor an 'h' (description hash) field is present.",
            type: 13
        });
    }
    if (
        result.description !== undefined &&
        result.descriptionHash !== undefined
    ) {
        issues.push({
            code: 'both_descriptions',
            severity: 'error',
            message:
                "Both 'd' (description) and 'h' (description hash) are present; BOLT 11 allows only one.",
            type: 23
        });
    }

    // Signature: 64 bytes r || s plus a recovery id, over
    // sha256(hrp || data words padded to a byte boundary).
    const sigBytes = wordsToBytes(sigWords);
    const compact = sigBytes.slice(0, 64);
    const recoveryFlag = sigBytes[64];
    const sigStart = dataStart + dataWords.length;
    segments.push({
        start: sigStart,
        end: sigStart + SIGNATURE_WORDS,
        kind: 'signature',
        label: 'signature'
    });
    segments.push({
        start: sigStart + SIGNATURE_WORDS,
        end: normalized.length,
        kind: 'checksum',
        label: 'checksum'
    });

    const messageHash = sha256(
        concatBytes(utf8Encode(hrp), wordsToBytesPadded(dataWords))
    );
    let signatureHighS = false;
    try {
        signatureHighS = secp256k1.Signature.fromBytes(
            compact,
            'compact'
        ).hasHighS();
    } catch {
        // Out-of-range r or s; reported below.
    }

    let recoveredPubkey: string | undefined;
    if (recoveryFlag <= 3) {
        try {
            const recovered = secp256k1.recoverPublicKey(
                Uint8Array.from([recoveryFlag, ...compact]),
                messageHash,
                { prehash: false }
            );
            recoveredPubkey = bytesToHex(recovered);
        } catch {
            recoveredPubkey = undefined;
        }
    }

    let signatureStatus: Bolt11SignatureStatus;
    if (result.payee !== undefined) {
        let ok = false;
        try {
            ok = secp256k1.verify(
                compact,
                messageHash,
                hexToBytes(result.payee),
                {
                    prehash: false,
                    lowS: false
                }
            );
        } catch {
            ok = false;
        }
        signatureStatus = ok ? 'verified' : 'mismatch';
        if (!ok) {
            issues.push({
                code: 'signature_mismatch',
                severity: 'error',
                message:
                    "The signature does not verify against the 'n' (payee) field.",
                type: 19
            });
        }
        if (signatureHighS) {
            issues.push({
                code: 'high_s_with_payee',
                severity: 'error',
                message:
                    "High-S signature with an explicit 'n' field; BOLT 11 requires low-S in that case.",
                type: 19
            });
        }
    } else if (recoveredPubkey) {
        signatureStatus = 'recovered';
    } else {
        signatureStatus = 'invalid';
        issues.push({
            code: 'signature_not_recoverable',
            severity: 'error',
            message: 'No public key can be recovered from the signature.'
        });
    }

    const expiryValue = expiry ?? DEFAULT_EXPIRY_SECONDS;
    const minFinalValue = minFinalCltv ?? DEFAULT_MIN_FINAL_CLTV_EXPIRY;

    return {
        kind: 'bolt11',
        input,
        normalized,
        valid: !hasErrors(issues),
        issues,
        segments,
        hrp,
        network,
        amountMsat,
        amountText,
        timestamp,
        expiry: expiryValue,
        expiryDefaulted: expiry === undefined,
        expiresAt: timestamp + expiryValue,
        minFinalCltvExpiry: minFinalValue,
        minFinalCltvExpiryDefaulted: minFinalCltv === undefined,
        paymentHash: result.paymentHash,
        paymentSecret: result.paymentSecret,
        description: result.description,
        descriptionHash: result.descriptionHash,
        metadata: result.metadata,
        payee: result.payee,
        recoveredPubkey,
        nodeId: result.payee ?? recoveredPubkey,
        signature: bytesToHex(compact),
        recoveryFlag,
        signatureStatus,
        signatureHighS,
        features: result.features,
        routeHints,
        fallbackAddresses,
        tags
    };
}
