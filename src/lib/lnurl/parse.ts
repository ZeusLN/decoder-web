/**
 * Shapes of LNURL responses: payRequest (LUD-06, with LUD-12 comments,
 * LUD-18 payer data and NIP-57 zaps), withdrawRequest (LUD-03) and
 * channelRequest (LUD-02). Unknown fields are kept in `extra`.
 */

export interface MetadataEntry {
    mime: string;
    /** Text value, or a data: URL for images. */
    value: string;
    isImage: boolean;
}

export interface LnurlResponse {
    tag?: string;
    callback?: string;
    k1?: string;
    minSendable?: bigint;
    maxSendable?: bigint;
    minWithdrawable?: bigint;
    maxWithdrawable?: bigint;
    defaultDescription?: string;
    commentAllowed?: number;
    allowsNostr?: boolean;
    nostrPubkey?: string;
    disposable?: boolean;
    payerData?: Record<string, { mandatory?: boolean }>;
    metadata?: MetadataEntry[];
    metadataError?: string;
    /** channelRequest fields. */
    uri?: string;
    /** Fields not listed above. */
    extra: Record<string, unknown>;
}

const KNOWN = new Set([
    'tag',
    'callback',
    'k1',
    'minSendable',
    'maxSendable',
    'minWithdrawable',
    'maxWithdrawable',
    'defaultDescription',
    'commentAllowed',
    'allowsNostr',
    'nostrPubkey',
    'disposable',
    'payerData',
    'metadata',
    'uri'
]);

// Images larger than this are not rendered (LUD-06 suggests keeping them small).
const MAX_IMAGE_BASE64 = 136 * 1024;

function toBigInt(v: unknown): bigint | undefined {
    if (typeof v === 'number' && Number.isFinite(v))
        return BigInt(Math.trunc(v));
    if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
    return undefined;
}

export function parseMetadata(metadata: string): MetadataEntry[] {
    const parsed: unknown = JSON.parse(metadata);
    if (!Array.isArray(parsed)) throw new Error('metadata is not a JSON array');
    return parsed.flatMap((entry): MetadataEntry[] => {
        if (!Array.isArray(entry) || typeof entry[0] !== 'string') return [];
        const [mime, value] = entry as [string, unknown];
        const text = typeof value === 'string' ? value : JSON.stringify(value);
        if (/^image\/(png|jpeg);base64$/.test(mime)) {
            if (text.length > MAX_IMAGE_BASE64) {
                return [
                    {
                        mime,
                        value: `(image of ${text.length} base64 characters not shown)`,
                        isImage: false
                    }
                ];
            }
            return [
                {
                    mime,
                    value: `data:${mime.split(';')[0]};base64,${text}`,
                    isImage: true
                }
            ];
        }
        return [{ mime, value: text, isImage: false }];
    });
}

export function parseLnurlResponse(raw: unknown): LnurlResponse {
    const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<
        string,
        unknown
    >;
    const out: LnurlResponse = { extra: {} };
    const str = (k: string) =>
        typeof obj[k] === 'string' ? (obj[k] as string) : undefined;
    out.tag = str('tag');
    out.callback = str('callback');
    out.k1 = str('k1');
    out.defaultDescription = str('defaultDescription');
    out.nostrPubkey = str('nostrPubkey');
    out.uri = str('uri');
    out.minSendable = toBigInt(obj.minSendable);
    out.maxSendable = toBigInt(obj.maxSendable);
    out.minWithdrawable = toBigInt(obj.minWithdrawable);
    out.maxWithdrawable = toBigInt(obj.maxWithdrawable);
    if (typeof obj.commentAllowed === 'number')
        out.commentAllowed = obj.commentAllowed;
    if (typeof obj.allowsNostr === 'boolean') out.allowsNostr = obj.allowsNostr;
    if (typeof obj.disposable === 'boolean') out.disposable = obj.disposable;
    if (obj.payerData && typeof obj.payerData === 'object') {
        out.payerData = obj.payerData as Record<
            string,
            { mandatory?: boolean }
        >;
    }
    if (typeof obj.metadata === 'string') {
        try {
            out.metadata = parseMetadata(obj.metadata);
        } catch (e) {
            out.metadataError = (e as Error).message;
        }
    }
    for (const [k, v] of Object.entries(obj)) {
        if (!KNOWN.has(k)) out.extra[k] = v;
    }
    return out;
}
