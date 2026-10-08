import { useEffect } from 'react';

export const SITE_URL = 'https://decoder.zeusln.com';

function setMeta(selector: string, attr: 'content' | 'href', value: string) {
    document.querySelector(selector)?.setAttribute(attr, value);
}

/**
 * Sets the document title, description and canonical URL for a page.
 * Crawlers that run JavaScript see the per-page values; link previews use
 * the static tags in index.html.
 */
export function usePageMeta({
    title,
    description,
    path
}: {
    title: string;
    description: string;
    path: string;
}) {
    useEffect(() => {
        document.title = title;
        setMeta('meta[name="description"]', 'content', description);
        setMeta('link[rel="canonical"]', 'href', `${SITE_URL}${path}`);
    }, [title, description, path]);
}
