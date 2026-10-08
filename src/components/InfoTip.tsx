/** An ⓘ glyph that shows an explanation on hover or keyboard focus. */
export default function InfoTip({ text }: { text: string }) {
    return (
        <span className="info-tip" tabIndex={0} aria-label={text}>
            <span aria-hidden="true" style={{ fontSize: 12, lineHeight: 1 }}>
                ⓘ
            </span>
            <span className="info-tip-bubble" role="tooltip">
                {text}
            </span>
        </span>
    );
}
