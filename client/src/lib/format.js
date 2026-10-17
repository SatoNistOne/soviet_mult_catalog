export function plural(n, one, few, many) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
    return many;
}

export const count = (n, one, few, many) => `${n} ${plural(n, one, few, many)}`;
export const filmsCount = (n) => count(n, 'мультфильм', 'мультфильма', 'мультфильмов');
export const runtime = (min) => (min ? `${min} ${plural(min, 'минута', 'минуты', 'минут')}` : '');
export const countries = (list) => (list || []).map((c) => c.name).join(', ');
export const names = (list) => (list || []).map((p) => p.name).join(', ');
export const archiveNo = (id) => `№ ${String(id ?? 0).padStart(4, '0')}`;

export function lifespan(person) {
    if (!person?.birth_year) return '';
    return person.death_year ? `${person.birth_year}–${person.death_year}` : `род. ${person.birth_year}`;
}

export function studioYears(studio) {
    if (!studio?.founded) return '';
    return studio.closed ? `${studio.founded}–${studio.closed}` : `с ${studio.founded} года`;
}

export const savedAtLabel = (ts) =>
    ts ? new Date(ts).toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export const paragraphs = (text) => (text || '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
