import type { ReactNode } from 'react';
import type { FeatureBit } from '../lib/features';
import { MONO } from '../styles/styles';
import { font, fontWeight } from '../utils/FontUtils';
import {
    formatBtc,
    formatDate,
    formatMsat,
    formatSats,
    relativeTime
} from '../utils/format';
import Badge from '../components/Badge';
import CopyableMono from '../components/CopyableMono';
import InfoTip from '../components/InfoTip';

export function NodeLink({
    pubkey,
    mainnet
}: {
    pubkey: string;
    mainnet: boolean;
}) {
    return (
        <span
            style={{
                display: 'inline-flex',
                flexWrap: 'wrap',
                gap: 8,
                alignItems: 'baseline'
            }}
        >
            <CopyableMono value={pubkey} />
            {mainnet && (
                <a
                    href={`https://amboss.space/node/${pubkey}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    style={{ fontFamily: font('montreal'), fontSize: 12 }}
                >
                    Amboss ↗
                </a>
            )}
        </span>
    );
}

export function AmountValue({ msat }: { msat: bigint }) {
    return (
        <span>
            {formatSats(msat)}
            <span
                style={{
                    color: 'var(--theme-secondaryText)',
                    fontSize: 12,
                    marginLeft: 8
                }}
            >
                {formatMsat(msat)} · {formatBtc(msat)}
            </span>
        </span>
    );
}

export function TimeValue({ seconds, now }: { seconds: number; now: number }) {
    return (
        <span>
            {formatDate(seconds)}
            <span
                style={{
                    color: 'var(--theme-secondaryText)',
                    fontSize: 12,
                    marginLeft: 8
                }}
            >
                {relativeTime(seconds, now)}
            </span>
        </span>
    );
}

export function FeatureList({ bits }: { bits: FeatureBit[] }) {
    if (bits.length === 0) return <span>(none)</span>;
    return (
        <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {bits.map((b) => (
                <span
                    key={b.bit}
                    style={{
                        display: 'inline-flex',
                        gap: 8,
                        alignItems: 'center',
                        flexWrap: 'wrap'
                    }}
                >
                    <span style={{ fontFamily: MONO, minWidth: 34 }}>
                        {b.bit}
                    </span>
                    <span
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6
                        }}
                    >
                        {b.name}
                        <InfoTip text={b.description} />
                    </span>
                    <Badge
                        tone={
                            b.unknownRequired
                                ? 'error'
                                : b.required
                                  ? 'strong'
                                  : 'neutral'
                        }
                    >
                        {b.unknownRequired
                            ? 'unknown, required'
                            : b.required
                              ? 'required'
                              : 'optional'}
                    </Badge>
                </span>
            ))}
        </span>
    );
}

export function SubCard({
    title,
    children
}: {
    title: string;
    children: ReactNode;
}) {
    return (
        <div
            style={{
                border: '1px solid var(--theme-separator)',
                borderRadius: 8,
                padding: '10px 14px',
                background: 'var(--theme-background)',
                marginTop: 8
            }}
        >
            <div
                style={{
                    fontFamily: font('montrealMedium'),
                    fontWeight: fontWeight.montrealMedium,
                    fontSize: 13,
                    color: 'var(--theme-secondaryText)',
                    marginBottom: 4
                }}
            >
                {title}
            </div>
            {children}
        </div>
    );
}

export function GroupTitle({ children }: { children: ReactNode }) {
    return (
        <h3
            style={{
                fontFamily: font('montrealMedium'),
                fontWeight: fontWeight.montrealMedium,
                fontSize: 12,
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                color: 'var(--theme-secondaryText)',
                margin: '18px 0 2px'
            }}
        >
            {children}
        </h3>
    );
}
