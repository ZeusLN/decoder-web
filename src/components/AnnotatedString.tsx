import type { ReactNode } from 'react';
import type { Segment } from '../lib/types';
import { MONO } from '../styles/styles';
import { font, fontWeight } from '../utils/FontUtils';

/** Greys for alternating fields, so neighbours stay distinct in monochrome. */
const FIELD_SHADES = [
    '#ffffff',
    '#b8b8b8',
    '#e4e4e4',
    '#949494',
    '#d0d0d0',
    '#a6a6a6'
];

/** Identifies what a segment belongs to; a record split by `+` joins shares one key. */
export function segmentKey(segment: Segment, index: number): string {
    return segment.recordIndex !== undefined
        ? `r${segment.recordIndex}`
        : `s${index}`;
}

function segmentColor(segment: Segment): string {
    switch (segment.kind) {
        case 'field':
            return FIELD_SHADES[
                (segment.recordIndex ?? 0) % FIELD_SHADES.length
            ];
        case 'unknown':
            return 'var(--theme-warning)';
        case 'signature':
            return '#7d7d7d';
        case 'amount':
        case 'timestamp':
            return '#d8d8d8';
        default:
            return 'var(--theme-secondaryText)';
    }
}

export interface SegmentDetail {
    title: string;
    subtitle?: string;
    body?: ReactNode;
}

export default function AnnotatedString({
    text,
    segments,
    selectedKey,
    onSelect,
    describe
}: {
    text: string;
    segments: Segment[];
    selectedKey: string | null;
    onSelect: (key: string | null) => void;
    describe: (segment: Segment, index: number) => SegmentDetail;
}) {
    const selectedIndex = segments.findIndex(
        (s, i) => segmentKey(s, i) === selectedKey
    );
    const detail =
        selectedIndex >= 0
            ? describe(segments[selectedIndex], selectedIndex)
            : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div
                className="annotated"
                style={{
                    fontFamily: MONO,
                    fontSize: 13.5,
                    lineHeight: 1.7,
                    wordBreak: 'break-all',
                    whiteSpace: 'pre-wrap'
                }}
                onMouseLeave={() => undefined}
            >
                {segments.map((s, i) => {
                    const key = segmentKey(s, i);
                    const interactive = s.kind !== 'continuation';
                    return (
                        <span
                            key={i}
                            className={`seg${key === selectedKey ? ' selected' : ''}`}
                            style={{
                                color: segmentColor(s),
                                textDecoration:
                                    s.kind === 'field' &&
                                    (s.recordIndex ?? 0) % 2 === 1
                                        ? 'underline'
                                        : undefined,
                                textDecorationColor: 'rgba(255,255,255,0.35)',
                                textUnderlineOffset: 3
                            }}
                            tabIndex={
                                interactive &&
                                (s.kind === 'field' || s.kind === 'unknown')
                                    ? 0
                                    : -1
                            }
                            role={interactive ? 'button' : undefined}
                            aria-label={interactive ? s.label : undefined}
                            onMouseEnter={() => interactive && onSelect(key)}
                            onFocus={() => interactive && onSelect(key)}
                            onClick={() => interactive && onSelect(key)}
                        >
                            {text.slice(s.start, s.end)}
                        </span>
                    );
                })}
            </div>
            <div
                aria-live="polite"
                style={{
                    minHeight: 64,
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: 'var(--theme-background)',
                    border: '1px solid var(--theme-separator)'
                }}
            >
                {detail ? (
                    <>
                        <div
                            style={{
                                fontFamily: font('montrealMedium'),
                                fontWeight: fontWeight.montrealMedium,
                                fontSize: 14,
                                color: 'var(--theme-text)'
                            }}
                        >
                            {detail.title}
                        </div>
                        {detail.subtitle && (
                            <div
                                style={{
                                    fontSize: 12,
                                    color: 'var(--theme-secondaryText)',
                                    marginTop: 2
                                }}
                            >
                                {detail.subtitle}
                            </div>
                        )}
                        {detail.body && (
                            <div
                                style={{
                                    marginTop: 8,
                                    fontFamily: MONO,
                                    fontSize: 12,
                                    wordBreak: 'break-all'
                                }}
                            >
                                {detail.body}
                            </div>
                        )}
                    </>
                ) : (
                    <span
                        style={{
                            fontSize: 13,
                            color: 'var(--theme-secondaryText)'
                        }}
                    >
                        Hover over or tap a part of the string to see what it
                        encodes.
                    </span>
                )}
            </div>
        </div>
    );
}
