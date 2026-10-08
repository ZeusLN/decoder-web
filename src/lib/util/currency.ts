/**
 * ISO 4217 minor-unit exponents for BOLT 12 `offer_currency`. BOLT 12
 * amounts in a currency are given in that currency's minor unit, so the
 * exponent is needed to show "1.50 USD" rather than "150".
 */
const EXPONENTS: Record<string, number> = {
    AED: 2,
    ARS: 2,
    AUD: 2,
    BHD: 3,
    BRL: 2,
    CAD: 2,
    CHF: 2,
    CLP: 0,
    CNY: 2,
    COP: 2,
    CZK: 2,
    DKK: 2,
    EUR: 2,
    GBP: 2,
    HKD: 2,
    HUF: 2,
    IDR: 2,
    ILS: 2,
    INR: 2,
    ISK: 0,
    JOD: 3,
    JPY: 0,
    KES: 2,
    KRW: 0,
    KWD: 3,
    MXN: 2,
    MYR: 2,
    NGN: 2,
    NOK: 2,
    NZD: 2,
    OMR: 3,
    PHP: 2,
    PKR: 2,
    PLN: 2,
    RON: 2,
    RUB: 2,
    SAR: 2,
    SEK: 2,
    SGD: 2,
    THB: 2,
    TND: 3,
    TRY: 2,
    TWD: 2,
    UAH: 2,
    UGX: 0,
    USD: 2,
    VND: 0,
    XAF: 0,
    XOF: 0,
    ZAR: 2
};

export function currencyExponent(code: string): number | undefined {
    return EXPONENTS[code];
}

export function isIso4217Shape(code: string): boolean {
    return /^[A-Z]{3}$/.test(code);
}

/** Formats a minor-unit amount, e.g. (150n, 'USD') -> '1.50 USD'. */
export function formatCurrencyAmount(minor: bigint, code: string): string {
    const exp = currencyExponent(code);
    if (exp === undefined || exp === 0) return `${minor} ${code}`;
    const s = minor.toString().padStart(exp + 1, '0');
    return `${s.slice(0, -exp)}.${s.slice(-exp)} ${code}`;
}
