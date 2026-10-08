/**
 * Shared result types. Every decoder returns a result with `issues`
 * (problems found while decoding) and `segments` (character ranges of the
 * normalized input, used to annotate the string in the UI).
 */
import type { Bolt11Result } from './bolt11/decode';
import type { Bolt12Result } from './bolt12/decode';
import type { LnurlResult } from './lnurl/decode';

export type Severity = 'error' | 'warning' | 'info';

export interface Issue {
    /** Stable machine-readable code, e.g. `missing_payment_secret`. */
    code: string;
    severity: Severity;
    message: string;
    /** BOLT 12 TLV type or BOLT 11 tag code the issue refers to. */
    type?: number;
}

export type SegmentKind =
    | 'prefix'
    | 'amount'
    | 'separator'
    | 'timestamp'
    | 'field'
    | 'unknown'
    | 'signature'
    | 'checksum'
    | 'padding'
    | 'continuation';

export interface Segment {
    /** Character offsets into `normalized`, end exclusive. */
    start: number;
    end: number;
    kind: SegmentKind;
    /** Short field name, e.g. `payment_hash`. */
    label: string;
    /** Index into the result's tag or TLV list, when the segment is one. */
    recordIndex?: number;
}

export interface ErrorResult {
    kind: 'error';
    input: string;
    message: string;
    /** What the input looked like, if it could be classified. */
    detected?: string;
}

export type DecodeResult =
    Bolt11Result | Bolt12Result | LnurlResult | ErrorResult;

/** True if no issue is error-severity. */
export function hasErrors(issues: Issue[]): boolean {
    return issues.some((i) => i.severity === 'error');
}
