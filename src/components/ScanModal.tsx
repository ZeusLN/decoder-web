import { useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import { errorBoxStyle } from '../styles/styles';
import { font } from '../utils/FontUtils';

type Scanner = import('qr-scanner').default;

/**
 * Camera QR scanner. qr-scanner loads only when the modal opens, so it
 * stays out of the main bundle. An image upload works without a camera.
 */
export default function ScanModal({
    isOpen,
    onClose,
    onResult
}: {
    isOpen: boolean;
    onClose: () => void;
    onResult: (text: string) => void;
}) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setError(null);
        let scanner: Scanner | null = null;
        let stopped = false;
        import('qr-scanner')
            .then(async ({ default: QrScanner }) => {
                if (stopped || !videoRef.current) return;
                if (!(await QrScanner.hasCamera())) {
                    setError(
                        'No camera found. Upload a picture of the QR code instead.'
                    );
                    return;
                }
                scanner = new QrScanner(
                    videoRef.current,
                    (result) => {
                        scanner?.stop();
                        onResult(result.data);
                    },
                    {
                        returnDetailedScanResult: true,
                        highlightScanRegion: true,
                        preferredCamera: 'environment'
                    }
                );
                await scanner.start();
            })
            .catch((e: unknown) => {
                setError(
                    e instanceof Error && e.name === 'NotAllowedError'
                        ? 'Camera access was denied. Allow it in your browser settings, or upload a picture.'
                        : `The camera could not start: ${e instanceof Error ? e.message : String(e)}`
                );
            });
        return () => {
            stopped = true;
            scanner?.destroy();
        };
    }, [isOpen, onResult]);

    const onFile = async (file: File | undefined) => {
        if (!file) return;
        try {
            const { default: QrScanner } = await import('qr-scanner');
            const result = await QrScanner.scanImage(file, {
                returnDetailedScanResult: true
            });
            onResult(result.data);
        } catch {
            setError('No QR code was found in that image.');
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Scan a QR code"
            maxWidth={520}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <video
                    ref={videoRef}
                    muted
                    playsInline
                    style={{
                        width: '100%',
                        borderRadius: 8,
                        background: '#000',
                        minHeight: 200
                    }}
                />
                {error && <div style={errorBoxStyle}>{error}</div>}
                <label
                    className="btn-secondary"
                    style={{
                        alignSelf: 'flex-start',
                        fontFamily: font('montreal')
                    }}
                >
                    Upload an image
                    <input
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => void onFile(e.target.files?.[0])}
                    />
                </label>
            </div>
        </Modal>
    );
}
