import type { ReactNode } from 'react';
import { MONO } from '../styles/styles';
import { font, fontWeight } from '../utils/FontUtils';
import Badge from './Badge';

export interface RecordRow {
    key: string;
    type: string;
    name: string;
    length: string;
    value: ReactNode;
    flag?: { tone: 'warning' | 'error' | 'neutral'; label: string };
}

const th: React.CSSProperties = {
    padding: '12px 14px',
    textAlign: 'left',
    fontWeight: 'normal',
    whiteSpace: 'nowrap'
};
const td: React.CSSProperties = { padding: '12px 14px', verticalAlign: 'top' };

/** Record table with a row selection shared with the annotated string. */
export default function RecordTable({
    rows,
    headers,
    selectedKey,
    onSelect
}: {
    rows: RecordRow[];
    headers: [string, string, string, string];
    selectedKey: string | null;
    onSelect: (key: string) => void;
}) {
    return (
        <div className="no-scrollbar" style={{ overflowX: 'auto' }}>
            <table
                style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: 13
                }}
            >
                <thead>
                    <tr
                        style={{
                            borderBottom: '1px solid var(--theme-separator)',
                            color: 'var(--theme-secondaryText)',
                            fontFamily: font('montrealMedium'),
                            fontWeight: fontWeight.montrealMedium,
                            fontSize: 14
                        }}
                    >
                        {headers.map((h) => (
                            <th key={h} style={th}>
                                {h}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((r) => (
                        <tr
                            key={r.key}
                            className={`list-row${r.key === selectedKey ? ' selected' : ''}`}
                            style={{
                                borderBottom:
                                    '1px solid var(--theme-separator)',
                                cursor: 'pointer'
                            }}
                            onClick={() => onSelect(r.key)}
                            onMouseEnter={() => onSelect(r.key)}
                        >
                            <td
                                style={{
                                    ...td,
                                    fontFamily: MONO,
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {r.type}
                            </td>
                            <td style={{ ...td, whiteSpace: 'nowrap' }}>
                                <span
                                    style={{
                                        display: 'inline-flex',
                                        gap: 8,
                                        alignItems: 'center'
                                    }}
                                >
                                    {r.name}
                                    {r.flag && (
                                        <Badge tone={r.flag.tone}>
                                            {r.flag.label}
                                        </Badge>
                                    )}
                                </span>
                            </td>
                            <td style={{ ...td, fontFamily: MONO }}>
                                {r.length}
                            </td>
                            <td
                                style={{
                                    ...td,
                                    fontFamily: MONO,
                                    wordBreak: 'break-all',
                                    minWidth: 220
                                }}
                            >
                                {r.value}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
