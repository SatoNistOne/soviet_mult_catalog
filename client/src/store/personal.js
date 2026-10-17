import { useSyncExternalStore } from 'react';

const KEY = 'multarchive.personal.v1';
const listeners = new Set();

function load() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
        return {
            favorites: raw.favorites || {}, watched: raw.watched || {}, theme: raw.theme || 'light',
            sidebarCollapsed: Boolean(raw.sidebarCollapsed),
        };
    } catch {
        return { favorites: {}, watched: {}, theme: 'light', sidebarCollapsed: false };
    }
}

let state = load();

function commit(next) {
    state = next;
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
    }
    listeners.forEach((fn) => fn());
}

export function snapshot(film) {
    return {
        slug: film.slug,
        title: film.title,
        original_title: film.original_title || '',
        year: film.year,
        duration_min: film.duration_min || null,
        studio: film.studio,
        countries: film.countries || [],
        techniques: film.techniques || [],
        poster: film.poster ? { thumb: film.poster.thumb } : null,
        directors: film.directors || [],
        addedAt: Date.now(),
    };
}

export function toggle(list, film) {
    const items = { ...state[list] };
    const added = !items[film.slug];
    if (added) items[film.slug] = snapshot(film);
    else delete items[film.slug];
    commit({ ...state, [list]: items });
    return added;
}

export function restore(list, saved) {
    commit({ ...state, [list]: { ...state[list], [saved.slug]: saved } });
}

export function clear(list) {
    commit({ ...state, [list]: {} });
}

export function setTheme(theme) {
    commit({ ...state, theme });
}

export function setSidebarCollapsed(sidebarCollapsed) {
    commit({ ...state, sidebarCollapsed });
}

function subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
}

export function usePersonal() {
    return useSyncExternalStore(subscribe, () => state);
}
