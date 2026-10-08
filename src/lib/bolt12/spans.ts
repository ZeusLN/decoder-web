/**
 * Maps TLV records back to characters of the original string. Each data
 * character carries 5 bits; it belongs to the record that owns its first
 * bit. `+` joins and the whitespace after them get their own segments.
 */
import type { Segment, SegmentKind } from '../types';
import type { Bolt12String } from './bech32';
import type { RawTlv } from './tlv';

interface Label {
    kind: SegmentKind;
    label: string;
    recordIndex?: number;
}

export function bolt12Segments(
    str: Bolt12String,
    raw: RawTlv[],
    records: { name: string; type: bigint; known: boolean }[]
): Segment[] {
    const labels: (Label | undefined)[] = new Array(str.normalized.length);
    const sep = str.hrp.length;

    for (let j = 0; j < str.offsets.length; j++) {
        let label: Label;
        if (j < sep) {
            label = { kind: 'prefix', label: 'prefix' };
        } else if (j === sep) {
            label = { kind: 'separator', label: 'separator' };
        } else {
            const byte = Math.floor(((j - sep - 1) * 5) / 8);
            if (byte >= str.bytes.length) {
                label = { kind: 'padding', label: 'padding' };
            } else {
                const index = raw.findIndex(
                    (r) => byte >= r.start && byte < r.end
                );
                if (index === -1) {
                    label = { kind: 'unknown', label: 'unparsed' };
                } else {
                    const record = records[index];
                    const isSignature =
                        record.type >= 240n && record.type <= 1000n;
                    label = {
                        kind: isSignature
                            ? 'signature'
                            : record.known
                              ? 'field'
                              : 'unknown',
                        label: record.known
                            ? record.name
                            : `unknown (${record.type})`,
                        recordIndex: index
                    };
                }
            }
        }
        labels[str.offsets[j]] = label;
    }
    for (const offset of str.continuations) {
        labels[offset] = { kind: 'continuation', label: 'continuation' };
    }

    const segments: Segment[] = [];
    for (let i = 0; i < labels.length; i++) {
        const l = labels[i]!;
        const prev = segments[segments.length - 1];
        if (
            prev &&
            prev.kind === l.kind &&
            prev.label === l.label &&
            prev.recordIndex === l.recordIndex
        ) {
            prev.end = i + 1;
        } else {
            segments.push({
                start: i,
                end: i + 1,
                kind: l.kind,
                label: l.label,
                recordIndex: l.recordIndex
            });
        }
    }
    return segments;
}
