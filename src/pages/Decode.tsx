import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { decode } from '../lib';
import { useDebounced } from '../hooks/useDebounced';
import { usePageMeta } from '../hooks/usePageMeta';
import { pageTitleStyle, subtitleStyle, cardStyle } from '../styles/styles';
import ResultView, { ErrorView } from '../views/ResultView';
import ScanModal from '../components/ScanModal';
import SamplesModal from '../components/SamplesModal';
import PrivacyNote from '../components/PrivacyNote';

export default function Decode() {
    usePageMeta({
        title: 'ZEUS Decoder: decode Lightning invoices, offers and LNURLs',
        description:
            'Decode BOLT 11 invoices, BOLT 12 offers, invoice requests, invoices and payer proofs, LNURLs and lightning addresses. Every field explained, signatures checked, all in your browser.',
        path: '/'
    });
    const [params, setParams] = useSearchParams();
    const q = params.get('q') ?? '';
    const [text, setText] = useState(q);
    // What is decoded: typing commits after a pause, explicit actions at once.
    const [committed, setCommitted] = useState(q);
    // The last value this page wrote to ?q=, to tell our own updates from
    // back/forward navigation.
    const written = useRef(q);
    const [scanOpen, setScanOpen] = useState(false);
    const [samplesOpen, setSamplesOpen] = useState(false);
    const [pasteError, setPasteError] = useState<string | null>(null);

    useEffect(() => {
        if (q !== written.current) {
            written.current = q;
            setText(q);
            setCommitted(q);
        }
    }, [q]);

    const debounced = useDebounced(text, 300);
    useEffect(() => {
        setCommitted(debounced);
    }, [debounced]);

    useEffect(() => {
        const value = committed.trim();
        if (value === written.current) return;
        written.current = value;
        setParams(value ? { q: value } : {}, { replace: true });
    }, [committed, setParams]);

    // Explicit actions decode at once and add a history entry.
    const load = useCallback(
        (value: string) => {
            const v = value.trim();
            setText(v);
            setCommitted(v);
            written.current = v;
            setParams(v ? { q: v } : {});
        },
        [setParams]
    );

    const result = useMemo(
        () => (committed.trim() ? decode(committed) : null),
        [committed]
    );

    const paste = async () => {
        setPasteError(null);
        try {
            load(await navigator.clipboard.readText());
        } catch {
            setPasteError(
                'The browser did not allow reading the clipboard. Paste into the box instead.'
            );
        }
    };

    const onScan = useCallback(
        (value: string) => {
            setScanOpen(false);
            load(value);
        },
        [load]
    );

    return (
        <div className="page">
            <header
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
                <h1 style={pageTitleStyle}>Decode</h1>
                <p style={subtitleStyle}>
                    BOLT 11 invoices, BOLT 12 offers, invoice requests, invoices
                    and payer proofs, LNURLs and lightning addresses.
                </p>
                <PrivacyNote />
            </header>

            <section
                style={{
                    ...cardStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12
                }}
            >
                <label htmlFor="decode-input" className="sr-only">
                    Lightning string
                </label>
                <textarea
                    id="decode-input"
                    className="input-area"
                    placeholder="lnbc..., lno1..., lnurl1... or name@domain"
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    autoComplete="off"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <button
                        className="btn-secondary"
                        onClick={() => void paste()}
                    >
                        Paste
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => setScanOpen(true)}
                    >
                        Scan QR
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => setSamplesOpen(true)}
                    >
                        Samples
                    </button>
                    {text && (
                        <button
                            className="btn-secondary"
                            onClick={() => load('')}
                        >
                            Clear
                        </button>
                    )}
                </div>
                {pasteError && (
                    <span
                        style={{ fontSize: 13, color: 'var(--theme-warning)' }}
                    >
                        {pasteError}
                    </span>
                )}
            </section>

            {result &&
                (result.kind === 'error' ? (
                    <ErrorView result={result} />
                ) : (
                    <ResultView key={result.normalized} result={result} />
                ))}

            <ScanModal
                isOpen={scanOpen}
                onClose={() => setScanOpen(false)}
                onResult={onScan}
            />
            <SamplesModal
                isOpen={samplesOpen}
                onClose={() => setSamplesOpen(false)}
                onPick={(v) => {
                    setSamplesOpen(false);
                    load(v);
                }}
            />
        </div>
    );
}
