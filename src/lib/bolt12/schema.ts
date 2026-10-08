/**
 * BOLT 12 TLV types, names and the message each belongs to. Payer proof
 * types (241, 1001-1005) come from the draft in lightning/bolts#1295.
 */

export type Bolt12Message =
    'offer' | 'invoice_request' | 'invoice' | 'payer_proof';

export type FieldGroup =
    'offer' | 'invoice_request' | 'invoice' | 'signature' | 'payer_proof';

export interface FieldSpec {
    type: number;
    name: string;
    group: FieldGroup;
}

const FIELDS: FieldSpec[] = [
    { type: 0, name: 'invreq_metadata', group: 'invoice_request' },
    { type: 2, name: 'offer_chains', group: 'offer' },
    { type: 4, name: 'offer_metadata', group: 'offer' },
    { type: 6, name: 'offer_currency', group: 'offer' },
    { type: 8, name: 'offer_amount', group: 'offer' },
    { type: 10, name: 'offer_description', group: 'offer' },
    { type: 12, name: 'offer_features', group: 'offer' },
    { type: 14, name: 'offer_absolute_expiry', group: 'offer' },
    { type: 16, name: 'offer_paths', group: 'offer' },
    { type: 18, name: 'offer_issuer', group: 'offer' },
    { type: 20, name: 'offer_quantity_max', group: 'offer' },
    { type: 22, name: 'offer_issuer_id', group: 'offer' },
    { type: 80, name: 'invreq_chain', group: 'invoice_request' },
    { type: 82, name: 'invreq_amount', group: 'invoice_request' },
    { type: 84, name: 'invreq_features', group: 'invoice_request' },
    { type: 86, name: 'invreq_quantity', group: 'invoice_request' },
    { type: 88, name: 'invreq_payer_id', group: 'invoice_request' },
    { type: 89, name: 'invreq_payer_note', group: 'invoice_request' },
    { type: 90, name: 'invreq_paths', group: 'invoice_request' },
    { type: 91, name: 'invreq_bip_353_name', group: 'invoice_request' },
    { type: 160, name: 'invoice_paths', group: 'invoice' },
    { type: 162, name: 'invoice_blindedpay', group: 'invoice' },
    { type: 164, name: 'invoice_created_at', group: 'invoice' },
    { type: 166, name: 'invoice_relative_expiry', group: 'invoice' },
    { type: 168, name: 'invoice_payment_hash', group: 'invoice' },
    { type: 170, name: 'invoice_amount', group: 'invoice' },
    { type: 172, name: 'invoice_fallbacks', group: 'invoice' },
    { type: 174, name: 'invoice_features', group: 'invoice' },
    { type: 176, name: 'invoice_node_id', group: 'invoice' },
    { type: 240, name: 'signature', group: 'signature' },
    { type: 241, name: 'proof_signature', group: 'payer_proof' },
    { type: 1001, name: 'proof_preimage', group: 'payer_proof' },
    { type: 1002, name: 'proof_omitted_tlvs', group: 'payer_proof' },
    { type: 1003, name: 'proof_missing_hashes', group: 'payer_proof' },
    { type: 1004, name: 'proof_leaf_hashes', group: 'payer_proof' },
    { type: 1005, name: 'proof_note', group: 'payer_proof' }
];

const BY_TYPE = new Map<number, FieldSpec>(FIELDS.map((f) => [f.type, f]));

export function fieldSpec(type: bigint): FieldSpec | undefined {
    return type <= 1005n ? BY_TYPE.get(Number(type)) : undefined;
}

/** Field groups each message understands. */
const KNOWN_GROUPS: Record<Bolt12Message, FieldGroup[]> = {
    offer: ['offer'],
    invoice_request: ['offer', 'invoice_request', 'signature'],
    invoice: ['offer', 'invoice_request', 'invoice', 'signature'],
    payer_proof: [
        'offer',
        'invoice_request',
        'invoice',
        'signature',
        'payer_proof'
    ]
};

export function isKnownType(type: bigint, message: Bolt12Message): boolean {
    const spec = fieldSpec(type);
    return !!spec && KNOWN_GROUPS[message].includes(spec.group);
}

/**
 * Whether a type may appear in a message at all (BOLT 12 reader rules, as
 * enforced by lnd bolt12/validate.go). Invoices have no range rule; unknown
 * even types are rejected separately.
 */
export function isAllowedType(type: bigint, message: Bolt12Message): boolean {
    switch (message) {
        case 'offer':
            return (
                (type >= 1n && type <= 79n) ||
                (type >= 1_000_000_000n && type <= 1_999_999_999n)
            );
        case 'invoice_request':
            return (
                type <= 159n ||
                (type >= 240n && type <= 1000n) ||
                (type >= 1_000_000_000n && type <= 2_999_999_999n)
            );
        case 'invoice':
            return true;
        case 'payer_proof':
            return true;
    }
}

export const HRP_MESSAGES: Record<string, Bolt12Message> = {
    lno: 'offer',
    lnr: 'invoice_request',
    lni: 'invoice',
    lnp: 'payer_proof'
};
