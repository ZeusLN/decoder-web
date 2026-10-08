import { describe, expect, it } from 'vitest';
import proofs from '../../../test/fixtures/payer-proof-test.json';
import { decodeBolt12 } from './decode';
import { nextMarker, validateOmittedMarkers } from './payerProof';

describe('bolts payer-proof-test.json', () => {
    it.each(proofs.valid_vectors.map((v) => [v.name, v] as const))(
        'valid: %s',
        (_n, v) => {
            const r = decodeBolt12(v.result.bech32);
            expect(r.message).toBe('payer_proof');
            expect(r.issues.filter((i) => i.severity === 'error')).toEqual([]);
            expect(r.valid).toBe(true);
            expect(r.payerProof?.invoiceMerkleRoot).toBe(
                v.working.invoice_merkle_root
            );
            expect(r.merkleRoot).toBe(v.working.invoice_merkle_root);
            expect(r.payerProof?.invoiceSignatureValid).toBe(true);
            expect(r.payerProof?.proofSignatureValid).toBe(true);
            expect(r.payerProof?.preimageMatchesPaymentHash).toBe(true);
            expect(r.signatureStatus).toBe('valid');
            expect(
                r.records.map((x) => ({
                    type: Number(x.type),
                    len: x.length,
                    hex: x.hex
                }))
            ).toEqual(v.result.proof_fields);
            expect(r.issues.map((i) => i.code)).toContain('draft_spec');
        }
    );

    const expectedCode = (reason: string): string => {
        if (reason.startsWith('missing_')) return 'missing_field';
        if (reason === 'wrong_proof_preimage') return 'wrong_preimage';
        if (reason.startsWith('proof_omitted_tlvs'))
            return 'invalid_omitted_tlvs';
        if (reason.startsWith('proof_leaf_hashes')) return 'leaf_hash_count';
        if (reason.startsWith('proof_missing_hashes'))
            return 'invalid_missing_hashes';
        if (reason === 'wrong_invoice_signature') return 'invalid_signature';
        if (reason === 'wrong_proof_signature')
            return 'invalid_proof_signature';
        return reason;
    };

    it.each(proofs.invalid_vectors.map((v) => [v.reason, v.bech32] as const))(
        'invalid: %s',
        (reason, s) => {
            const r = decodeBolt12(s);
            expect(r.valid).toBe(false);
            expect(r.issues.map((i) => i.code)).toContain(expectedCode(reason));
        }
    );
});

describe('omitted markers', () => {
    it('jumps from the invoice range to the experimental range', () => {
        expect(nextMarker(5n)).toBe(6n);
        expect(nextMarker(239n)).toBe(1_000_000_000n);
    });

    it('accepts minimized markers and rejects others', () => {
        // Included 10 and 20: omitted fields before 10 are 1, 2...; after 10, 11...
        expect(() =>
            validateOmittedMarkers([1n, 2n, 11n], [10n, 20n])
        ).not.toThrow();
        expect(() => validateOmittedMarkers([2n], [10n])).toThrow(
            'not minimized'
        );
        expect(() => validateOmittedMarkers([0n], [10n])).toThrow();
        expect(() => validateOmittedMarkers([1n, 1n], [10n])).toThrow(
            'ascending'
        );
        expect(() => validateOmittedMarkers([10n], [10n])).toThrow('included');
        expect(() => validateOmittedMarkers([240n], [10n])).toThrow(
            'allowed ranges'
        );
    });
});
