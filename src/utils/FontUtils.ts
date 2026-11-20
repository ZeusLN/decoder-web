/**
 * Font utilities ported from Zeus mobile app (zeus/utils/FontUtils.ts)
 * Adapted for web — no React Native Platform dependency.
 *
 * Font roles:
 *   Marlide Display Bold     — Headlines, page titles, section headers, stat values
 *   Roboto                   — Body text, labels, descriptions, buttons, table cells
 */

const Fonts: Record<string, string> = {
    // Headlines / display
    marlideBold: 'Marlide Display Bold',
    // Body / UI
    body: "'Roboto', sans-serif",
    bodyMedium: "'Roboto', sans-serif",
    bodyBold: "'Roboto', sans-serif"
};

/**
 * Font weight to pair with body variants:
 *   body       → font-weight: 400 (Regular)
 *   bodyMedium → font-weight: 500
 *   bodyBold   → font-weight: 700
 */
export const fontWeight: Record<string, number> = {
    body: 400,
    bodyMedium: 500,
    bodyBold: 700
};

export function font(id: keyof typeof Fonts): string {
    return Fonts[id];
}
