import type { ReactNode } from 'react';
import { Link } from 'react-router';
import type { Bolt12Record, Bolt12Result } from '../lib/bolt12/decode';
import { formatOfferAmount } from '../lib/bolt12/decode';
import type {
    Bip353Name,
    BlindedPath,
    BlindedPayInfo,
    Bolt12Fallback,
    ChainRef
} from '../lib/bolt12/codecs';
import type { FeatureBit } from '../lib/features';
import type { Segment } from '../lib/types';
import { fieldInfo } from '../lib/fieldInfo';
import { formatDuration } from '../utils/format';
import Field from '../components/Field';
import CopyableMono from '../components/CopyableMono';
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

const MESSAGE_LABELS: Record<Bolt12Result['message'], string> = {
    offer: 'BOLT 12 offer',
    invoice_request: 'BOLT 12 invoice request',
    invoice: 'BOLT 12 invoice',
    payer_proof: 'BOLT 12 payer proof'
};

export function bolt12Badges(
    r: Bolt12Result,
    now: number
): { tone: BadgeTone; label: string }[] {
    const badges: { tone: BadgeTone; label: string }[] = [
        { tone: 'strong', label: MESSAGE_LABELS[r.message] },
        { tone: 'neutral', label: r.chainName }
    ];
    badges.push(
        r.valid
            ? { tone: 'success', label: 'valid' }
            : { tone: 'error', label: 'invalid' }
    );
    if (r.expiresAt !== undefined) {
        badges.push(
            now >= r.expiresAt
                ? { tone: 'warning', label: 'expired' }
                : { tone: 'success', label: 'not expired' }
        );
    }
    if (r.signatureStatus === 'valid')
        badges.push({ tone: 'success', label: 'signature verified' });
    if (r.signatureStatus === 'invalid')
        badges.push({ tone: 'error', label: 'bad signature' });
    if (r.signatureStatus === 'missing')
        badges.push({ tone: 'error', label: 'no signature' });
    if (r.message === 'payer_proof')
        badges.push({ tone: 'warning', label: 'draft spec' });
    return badges;
}

function pathNode(path: BlindedPath, mainnet: boolean): ReactNode {
    const n = path.firstNodeId;
    if (n.kind === 'pubkey')
        return <NodeLink pubkey={n.pubkey} mainnet={mainnet} />;
    return `channel ${n.shortChannelId}, direction ${n.direction}`;
}

function PathList({
    paths,
    payinfo,
    mainnet
}: {
    paths: BlindedPath[];
    payinfo?: BlindedPayInfo[];
    mainnet: boolean;
}) {
    return (
        <div>
            {paths.map((p, i) => {
                const info = payinfo?.[i];
                return (
                    <SubCard
                        key={i}
                        title={`Blinded path ${i + 1} (${p.hops.length} hop${p.hops.length === 1 ? '' : 's'})`}
                    >
                        <Field
                            label="Introduction node"
                            value={pathNode(p, mainnet)}
                            mono
                        />
                        <Field
                            label="First path key"
                            value={p.firstPathKey}
                            copy={p.firstPathKey}
                            mono
                        />
                        {p.hops.map((h, j) => (
                            <Field
                                key={j}
                                label={`Hop ${j + 1}`}
                                value={h.blindedNodeId}
                                copy={h.blindedNodeId}
                                mono
                                note={`${h.encryptedRecipientData.length / 2} bytes of encrypted data`}
                            />
                        ))}
                        {info && (
                            <>
                                <Field
                                    label="Fees"
                                    value={`${info.feeBaseMsat} msat + ${info.feeProportionalMillionths} ppm`}
                                />
                                <Field
                                    label="CLTV delta"
                                    value={`${info.cltvExpiryDelta} blocks`}
                                />
                                <Field
                                    label="HTLC range"
                                    value={`${info.htlcMinimumMsat} to ${info.htlcMaximumMsat} msat`}
                                />
                                {info.features.length > 0 && (
                                    <Field
                                        label="Features"
                                        value={
                                            <FeatureList bits={info.features} />
                                        }
                                    />
                                )}
                            </>
                        )}
                    </SubCard>
                );
            })}
        </div>
    );
}

const LABELS: Record<string, string> = {
    signature: 'Signature',
    proof_signature: 'Proof signature',
    proof_omitted_tlvs: 'Omitted fields',
    invreq_bip_353_name: 'BIP 353 name',
    offer_issuer_id: 'Issuer ID',
    invreq_payer_id: 'Payer ID',
    invoice_node_id: 'Node ID',
    invoice_blindedpay: 'Blinded pay info'
};

function label(name: string): string {
    if (LABELS[name]) return LABELS[name];
    return name
        .replace(/^(offer|invreq|invoice|proof)_/, '')
        .replace(/_/g, ' ')
        .replace(/^./, (c) => c.toUpperCase());
}

