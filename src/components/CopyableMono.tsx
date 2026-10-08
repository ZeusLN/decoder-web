import React from 'react';
import { useCopy } from '../hooks/useCopy';

/**
 * Click-to-copy text: shows a display form, copies the full
 * value, and swaps to "Copied!" for a beat, or "Copy failed" when the
 * clipboard write is refused.
 */
export default function CopyableMono({
    value,
    display,
    title = 'Click to copy',
    style
}: {
    /** The full string written to the clipboard. */
    value: string;
    /** Shown instead of `value`, typically a truncated form. */
    display?: React.ReactNode;
    title?: string;
    style?: React.CSSProperties;
}) {
    const { state, copy } = useCopy();

    return (
        <span
            role="button"
            tabIndex={0}
            title={title}
            onClick={() => void copy(value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    void copy(value);
                }
            }}
            style={{
                cursor: 'pointer',
                color:
                    state === 'copied'
                        ? 'var(--theme-highlight)'
                        : state === 'failed'
                          ? 'var(--theme-error, #e5534b)'
                          : 'inherit',
                ...style
            }}
        >
            {state === 'copied'
                ? 'Copied!'
                : state === 'failed'
                  ? 'Copy failed'
                  : (display ?? value)}
        </span>
    );
}
