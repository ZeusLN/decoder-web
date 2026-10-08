/** Display formatting for amounts, times and raw JSON. */
import { bytesToHex } from '../lib/util/bytes';

function group(digits: string): string {
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 250000123n -> "250,000.123 sat". */
export function formatSats(msat: bigint): string {
    const sats = msat / 1000n;
    const rem = msat % 1000n;
    const frac =
        rem === 0n
            ? ''
            : `.${rem.toString().padStart(3, '0').replace(/0+$/, '')}`;
    return `${group(sats.toString())}${frac} sat`;
}

export function formatMsat(msat: bigint): string {
    return `${group(msat.toString())} msat`;
}

/** 250000000n -> "0.0025 BTC". */
export function formatBtc(msat: bigint): string {
    const whole = msat / 100_000_000_000n;
    const frac = (msat % 100_000_000_000n)
        .toString()
        .padStart(11, '0')
        .replace(/0+$/, '');
    return `${whole}${frac ? `.${frac}` : ''} BTC`;
}

export function formatDate(unixSeconds: number): string {
    const d = new Date(unixSeconds * 1000);
    if (Number.isNaN(d.getTime())) return String(unixSeconds);
    return d.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
    });
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 31_536_000],
    ['month', 2_592_000],
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
    ['second', 1]
];

/** "in 59 minutes", "3 days ago". */
export function relativeTime(unixSeconds: number, nowSeconds: number): string {
    const diff = unixSeconds - nowSeconds;
    const abs = Math.abs(diff);
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    for (const [unit, secs] of UNITS) {
        if (abs >= secs || unit === 'second') {
            return rtf.format(Math.round(diff / secs), unit);
        }
    }
    return '';
}

export function formatDuration(seconds: number): string {
    if (seconds % 86_400 === 0 && seconds >= 86_400)
        return `${seconds / 86_400} day${seconds === 86_400 ? '' : 's'}`;
    if (seconds % 3_600 === 0 && seconds >= 3_600)
        return `${seconds / 3_600} hour${seconds === 3_600 ? '' : 's'}`;
    if (seconds % 60 === 0 && seconds >= 60)
        return `${seconds / 60} minute${seconds === 60 ? '' : 's'}`;
    return `${seconds} second${seconds === 1 ? '' : 's'}`;
}

/** JSON with bigints as strings and byte arrays as hex. */
export function toJson(value: unknown): string {
    return JSON.stringify(
        value,
        (_k, v) => {
            if (typeof v === 'bigint') return v.toString();
            if (v instanceof Uint8Array) return bytesToHex(v);
            return v;
        },
        2
    );
}

export function shorten(value: string, keep = 10): string {
    return value.length > keep * 2 + 1
        ? `${value.slice(0, keep)}…${value.slice(-keep)}`
        : value;
}
