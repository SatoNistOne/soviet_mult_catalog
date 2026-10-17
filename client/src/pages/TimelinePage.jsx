import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form } from 'react-bootstrap';
import { Link, useSearchParams } from 'react-router-dom';
import ArchiveImage from '../components/ArchiveImage.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { EmptyState, ErrorState, OfflineNotice, PageSkeleton } from '../components/States.jsx';
import { api } from '../data/api.js';
import { useApi } from '../hooks/useApi.js';
import { countries } from '../lib/format.js';

const FILTERS = ['country', 'studio', 'technique', 'kind'];
const KIND_ICONS = { milestone: 'bi-flag', technology: 'bi-lightbulb', studio: 'bi-building', premiere: 'bi-film', award: 'bi-award' };

export default function TimelinePage() {
    const [params, setParams] = useSearchParams();
    const query = Object.fromEntries(FILTERS.filter((k) => params.get(k)).map((k) => [k, params.get(k)]));
    const key = JSON.stringify(query);
    const timeline = useApi((signal) => api.timeline(query, { signal }), key);
    const facets = useApi((signal) => api.facets({ signal }), 'facets');
    const [selected, setSelected] = useState(null);
    const [era, setEra] = useState(null);
    const listRef = useRef(null);

    const data = timeline.data;
    const entries = useMemo(() => {
        const map = new Map();
        for (const year of data?.years || []) {
            for (const e of year.events) map.set(`e${e.id}`, { type: 'event', ...e });
            for (const f of year.films) map.set(`f${f.slug}`, { type: 'film', ...f });
        }
        return map;
    }, [data]);
    const current = entries.get(selected) || null;

    useEffect(() => {
        if (!listRef.current) return undefined;
        const observer = new IntersectionObserver((items) => {
            const visible = items.filter((i) => i.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
            if (visible[0]) setEra(visible[0].target.dataset.era);
        }, { rootMargin: '-20% 0px -70% 0px' });
        listRef.current.querySelectorAll('[data-era]').forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [data]);

    const update = (k, v) => {
        const next = new URLSearchParams(params);
        if (v) next.set(k, v); else next.delete(k);
        setParams(next, { replace: true });
        setSelected(null);
    };
    const jump = (eraKey) => {
        const el = listRef.current?.querySelector(`[data-era="${eraKey}"]`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const f = facets.data;
    const techniques = f?.genres.filter((g) => g.kind === 'technique') || [];
    const select = (k) => setSelected((s) => (s === k ? null : k));

    return (
        <Page title="Хронология">
            <PageHeader title="История анимации" subtitle="Путешествие сквозь эпохи, стили и открытия" />
            <div className="ma-filters ma-filters--compact" role="group" aria-label="Фильтры хронологии">
                <div className="ma-filters__row">
                    <SimpleSelect label="Страна" value={query.country} all="Все страны" options={f?.countries} onChange={(v) => update('country', v)} />
                    <SimpleSelect label="Студия" value={query.studio} all="Все студии" options={f?.studios} onChange={(v) => update('studio', v)} />
                    <SimpleSelect label="Техника" value={query.technique} all="Любая техника" options={techniques} onChange={(v) => update('technique', v)} />
                    <Form.Group className="ma-select">
                        <Form.Label>Тип событий</Form.Label>
                        <Form.Select value={query.kind || ''} onChange={(e) => update('kind', e.target.value)}>
                            <option value="">Все события и фильмы</option>
                            <option value="film">Только мультфильмы</option>
                            {(data?.kinds || []).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </Form.Select>
                    </Form.Group>
                    <Button variant="link" className="ma-reset" disabled={!Object.keys(query).length} onClick={() => { setParams({}, { replace: true }); setSelected(null); }}>
                        <i className="bi bi-x-circle me-1" aria-hidden="true" />Сбросить фильтры
                    </Button>
                </div>
            </div>

            {data && (
                <nav className="ma-eras" aria-label="Эпохи">
                    {data.eras.map((e) => (
                        <button type="button" key={e.key} className={`ma-era ${era === e.key ? 'is-active' : ''}`}
                                disabled={!e.count} onClick={() => jump(e.key)} aria-current={era === e.key ? 'true' : undefined}>
                            <span className="ma-era__label">{e.label}</span>
                            <span className="ma-era__count">{e.count}</span>
                        </button>
                    ))}
                </nav>
            )}

            <OfflineNotice offline={timeline.offline} savedAt={timeline.savedAt} />
            {timeline.error && !data ? <ErrorState error={timeline.error} onRetry={timeline.reload} />
                : !data ? <PageSkeleton />
                : data.years.length === 0 ? (
                    <EmptyState icon="bi-hourglass" title="Ничего не найдено" text="Под выбранные условия событий нет. Попробуйте сбросить фильтры." />
                ) : (
                    <div className="ma-timeline-layout">
                        <ol className="ma-timeline" ref={listRef}>
                            {data.years.map((year, i) => {
                                const firstOfEra = i === 0 || data.years[i - 1].era !== year.era;
                                return (
                                    <li key={year.year} className="ma-tl-year" data-era={firstOfEra ? year.era : undefined}>
                                        {firstOfEra && <h2 className="ma-tl-era">{data.eras.find((e) => e.key === year.era)?.label}</h2>}
                                        <div className="ma-tl-year__mark"><span>{year.year}</span></div>
                                        <div className="ma-tl-year__entries">
                                            {year.events.map((e) => {
                                                const k = `e${e.id}`;
                                                return (
                                                    <div key={k}>
                                                        <button type="button" className={`ma-tl-event ${e.major ? 'is-major' : ''} ${selected === k ? 'is-selected' : ''}`}
                                                                aria-expanded={selected === k} onClick={() => select(k)}>
                                                            <i className={`bi ${KIND_ICONS[e.kind] || 'bi-flag'}`} aria-hidden="true" />
                                                            <span className="ma-tl-event__text">
                                                                <span className="ma-tl-event__kind">{e.kind_label}{e.major ? ' · ключевое событие' : ''}</span>
                                                                <strong>{e.title}</strong>
                                                            </span>
                                                        </button>
                                                        {selected === k && <div className="ma-tl-inline"><Detail entry={current} /></div>}
                                                    </div>
                                                );
                                            })}
                                            {year.films.length > 0 && (
                                                <div className="ma-tl-films">
                                                    {year.films.map((film) => {
                                                        const k = `f${film.slug}`;
                                                        return (
                                                            <div key={k} className="ma-tl-films__cell">
                                                                <button type="button" className={`ma-tl-film ${selected === k ? 'is-selected' : ''}`}
                                                                        aria-expanded={selected === k} onClick={() => select(k)}>
                                                                    <ArchiveImage src={film.poster?.thumb} alt="" ratio="thumb" />
                                                                    <span className="ma-tl-film__text">
                                                                        <strong>{film.title}</strong>
                                                                        <small>{film.studio?.name}</small>
                                                                    </span>
                                                                </button>
                                                                {selected === k && <div className="ma-tl-inline"><Detail entry={current} /></div>}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                );
                            })}
                        </ol>
                        <aside className="ma-tl-panel" aria-live="polite">
                            {current ? <Detail entry={current} onClose={() => setSelected(null)} /> : (
                                <div className="ma-tl-panel__hint">
                                    <i className="bi bi-hand-index" aria-hidden="true" />
                                    <p>Выберите событие или мультфильм на ленте, чтобы увидеть подробности.</p>
                                </div>
                            )}
                        </aside>
                    </div>
                )}
        </Page>
    );
}

function Detail({ entry, onClose }) {
    if (!entry) return null;
    if (entry.type === 'film') {
        return (
            <div className="ma-detail">
                {onClose && <button type="button" className="btn-close ma-detail__close" aria-label="Закрыть" onClick={onClose} />}
                <ArchiveImage src={entry.poster?.thumb} alt={`Постер: ${entry.title}`} />
                <p className="ma-kicker">{entry.year} · {countries(entry.countries)}</p>
                <h3 className="ma-h3">{entry.title}</h3>
                {entry.description && <p>{entry.description}</p>}
                <p className="ma-muted small">Студия: <Link to={`/studios/${entry.studio.slug}`}>{entry.studio.name}</Link></p>
                <div className="d-flex gap-2 flex-wrap">
                    <Link className="btn btn-danger btn-sm" to={`/film/${entry.slug}`}>Подробнее</Link>
                    <FavoriteButton film={entry} />
                </div>
            </div>
        );
    }
    return (
        <div className={`ma-detail ma-detail--event ${entry.major ? 'is-major' : ''}`}>
            {onClose && <button type="button" className="btn-close ma-detail__close" aria-label="Закрыть" onClick={onClose} />}
            <p className="ma-kicker">{entry.year} · {entry.kind_label}{entry.country ? ` · ${entry.country.name}` : ''}</p>
            <h3 className="ma-h3">{entry.title}</h3>
            <p>{entry.description}</p>
            {(entry.films.length > 0 || entry.studio) && (
                <ul className="ma-detail__links">
                    {entry.films.map((f) => <li key={f.slug}><i className="bi bi-film" aria-hidden="true" /><Link to={`/film/${f.slug}`}>{f.title}</Link></li>)}
                    {entry.studio && <li><i className="bi bi-building" aria-hidden="true" /><Link to={`/studios/${entry.studio.slug}`}>{entry.studio.name}</Link></li>}
                </ul>
            )}
        </div>
    );
}

function SimpleSelect({ label, value, all, options, onChange }) {
    return (
        <Form.Group className="ma-select">
            <Form.Label>{label}</Form.Label>
            <Form.Select value={value || ''} onChange={(e) => onChange(e.target.value)}>
                <option value="">{all}</option>
                {(options || []).map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
            </Form.Select>
        </Form.Group>
    );
}
