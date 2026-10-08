import { useEffect, useState } from 'react';

/** Current Unix time in seconds, refreshed every `intervalMs`. */
export function useNow(intervalMs = 15_000): number {
    const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
    useEffect(() => {
        const id = window.setInterval(
            () => setNow(Math.floor(Date.now() / 1000)),
            intervalMs
        );
        return () => window.clearInterval(id);
    }, [intervalMs]);
    return now;
}
