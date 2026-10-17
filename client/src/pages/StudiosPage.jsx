import { useEffect, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import ArchiveImage from '../components/ArchiveImage.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { EmptyState, ErrorState, OfflineNotice, PageSkeleton } from '../components/States.jsx';
import { api } from '../data/api.js';
import { useApi } from '../hooks/useApi.js';
import { filmsCount, studioYears } from '../lib/format.js';

const PERIODS = [1920, 1930, 1940, 1950, 1960, 1970, 1980, 1990];
const ORDERINGS = [['name', 'По названию'], ['founded', 'Сначала старейшие'], ['-founded', 'Сначала новые']];

export default function StudiosPage() {
    const [params, setParams] = useSearchParams();
    const query = Object.fromEntries(['q', 'country', 'active_in', 'ordering'].filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
    const [search, setSearch] = useState(query.q || '');
    const studios = useApi((signal) => api.studios(query, { signal }), JSON.stringify(query));
    const facets = useApi((signal) => api.facets({ signal }), 'facets');

    const update = (k, v) => {
        const next = new URLSearchParams(params);
        if (v) next.set(k, v); else next.delete(k);
        setParams(next, { replace: true });
    };
    useEffect(() => {
        if ((query.q || '') === search.trim()) return undefined;
        const t = setTimeout(() => update('q', search.trim()), 250);
        return () => clearTimeout(t);
    }, [search]);

    const reset = () => { setSearch(''); setParams({}, { replace: true }); };

    return (
        <Page title="Студии">
            <PageHeader title="Анимационные студии" subtitle="Мастерские, которые создали историю мультипликации" />
            <section className="ma-filters" aria-label="Поиск студий">
                <div className="ma-filters__row">
                    <div className="ma-input-icon flex-grow-1">
                        <i className="bi bi-search" aria-hidden="true" />
                        <Form.Control type="search" placeholder="Название студии..." aria-label="Название студии"
                                      value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>
                    <Form.Group className="ma-select">
                        <Form.Label>Страна</Form.Label>
                        <Form.Select value={query.country || ''} onChange={(e) => update('country', e.target.value)}>
                            <option value="">Все страны</option>
                            {(facets.data?.countries || []).map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="ma-select">
                        <Form.Label>Период работы</Form.Label>
                        <Form.Select value={query.active_in || ''} onChange={(e) => update('active_in', e.target.value)}>
                            <option value="">Любой период</option>
                            {PERIODS.map((d) => <option key={d} value={d}>Работала в {d}-е</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Form.Group className="ma-select">
                        <Form.Label>Сортировка</Form.Label>
                        <Form.Select value={query.ordering || 'name'} onChange={(e) => update('ordering', e.target.value === 'name' ? '' : e.target.value)}>
                            {ORDERINGS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </Form.Select>
                    </Form.Group>
                </div>
            </section>
            <OfflineNotice offline={studios.offline} savedAt={studios.savedAt} />
            {studios.error && !studios.data ? <ErrorState error={studios.error} onRetry={studios.reload} />
                : !studios.data ? <PageSkeleton />
                : studios.data.length === 0 ? (
                    <EmptyState icon="bi-building" title="Ничего не найдено" text="Попробуйте изменить запрос или сбросить фильтры."
                                action={<Button variant="danger" onClick={reset}>Сбросить фильтры</Button>} />
                ) : (
                    <div className={`ma-studios ${studios.loading ? 'is-refreshing' : ''}`}>
                        {studios.data.map((s) => <StudioCard key={s.slug} studio={s} />)}
                    </div>
                )}
        </Page>
    );
}

export function StudioMark({ studio, size = 'md' }) {
    if (studio.logo) {
        return <span className={`ma-studio-mark ma-studio-mark--${size}`}><ArchiveImage src={studio.logo} alt={`Логотип: ${studio.name}`} ratio="free" fit="contain" /></span>;
    }
    const initials = studio.name.replace(/[«»"]/g, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
    return <span className={`ma-studio-mark ma-studio-mark--${size} ma-studio-mark--initials`} aria-hidden="true">{initials}</span>;
}

function StudioCard({ studio }) {
    return (
        <article className="ma-studio-card">
            <StudioMark studio={studio} />
            <div className="ma-studio-card__body">
                <h2 className="ma-h3"><Link to={`/studios/${studio.slug}`} className="stretched-link">{studio.name}</Link></h2>
                <p className="ma-studio-card__meta">
                    {[studio.country?.name, studio.city, studioYears(studio)].filter(Boolean).join(' · ')}
                </p>
                <p className="ma-studio-card__desc">{studio.description}</p>
            </div>
            <div className="ma-studio-card__foot">
                <span className="ma-badge"><i className="bi bi-film me-1" aria-hidden="true" />{filmsCount(studio.film_count)}</span>
                <span className="ma-studio-card__more">Подробнее <i className="bi bi-arrow-right" aria-hidden="true" /></span>
            </div>
        </article>
    );
}