function RecordField({
    rec,
    r,
    now
}: {
    rec: Bolt12Record;
    r: Bolt12Result;
    now: number;
}) {
    const mainnet = r.chainName === 'mainnet';
    const name = rec.name;
    const lbl = label(name);
    if (rec.error) {
        return (
            <Field
                label={lbl}
                infoKey={name}
                value={rec.hex || '(empty)'}
                mono
                note={`Malformed: ${rec.error}`}
            />
        );
    }
    const v = rec.value;
    switch (name) {
        case 'offer_amount':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={
                        r.fields.offer_currency ? (
                            formatOfferAmount(r.fields)
                        ) : (
                            <AmountValue msat={v as bigint} />
                        )
                    }
                />
            );
        case 'invreq_amount':
        case 'invoice_amount':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={<AmountValue msat={v as bigint} />}
                />
            );
        case 'offer_chains':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={
                        (v as ChainRef[])
                            .map((c) => c.name ?? c.hash)
                            .join(', ') || '(none)'
                    }
                />
            );
        case 'invreq_chain':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={(v as ChainRef).name ?? (v as ChainRef).hash}
                />
            );
        case 'offer_absolute_expiry':
        case 'invoice_created_at':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={
                        <TimeValue seconds={Number(v as bigint)} now={now} />
                    }
                />
            );
        case 'invoice_relative_expiry':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={formatDuration(Number(v as bigint))}
                />
            );
        case 'offer_quantity_max':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={(v as bigint) === 0n ? 'Unlimited' : String(v)}
                />
            );
        case 'offer_features':
        case 'invreq_features':
        case 'invoice_features':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={<FeatureList bits={v as FeatureBit[]} />}
                />
            );
        case 'offer_paths':
        case 'invreq_paths':
        case 'invoice_paths':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={
                        <PathList
                            paths={v as BlindedPath[]}
                            payinfo={
                                name === 'invoice_paths'
                                    ? r.fields.invoice_blindedpay
                                    : undefined
                            }
                            mainnet={mainnet}
                        />
                    }
                />
            );
        case 'invoice_blindedpay':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={`${(v as BlindedPayInfo[]).length} entries, shown with the paths above`}
                />
            );
        case 'offer_issuer_id':
        case 'invoice_node_id':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={<NodeLink pubkey={v as string} mainnet={mainnet} />}
                    mono
                />
            );
        case 'invoice_fallbacks':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={(v as Bolt12Fallback[]).map((f, i) => (
                        <span key={i} style={{ display: 'block' }}>
                            <CopyableMono value={f.address ?? f.programHex} />{' '}
                            {f.type ? `(${f.type})` : `(version ${f.version})`}
                        </span>
                    ))}
                />
            );
        case 'invreq_bip_353_name': {
            const n = v as Bip353Name;
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={`₿${n.name}@${n.domain}`}
                />
            );
        }
        case 'invoice_payment_hash':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={v as string}
                    copy={v as string}
                    mono
                    note={
                        r.message === 'invoice' ? (
                            <Link
                                to={`/verify?q=${encodeURIComponent(r.normalized)}`}
                            >
                                Verify a preimage for this hash
                            </Link>
                        ) : undefined
                    }
                />
            );
        case 'proof_omitted_tlvs':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={
                        r.payerProof?.omittedTlvs.length
                            ? r.payerProof.omittedTlvs.join(', ')
                            : '(none)'
                    }
                    note={`Encoded as ${rec.hex || 'nothing'}`}
                />
            );
        case 'proof_missing_hashes':
        case 'proof_leaf_hashes':
            return (
                <Field
                    label={lbl}
                    infoKey={name}
                    value={(v as string[]).map((h) => (
                        <span key={h} style={{ display: 'block' }}>
                            {h}
                        </span>
                    ))}
                    mono
                />
            );
        case 'unknown':
            return (
                <Field
                    label={`Unknown type ${rec.type}`}
                    value={rec.hex || '(empty)'}
                    copy={rec.hex}
                    mono
                    note={
                        rec.type % 2n === 0n
                            ? 'Even: readers must reject it'
                            : 'Odd: readers ignore it'
                    }
                />
            );
        default:
            if (typeof v === 'string') {
                const hexy = /^[0-9a-f]+$/.test(v) && v.length >= 16;
                return (
                    <Field
                        label={lbl}
                        infoKey={name}
                        value={v || '(empty)'}
                        copy={v}
                        mono={hexy}
                    />
                );
            }
            return (
                <Field label={lbl} infoKey={name} value={rec.display} mono />
            );
    }
}

