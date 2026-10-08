/**
 * One-paragraph explanations for each decoded field, shown in the UI's
 * info tooltips. Paraphrased from BOLT 11, BOLT 12 and the LUD specs.
 */
export const FIELD_INFO: Record<string, string> = {
    // Shared
    prefix: 'Identifies the kind of string and, for BOLT 11, the Bitcoin network.',
    network:
        'The Bitcoin network the payment is on, from the BOLT 11 prefix or the BOLT 12 chain field.',
    amount: 'The amount requested. Lightning amounts are in millisatoshis (1/1000 of a satoshi).',
    separator: "The bech32 separator '1' between the prefix and the data.",
    checksum:
        'Six characters that let wallets detect typing errors (BOLT 11 and LNURL only).',
    padding:
        'Zero bits that fill the last character. BOLT 12 allows at most 4.',
    continuation:
        "A '+' join. BOLT 12 strings may be split with '+' and whitespace.",
    signature: 'Proof that the payee created this exact string.',

    // BOLT 11
    timestamp: 'When the invoice was created (seconds since 1970).',
    payment_hash:
        'SHA-256 of the preimage the payee reveals when paid. The preimage is the proof of payment.',
    payment_secret:
        'A secret the payer passes to the payee to stop intermediate nodes probing the final hop.',
    description: 'A short description of what is being paid for.',
    description_hash:
        'SHA-256 of a description too long to include, usually LNURL metadata.',
    payee: "The payee's node public key, stated explicitly with an 'n' field.",
    node_id:
        "The payee's node public key: the 'n' field if present, otherwise recovered from the signature.",
    expiry: 'Seconds after the timestamp when the invoice stops being payable. Defaults to 3600.',
    min_final_cltv_expiry:
        'Blocks the payee needs before the last HTLC expires. Defaults to 18.',
    fallback_address:
        'An on-chain address to pay if the Lightning payment fails.',
    route_hint:
        'A private route to the payee: each hop gives a node, channel, fees and CLTV delta.',
    features:
        'Feature bits the payment needs or supports (BOLT 9). Even bits are required.',
    metadata: 'Data the payer must return to the payee in the payment onion.',
    recovery_flag:
        'Recovery id used to derive the public key from the signature.',

    // BOLT 12 offer
    offer_chains: 'Chains the offer is valid for. Bitcoin mainnet when absent.',
    offer_metadata: 'Data for the issuer only; payers ignore it.',
    offer_currency: 'ISO 4217 currency of offer_amount. Bitcoin when absent.',
    offer_amount:
        'Amount per item, in msat or in minor units of offer_currency.',
    offer_description:
        'What the offer is for. Required when there is an amount.',
    offer_features: 'Feature bits for the offer.',
    offer_absolute_expiry:
        'Unix time after which the offer should not be used.',
    offer_paths:
        'Blinded paths to reach the issuer with an invoice request, hiding its node.',
    offer_issuer: 'Who is issuing the offer, for display.',
    offer_quantity_max:
        'Most items a payer may request. 0 means no limit; absent means one item.',
    offer_issuer_id:
        'Public key the issuer uses to sign invoices for this offer.',

    // BOLT 12 invoice request
    invreq_metadata:
        'Payer-chosen random data that makes the request and its keys unique.',
    invreq_chain: 'The chain the payer wants to pay on.',
    invreq_amount: 'Amount the payer intends to pay, in msat.',
    invreq_features: 'Feature bits for the invoice request.',
    invreq_quantity: 'Number of items requested.',
    invreq_payer_id:
        'Key the payer signs the request with. Often a one-time key.',
    invreq_payer_note: 'A note from the payer to the issuer.',
    invreq_paths: 'Blinded paths to reach the payer with the invoice.',
    invreq_bip_353_name:
        'The BIP 353 name (₿user@domain) the payer used to find the offer.',

    // BOLT 12 invoice
    invoice_paths: 'Blinded paths to pay the invoice through.',
    invoice_blindedpay:
        'Fees, CLTV delta and HTLC limits for each blinded path.',
    invoice_created_at: 'When the invoice was created (seconds since 1970).',
    invoice_relative_expiry:
        'Seconds after creation until expiry. Defaults to 7200.',
    invoice_payment_hash: 'SHA-256 of the payment preimage.',
    invoice_amount: 'Amount to pay, in msat.',
    invoice_fallbacks:
        'On-chain addresses to use if the Lightning payment fails.',
    invoice_features: 'Feature bits for paying the invoice.',
    invoice_node_id:
        'Key that signs the invoice. Must match offer_issuer_id when present.',

    // Payer proofs
    proof_signature: "The payer's signature over the proof.",
    proof_preimage: 'The payment preimage; it must hash to the payment hash.',
    proof_omitted_tlvs: 'Markers for the invoice fields the proof leaves out.',
    proof_missing_hashes:
        'Merkle hashes of omitted subtrees, used to rebuild the root.',
    proof_leaf_hashes: 'Nonce hashes of the disclosed fields.',
    proof_note: 'A note from the payer.',

    merkle_root:
        "Merkle root over the fields; signatures cover it. Core Lightning reports an offer's root as its offer_id.",

    // LNURL
    url: 'The URL a wallet fetches to get the payment parameters.',
    tag: 'The LNURL type: payRequest, withdrawRequest, channelRequest or login.',
    callback: 'URL the wallet calls next, with the amount or invoice.',
    minSendable: 'Smallest amount the service accepts, in msat.',
    maxSendable: 'Largest amount the service accepts, in msat.',
    minWithdrawable: 'Smallest amount you can withdraw, in msat.',
    maxWithdrawable: 'Largest amount you can withdraw, in msat.',
    k1: 'A random challenge from the service.',
    commentAllowed: 'Longest comment the payer may attach (LUD-12).',
    allowsNostr: 'Whether the service accepts Nostr zap requests (NIP-57).',
    nostrPubkey: 'Key the service signs zap receipts with.',
    payerData: 'Payer details the service asks for (LUD-18).',
    defaultDescription: 'Description for the withdrawal invoice.',
    username: 'The user part of the lightning address.',
    domain: 'The domain hosting the lightning address.'
};

export function fieldInfo(key: string): string | undefined {
    return FIELD_INFO[key];
}
