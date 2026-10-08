import { useState } from 'react';
import type { DecodeResult, Segment } from '../lib/types';
import { errorBoxStyle } from '../styles/styles';
import Card from '../components/Card';
import Badge, { type BadgeTone } from '../components/Badge';
import IssueList from '../components/IssueList';
import Tabs from '../components/Tabs';
import RawJson from '../components/RawJson';
import RecordTable, { type RecordRow } from '../components/RecordTable';
import AnnotatedString, {
    type SegmentDetail
} from '../components/AnnotatedString';
import QrCode from '../components/QrCode';
import { useNow } from '../hooks/useNow';
import {
    Bolt11Fields,
    bolt11Badges,
    bolt11Rows,
    describeBolt11Segment
} from './Bolt11View';
import {
    Bolt12Fields,
    bolt12Badges,
    bolt12Rows,
    describeBolt12Segment
} from './Bolt12View';
import { LnurlFields, describeLnurlSegment, lnurlBadges } from './LnurlView';

type Tab = 'fields' | 'records' | 'raw';

export default function ResultView({
    result
}: {
    result: Exclude<DecodeResult, { kind: 'error' }>;
}) {
    const now = useNow();
    const [tab, setTab] = useState<Tab>('fields');
    const [selected, setSelected] = useState<string | null>(null);

    let badges: { tone: BadgeTone; label: string }[];
    let fields: React.ReactNode;
    let rows: RecordRow[] | null = null;
    let rowHeaders: [string, string, string, string] = [
        'Type',
        'Name',
        'Length',
        'Value'
    ];
    let describe: (s: Segment, i: number) => SegmentDetail;

    switch (result.kind) {
        case 'bolt11':
            badges = bolt11Badges(result, now);
            fields = <Bolt11Fields r={result} now={now} />;
            rows = bolt11Rows(result);
            rowHeaders = ['Tag', 'Name', 'Length', 'Value'];
            describe = (s) => describeBolt11Segment(result, s);
            break;
        case 'bolt12':
            badges = bolt12Badges(result, now);
            fields = <Bolt12Fields r={result} now={now} />;
            rows = bolt12Rows(result);
            describe = (s) => describeBolt12Segment(result, s);
            break;
        case 'lnurl':
            badges = lnurlBadges(result);
            fields = <LnurlFields r={result} />;
            describe = (s) => describeLnurlSegment(result, s);
            break;
    }

    const tabs: { id: Tab; label: string }[] = [
        { id: 'fields', label: 'Fields' },
        ...(rows
            ? [
                  {
                      id: 'records' as const,
                      label: result.kind === 'bolt11' ? 'Tags' : 'TLV records'
                  }
              ]
            : []),
        { id: 'raw', label: 'Raw JSON' }
    ];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {badges.map((b) => (
                    <Badge key={b.label} tone={b.tone}>
                        {b.label}
                    </Badge>
                ))}
            </div>
            <IssueList issues={result.issues} />
            <div className="result-grid">
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 20,
                        minWidth: 0
                    }}
                >
                    <Card>
                        <Tabs tabs={tabs} active={tab} onChange={setTab} />
                        <div style={{ marginTop: 8 }}>
                            {tab === 'fields' && fields}
                            {tab === 'records' && rows && (
                                <RecordTable
                                    rows={rows}
                                    headers={rowHeaders}
                                    selectedKey={selected}
                                    onSelect={setSelected}
                                />
                            )}
                            {tab === 'raw' && <RawJson value={result} />}
                        </div>
                    </Card>
                    <Card title="Annotated string">
                        <AnnotatedString
                            text={result.normalized}
                            segments={result.segments}
                            selectedKey={selected}
                            onSelect={setSelected}
                            describe={describe}
                        />
                    </Card>
                </div>
                <Card
                    title="QR code"
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    <QrCode value={result.normalized} />
                </Card>
            </div>
        </div>
    );
}

export function ErrorView({
    result
}: {
    result: Extract<DecodeResult, { kind: 'error' }>;
}) {
    return (
        <div style={errorBoxStyle}>
            {result.detected
                ? `Looks like a ${result.detected}, but it could not be decoded: `
                : ''}
            {result.message}
        </div>
    );
}
