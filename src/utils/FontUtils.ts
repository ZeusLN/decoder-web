/**
 * Font utilities ported from Zeus mobile app (zeus/utils/FontUtils.ts)
 * Adapted for web — no React Native Platform dependency.
 *
 * Font roles:
 *   Marlide Display / Bold  — Headlines, page titles, section headers, stat values
 *   PP Neue Montreal         — Body text, labels, descriptions, buttons, table cells
 */

const Fonts: Record<string, string> = {
    // Headlines / display
    marlide: 'Marlide Display',
    marlideBold: 'Marlide Display Bold',
    // Body / UI
    montreal: "'PP Neue Montreal', sans-serif",
    montrealMedium: "'PP Neue Montreal', sans-serif",
    montrealBold: "'PP Neue Montreal', sans-serif"
};

/**
 * Font weight to pair with montreal variants:
 *   montreal       → font-weight: 400 (Book)
 *   montrealMedium → font-weight: 500
 *   montrealBold   → font-weight: 700
 */
export const fontWeight: Record<string, number> = {
    montreal: 400,
    montrealMedium: 500,
    montrealBold: 700
};

export function font(id: keyof typeof Fonts): string {
    return Fonts[id];
}
