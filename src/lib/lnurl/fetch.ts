/**
 * Fetches an LNURL endpoint from the browser and classifies failures.
 * There is no proxy: services that do not send CORS headers cannot be read
 * from a web page, and the error says so.
 */
import { parseLnurlResponse, type LnurlResponse } from './parse';

export type LnurlFetchError =
    | { kind: 'cors-or-network'; message: string }
    | { kind: 'timeout'; message: string }
    | { kind: 'http'; status: number; message: string }
    | { kind: 'json'; message: string }
    | { kind: 'lnurl-error'; reason: string; message: string };

export type LnurlFetchResult =
    | { ok: true; response: LnurlResponse; raw: unknown }
    | { ok: false; error: LnurlFetchError };

export interface FetchOptions {
    fetch?: typeof globalThis.fetch;
    timeoutMs?: number;
    signal?: AbortSignal;
}

export async function fetchLnurl(
    url: string,
    opts: FetchOptions = {}
): Promise<LnurlFetchResult> {
    const doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
    const controller = new AbortController();
    const timeout = setTimeout(
        () => controller.abort(),
        opts.timeoutMs ?? 10_000
    );
    opts.signal?.addEventListener('abort', () => controller.abort());
    let res: Response;
    try {
        res = await doFetch(url, {
            signal: controller.signal,
            headers: { Accept: 'application/json' }
        });
    } catch (e) {
        clearTimeout(timeout);
        if (controller.signal.aborted && !opts.signal?.aborted) {
            return {
                ok: false,
                error: {
                    kind: 'timeout',
                    message: 'The service did not answer within 10 seconds.'
                }
            };
        }
        return {
            ok: false,
            error: {
                kind: 'cors-or-network',
                message:
                    `The request failed: the service is unreachable or does not allow requests from web pages (CORS). ${(e as Error).message ?? ''}`.trim()
            }
        };
    }
    clearTimeout(timeout);
    let raw: unknown;
    try {
        raw = await res.json();
    } catch {
        return {
            ok: false,
            error: res.ok
                ? { kind: 'json', message: 'The service did not return JSON.' }
                : {
                      kind: 'http',
                      status: res.status,
                      message: `The service answered with HTTP ${res.status}.`
                  }
        };
    }
    const status = (raw as { status?: unknown })?.status;
    if (typeof status === 'string' && status.toUpperCase() === 'ERROR') {
        const reason = String(
            (raw as { reason?: unknown }).reason ?? 'No reason given'
        );
        return {
            ok: false,
            error: {
                kind: 'lnurl-error',
                reason,
                message: `The service returned an error: ${reason}`
            }
        };
    }
    if (!res.ok) {
        return {
            ok: false,
            error: {
                kind: 'http',
                status: res.status,
                message: `The service answered with HTTP ${res.status}.`
            }
        };
    }
    return { ok: true, response: parseLnurlResponse(raw), raw };
}
