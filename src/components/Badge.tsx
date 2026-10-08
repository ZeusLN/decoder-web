import { font, fontWeight } from '../utils/FontUtils';

export type BadgeTone = 'neutral' | 'strong' | 'success' | 'warning' | 'error';

const TONES: Record<
    BadgeTone,
    { background: string; color: string; border: string }
> = {
    neutral: {
        background: 'var(--theme-secondary)',
        color: 'var(--theme-secondaryText)',
        border: '1px solid var(--theme-separator)'
    },
    strong: {
        background: 'var(--theme-highlight)',
        color: 'var(--theme-on-highlight)',
        border: '1px solid var(--theme-highlight)'
    },
    success: {
        background: 'rgba(70, 190, 67, 0.12)',
        color: 'var(--theme-success)',
        border: '1px solid rgba(70, 190, 67, 0.4)'
    },
    warning: {
        background: 'rgba(255, 176, 64, 0.12)',
        color: 'var(--theme-bitcoin)',
        border: '1px solid rgba(255, 176, 64, 0.4)'
    },
    error: {
        background: 'rgba(225, 76, 76, 0.12)',
        color: 'var(--theme-warning)',
        border: '1px solid rgba(225, 76, 76, 0.4)'
    }
};

/** A small uppercase pill with status tones. */
export default function Badge({
    tone = 'neutral',
    children
}: {
    tone?: BadgeTone;
    children: React.ReactNode;
}) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontFamily: font('montrealMedium'),
                fontWeight: fontWeight.montrealMedium,
                fontSize: 11,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                padding: '3px 8px',
                borderRadius: 10,
                whiteSpace: 'nowrap',
                ...TONES[tone]
            }}
        >
            {children}
        </span>
    );
}
