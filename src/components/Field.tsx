import type { ReactNode } from 'react';
import { fieldInfo } from '../lib/fieldInfo';
import { MONO } from '../styles/styles';
import { font, fontWeight } from '../utils/FontUtils';
import CopyableMono from './CopyableMono';
import InfoTip from './InfoTip';

interface FieldProps {
    label: string;
    /** Key into FIELD_INFO for the tooltip. */
    infoKey?: string;
    /** Rendered value. Strings are copyable when `copy` is set. */
    value: ReactNode;
    /** Value written to the clipboard; enables click-to-copy. */
    copy?: string;
    mono?: boolean;
    /** Extra line under the value, e.g. "default". */
    note?: ReactNode;
}

/**
 * A label and value row with an info tooltip and click-to-copy. Stacks
 * on narrow screens via the .field-row class.
 */
export default function Field({
    label,
    infoKey,
    value,
    copy,
    mono,
    note
}: FieldProps) {
    const info = fieldInfo(infoKey ?? label);
    const valueStyle = {
        fontFamily: mono ? MONO : font('montreal'),
        fontWeight: fontWeight.montreal,
        fontSize: mono ? 12.5 : 14,
        color: 'var(--theme-text)',
        wordBreak: 'break-all' as const,
        minWidth: 0
    };
    return (
        <div className="field-row">
            <span
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontFamily: font('montrealMedium'),
                    fontWeight: fontWeight.montrealMedium,
                    fontSize: 13,
                    color: 'var(--theme-secondaryText)'
                }}
            >
                {label}
                {info && <InfoTip text={info} />}
            </span>
            <span style={valueStyle}>
                {copy !== undefined ? (
                    <CopyableMono value={copy} display={value} />
                ) : (
                    value
                )}
                {note && (
                    <span
                        style={{
                            display: 'block',
                            marginTop: 2,
                            fontFamily: font('montreal'),
                            fontSize: 12,
                            color: 'var(--theme-secondaryText)'
                        }}
                    >
                        {note}
                    </span>
                )}
            </span>
        </div>
    );
}
