import { SAMPLES } from '../samples';
import { font, fontWeight } from '../utils/FontUtils';
import Modal from './Modal';

export default function SamplesModal({
    isOpen,
    onClose,
    onPick
}: {
    isOpen: boolean;
    onClose: () => void;
    onPick: (value: string) => void;
}) {
    const groups = [...new Set(SAMPLES.map((s) => s.group))];
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Samples" maxWidth={520}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                {groups.map((g) => (
                    <div key={g}>
                        <div
                            style={{
                                fontFamily: font('montrealMedium'),
                                fontWeight: fontWeight.montrealMedium,
                                fontSize: 12,
                                textTransform: 'uppercase',
                                letterSpacing: 0.8,
                                color: 'var(--theme-secondaryText)',
                                marginBottom: 8
                            }}
                        >
                            {g}
                        </div>
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                            }}
                        >
                            {SAMPLES.filter((s) => s.group === g).map((s) => (
                                <button
                                    key={s.label}
                                    className="btn-secondary"
                                    style={{
                                        justifyContent: 'flex-start',
                                        textAlign: 'left'
                                    }}
                                    onClick={() => onPick(s.value)}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                <p
                    style={{
                        fontSize: 12,
                        color: 'var(--theme-secondaryText)',
                        lineHeight: 1.5
                    }}
                >
                    Most samples are test vectors from the BOLT specifications
                    and are signed with test keys.
                </p>
            </div>
        </Modal>
    );
}
