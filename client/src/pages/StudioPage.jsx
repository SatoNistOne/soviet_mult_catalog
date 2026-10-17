import { useState } from 'react';
import { Button } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import { FilmGrid } from '../components/FilmCard.jsx';
import { Page, SectionTitle } from '../components/Page.jsx';
import { ErrorState, OfflineNotice, PageSkeleton } from '../components/States.jsx';
import { api } from '../data/api.js';
import { useApi } from '../hooks/useApi.js';
import { filmsCount, paragraphs, studioYears } from '../lib/format.js';
import { StudioMark } from './StudiosPage.jsx';

export default function StudioPage() {
    const { slug } = useParams();
    const studio = useApi((signal) => api.studio(slug, { signal }), slug);
    const data = studio.data?.slug === slug ? studio.data : null;
    const crumbs = [{ to: '/studios', label: 'Студии' }, { label: data?.name || '…' }];
    if (studio.error && !data) return <Page title="Студия" crumbs={crumbs}><ErrorState error={studio.error} onRetry={studio.reload} /></Page>;
    if (!data) return <Page title="Студия" crumbs={crumbs}><PageSkeleton /></Page>;
    return (
        <Page title={data.name} crumbs={crumbs}>
            <OfflineNotice offline={studio.offline} savedAt={studio.savedAt} />
            <StudioView studio={data} />
        </Page>
    );
}

function StudioView({ studio }) {
    const [decade, setDecade] = useState(null);
    const [expanded, setExpanded] = useState(false);
    const decades = [...new Set(studio.films.map((f) => f.year - (f.year % 10)))].sort();
    const films = decade ? studio.films.filter((f) => f.year - (f.year % 10) === decade) : studio.films;
    const history = paragraphs(studio.history || studio.description);
    const byYear = studio.films.reduce((acc, f) => ((acc[f.year] ||= []).push(f), acc), {});

    return (
        <article className="ma-studio">
            <header className="ma-studio__head">
                <StudioMark studio={studio} size="lg" />
                <div>
                    <p className="ma-kicker">{[studio.country?.name, studio.city].filter(Boolean).join(' · ')}</p>
                    <h1 className="ma-h1">{studio.name}</h1>
                    <p className="ma-page-head__sub">{[studioYears(studio), `${filmsCount(studio.film_count)} в архиве`].filter(Boolean).join(' · ')}</p>
                    <p className="ma-film__lead">{studio.description}</p>
                </div>
            </header>

            <div className="ma-studio__grid">
                <section className="ma-section" aria-labelledby="studio-history">
                    <SectionTitle id="studio-history">История</SectionTitle>
                    <div className="ma-prose">
                        {(expanded ? history : history.slice(0, 2)).map((p, i) => <p key={i}>{p}</p>)}
                        {history.length > 2 && (
                            <Button variant="link" className="ma-more-link" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
                                {expanded ? 'Свернуть' : 'Читать полностью'}
                            </Button>
                        )}
                    </div>
                </section>
                <aside>
                    {studio.notable_creators.length > 0 && (
                        <section className="ma-section" aria-labelledby="studio-creators">
                            <SectionTitle id="studio-creators">Ключевые создатели</SectionTitle>
                            <ul className="ma-people">
                                {studio.notable_creators.map((p) => (
                                    <li key={p.slug}>
                                        <Link to={`/person/${p.slug}`}>{p.name}</Link>
                                        <span>{p.roles.join(', ').toLowerCase()} · {filmsCount(p.count)}</span>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}
                    {studio.milestones.length > 0 && (
                        <section className="ma-section" aria-labelledby="studio-milestones">
                            <SectionTitle id="studio-milestones">Важные вехи</SectionTitle>
                            <ol className="ma-milestones">
                                {studio.milestones.map((m) => (
                                    <li key={m.id} className={m.major ? 'is-major' : ''}>
                                        <span className="ma-milestones__year">{m.year}</span>
                                        <strong>{m.title}</strong>
                                        <p>{m.description}</p>
                                    </li>
                                ))}
                            </ol>
                        </section>
                    )}
                </aside>
            </div>

            <section className="ma-section" aria-labelledby="studio-films">
                <SectionTitle id="studio-films" count={studio.films.length}>Мультфильмы студии</SectionTitle>
                {decades.length > 1 && (
                    <div className="ma-decade-chips" role="group" aria-label="Десятилетие">
                        <button type="button" className={`ma-chip ${!decade ? 'is-active' : ''}`} aria-pressed={!decade} onClick={() => setDecade(null)}>Все</button>
                        {decades.map((d) => (
                            <button type="button" key={d} className={`ma-chip ${decade === d ? 'is-active' : ''}`} aria-pressed={decade === d} onClick={() => setDecade(d)}>{d}-е</button>
                        ))}
                    </div>
                )}
                <FilmGrid films={films} />
            </section>

            {studio.films.length > 1 && (
                <section className="ma-section" aria-labelledby="studio-chrono">
                    <SectionTitle id="studio-chrono">Хронология работ</SectionTitle>
                    <ol className="ma-chrono">
                        {Object.entries(byYear).map(([year, list]) => (
                            <li key={year}>
                                <span className="ma-chrono__year">{year}</span>
                                <span className="ma-chrono__films">
                                    {list.map((f, i) => <span key={f.slug}>{i > 0 && ', '}<Link to={`/film/${f.slug}`}>{f.title}</Link></span>)}
                                </span>
                            </li>
                        ))}
                    </ol>
                </section>
            )}
        </article>
    );
}
