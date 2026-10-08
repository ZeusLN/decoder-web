import { Link } from 'react-router';
import type { Bolt11Result } from '../lib/bolt11/decode';
import type { Segment } from '../lib/types';
import { fieldInfo } from '../lib/fieldInfo';
import { formatDuration, formatSats } from '../utils/format';
import Field from '../components/Field';
import type { BadgeTone } from '../components/Badge';
import type { RecordRow } from '../components/RecordTable';
import type { SegmentDetail } from '../components/AnnotatedString';
import {
    AmountValue,
    FeatureList,
    GroupTitle,
    NodeLink,
    SubCard,
    TimeValue
} from './common';

export function bolt11Badges(
    r: Bolt11Result,
    now: number
): { tone: BadgeTone; label: string }[] {
    const badges: { tone: BadgeTone; label: string }[] = [
        { tone: 'strong', label: 'BOLT 11 invoice' },
        { tone: 'neutral', label: r.network.name }
    ];
    badges.push(
        r.valid
            ? { tone: 'success', label: 'valid' }
            : { tone: 'error', label: 'invalid' }
    );
    badges.push(
        now >= r.expiresAt
            ? { tone: 'warning', label: 'expired' }
            : { tone: 'success', label: 'not expired' }
    );
    badges.push(
        r.signatureStatus === 'verified' || r.signatureStatus === 'recovered'
            ? {
                  tone: 'success',
                  label:
                      r.signatureStatus === 'verified'
                          ? 'signature verified'
                          : 'payee recovered'
              }
            : { tone: 'error', label: 'bad signature' }
    );
    return badges;
}

export function Bolt11Fields({ r, now }: { r: Bolt11Result; now: number }) {
    const mainnet = r.network.name === 'mainnet';
    return (
        <div>
            <GroupTitle>Payment</GroupTitle>
            <Field
                label="Amount"
                infoKey="amount"
                value={
                    r.amountMsat === null ? (
                        'Any amount (payer chooses)'
                    ) : (
                        <AmountValue msat={r.amountMsat} />
                    )
                }
                note={
                    r.amountText
                        ? `Written as ${r.amountText} in the prefix`
                        : undefined
                }
            />
            {r.description !== undefined && (
                <Field
                    label="Description"
                    infoKey="description"
                    value={r.description || '(empty)'}
                />
            )}
            {r.descriptionHash && (
                <Field
                    label="Description hash"
                    infoKey="description_hash"
                    value={r.descriptionHash}
                    copy={r.descriptionHash}
                    mono
                />
            )}
            <Field
                label="Payment hash"
                infoKey="payment_hash"
                value={r.paymentHash}
                copy={r.paymentHash}
                mono
                note={
                    <Link to={`/verify?q=${encodeURIComponent(r.normalized)}`}>
                        Verify a preimage for this hash
                    </Link>
                }
            />
            {r.paymentSecret && (
                <Field
                    label="Payment secret"
                    infoKey="payment_secret"
                    value={r.paymentSecret}
                    copy={r.paymentSecret}
                    mono
                />
            )}
            {r.metadata && (
                <Field
                    label="Metadata"
                    infoKey="metadata"
                    value={r.metadata}
                    copy={r.metadata}
                    mono
                />
            )}

            <GroupTitle>Payee</GroupTitle>
            {r.nodeId && (
                <Field
                    label="Node ID"
                    infoKey="node_id"
                    value={<NodeLink pubkey={r.nodeId} mainnet={mainnet} />}
                    mono
                    note={
                        r.payee
                            ? "From the 'n' field"
                            : 'Recovered from the signature'
                    }
                />
            )}
            <Field
                label="Network"
                infoKey="network"
                value={r.network.name}
                note={`Prefix ln${r.network.bolt11Prefix}`}
            />

            <GroupTitle>Timing</GroupTitle>
            <Field
                label="Created"
                infoKey="timestamp"
                value={<TimeValue seconds={r.timestamp} now={now} />}
            />
            <Field
                label="Expiry"
                infoKey="expiry"
                value={formatDuration(r.expiry)}
                note={
                    r.expiryDefaulted ? 'Not set; BOLT 11 default' : undefined
                }
            />
            <Field
                label="Expires"
                value={<TimeValue seconds={r.expiresAt} now={now} />}
                infoKey="expiry"
            />
            <Field
                label="Min final CLTV expiry"
                infoKey="min_final_cltv_expiry"
                value={`${r.minFinalCltvExpiry} blocks`}
                note={
                    r.minFinalCltvExpiryDefaulted
                        ? 'Not set; BOLT 11 default'
                        : undefined
                }
            />

            {r.features && (
                <>
                    <GroupTitle>Features</GroupTitle>
                    <Field
                        label="Feature bits"
                        infoKey="features"
                        value={<FeatureList bits={r.features.bits} />}
                    />
                </>
            )}

            {r.fallbackAddresses.length > 0 && (
                <>
                    <GroupTitle>Fallback addresses</GroupTitle>
                    {r.fallbackAddresses.map((f, i) => (
                        <Field
                            key={i}
                            label={
                                f.type
                                    ? f.type.toUpperCase()
                                    : `Version ${f.version}`
                            }
                            infoKey="fallback_address"
                            value={f.address ?? f.programHex}
                            copy={f.address ?? f.programHex}
                            mono
                            note={
                                f.address
                                    ? undefined
                                    : 'Unknown version or invalid program; wallets ignore it'
                            }
                        />
                    ))}
                </>
            )}

            {r.routeHints.length > 0 && (
                <>
                    <GroupTitle>Route hints</GroupTitle>
                    {r.routeHints.map((route, i) => (
                        <SubCard
                            key={i}
                            title={`Route ${i + 1} (${route.length} hop${route.length === 1 ? '' : 's'})`}
                        >
                            {route.map((hop, j) => (
                                <div key={j} style={{ marginTop: j ? 8 : 0 }}>
                                    <Field
                                        label={`Hop ${j + 1} node`}
                                        infoKey="route_hint"
                                        value={
                                            <NodeLink
                                                pubkey={hop.pubkey}
                                                mainnet={mainnet}
                                            />
                                        }
                                        mono
                                    />
                                    <Field
                                        label="Channel"
                                        value={hop.shortChannelId}
                                        copy={hop.shortChannelId}
                                        mono
                                        note={hop.shortChannelIdHex}
                                    />
                                    <Field
                                        label="Fees"
                                        value={`${hop.feeBaseMsat} msat + ${hop.feeProportionalMillionths} ppm`}
                                    />
                                    <Field
                                        label="CLTV delta"
                                        value={`${hop.cltvExpiryDelta} blocks`}
                                    />
                                </div>
                            ))}
                        </SubCard>
                    ))}
                </>
            )}

            <GroupTitle>Signature</GroupTitle>
            <Field
                label="Signature"
                infoKey="signature"
                value={r.signature}
                copy={r.signature}
                mono
                note={r.signatureHighS ? 'High-S form' : undefined}
            />
            <Field
                label="Recovery flag"
                infoKey="recovery_flag"
                value={String(r.recoveryFlag)}
            />
        </div>
    );
}

