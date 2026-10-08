import { describe, expect, it, vi } from 'vitest';
import { encodeBech32, bytesToWords } from '../util/bech32';
import { utf8Encode } from '../util/bytes';
import {
    decodeLightningAddress,
    decodeLnurlBech32,
    decodeLud17,
    isLightningAddress
} from './decode';
import { fetchLnurl } from './fetch';
import { parseMetadata } from './parse';

// LUD-01 example.
const LUD01 =
    'LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0V9CXJ0M385EKVCENXC6R2C35XVUKXEFCV5MKVV34X5EKZD3EV56NYD3HXQURZEPEXEJXXEPNXSCRVWFNV9NXZCN9XQ6XYEFHVGCXXCMYXYMNSERXFQ5FNS';

const lnurlFor = (url: string) =>
    encodeBech32('lnurl', bytesToWords(utf8Encode(url)));

describe('LNURL bech32 (LUD-01)', () => {
    it('decodes the LUD-01 example', () => {
        const r = decodeLnurlBech32(LUD01);
        expect(r.url).toBe(
            'https://service.com/api?q=3fc3645b439ce8e7f2553a69e5267081d96dcd340693afabe04be7b0ccd178df'
        );
        expect(r.params.q).toHaveLength(64);
        expect(r.issues).toEqual([]);
        expect(r.segments.at(-1)?.end).toBe(r.normalized.length);
    });

    it('recognises LNURL-auth URLs without fetching', () => {
        const r = decodeLnurlBech32(
            lnurlFor(
                'https://site.com/auth?tag=login&k1=' +
                    'ab'.repeat(32) +
                    '&action=login'
            )
        );
        expect(r.tag).toBe('login');
        expect(r.params.k1).toBe('ab'.repeat(32));
    });

    it('warns about plain http except for onion services', () => {
        expect(
            decodeLnurlBech32(lnurlFor('http://site.com/x')).issues.map(
                (i) => i.code
            )
        ).toEqual(['insecure_url']);
        expect(
            decodeLnurlBech32(lnurlFor('http://abc.onion/x')).issues
        ).toEqual([]);
    });

    it('rejects a bad checksum', () => {
        expect(() => decodeLnurlBech32(LUD01.slice(0, -1) + 'Q')).toThrow(
            'checksum'
        );
    });
});

describe('LUD-17 and LUD-16', () => {
    it('maps lnurlp:// to https and onion hosts to http', () => {
        expect(decodeLud17('lnurlp://site.com/p/abc').url).toBe(
            'https://site.com/p/abc'
        );
        expect(decodeLud17('lnurlw://abc.onion/w').url).toBe(
            'http://abc.onion/w'
        );
        expect(decodeLud17('keyauth://site.com/a?tag=login&k1=00').tag).toBe(
            'login'
        );
    });

    it('builds the well-known URL for a lightning address', () => {
        const r = decodeLightningAddress('Satoshi@ZeusPay.com');
        expect(r.url).toBe('https://zeuspay.com/.well-known/lnurlp/satoshi');
        expect(r.address).toEqual({
            username: 'satoshi',
            domain: 'zeuspay.com'
        });
        expect(decodeLightningAddress('user@abc.onion').url).toBe(
            'http://abc.onion/.well-known/lnurlp/user'
        );
        expect(
            decodeLightningAddress('AbC@cryptoqr.net').address?.username
        ).toBe('AbC');
    });

    it('matches lightning addresses', () => {
        expect(isLightningAddress('a@b.co')).toBe(true);
        expect(isLightningAddress('lnbc1xyz')).toBe(false);
        expect(isLightningAddress('a@b')).toBe(false);
    });
});

describe('fetchLnurl', () => {
    const json = (body: unknown, status = 200) =>
        vi.fn(
            async () =>
                new Response(JSON.stringify(body), {
                    status,
                    headers: { 'Content-Type': 'application/json' }
                })
        );

    it('parses a payRequest', async () => {
        const r = await fetchLnurl('https://x', {
            fetch: json({
                tag: 'payRequest',
                callback: 'https://x/cb',
                minSendable: 1000,
                maxSendable: '100000000',
                metadata: JSON.stringify([
                    ['text/plain', 'hello'],
                    ['text/identifier', 'a@x']
                ]),
                commentAllowed: 140,
                allowsNostr: true,
                nostrPubkey: 'ab',
                payerData: { name: { mandatory: false } },
                extraThing: 1
            })
        });
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        expect(r.response.tag).toBe('payRequest');
        expect(r.response.minSendable).toBe(1000n);
        expect(r.response.maxSendable).toBe(100000000n);
        expect(r.response.metadata?.[0]).toEqual({
            mime: 'text/plain',
            value: 'hello',
            isImage: false
        });
        expect(r.response.commentAllowed).toBe(140);
        expect(r.response.payerData?.name.mandatory).toBe(false);
        expect(r.response.extra).toEqual({ extraThing: 1 });
    });

    it('reports status ERROR with its reason', async () => {
        const r = await fetchLnurl('https://x', {
            fetch: json({ status: 'ERROR', reason: 'no such user' }, 404)
        });
        expect(r).toMatchObject({
            ok: false,
            error: { kind: 'lnurl-error', reason: 'no such user' }
        });
    });

    it('classifies a failed request as CORS or network', async () => {
        const fetch = vi.fn(async () => {
            throw new TypeError('Failed to fetch');
        });
        const r = await fetchLnurl('https://x', { fetch });
        expect(r).toMatchObject({
            ok: false,
            error: { kind: 'cors-or-network' }
        });
    });

    it('classifies non-JSON and HTTP errors', async () => {
        const html = vi.fn(async () => new Response('<html>', { status: 200 }));
        expect(await fetchLnurl('https://x', { fetch: html })).toMatchObject({
            ok: false,
            error: { kind: 'json' }
        });
        const down = vi.fn(
            async () => new Response('bad gateway', { status: 502 })
        );
        expect(await fetchLnurl('https://x', { fetch: down })).toMatchObject({
            ok: false,
            error: { kind: 'http', status: 502 }
        });
    });

    it('times out', async () => {
        const hang = vi.fn(
            (_url: string, init?: RequestInit) =>
                new Promise<Response>((_, reject) => {
                    init?.signal?.addEventListener('abort', () =>
                        reject(new DOMException('aborted', 'AbortError'))
                    );
                })
        );
        const r = await fetchLnurl('https://x', {
            fetch: hang as unknown as typeof fetch,
            timeoutMs: 10
        });
        expect(r).toMatchObject({ ok: false, error: { kind: 'timeout' } });
    });
});

describe('parseMetadata', () => {
    it('turns base64 images into data URLs', () => {
        const entries = parseMetadata(
            JSON.stringify([
                ['image/png;base64', 'iVBORw0KGgo='],
                ['text/long-desc', 'long']
            ])
        );
        expect(entries[0]).toEqual({
            mime: 'image/png;base64',
            value: 'data:image/png;base64,iVBORw0KGgo=',
            isImage: true
        });
        expect(entries[1].value).toBe('long');
    });

    it('rejects metadata that is not an array', () => {
        expect(() => parseMetadata('{}')).toThrow('array');
    });
});
