// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    act,
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router';
import App from './App';
import bolt11 from '../test/fixtures/bolt11-vectors.json';
import offers from '../test/fixtures/offers-test.json';
import proofs from '../test/fixtures/payer-proof-test.json';

const invoice = bolt11.valid.find((v) =>
    v.description.startsWith('Please send $3 for a cup of coffee')
)!.invoice;
const offer = offers.find(
    (v) => v.description === 'with description (but no amount)'
)!.bolt12;
const lni = proofs.valid_vectors[0].input.invoice;
const preimage = proofs.valid_vectors[0].result.proof_fields.find(
    (f) => f.type === 1001
)!.hex;

let currentUrl = '';
function LocationProbe() {
    const loc = useLocation();
    currentUrl = loc.pathname + loc.search;
    return null;
}

function renderAt(url: string) {
    return render(
        <MemoryRouter initialEntries={[url]}>
            <App />
            <LocationProbe />
        </MemoryRouter>
    );
}

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('Decode page', () => {
    it('decodes ?q= on load', () => {
        renderAt(`/?q=${encodeURIComponent(invoice)}`);
        expect(screen.getByText('BOLT 11 invoice')).toBeTruthy();
        expect(screen.getByText('1 cup coffee')).toBeTruthy();
        expect(screen.getAllByText(/250,000 sat/).length).toBeGreaterThan(0);
    });

    it('decodes typed input and writes it to the URL', async () => {
        vi.useFakeTimers();
        renderAt('/');
        fireEvent.change(screen.getByPlaceholderText(/lnbc/), {
            target: { value: offer }
        });
        await act(async () => {
            vi.advanceTimersByTime(400);
        });
        expect(screen.getByText('BOLT 12 offer')).toBeTruthy();
        expect(screen.getByText('Test vectors')).toBeTruthy();
        expect(currentUrl).toBe(
            `/?q=${encodeURIComponent(offer).replace(/%20/g, '+')}`
        );
    });

    it('shows an error for input it cannot decode', () => {
        renderAt('/?q=lnbc1notreal');
        expect(screen.getByText(/could not be decoded/)).toBeTruthy();
    });

    it('updates the info panel when a part of the string is hovered', () => {
        renderAt(`/?q=${encodeURIComponent(invoice)}`);
        const segment = screen.getByRole('button', { name: 'description' });
        fireEvent.mouseOver(segment);
        expect(screen.getByText(/description \('d', type 13\)/)).toBeTruthy();
    });

    it('fetches and shows an LNURL-pay response for a lightning address', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(
                async () =>
                    new Response(
                        JSON.stringify({
                            tag: 'payRequest',
                            callback: 'https://example.com/cb',
                            minSendable: 1000,
                            maxSendable: 5000000,
                            metadata: JSON.stringify([
                                ['text/plain', 'Example metadata']
                            ])
                        })
                    )
            )
        );
        renderAt('/?q=alice%40example.com');
        expect(
            screen.getByText('https://example.com/.well-known/lnurlp/alice')
        ).toBeTruthy();
        await waitFor(() =>
            expect(screen.getByText('Example metadata')).toBeTruthy()
        );
        expect(screen.getByText('payRequest')).toBeTruthy();
    });

    it('redirects path-style links to ?q=', () => {
        renderAt(`/${invoice}`);
        expect(currentUrl.startsWith('/?q=')).toBe(true);
        expect(screen.getByText('BOLT 11 invoice')).toBeTruthy();
    });
});

describe('Verify page', () => {
    it('confirms a matching preimage from the URL', async () => {
        renderAt(`/verify?q=${encodeURIComponent(lni)}&preimage=${preimage}`);
        await waitFor(() =>
            expect(screen.getByText('preimage matches')).toBeTruthy()
        );
    });

    it('reports a preimage that does not match', async () => {
        renderAt(
            `/verify?q=${encodeURIComponent(lni)}&preimage=${'00'.repeat(32)}`
        );
        await waitFor(() =>
            expect(screen.getByText('does not match')).toBeTruthy()
        );
    });
});

describe('page metadata', () => {
    it('sets a title and canonical URL per page', () => {
        const canonical = document.createElement('link');
        canonical.rel = 'canonical';
        document.head.appendChild(canonical);
        renderAt('/verify');
        expect(document.title).toMatch(/^Verify a Lightning payment preimage/);
        expect(canonical.href).toBe('https://decoder.zeusln.com/verify');
        cleanup();
        renderAt('/');
        expect(document.title).toMatch(/^ZEUS Decoder/);
        expect(canonical.href).toBe('https://decoder.zeusln.com/');
        canonical.remove();
    });
});
