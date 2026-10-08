import type { LnurlResult } from '../lib/lnurl/decode';
import type { LnurlResponse } from '../lib/lnurl/parse';
import type { Segment } from '../lib/types';
import { fieldInfo } from '../lib/fieldInfo';
import { useLnurlFetch } from '../hooks/useLnurlFetch';
import { errorBoxStyle } from '../styles/styles';
import { font } from '../utils/FontUtils';
import { toJson } from '../utils/format';
import Field from '../components/Field';
import type { BadgeTone } from '../components/Badge';
import type { SegmentDetail } from '../components/AnnotatedString';
import { AmountValue, GroupTitle } from './common';

const SOURCE_LABELS = {
    bech32: 'LNURL',
    lud17: 'LNURL (LUD-17)',
    'lightning-address': 'Lightning address'
};

export function lnurlBadges(
    r: LnurlResult
): { tone: BadgeTone; label: string }[] {
    const badges: { tone: BadgeTone; label: string }[] = [
        { tone: 'strong', label: SOURCE_LABELS[r.source] }
    ];
    if (r.tag) badges.push({ tone: 'neutral', label: r.tag });
    if (r.isOnion) badges.push({ tone: 'neutral', label: 'onion' });
    return badges;
}

function ResponseFields({ res }: { res: LnurlResponse }) {
    return (
        <>
            {res.tag && <Field label="Type" infoKey="tag" value={res.tag} />}
            {res.callback && (
                <Field
                    label="Callback"
                    infoKey="callback"
                    value={
                        <a
                            href={res.callback}
                            target="_blank"
                            rel="noreferrer noopener"
                        >
                            {res.callback}
                        </a>
                    }
                />
            )}
            {res.minSendable !== undefined && (
                <Field
                    label="Min sendable"
                    infoKey="minSendable"
                    value={<AmountValue msat={res.minSendable} />}
                />
            )}
            {res.maxSendable !== undefined && (
                <Field
                    label="Max sendable"
                    infoKey="maxSendable"
                    value={<AmountValue msat={res.maxSendable} />}
                />
            )}
            {res.minWithdrawable !== undefined && (
                <Field
                    label="Min withdrawable"
                    infoKey="minWithdrawable"
                    value={<AmountValue msat={res.minWithdrawable} />}
                />
            )}
            {res.maxWithdrawable !== undefined && (
                <Field
                    label="Max withdrawable"
                    infoKey="maxWithdrawable"
                    value={<AmountValue msat={res.maxWithdrawable} />}
                />
            )}
            {res.defaultDescription !== undefined && (
                <Field
                    label="Default description"
                    infoKey="defaultDescription"
                    value={res.defaultDescription || '(empty)'}
                />
            )}
            {res.k1 && (
                <Field
                    label="k1"
                    infoKey="k1"
                    value={res.k1}
                    copy={res.k1}
                    mono
                />
            )}
            {res.uri && (
                <Field label="Node URI" value={res.uri} copy={res.uri} mono />
            )}
            {res.commentAllowed !== undefined && (
                <Field
                    label="Comment allowed"
                    infoKey="commentAllowed"
                    value={`${res.commentAllowed} characters`}
                />
            )}
            {res.allowsNostr !== undefined && (
                <Field
                    label="Allows Nostr zaps"
                    infoKey="allowsNostr"
                    value={res.allowsNostr ? 'Yes' : 'No'}
                />
            )}
            {res.nostrPubkey && (
                <Field
                    label="Nostr pubkey"
                    infoKey="nostrPubkey"
                    value={res.nostrPubkey}
                    copy={res.nostrPubkey}
                    mono
                />
            )}
            {res.disposable !== undefined && (
                <Field
                    label="Disposable"
                    value={res.disposable ? 'Yes' : 'No'}
                />
            )}
            {res.payerData && (
                <Field
                    label="Payer data"
                    infoKey="payerData"
                    value={Object.entries(res.payerData)
                        .map(
                            ([k, v]) =>
                                `${k}${v?.mandatory ? ' (required)' : ''}`
                        )
                        .join(', ')}
                />
            )}
            {res.metadataError && (
                <Field
                    label="Metadata"
                    value={`Could not parse: ${res.metadataError}`}
                />
            )}
            {res.metadata && res.metadata.length > 0 && (
                <>
                    <GroupTitle>Metadata</GroupTitle>
                    {res.metadata.map((m, i) =>
                        m.isImage ? (
                            <Field
                                key={i}
                                label={m.mime}
                                value={
                                    <img
                                        src={m.value}
                                        alt="LNURL metadata"
                                        style={{
                                            maxWidth: 160,
                                            maxHeight: 160,
                                            borderRadius: 8
                                        }}
                                    />
                                }
                            />
                        ) : (
                            <Field key={i} label={m.mime} value={m.value} />
                        )
                    )}
                </>
            )}
            {Object.keys(res.extra).length > 0 && (
                <Field
                    label="Other fields"
                    value={
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                            {toJson(res.extra)}
                        </pre>
                    }
                    mono
                />
            )}
        </>
    );
}

export function LnurlFields({ r }: { r: LnurlResult }) {
    // LNURL-auth URLs carry everything needed; fetching them would log in.
    const { state, retry } = useLnurlFetch(r.tag === 'login' ? null : r.url);
    return (
        <div>
            <GroupTitle>Decoded</GroupTitle>
            {r.address && (
                <>
                    <Field
                        label="Username"
                        infoKey="username"
                        value={r.address.username}
                    />
                    <Field
                        label="Domain"
                        infoKey="domain"
                        value={r.address.domain}
                    />
                </>
            )}
            <Field
                label="URL"
                infoKey="url"
                value={
                    <a href={r.url} target="_blank" rel="noreferrer noopener">
                        {r.url}
                    </a>
                }
                copy={r.url}
            />
            {Object.entries(r.params).map(([k, v]) => (
                <Field key={k} label={`Query: ${k}`} value={v} copy={v} mono />
            ))}

            {r.tag === 'login' ? (
                <p
                    style={{
                        marginTop: 16,
                        fontFamily: font('montreal'),
                        fontSize: 13,
                        color: 'var(--theme-secondaryText)'
                    }}
                >
                    This is an LNURL-auth login request. A wallet signs k1 with
                    a key derived for {safeHost(r.url)}; nothing is fetched
                    here.
                </p>
            ) : (
                <>
                    <GroupTitle>Service response</GroupTitle>
                    {state.status === 'loading' && (
                        <p
                            style={{
                                fontSize: 13,
                                color: 'var(--theme-secondaryText)'
                            }}
                        >
                            Fetching…
                        </p>
                    )}
                    {state.status === 'done' && state.result.ok && (
                        <ResponseFields res={state.result.response} />
                    )}
                    {state.status === 'done' && !state.result.ok && (
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 10,
                                alignItems: 'flex-start',
                                marginTop: 6
                            }}
                        >
                            <div style={errorBoxStyle}>
                                {state.result.error.message}
                            </div>
                            <button className="btn-secondary" onClick={retry}>
                                Try again
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

function safeHost(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return 'the service';
    }
}

export function describeLnurlSegment(
    r: LnurlResult,
    s: Segment
): SegmentDetail {
    if (s.label === 'url')
        return {
            title: 'Encoded URL',
            subtitle: fieldInfo('url'),
            body: r.url
        };
    return {
        title: s.label.charAt(0).toUpperCase() + s.label.slice(1),
        subtitle: fieldInfo(s.label)
    };
}
