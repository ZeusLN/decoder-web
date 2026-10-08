import { useCallback, useEffect, useState } from 'react';
import { fetchLnurl, type LnurlFetchResult } from '../lib/lnurl/fetch';

export type LnurlFetchState =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'done'; result: LnurlFetchResult };

/** Fetches an LNURL endpoint when `url` is set; cancels on change or unmount. */
export function useLnurlFetch(url: string | null): {
    state: LnurlFetchState;
    retry: () => void;
} {
    const [state, setState] = useState<LnurlFetchState>({ status: 'idle' });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        if (!url) {
            setState({ status: 'idle' });
            return;
        }
        const controller = new AbortController();
        setState({ status: 'loading' });
        fetchLnurl(url, { signal: controller.signal }).then((result) => {
            if (!controller.signal.aborted)
                setState({ status: 'done', result });
        });
        return () => controller.abort();
    }, [url, attempt]);

    const retry = useCallback(() => setAttempt((n) => n + 1), []);
    return { state, retry };
}
