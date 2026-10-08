import { useCopy } from '../hooks/useCopy';

function CopyIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg
            viewBox="0 0 24 24"
            width={14}
            height={14}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <polyline points="20 6 9 17 4 12" />
        </svg>
    );
}

/** A button that copies `value` and shows whether the copy worked. */
export default function CopyButton({
    value,
    label,
    title
}: {
    value: string;
    label: string;
    title?: string;
}) {
    const { state, copy } = useCopy({ copied: 2000, failed: 2500 });
    const color =
        state === 'copied'
            ? 'var(--theme-success)'
            : state === 'failed'
              ? 'var(--theme-warning)'
              : 'var(--theme-text)';
    return (
        <button
            type="button"
            className="btn-secondary"
            title={title}
            onClick={() => void copy(value)}
            style={{
                color,
                borderColor: state === 'idle' ? undefined : color,
                minWidth: 120,
                transition: 'color 0.15s ease, border-color 0.15s ease'
            }}
        >
            {state === 'copied' ? <CheckIcon /> : <CopyIcon />}
            <span aria-live="polite">
                {state === 'copied'
                    ? 'Copied'
                    : state === 'failed'
                      ? 'Copy failed'
                      : label}
            </span>
        </button>
    );
}
