/**
 * Works out what kind of Lightning string the input is, after removing
 * wrappers: `lightning:` URIs, `lnurl:` prefixes, LUD-01 `?lightning=`
 * fallback URLs and BIP 21 `bitcoin:` URIs with a lightning or lno param.
 */
import { isLightningAddress, isLud17Url } from './lnurl/decode';

export type InputKind =
    | 'bolt11'
    | 'bolt12'
    | 'lnurl'
    | 'lud17'
    | 'lightning-address'
    | 'bip353'
    | 'unknown';

export interface Classified {
    kind: InputKind;
    /** The input with wrappers removed. */
    value: string;
    /** Wrappers that were removed, outermost first. */
    unwrapped: string[];
}

const BOLT11_PREFIX = /^ln(bc|tbs|tb|bcrt|sb)[0-9]*[munp]?1/;

function paramFrom(value: string, names: string[]): string | undefined {
    const query = value.includes('?')
        ? value.slice(value.indexOf('?') + 1)
        : '';
    const params = new URLSearchParams(query);
    for (const name of names) {
        for (const [k, v] of params) {
            if (k.toLowerCase() === name && v) return v;
        }
    }
    return undefined;
}

export function classify(input: string): Classified {
    let value = input.trim();
    const unwrapped: string[] = [];

    for (let guard = 0; guard < 4; guard++) {
        const lower = value.toLowerCase();
        if (lower.startsWith('lightning:')) {
            value = value.slice('lightning:'.length).replace(/^\/\//, '');
            unwrapped.push('lightning:');
            continue;
        }
        if (lower.startsWith('lnurl:')) {
            value = value.slice('lnurl:'.length);
            unwrapped.push('lnurl:');
            continue;
        }
        if (lower.startsWith('bitcoin:')) {
            const inner = paramFrom(value, ['lightning', 'lno']);
            if (inner) {
                value = inner;
                unwrapped.push('bitcoin:');
                continue;
            }
            break;
        }
        if (/^https?:\/\//.test(lower)) {
            const inner = paramFrom(value, ['lightning']);
            if (inner) {
                value = inner;
                unwrapped.push('lightning= parameter');
                continue;
            }
        }
        break;
    }
    value = value.trim();
    const lower = value.toLowerCase();
    const compact = lower.replace(/\+\s*/g, '');

    let kind: InputKind = 'unknown';
    if (isLud17Url(value)) kind = 'lud17';
    else if (value.startsWith('₿')) kind = 'bip353';
    else if (isLightningAddress(value)) kind = 'lightning-address';
    else if (lower.startsWith('lnurl1')) kind = 'lnurl';
    else if (/^ln[orip]1/.test(compact)) kind = 'bolt12';
    else if (BOLT11_PREFIX.test(lower)) kind = 'bolt11';
    return { kind, value, unwrapped };
}