const GROUPS: { title: string; test: (t: bigint) => boolean }[] = [
    { title: 'Offer', test: (t) => t >= 1n && t <= 79n },
    {
        title: 'Invoice request',
        test: (t) => t === 0n || (t >= 80n && t <= 159n)
    },
    { title: 'Invoice', test: (t) => t >= 160n && t <= 239n },
    { title: 'Signatures', test: (t) => t >= 240n && t <= 1000n },
    { title: 'Payer proof', test: (t) => t >= 1001n && t < 1_000_000_000n },
    { title: 'Experimental', test: (t) => t >= 1_000_000_000n }
];

export function Bolt12Fields({ r, now }: { r: Bolt12Result; now: number }) {
    return (
        <div>
            {GROUPS.map((g) => {
                const recs = r.records.filter((rec) => g.test(rec.type));
                if (recs.length === 0) return null;
                return (
                    <div key={g.title}>
                        <GroupTitle>{g.title}</GroupTitle>
                        {recs.map((rec) => (
                            <RecordField
                                key={rec.index}
                                rec={rec}
                                r={r}
                                now={now}
                            />
                        ))}
                    </div>
                );
            })}
            <GroupTitle>Derived</GroupTitle>
            {r.merkleRoot && (
                <Field
                    label={
                        r.message === 'payer_proof'
                            ? 'Invoice merkle root'
                            : r.message === 'offer'
                              ? 'Offer ID (merkle root)'
                              : 'Merkle root'
                    }
                    infoKey="merkle_root"
                    value={r.merkleRoot}
                    copy={r.merkleRoot}
                    mono
                />
            )}
            <Field
                label="Signature check"
                infoKey="signature"
                value={
                    {
                        valid: 'Valid',
                        invalid: 'Does not verify',
                        missing: 'No signature',
                        not_applicable: 'Offers are not signed'
                    }[r.signatureStatus]
                }
            />
            {r.payerProof && (
                <>
                    <Field
                        label="Preimage matches hash"
                        value={
                            r.payerProof.preimageMatchesPaymentHash
                                ? 'Yes'
                                : 'No'
                        }
                    />
                    <Field
                        label="Invoice signature"
                        value={
                            r.payerProof.invoiceSignatureValid
                                ? 'Valid'
                                : 'Does not verify'
                        }
                    />
                    <Field
                        label="Proof signature"
                        value={
                            r.payerProof.proofSignatureValid
                                ? 'Valid'
                                : 'Does not verify'
                        }
                    />
                </>
            )}
            {r.expiresAt !== undefined && r.message === 'invoice' && (
                <Field
                    label="Expires"
                    value={<TimeValue seconds={r.expiresAt} now={now} />}
                    infoKey="invoice_relative_expiry"
                />
            )}
        </div>
    );
}

export function bolt12Rows(r: Bolt12Result): RecordRow[] {
    return r.records.map((rec) => ({
        key: `r${rec.index}`,
        type: String(rec.type),
        name: rec.name === 'unknown' ? 'unknown' : rec.name,
        length: `${rec.length} B`,
        value: rec.error ? rec.hex || '(empty)' : rec.display || '(empty)',
        flag: rec.error
            ? { tone: 'error' as const, label: 'malformed' }
            : !rec.known
              ? {
                    tone:
                        rec.type % 2n === 0n
                            ? ('error' as const)
                            : ('neutral' as const),
                    label: rec.type % 2n === 0n ? 'unknown even' : 'unknown odd'
                }
              : undefined
    }));
}

export function describeBolt12Segment(
    r: Bolt12Result,
    s: Segment
): SegmentDetail {
    if (s.recordIndex !== undefined) {
        const rec = r.records[s.recordIndex];
        const known = rec.name !== 'unknown';
        return {
            title: known
                ? `${rec.name} (type ${rec.type})`
                : `Unknown type ${rec.type}`,
            subtitle: `${rec.length} bytes · ${rec.error ? `malformed: ${rec.error}` : known ? (fieldInfo(rec.name) ?? '') : rec.type % 2n === 0n ? 'even: readers must reject it' : 'odd: readers ignore it'}`,
            body: (
                <>
                    {rec.display !== rec.hex && (
                        <div
                            style={{ marginBottom: 6, wordBreak: 'break-word' }}
                        >
                            {rec.display}
                        </div>
                    )}
                    <div style={{ color: 'var(--theme-secondaryText)' }}>
                        {rec.hex || '(empty)'}
                    </div>
                </>
            )
        };
    }
    switch (s.kind) {
        case 'prefix':
            return {
                title: `Prefix: ${r.hrp}`,
                subtitle: MESSAGE_LABELS[r.message]
            };
        case 'separator':
            return { title: 'Separator', subtitle: fieldInfo('separator') };
        case 'padding':
            return { title: 'Padding', subtitle: fieldInfo('padding') };
        case 'continuation':
            return { title: 'Join', subtitle: fieldInfo('continuation') };
        default:
            return { title: s.label };
    }
}
