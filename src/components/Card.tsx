import type { CSSProperties, ReactNode } from 'react';
import { cardStyle, sectionTitleStyle } from '../styles/styles';

export default function Card({
    title,
    action,
    children,
    style
}: {
    title?: string;
    action?: ReactNode;
    children: ReactNode;
    style?: CSSProperties;
}) {
    return (
        <section style={{ ...cardStyle, ...style }}>
            {(title || action) && (
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        justifyContent: 'space-between',
                        gap: 12,
                        marginBottom: 16
                    }}
                >
                    {title && <h2 style={sectionTitleStyle}>{title}</h2>}
                    {action}
                </div>
            )}
            {children}
        </section>
    );
}
