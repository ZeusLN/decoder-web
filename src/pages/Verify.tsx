import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { checkPreimage, decode } from '../lib';
import { isHex } from '../lib/util/bytes';
import { useDebounced } from '../hooks/useDebounced';
import { usePageMeta } from '../hooks/usePageMeta';
import {
    cardStyle,
    errorBoxStyle,
    inputStyle,
    labelStyle,
    pageTitleStyle,
    subtitleStyle,
    MONO
} from '../styles/styles';
import Field from '../components/Field';
import CopyButton from '../components/CopyButton';
import Badge from '../components/Badge';

/** The payment hash in an invoice, or the input itself if it is a 32-byte hex hash. */
function paymentHashOf(input: string): { hash?: string; error?: string } {
    const v = input.trim();
    if (!v) return {};
    if (v.length === 64 && isHex(v)) return { hash: v.toLowerCase() };
    const r = decode(v);
    if (r.kind === 'bolt11') return { hash: r.paymentHash };
    if (r.kind === 'bolt12' && r.fields.invoice_payment_hash)
        return { hash: r.fields.invoice_payment_hash };
    if (r.kind === 'error') return { error: r.message };
    return {
        error: 'Enter a BOLT 11 invoice, a BOLT 12 invoice (lni) or a 64-character payment hash.'
    };
}

export default function Verify() {
    usePageMeta({
        title: 'Verify a Lightning payment preimage | ZEUS Decoder',
        description:
            'Check that a payment preimage matches the payment hash of a BOLT 11 or BOLT 12 invoice, in your browser.',
        path: '/verify'
    });
    const [params, setParams] = useSearchParams();
    const [invoice, setInvoice] = useState(params.get('q') ?? '');
    const [preimage, setPreimage] = useState(params.get('preimage') ?? '');
    const debouncedInvoice = useDebounced(invoice, 300);
    const debouncedPreimage = useDebounced(preimage, 300);

    useEffect(() => {
        const next: Record<string, string> = {};
        if (debouncedInvoice.trim()) next.q = debouncedInvoice.trim();
        if (debouncedPreimage.trim()) next.preimage = debouncedPreimage.trim();
        setParams(next, { replace: true });
    }, [debouncedInvoice, debouncedPreimage, setParams]);

    const { hash, error } = useMemo(
        () => paymentHashOf(debouncedInvoice),
        [debouncedInvoice]
    );
    const check = useMemo(
        () =>
            hash && debouncedPreimage.trim()
                ? checkPreimage(debouncedPreimage, hash)
                : null,
        [hash, debouncedPreimage]
    );
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

    return (
        <div className="page">
            <header
                style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
            >
                <h1 style={pageTitleStyle}>Verify preimage</h1>
                <p style={subtitleStyle}>
                    A payment is proven by its preimage: the payment hash is the
                    SHA-256 of it. Paste an invoice and the preimage your wallet
                    shows for the payment.
                </p>
            </header>
            <section
                style={{
                    ...cardStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16
                }}
            >
                <div>
                    <label htmlFor="verify-invoice" style={labelStyle}>
                        Invoice or payment hash
                    </label>
                    <textarea
                        id="verify-invoice"
                        className="input-area"
                        style={{ minHeight: 90 }}
                        spellCheck={false}
                        value={invoice}
                        onChange={(e) => setInvoice(e.target.value)}
                        placeholder="lnbc..., lni1... or 64 hex characters"
                    />
                </div>
                <div>
                    <label htmlFor="verify-preimage" style={labelStyle}>
                        Preimage (64 hex characters, or text)
                    </label>
                    <input
                        id="verify-preimage"
                        style={{ ...inputStyle, fontFamily: MONO }}
                        spellCheck={false}
                        value={preimage}
                        onChange={(e) => setPreimage(e.target.value)}
                    />
                </div>
            </section>

            {error && <div style={errorBoxStyle}>{error}</div>}
            {hash && (
                <section style={cardStyle}>
                    <Field
                        label="Payment hash"
                        infoKey="payment_hash"
                        value={hash}
                        copy={hash}
                        mono
                    />
                    {check && (
                        <>
                            <Field
                                label="Preimage read as"
                                value={
                                    check.interpretedAs === 'hex'
                                        ? '32 bytes of hex'
                                        : 'UTF-8 text'
                                }
                                note={
                                    check.interpretedAs === 'text'
                                        ? `Bytes: ${check.preimageHex}`
                                        : undefined
                                }
                            />
                            <Field
                                label="SHA-256 of preimage"
                                value={check.computedHash}
                                copy={check.computedHash}
                                mono
                            />
                            <Field
                                label="Result"
                                value={
                                    check.matches ? (
                                        <Badge tone="success">
                                            preimage matches
                                        </Badge>
                                    ) : (
                                        <Badge tone="error">
                                            does not match
                                        </Badge>
                                    )
                                }
                            />
                            <Field
                                label="Share"
                                value={
                                    <CopyButton
                                        value={shareUrl}
                                        label="Copy link to this check"
                                    />
                                }
                            />
                        </>
                    )}
                    {invoice.trim() &&
                        !(
                            invoice.trim().length === 64 &&
                            isHex(invoice.trim())
                        ) && (
                            <p style={{ marginTop: 12, fontSize: 13 }}>
                                <Link
                                    to={`/?q=${encodeURIComponent(invoice.trim())}`}
                                >
                                    Decode this invoice
                                </Link>
                            </p>
                        )}
                </section>
            )}
        </div>
    );
}
