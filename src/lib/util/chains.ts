/**
 * Bitcoin networks as BOLT 11 prefixes and BOLT 12 chain hashes.
 *
 * Chain hashes are genesis block hashes in the byte order they appear on the
 * wire (the reverse of the usual block-explorer display).
 */

export interface Network {
    /** Human-readable name. */
    name: string;
    /** BOLT 11 currency prefix after "ln" (bc, tb, tbs, bcrt, sb). */
    bolt11Prefix: string;
    /** Segwit address prefix used for fallback addresses. */
    bech32: string;
    /** Base58 version bytes used for P2PKH and P2SH fallback addresses. */
    pubKeyHash: number;
    scriptHash: number;
    /** Wire-order genesis hash, as used in BOLT 12 `chains` and `chain`. */
    chainHash?: string;
}

export const NETWORKS: Network[] = [
    {
        name: 'mainnet',
        bolt11Prefix: 'bc',
        bech32: 'bc',
        pubKeyHash: 0x00,
        scriptHash: 0x05,
        chainHash:
            '6fe28c0ab6f1b372c1a6a246ae63f74f931e8365e15a089c68d6190000000000'
    },
    {
        name: 'testnet',
        bolt11Prefix: 'tb',
        bech32: 'tb',
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        chainHash:
            '43497fd7f826957108f4a30fd9cec3aeba79972084e90ead01ea330900000000'
    },
    {
        name: 'signet',
        bolt11Prefix: 'tbs',
        bech32: 'tb',
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        chainHash:
            'f61eee3b63a380a477a063af32b2bbc97c9ff9f01f2c4225e973988108000000'
    },
    {
        name: 'regtest',
        bolt11Prefix: 'bcrt',
        bech32: 'bcrt',
        pubKeyHash: 0x6f,
        scriptHash: 0xc4,
        chainHash:
            '06226e46111a0b59caaf126043eb5bbf28c34f3a5e332a1fc7b2b73cf188910f'
    },
    {
        name: 'simnet',
        bolt11Prefix: 'sb',
        bech32: 'sb',
        pubKeyHash: 0x3f,
        scriptHash: 0x7b
    }
];

/**
 * Chains with no BOLT 11 prefix of their own. testnet4 shares `tb` with
 * testnet3; only BOLT 12 chain hashes tell them apart.
 */
const EXTRA_CHAINS: Record<string, string> = {
    '1466275836220db2944ca059a3a10ef6fd2ea684b0688d2c379296888a206003':
        'liquidv1',
    '43f08bdab050e35b567c864b91f47f50ae725ae2de53bcfbbaf284da00000000':
        'testnet4'
};

export function networkByBolt11Prefix(prefix: string): Network | undefined {
    return NETWORKS.find((n) => n.bolt11Prefix === prefix);
}

export function chainName(chainHashHex: string): string | undefined {
    const known = NETWORKS.find((n) => n.chainHash === chainHashHex);
    return known?.name ?? EXTRA_CHAINS[chainHashHex];
}

export function networkByChainHash(chainHashHex: string): Network | undefined {
    const name = chainName(chainHashHex);
    if (!name) return undefined;
    if (name === 'testnet4') {
        // testnet4 uses testnet address encoding.
        const testnet = NETWORKS.find((n) => n.name === 'testnet')!;
        return { ...testnet, name, chainHash: chainHashHex };
    }
    return NETWORKS.find((n) => n.name === name);
}

export const MAINNET = NETWORKS[0];
