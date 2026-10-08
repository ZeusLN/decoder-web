import type { Issue } from '../lib/types';
import { font } from '../utils/FontUtils';

const COLORS = {
    error: {
        color: '#E14C4C',
        background: 'rgba(225, 76, 76, 0.1)',
        border: 'rgba(225, 76, 76, 0.4)'
    },
    warning: {
        color: '#FFB040',
        background: 'rgba(255, 176, 64, 0.08)',
        border: 'rgba(255, 176, 64, 0.35)'
    },
    info: {
        color: 'var(--theme-secondaryText)',
        background: 'var(--theme-secondary)',
        border: 'var(--theme-separator)'
    }
};

const LABELS = { error: 'Error', warning: 'Warning', info: 'Note' };

export default function IssueList({ issues }: { issues: Issue[] }) {
    if (issues.length === 0) return null;
    const order = { error: 0, warning: 1, info: 2 };
    const sorted = [...issues].sort(
        (a, b) => order[a.severity] - order[b.severity]
    );
    return (
        <ul
            style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 8
            }}
        >
            {sorted.map((issue, i) => {
                const c = COLORS[issue.severity];
                return (
                    <li
                        key={`${issue.code}-${i}`}
                        style={{
                            padding: '10px 12px',
                            borderRadius: 6,
                            background: c.background,
                            border: `1px solid ${c.border}`,
                            color: c.color,
                            fontFamily: font('montreal'),
                            fontSize: 13,
                            lineHeight: 1.45,
                            wordBreak: 'break-word'
                        }}
                    >
                        <strong style={{ fontWeight: 500 }}>
                            {LABELS[issue.severity]}:
                        </strong>{' '}
                        {issue.message}
                    </li>
                );
            })}
        </ul>
    );
}
