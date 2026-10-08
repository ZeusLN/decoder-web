import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { font } from '../utils/FontUtils';

// Above this, a QR code is too dense to scan reliably from a screen.
const MAX_QR_LENGTH = 2000;

/** QR code in the monochrome theme colors with the ZEUS icon in the middle. */
export default function QrCode({ value }: { value: string }) {
    const [dataUrl, setDataUrl] = useState<string | null>(null);
    const tooLong = value.length > MAX_QR_LENGTH;

    useEffect(() => {
        if (tooLong) return;
        let cancelled = false;
        // Uppercase BOLT strings use the denser alphanumeric QR mode.
        const payload =
            /^(ln|lnurl)/i.test(value) && !/[+\s]/.test(value)
                ? value.toUpperCase()
                : value;
        QRCode.toDataURL(payload, {
            width: 480,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#FFFFFF', light: '#000000' }
        })
            .then((url) => {
                if (!cancelled) setDataUrl(url);
            })
            .catch(() => {
                if (!cancelled) setDataUrl(null);
            });
        return () => {
            cancelled = true;
        };
    }, [value, tooLong]);

    if (tooLong) {
        return (
            <p
                style={{
                    fontFamily: font('montreal'),
                    fontSize: 13,
                    color: 'var(--theme-secondaryText)'
                }}
            >
                This string is {value.length} characters long, too long for a QR
                code that scans reliably.
            </p>
        );
    }
    if (!dataUrl) return null;
    return (
        <div style={{ position: 'relative', width: 240, height: 240 }}>
            <img
                src={dataUrl}
                alt="QR code of the input"
                style={{ width: 240, height: 240, display: 'block' }}
            />
            <img
                src="/icon_black.png"
                alt=""
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 52,
                    height: 52,
                    padding: 6,
                    boxSizing: 'border-box',
                    background: 'var(--theme-highlight)'
                }}
            />
        </div>
    );
}
