import { useEffect } from 'react';
import { font, fontWeight } from '../utils/FontUtils';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    /** Optional maxWidth override (default 480). */
    maxWidth?: number;
    /** Optional control rendered in the header, left of the close button. */
    headerAction?: React.ReactNode;
}

/**
 * Centered modal with a backdrop. ESC closes. Click on backdrop closes.
 * Click on dialog itself does not propagate.
 */
export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    maxWidth = 480,
    headerAction
}: ModalProps) {
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                padding: '10vh 16px',
                zIndex: 100
            }}
        >
            <div
                onClick={(e) => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth,
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background:
                        'var(--theme-modalBackground, var(--theme-secondary))',
                    border: '1px solid var(--theme-separator)',
                    borderRadius: 12,
                    padding: 24,
                    boxShadow: '0 12px 48px rgba(0, 0, 0, 0.4)'
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        marginBottom: 20,
                        flexShrink: 0
                    }}
                >
                    <h2
                        style={{
                            fontFamily: font('marlideBold'),
                            fontSize: 30,
                            color: 'var(--theme-highlight)',
                            margin: 0
                        }}
                    >
                        {title}
                    </h2>
                    <div
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4
                        }}
                    >
                        {headerAction}
                        <button
                            onClick={onClose}
                            aria-label="Close"
                            style={{
                                fontFamily: font('montrealMedium'),
                                fontWeight: fontWeight.montrealMedium,
                                fontSize: 14,
                                padding: '4px 12px',
                                borderRadius: 6,
                                border: 'none',
                                background: 'transparent',
                                color: 'var(--theme-secondaryText)',
                                cursor: 'pointer'
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
                <div
                    className="no-scrollbar"
                    style={{ overflowY: 'auto', minHeight: 0 }}
                >
                    {children}
                </div>
            </div>
        </div>
    );
}
