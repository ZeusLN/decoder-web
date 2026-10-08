/**
 * Feature bit names from BOLT 9, cross-checked against rust-lightning
 * (lightning-types/src/features.rs) and lnd (lnwire/features.go). Each pair
 * of bits shares a name: the even bit means "required", the odd bit means
 * "optional". Readers must reject unknown even bits ("it's OK to be odd").
 */
const FEATURE_NAMES: Record<number, string> = {
    0: 'option_data_loss_protect',
    2: 'initial_routing_sync',
    4: 'option_upfront_shutdown_script',
    6: 'gossip_queries',
    8: 'var_onion_optin',
    10: 'gossip_queries_ex',
    12: 'option_static_remotekey',
    14: 'payment_secret',
    16: 'basic_mpp',
    18: 'option_support_large_channel',
    20: 'option_anchor_outputs',
    22: 'option_anchors_zero_fee_htlc_tx',
    24: 'option_route_blinding',
    26: 'option_shutdown_anysegwit',
    28: 'option_dual_fund',
    30: 'amp (lnd) / option_taproot (experimental)',
    34: 'option_quiesce',
    38: 'option_onion_messages',
    40: 'option_zero_fee_commitments',
    42: 'option_provide_storage',
    44: 'option_channel_type',
    46: 'option_scid_alias',
    48: 'option_payment_metadata',
    50: 'option_zeroconf',
    54: 'keysend (non-standard)',
    56: 'option_trampoline (draft)',
    60: 'option_simple_close',
    62: 'option_splice',
    258: 'dns_resolver (draft)',
    260: 'experimental_accountability (lnd)',
    2022: 'script_enforced_lease (lnd)'
};

/**
 * What each feature means, keyed by the even bit of the pair. Paraphrased
 * from BOLT 9, with lnd and LDK for bits outside the spec.
 */
const FEATURE_DESCRIPTIONS: Record<number, string> = {
    0: 'A node that lost channel state can ask its peer for the latest state and still recover its funds.',
    2: 'Asks the peer to send the whole gossip table on connect. Deprecated.',
    4: 'Commits to a closing address when the channel opens, so a compromised node cannot redirect funds when it closes.',
    6: 'Peers can ask for specific gossip instead of receiving all of it.',
    8: 'Understands variable-size (TLV) onion payloads, which payment secrets, multi-part payments and most newer features rely on.',
    10: 'Adds timestamps and checksums to gossip queries.',
    12: "The peer's output in a force-close pays to a fixed key, which makes recovering funds simpler.",
    14: 'The payer must send the payment secret from the invoice, which stops nodes along the route from probing the recipient.',
    16: 'The recipient accepts a payment split across several routes (multi-part payment).',
    18: 'Allows channels larger than 2^24 sats (about 0.168 BTC), known as wumbo channels.',
    20: 'Commitment transactions have anchor outputs so either side can bump the fee. Superseded by bit 22.',
    22: 'Anchor outputs with zero-fee HTLC transactions; fees are added when the transaction is broadcast.',
    24: "Supports blinded paths, which hide the recipient's node and channels from the payer.",
    26: 'The channel can close to any future segwit address version, such as taproot.',
    28: 'Both sides can put funds into a channel when it opens (dual funding).',
    30: 'In lnd invoices, AMP: a multi-part payment where each part has its own preimage. LDK uses this bit experimentally for taproot channels.',
    34: 'Peers can pause channel updates, which splicing and channel upgrades need.',
    38: 'Can send and forward onion messages, which BOLT 12 uses to request invoices.',
    40: 'Commitment transactions pay no fee and carry one shared anchor output (v3 transactions).',
    42: 'Will keep an encrypted backup for its peers.',
    44: 'Peers agree on an explicit channel type when opening a channel.',
    46: 'Uses an alias short channel id, so a private channel does not reveal its funding transaction.',
    48: 'The invoice carries metadata that the payer must return to the recipient in the payment onion.',
    50: 'Will use a channel before its funding transaction confirms (zero-conf).',
    54: 'Accepts spontaneous payments without an invoice (keysend). Not part of the spec.',
    56: 'Supports trampoline routing, where a node finds the rest of the route for the payer. Draft.',
    60: 'Uses the simplified channel closing protocol.',
    62: 'Can add or remove funds from a channel without closing it (splicing).',
    258: 'Resolves BIP 353 names for peers over onion messages. Draft.',
    260: 'lnd experimental accountability signals for HTLCs.',
    2022: 'lnd Lightning Pool channels whose lease is enforced by script.'
};

/** Bits a reader of each context understands, used to flag unknown even bits. */
const KNOWN_BY_CONTEXT: Record<FeatureContext, number[]> = {
    bolt11: [8, 14, 16, 30, 48, 56],
    offer: [],
    invreq: [],
    bolt12invoice: [16, 56],
    blindedHop: []
};

export type FeatureContext =
    'bolt11' | 'offer' | 'invreq' | 'bolt12invoice' | 'blindedHop';

export interface FeatureBit {
    bit: number;
    name: string;
    required: boolean;
    /** True if this is an even bit no implementation in this context defines. */
    unknownRequired: boolean;
    /** What the feature means, for display. */
    description: string;
}

export function featureDescription(bit: number): string {
    const known = FEATURE_DESCRIPTIONS[bit - (bit % 2)];
    if (known) return known;
    return bit % 2 === 0
        ? 'Not a feature this decoder knows. It is even, so it is required: a wallet that does not understand it must not pay.'
        : 'Not a feature this decoder knows. It is odd, so it is optional and wallets can ignore it.';
}

export function featureName(bit: number): string | undefined {
    return FEATURE_NAMES[bit - (bit % 2)];
}

/** Lists the set bits of a big-endian feature vector, lowest bit first. */
export function setBits(bytes: Uint8Array): number[] {
    const bits: number[] = [];
    for (let i = 0; i < bytes.length; i++) {
        const byte = bytes[bytes.length - 1 - i];
        for (let j = 0; j < 8; j++) {
            if (byte & (1 << j)) bits.push(i * 8 + j);
        }
    }
    return bits;
}

export function describeFeatures(
    bits: number[],
    context: FeatureContext
): FeatureBit[] {
    const known = KNOWN_BY_CONTEXT[context];
    return bits.map((bit) => {
        const pair = bit - (bit % 2);
        return {
            bit,
            name: featureName(bit) ?? `unknown feature ${bit}`,
            required: bit % 2 === 0,
            unknownRequired: bit % 2 === 0 && !known.includes(pair),
            description: featureDescription(bit)
        };
    });
}
