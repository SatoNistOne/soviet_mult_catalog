import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilmGrid } from '../components/FilmCard.jsx';
import { useFeedback } from '../components/Feedback.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { CardSkeletons, EmptyState, ErrorState, OfflineNotice } from '../components/States.jsx';
import { api } from '../data/api.js';
import { useApi } from '../hooks/useApi.js';
import { filmsCount } from '../lib/format.js';

const FILTERS = ['q', 'year_from', 'year_to', 'country', 'studio', 'genre', 'technique', 'director', 'person', 'year', 'ordering'];
const PAGE_SIZE = 24;
const ORDERINGS = [['-year', 'Сначала новые'], ['year', 'Сначала старые'], ['title', 'По названию']];
const VIEW_KEY = 'multarchive.catalog.view';

function readView() {
    try { return localStorage.getItem(VIEW_KEY) || 'grid'; } catch { return 'grid'; }
}

export default function CatalogPage() {
    const [params, setParams] = useSearchParams();
    const navigate = useNavigate();
    const { notify } = useFeedback();
    const query = useMemo(() => Object.fromEntries(FILTERS.filter((k) => params.get(k)).map((k) => [k, params.get(k)])), [params]);
    const queryKey = JSON.stringify(query);
    const [view, setView] = useState(readView);
    const [search, setSearch] = useState(query.q || '');
    const [extra, setExtra] = useState({ items: [], page: 1, loading: false, error: null });

    const facets = useApi((signal) => api.facets({ signal }), 'facets');
    const films = useApi((signal) => api.films({ ordering: '-year', ...query, page_size: PAGE_SIZE }, { signal }), queryKey);

    useEffect(() => { setExtra({ items: [], page: 1, loading: false, error: null }); }, [queryKey]);
    useEffect(() => { setSearch(query.q || ''); }, [query.q]);

    const update = useCallback((changes) => {
        const next = new URLSearchParams(params);
        for (const [key, value] of Object.entries(changes)) {
            if (value === '' || value == null) next.delete(key);
            else next.set(key, value);
        }
        setParams(next, { replace: true });
    }, [params, setParams]);

    useEffect(() => {
        if ((query.q || '') === search.trim()) return undefined;
        const timer = setTimeout(() => update({ q: search.trim() }), 300);
        return () => clearTimeout(timer);
    }, [search, query.q, update]);

    const total = films.data?.count ?? 0;
    const items = useMemo(() => [...(films.data?.results || []), ...extra.items], [films.data, extra.items]);
    const hasMore = items.length < total;

    const loadMore = useCallback(async () => {
        if (extra.loading || !hasMore) return;
        setExtra((s) => ({ ...s, loading: true, error: null }));
        try {
            const { data } = await api.films({ ordering: '-year', ...query, page_size: PAGE_SIZE, page: extra.page + 1 });
            setExtra((s) => ({ items: [...s.items, ...data.results], page: s.page + 1, loading: false, error: null }));
        } catch (error) {
            setExtra((s) => ({ ...s, loading: false, error }));
        }
    }, [extra.loading, extra.page, hasMore, query]);

    const sentinel = useRef(null);
    useEffect(() => {
        if (!sentinel.current || !hasMore) return undefined;
        const observer = new IntersectionObserver((entries) => entries[0].isIntersecting && loadMore(), { rootMargin: '400px' });
        observer.observe(sentinel.current);
        return () => observer.disconnect();
    }, [hasMore, loadMore]);

    const changeView = (value) => {
        setView(value);
        try { localStorage.setItem(VIEW_KEY, value); } catch { }
    };

    const random = async () => {
        try {
            const { data } = await api.random(query);
            navigate(`/film/${data.slug}`);
        } catch {
            notify({ text: 'Под эти условия нечего выбрать', icon: 'bi-shuffle' });
        }
    };

    const f = facets.data;
    const genres = f?.genres.filter((g) => g.kind !== 'technique') || [];
    const techniques = f?.genres.filter((g) => g.kind === 'technique') || [];
    const minYear = f?.years.min ?? 1900;
    const maxYear = f?.years.max ?? 2000;

    const chips = [];
    const label = (list, slug) => list?.find((x) => x.slug === slug)?.name || slug;
    if (query.q) chips.push(['q', `«${query.q}»`]);
    if (query.year_from || query.year_to) chips.push(['years', `${query.year_from || minYear}–${query.year_to || maxYear}`]);
    if (query.year) chips.push(['year', `${query.year} год`]);
    if (query.country) chips.push(['country', label(f?.countries, query.country)]);
    if (query.studio) chips.push(['studio', label(f?.studios, query.studio)]);
    if (query.genre) chips.push(['genre', label(f?.genres, query.genre)]);
    if (query.technique) chips.push(['technique', label(f?.genres, query.technique)]);
    if (query.director) chips.push(['director', label(f?.directors, query.director)]);
    if (query.person) chips.push(['person', 'Персона']);
    const removeChip = (key) => update(key === 'years' ? { year_from: '', year_to: '' } : { [key]: '' });
    const reset = () => { setSearch(''); setParams(query.ordering ? { ordering: query.ordering } : {}, { replace: true }); };

    return (
        <Page title="Каталог">
            <PageHeader title="Каталог мультфильмов" subtitle="Откройте для себя классику анимации разных эпох">
                <Button variant="outline-dark" onClick={random}><i className="bi bi-shuffle me-2" aria-hidden="true" />Случайный</Button>
            </PageHeader>

            <section className="ma-filters" aria-label="Поиск и фильтры">
                <div className="ma-filters__main">
                    <div className="ma-input-icon">
                        <i className="bi bi-search" aria-hidden="true" />
                        <Form.Control type="search" placeholder="Название мультфильма..." aria-label="Название мультфильма"
                                      value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <div className="ma-years" role="group" aria-label="Годы выпуска">
                        <span className="ma-years__label">Годы</span>
                        <Form.Control type="number" min={minYear} max={maxYear} placeholder={String(minYear)} aria-label="Год выпуска от"
                                      value={query.year_from || ''} onChange={(e) => update({ year_from: e.target.value })} />
                        <span aria-hidden="true">—</span>
                        <Form.Control type="number" min={minYear} max={maxYear} placeholder={String(maxYear)} aria-label="Год выпуска до"
                                      value={query.year_to || ''} onChange={(e) => update({ year_to: e.target.value })} />
                    </div>
                    <Form.Select aria-label="Сортировка" value={query.ordering || '-year'} className="ma-filters__sort"
                                 onChange={(e) => update({ ordering: e.target.value === '-year' ? '' : e.target.value })}>
                        {ORDERINGS.map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                    </Form.Select>
                </div>
                <div className="ma-filters__row">
                    <FilterSelect label="Страна" value={query.country} all="Все страны" options={f?.countries} onChange={(v) => update({ country: v })} />
                    <FilterSelect label="Студия" value={query.studio} all="Все студии" options={f?.studios} onChange={(v) => update({ studio: v })} />
                    <FilterSelect label="Жанр" value={query.genre} all="Все жанры" options={genres} onChange={(v) => update({ genre: v })} />
                    <FilterSelect label="Техника" value={query.technique} all="Любая техника" options={techniques} onChange={(v) => update({ technique: v })} />
                    <Button variant="link" className="ma-reset" onClick={reset} disabled={!chips.length}>
                        <i className="bi bi-x-circle me-1" aria-hidden="true" />Сбросить фильтры
                    </Button>
                </div>
            </section>

            <div className="ma-results-bar">
                <div className="ma-results-bar__info" aria-live="polite">
                    {films.loading && !films.data ? 'Ищем в архиве…' : `Найдено: ${filmsCount(total)}`}
                    {chips.map(([key, text]) => (
                        <button type="button" key={key} className="ma-chip" onClick={() => removeChip(key)} aria-label={`Убрать фильтр: ${text}`}>
                            {text}<i className="bi bi-x" aria-hidden="true" />
                        </button>
                    ))}
                </div>
                <div className="btn-group" role="group" aria-label="Вид списка">
                    {[['grid', 'bi-grid-3x2-gap', 'Сетка'], ['list', 'bi-list-ul', 'Список']].map(([value, icon, text]) => (
                        <OverlayTrigger key={value} overlay={<Tooltip>{text}</Tooltip>}>
                            <Button variant={view === value ? 'dark' : 'outline-secondary'} size="sm" aria-pressed={view === value}
                                    aria-label={text} onClick={() => changeView(value)}>
                                <i className={`bi ${icon}`} aria-hidden="true" />
                            </Button>
                        </OverlayTrigger>
                    ))}
                </div>
            </div>

            <OfflineNotice offline={films.offline} savedAt={films.savedAt} />
            {films.error && !films.data ? (
                <ErrorState error={films.error} onRetry={films.reload} />
            ) : !films.data ? (
                <CardSkeletons />
            ) : items.length === 0 ? (
                <EmptyState icon="bi-search" title="Ничего не найдено" text="Попробуйте изменить поисковый запрос или сбросить фильтры."
                            action={<Button variant="danger" onClick={reset}>Сбросить фильтры</Button>} />
            ) : (
                <div className={films.loading ? 'is-refreshing' : ''}>
                    <FilmGrid films={items} layout={view} />
                    {hasMore && (
                        <div className="ma-more" ref={sentinel}>
                            <Button variant="outline-dark" onClick={loadMore} disabled={extra.loading}>
                                {extra.loading ? 'Загружаем…' : 'Загрузить ещё'}
                            </Button>
                            {extra.error && <p className="ma-muted small mt-2">Не удалось загрузить: {extra.error.message}</p>}
                        </div>
                    )}
                </div>
            )}
        </Page>
    );
}

function FilterSelect({ label, value, all, options, onChange }) {
    return (
        <Form.Group className="ma-select">
            <Form.Label>{label}</Form.Label>
            <Form.Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
                <option value="">{all}</option>
                {(options || []).map((o) => <option key={o.slug} value={o.slug}>{o.name} ({o.count})</option>)}
            </Form.Select>
        </Form.Group>
    );
}
