/**
 * Entry point: decode(input) returns a result for any supported Lightning
 * string and never throws.
 */
import { classify, type InputKind } from './classify';
import { decodeBolt11 } from './bolt11/decode';
import { decodeBolt12 } from './bolt12/decode';
import {
    decodeLightningAddress,
    decodeLnurlBech32,
    decodeLud17
} from './lnurl/decode';
import type { DecodeResult } from './types';

const ACCEPTED =
    'Paste a BOLT 11 invoice (lnbc...), a BOLT 12 offer, invoice request, invoice or payer proof (lno, lnr, lni, lnp), an LNURL or a lightning address.';

const KIND_NAMES: Record<InputKind, string> = {
    bolt11: 'BOLT 11 invoice',
    bolt12: 'BOLT 12 string',
    lnurl: 'LNURL',
    lud17: 'LNURL (LUD-17 URL)',
    'lightning-address': 'lightning address',
    bip353: 'BIP 353 name',
    unknown: 'unknown'
};

export function decode(input: string): DecodeResult {
    if (!input.trim()) {
        return { kind: 'error', input, message: ACCEPTED };
    }
    const c = classify(input);
    try {
        switch (c.kind) {
            case 'bolt11':
                return decodeBolt11(c.value);
            case 'bolt12':
                return decodeBolt12(c.value);
            case 'lnurl':
                return decodeLnurlBech32(c.value);
            case 'lud17':
                return decodeLud17(c.value);
            case 'lightning-address':
                return decodeLightningAddress(c.value);
            case 'bip353':
                return {
                    kind: 'error',
                    input,
                    detected: KIND_NAMES.bip353,
                    message:
                        'BIP 353 names (₿user@domain) are resolved through DNS, which this page does not query. Without the ₿ the same name is tried as a lightning address.'
                };
            default:
                return {
                    kind: 'error',
                    input,
                    message: `Not a recognised Lightning string. ${ACCEPTED}`
                };
        }
    } catch (e) {
        return {
            kind: 'error',
            input,
            detected: KIND_NAMES[c.kind],
            message: (e as Error).message
        };
    }
}

export { classify } from './classify';
export { checkPreimage } from './verify/preimage';
export { fetchLnurl } from './lnurl/fetch';
export type { DecodeResult, Issue, Segment } from './types';
export type { Bolt11Result } from './bolt11/decode';
export type { Bolt12Result } from './bolt12/decode';
export type { LnurlResult } from './lnurl/decode';
