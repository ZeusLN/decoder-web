import { describe, expect, it } from 'vitest';
import bolt11 from '../../test/fixtures/bolt11-vectors.json';
import offers from '../../test/fixtures/offers-test.json';
import { classify } from './classify';
import { decode } from './index';
import { checkPreimage } from './verify/preimage';

const invoice = bolt11.valid[0].invoice;
const offer = offers[0].bolt12;
const LUD01 =
    'LNURL1DP68GURN8GHJ7UM9WFMXJCM99E3K7MF0V9CXJ0M385EKVCENXC6R2C35XVUKXEFCV5MKVV34X5EKZD3EV56NYD3HXQURZEPEXEJXXEPNXSCRVWFNV9NXZCN9XQ6XYEFHVGCXXCMYXYMNSERXFQ5FNS';

describe('classify', () => {
    it.each([
        [invoice, 'bolt11'],
        [invoice.toUpperCase(), 'bolt11'],
        [`lightning:${invoice}`, 'bolt11'],
        [`LIGHTNING:${invoice.toUpperCase()}`, 'bolt11'],
        [offer, 'bolt12'],
        [`l+no1${offer.slice(4)}`, 'bolt12'],
        [LUD01, 'lnurl'],
        [`lnurl:${LUD01}`, 'lnurl'],
        [`https://site.com/pay?lightning=${LUD01}`, 'lnurl'],
        [`bitcoin:bc1qxyz?amount=1&lightning=${invoice}`, 'bolt11'],
        [`bitcoin:bc1qxyz?lno=${offer}`, 'bolt12'],
        ['lnurlp://site.com/x', 'lud17'],
        ['satoshi@zeuspay.com', 'lightning-address'],
        ['₿satoshi@zeuspay.com', 'bip353'],
        ['hello', 'unknown'],
        ['  ' + invoice + '\n', 'bolt11']
    ])('%s -> %s', (input, kind) => {
        expect(classify(input).kind).toBe(kind);
    });

    it('records the wrappers it removed', () => {
        expect(classify(`lightning:${invoice}`).unwrapped).toEqual([
            'lightning:'
        ]);
    });
});

describe('decode', () => {
    it('routes each kind to its decoder', () => {
        expect(decode(invoice).kind).toBe('bolt11');
        expect(decode(offer).kind).toBe('bolt12');
        expect(decode(LUD01).kind).toBe('lnurl');
        expect(decode('satoshi@zeuspay.com').kind).toBe('lnurl');
    });

    it('returns an error result instead of throwing', () => {
        const bad = decode(invoice.slice(0, -1) + 'q');
        expect(bad.kind).toBe('error');
        if (bad.kind === 'error') {
            expect(bad.detected).toBe('BOLT 11 invoice');
            expect(bad.message).toMatch(/checksum/);
        }
        expect(decode('').kind).toBe('error');
        expect(decode('not a thing').kind).toBe('error');
    });
});

describe('checkPreimage', () => {
    const hash =
        '66687aadf862bd776c8fc18b8e9f8e20089714856ee233b3902a591d0d5f2925';

    it('reads 64 hex characters as bytes', () => {
        const r = checkPreimage('00'.repeat(32), hash);
        expect(r.interpretedAs).toBe('hex');
        expect(r.matches).toBe(true);
        expect(
            checkPreimage('00'.repeat(32).toUpperCase(), hash.toUpperCase())
                .matches
        ).toBe(true);
    });

    it('reads anything else as UTF-8 text', () => {
        const r = checkPreimage(
            'hello',
            '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
        );
        expect(r.interpretedAs).toBe('text');
        expect(r.matches).toBe(true);
        expect(checkPreimage('hello', hash).matches).toBe(false);
    });
});
