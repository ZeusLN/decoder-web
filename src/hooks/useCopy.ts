import { useCallback, useEffect, useRef, useState } from 'react';

export type CopyState = 'idle' | 'copied' | 'failed';

/**
 * Clipboard write with honest feedback: `copied` only after the write
 * resolves, `failed` when it rejects (permission denied, unfocused
 * document, or no navigator.clipboard outside a secure context). The
 * state resets after `resetMs`.
 */
export function useCopy(resetMs = { copied: 1200, failed: 2000 }) {
    const [state, setState] = useState<CopyState>('idle');
    const timer = useRef<number | null>(null);
    const mounted = useRef(true);

    // Set the flag in the effect body, not just at init: StrictMode runs
    // effects twice in development (mount, cleanup, mount), and a flag
    // only cleared by the cleanup would stay false and drop every update.
    useEffect(() => {
        mounted.current = true;
        return () => {
            mounted.current = false;
            if (timer.current !== null) window.clearTimeout(timer.current);
        };
    }, []);

    const copy = useCallback(
        async (value: string) => {
            let ok = false;
            try {
                await navigator.clipboard.writeText(value);
                ok = true;
            } catch {
                ok = false;
            }
            if (!mounted.current) return;
            setState(ok ? 'copied' : 'failed');
            if (timer.current !== null) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(
                () => setState('idle'),
                ok ? resetMs.copied : resetMs.failed
            );
        },
        [resetMs.copied, resetMs.failed]
    );

    return { state, copy };
}
