import { API_BASE, REQUEST_TIMEOUT_MS } from './config.js';
import { cacheGet, cachePut } from './cache.js';

export class ApiError extends Error {
    constructor(message, status = 0) {
        super(message);
        this.status = status;
    }
}

function buildQuery(path, params = {}) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== '') search.set(key, value);
    }
    search.sort();
    const query = search.toString();
    return query ? `${path}?${query}` : path;
}

async function fetchJson(url, signal) {
    const timeout = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
    let response;
    try {
        response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
        });
    } catch (error) {
        if (error?.name === 'AbortError' && signal?.aborted) throw error;
        throw new ApiError('Сервер архива недоступен', 0);
    }
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new ApiError(body?.detail || `Ошибка сервера (${response.status})`, response.status);
    return body;
}

export async function get(path, params = {}, { signal, cache = true } = {}) {
    const key = buildQuery(path, params);
    try {
        const data = await fetchJson(API_BASE + key, signal);
        if (cache) cachePut('api', key, data);
        return { data, offline: false, savedAt: null };
    } catch (error) {
        if (error.status || !cache || signal?.aborted) throw error;
        const saved = await cacheGet('api', key);
        if (saved) return { data: saved.value, offline: true, savedAt: saved.ts };
        throw error;
    }
}

const slugPath = (prefix, slug) => `/${prefix}/${encodeURIComponent(slug)}/`;

export const api = {
    films: (params, opts) => get('/films/', params, opts),
    film: (slug, opts) => get(slugPath('films', slug), {}, opts),
    random: (params) => get('/films/random/', params, { cache: false }),
    suggest: (q, opts) => get('/films/suggest/', { q }, opts),
    person: (slug, opts) => get(slugPath('persons', slug), {}, opts),
    studios: (params, opts) => get('/studios/', params, opts),
    studio: (slug, opts) => get(slugPath('studios', slug), {}, opts),
    timeline: (params, opts) => get('/timeline/', params, opts),
    facets: (opts) => get('/facets/', {}, opts),
    ping: () => get('/facets/', {}, { cache: false }),
};