function tagValue(r: Bolt11Result, i: number): string {
    const t = r.tags[i];
    if (t.display !== undefined) return t.display;
    return t.hex || '(empty)';
}

export function bolt11Rows(r: Bolt11Result): RecordRow[] {
    return r.tags.map((t) => ({
        key: `r${t.index}`,
        type: `${t.letter} (${t.code})`,
        name: t.name,
        length: `${t.lengthWords} words`,
        value: tagValue(r, t.index),
        flag: t.ignored
            ? { tone: 'warning' as const, label: 'ignored' }
            : t.name === 'unknown'
              ? { tone: 'neutral' as const, label: 'unknown' }
              : undefined
    }));
}

export function describeBolt11Segment(
    r: Bolt11Result,
    s: Segment
): SegmentDetail {
    const chars = `${s.end - s.start} characters`;
    if (s.recordIndex !== undefined) {
        const t = r.tags[s.recordIndex];
        return {
            title: `${t.name} ('${t.letter}', type ${t.code})`,
            subtitle: `${t.lengthWords} data words · ${t.ignored ? `ignored: ${t.ignored}` : (fieldInfo(t.name) ?? 'Unknown tag, kept as raw data')}`,
            body: tagValue(r, s.recordIndex)
        };
    }
    switch (s.kind) {
        case 'prefix':
            return {
                title: `Prefix: ln${r.network.bolt11Prefix}`,
                subtitle: `Lightning on ${r.network.name}`
            };
        case 'amount':
            return {
                title: `Amount: ${r.amountText}`,
                subtitle:
                    r.amountMsat !== null ? formatSats(r.amountMsat) : undefined
            };
        case 'timestamp':
            return {
                title: 'Timestamp',
                subtitle: `${chars} · ${new Date(r.timestamp * 1000).toISOString()}`,
                body: String(r.timestamp)
            };
        case 'signature':
            return {
                title: 'Signature',
                subtitle: `${chars} · 64-byte signature plus recovery flag ${r.recoveryFlag}`,
                body: r.signature
            };
        default:
            return {
                title: s.label.charAt(0).toUpperCase() + s.label.slice(1),
                subtitle: fieldInfo(s.label) ?? chars
            };
    }
}
