/** Inline style objects shared across components. */
import type { CSSProperties } from 'react';
import { font, fontWeight } from '../utils/FontUtils';

export const MONO =
    'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';

export const cardStyle: CSSProperties = {
    background: 'var(--theme-secondary)',
    borderRadius: 12,
    border: '1px solid var(--theme-separator)',
    padding: 20
};

export const pageTitleStyle: CSSProperties = {
    fontFamily: font('marlideBold'),
    fontSize: 44,
    lineHeight: 1.05,
    color: 'var(--theme-highlight)',
    fontWeight: 'normal'
};

export const sectionTitleStyle: CSSProperties = {
    fontFamily: font('marlideBold'),
    fontSize: 24,
    color: 'var(--theme-highlight)',
    fontWeight: 'normal'
};

export const subtitleStyle: CSSProperties = {
    fontFamily: font('montreal'),
    fontWeight: fontWeight.montreal,
    fontSize: 16,
    color: 'var(--theme-secondaryText)',
    lineHeight: 1.5
};

export const labelStyle: CSSProperties = {
    display: 'block',
    fontFamily: font('montrealMedium'),
    fontWeight: fontWeight.montrealMedium,
    fontSize: 13,
    color: 'var(--theme-secondaryText)',
    marginBottom: 6
};

export const inputStyle: CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 6,
    border: '1px solid rgba(128, 128, 128, 0.25)',
    background: 'var(--theme-secondary)',
    color: 'var(--theme-text)',
    fontFamily: font('montreal'),
    fontWeight: fontWeight.montreal,
    fontSize: 14,
    boxSizing: 'border-box',
    outline: 'none'
};

export const errorBoxStyle: CSSProperties = {
    padding: '10px 12px',
    borderRadius: 6,
    background: 'rgba(225, 76, 76, 0.1)',
    border: '1px solid rgba(225, 76, 76, 0.4)',
    color: '#E14C4C',
    fontFamily: font('montreal'),
    fontSize: 13,
    wordBreak: 'break-word'
};

// The baseline is an inset shadow, not a border: overflowX clips anything
// drawn outside the content box, which hid the active tab's underline when
// it overlapped a border. The separator color matches the card, so the
// baseline uses a faint white instead.
export const tabBarStyle: CSSProperties = {
    display: 'flex',
    gap: 0,
    boxShadow: 'inset 0 -1px 0 rgba(255, 255, 255, 0.12)',
    overflowX: 'auto'
};

export function tabStyle(active: boolean): CSSProperties {
    return {
        fontFamily: font('montrealMedium'),
        fontWeight: fontWeight.montrealMedium,
        fontSize: 18,
        padding: '10px 20px',
        border: 'none',
        cursor: 'pointer',
        background: 'transparent',
        color: active ? 'var(--theme-highlight)' : 'var(--theme-secondaryText)',
        borderBottom: active
            ? '2px solid var(--theme-highlight)'
            : '2px solid transparent',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s ease, border-color 0.15s ease'
    };
}
