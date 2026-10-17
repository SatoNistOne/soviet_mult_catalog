import { useEffect, useState } from 'react';
import { cacheGet, cachePut } from './cache.js';

const objectUrls = new Map();
const pending = new Map();
const MAX_URLS = 500;

async function load(url) {
    const saved = await cacheGet('img', url);
    let blob = saved?.value;
    if (!blob) {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`image ${response.status}`);
        blob = await response.blob();
        cachePut('img', url, blob);
    }
    const objectUrl = URL.createObjectURL(blob);
    objectUrls.set(url, objectUrl);
    if (objectUrls.size > MAX_URLS) {
        const [oldest, oldUrl] = objectUrls.entries().next().value;
        URL.revokeObjectURL(oldUrl);
        objectUrls.delete(oldest);
    }
    return objectUrl;
}

export function resolveImage(url) {
    if (objectUrls.has(url)) return Promise.resolve(objectUrls.get(url));
    if (!pending.has(url)) {
        pending.set(url, load(url).finally(() => pending.delete(url)));
    }
    return pending.get(url);
}

export function useCachedImage(url) {
    const [state, setState] = useState(() => ({ url, src: url ? objectUrls.get(url) || null : null, failed: false }));
    useEffect(() => {
        if (!url || objectUrls.has(url)) return undefined;
        let alive = true;
        resolveImage(url)
            .then((src) => alive && setState({ url, src, failed: false }))
            .catch(() => alive && setState({ url, src: null, failed: true }));
        return () => {
            alive = false;
        };
    }, [url]);
    if (state.url !== url) return { src: url ? objectUrls.get(url) || null : null, failed: false };
    return state;
}
