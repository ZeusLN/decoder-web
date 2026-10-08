import { useMemo } from 'react';
import { toJson } from '../utils/format';
import { MONO } from '../styles/styles';
import CopyButton from './CopyButton';

export default function RawJson({ value }: { value: unknown }) {
    const json = useMemo(() => toJson(value), [value]);
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ alignSelf: 'flex-end' }}>
                <CopyButton
                    value={json}
                    label="Copy JSON"
                    title="Copy the decoded result as JSON"
                />
            </div>
            <pre
                style={{
                    margin: 0,
                    padding: 16,
                    borderRadius: 8,
                    background: 'var(--theme-background)',
                    border: '1px solid var(--theme-separator)',
                    color: 'var(--theme-text)',
                    fontFamily: MONO,
                    fontSize: 12,
                    lineHeight: 1.5,
                    overflow: 'auto',
                    maxHeight: 520
                }}
            >
                {json}
            </pre>
        </div>
    );
}
