/**
 * LNURL inputs: bech32 `lnurl1...` strings (LUD-01), LUD-17 scheme URLs
 * (lnurlp://, lnurlw://, lnurlc://, keyauth://) and lightning addresses
 * (LUD-16). Decoding only produces the URL; fetching it is separate
 * (fetch.ts) because it needs the network.
 */
import { decodeBech32, wordsToBytes } from '../util/bech32';
import { utf8DecodeStrict } from '../util/bytes';
import type { Issue, Segment } from '../types';

export type LnurlSource = 'bech32' | 'lud17' | 'lightning-address';

export interface LnurlResult {
    kind: 'lnurl';
    input: string;
    normalized: string;
    source: LnurlSource;
    /** The URL a wallet would fetch (or open, for login). */
    url: string;
    /** LUD-17 scheme, e.g. `lnurlp`. */
    scheme?: string;
    /** Tag known before fetching: `login` for LNURL-auth URLs. */
    tag?: string;
    /** Query parameters of the decoded URL. */
    params: Record<string, string>;
    address?: { username: string; domain: string };
    isOnion: boolean;
    valid: boolean;
    issues: Issue[];
    segments: Segment[];
}

// From ZEUS utils/AddressUtils.ts (RFC 5322 local part, DNS or IP domain).
const LIGHTNING_ADDRESS =
    /^(?:[\p{L}\p{N}\p{S}\p{M}!#$%&'*+/=?^_`{|}~-]+(?:\.[\p{L}\p{N}\p{S}\p{M}!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/u;

export function isLightningAddress(input: string): boolean {
    return LIGHTNING_ADDRESS.test(input);
}

const LUD17_SCHEMES = ['lnurlp', 'lnurlw', 'lnurlc', 'keyauth'];

export function isLud17Url(input: string): boolean {
    const scheme = input.split('://')[0]?.toLowerCase();
    return input.includes('://') && LUD17_SCHEMES.includes(scheme);
}

function queryParams(url: string): Record<string, string> {
    try {
        const params: Record<string, string> = {};
        new URL(url).searchParams.forEach((v, k) => {
            params[k] = v;
        });
        return params;
    } catch {
        return {};
    }
}

function hostIsOnion(url: string): boolean {
    try {
        return new URL(url).hostname.endsWith('.onion');
    } catch {
        return false;
    }
}

function urlIssues(url: string, isOnion: boolean): Issue[] {
    const issues: Issue[] = [];
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        return [
            {
                code: 'invalid_url',
                severity: 'error',
                message: 'The decoded value is not a URL.'
            }
        ];
    }
    if (
        parsed.protocol !== 'https:' &&
        !(parsed.protocol === 'http:' && isOnion)
    ) {
        issues.push({
            code: 'insecure_url',
            severity: 'warning',
            message: 'LUD-01 requires https, except for .onion services.'
        });
    }
    return issues;
}

function withTag(result: Omit<LnurlResult, 'tag' | 'valid'>): LnurlResult {
    const tag = result.params.tag === 'login' ? 'login' : undefined;
    return {
        ...result,
        tag,
        valid: !result.issues.some((i) => i.severity === 'error')
    };
}

export function decodeLnurlBech32(input: string): LnurlResult {
    const trimmed = input.trim();
    const decoded = decodeBech32(trimmed);
    if (decoded.hrp !== 'lnurl') {
        throw new Error(`Not an LNURL: prefix '${decoded.hrp}'`);
    }
    const url = utf8DecodeStrict(wordsToBytes(decoded.words, true));
    if (url === null) {
        throw new Error('LNURL does not decode to UTF-8 text');
    }
    const normalized = trimmed.toLowerCase();
    const isOnion = hostIsOnion(url);
    const dataEnd = normalized.length - 6;
    return withTag({
        kind: 'lnurl',
        input,
        normalized,
        source: 'bech32',
        url,
        params: queryParams(url),
        isOnion,
        issues: urlIssues(url, isOnion),
        segments: [
            { start: 0, end: 5, kind: 'prefix', label: 'prefix' },
            { start: 5, end: 6, kind: 'separator', label: 'separator' },
            { start: 6, end: dataEnd, kind: 'field', label: 'url' },
            {
                start: dataEnd,
                end: normalized.length,
                kind: 'checksum',
                label: 'checksum'
            }
        ]
    });
}

export function decodeLud17(input: string): LnurlResult {
    const trimmed = input.trim();
    const [scheme, rest] = [
        trimmed.slice(0, trimmed.indexOf('://')).toLowerCase(),
        trimmed.slice(trimmed.indexOf('://') + 3)
    ];
    const host = rest.split(/[/?#]/)[0].toLowerCase();
    const isOnion = host.endsWith('.onion');
    const url = `${isOnion ? 'http' : 'https'}://${rest}`;
    return withTag({
        kind: 'lnurl',
        input,
        normalized: trimmed,
        source: 'lud17',
        scheme,
        url,
        params: queryParams(url),
        isOnion,
        issues: urlIssues(url, isOnion),
        segments: [
            {
                start: 0,
                end: scheme.length + 3,
                kind: 'prefix',
                label: 'scheme'
            },
            {
                start: scheme.length + 3,
                end: trimmed.length,
                kind: 'field',
                label: 'url'
            }
        ]
    });
}

/** LUD-16: user@domain -> https://domain/.well-known/lnurlp/user. */
export function decodeLightningAddress(input: string): LnurlResult {
    const trimmed = input.trim();
    const at = trimmed.lastIndexOf('@');
    const username = trimmed.slice(0, at);
    const domain = trimmed.slice(at + 1).toLowerCase();
    const isOnion = domain.endsWith('.onion');
    // cryptoqr.net usernames carry case-sensitive URL-encoded data (ZEUS LnurlPayUtils).
    const isCryptoQr =
        domain === 'cryptoqr.net' || domain.endsWith('.cryptoqr.net');
    const user = isCryptoQr ? username : username.toLowerCase();
    const url = `${isOnion ? 'http' : 'https'}://${domain}/.well-known/lnurlp/${user}`;
    return withTag({
        kind: 'lnurl',
        input,
        normalized: trimmed,
        source: 'lightning-address',
        url,
        params: {},
        address: { username: user, domain },
        isOnion,
        issues: [],
        segments: [
            { start: 0, end: at, kind: 'field', label: 'username' },
            { start: at, end: at + 1, kind: 'separator', label: 'separator' },
            {
                start: at + 1,
                end: trimmed.length,
                kind: 'field',
                label: 'domain'
            }
        ]
    });
}
