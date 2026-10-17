import { useState } from 'react';
import { Button, Modal } from 'react-bootstrap';
import { Link, useParams } from 'react-router-dom';
import ArchiveImage from '../components/ArchiveImage.jsx';
import FavoriteButton from '../components/FavoriteButton.jsx';
import { useFeedback } from '../components/Feedback.jsx';
import { FilmRow, Page, SectionTitle } from '../components/Page.jsx';
import { ErrorState, OfflineNotice, PageSkeleton } from '../components/States.jsx';
import { api } from '../data/api.js';
import { useApi } from '../hooks/useApi.js';
import { archiveNo, countries, paragraphs, runtime } from '../lib/format.js';
import { toggle, usePersonal } from '../store/personal.js';

const CREW = ['director', 'writer', 'composer', 'artist'];

export default function FilmPage() {
    const { slug } = useParams();
    const film = useApi((signal) => api.film(slug, { signal }), slug);
    const data = film.data?.slug === slug ? film.data : null;
    const crumbs = [{ to: '/', label: 'Каталог' }, { label: data?.title || '…' }];

    if (film.error && !data) return <Page title="Мультфильм" crumbs={crumbs}><ErrorState error={film.error} onRetry={film.reload} /></Page>;
    if (!data) return <Page title="Мультфильм" crumbs={crumbs}><PageSkeleton /></Page>;
    return (
        <Page title={data.title} crumbs={crumbs}>
            <OfflineNotice offline={film.offline} savedAt={film.savedAt} />
            <FilmView film={data} />
        </Page>
    );
}

function FilmView({ film }) {
    const { watched } = usePersonal();
    const { notify } = useFeedback();
    const [viewer, setViewer] = useState(null);
    const images = [film.poster, ...film.frames].filter(Boolean);
    const genres = film.genres.filter((g) => g.kind !== 'technique');
    const techniques = film.genres.filter((g) => g.kind === 'technique');
    const crew = CREW.map((role) => {
        const list = film.credits.filter((c) => c.role === role);
        return list.length ? { role, label: list[0].role_label, people: list } : null;
    }).filter(Boolean);
    const voices = film.credits.filter((c) => c.role === 'voice');
    const isWatched = Boolean(watched[film.slug]);

    const sections = [
        ['about', 'О мультфильме', true],
        ['history', 'История создания', Boolean(film.history)],
        ['creators', 'Создатели', crew.length + voices.length > 0],
        ['gallery', 'Галерея', images.length > 0],
        ['facts', 'Интересные факты', film.facts.length + film.awards.length > 0],
        ['similar', 'Похожие мультфильмы', film.related.length > 0],
    ].filter(([, , show]) => show);

    const markWatched = () => {
        const on = toggle('watched', film);
        notify({ text: on ? 'Отмечено как просмотренное' : 'Отметка «Просмотрено» снята', icon: on ? 'bi-eye-fill' : 'bi-eye' });
    };

    return (
        <article className="ma-film">
            <section className="ma-film__hero">
                <button type="button" className="ma-film__poster" onClick={() => images.length && setViewer(0)}
                        disabled={!images.length} aria-label="Открыть постер крупно">
                    <ArchiveImage src={film.poster?.full || film.poster?.thumb} alt={`Постер мультфильма «${film.title}»`} />
                    <span className="ma-film__no">{archiveNo(film.id)}</span>
                </button>
                <div className="ma-film__info">
                    <p className="ma-kicker">{[film.year, countries(film.countries)].filter(Boolean).join(' · ')}</p>
                    <h1 className="ma-h1 ma-film__title">{film.title}</h1>
                    {film.original_title && <p className="ma-film__original" lang="und">{film.original_title}</p>}
                    {film.description && <p className="ma-film__lead">{film.description}</p>}
                    <dl className="ma-meta">
                        <div><dt>Год выпуска</dt><dd><Link to={`/?year_from=${film.year}&year_to=${film.year}`}>{film.year}</Link></dd></div>
                        <div><dt>Страна</dt><dd>{film.countries.map((c, i) => <span key={c.slug}>{i > 0 && ', '}<Link to={`/?country=${c.slug}`}>{c.name}</Link></span>)}</dd></div>
                        <div><dt>Студия</dt><dd><Link to={`/studios/${film.studio.slug}`}>{film.studio.name}</Link></dd></div>
                        {film.directors.length > 0 && (
                            <div><dt>Режиссёр</dt><dd>{film.directors.map((p, i) => <span key={p.slug}>{i > 0 && ', '}<Link to={`/person/${p.slug}`}>{p.name}</Link></span>)}</dd></div>
                        )}
                        {film.duration_min && <div><dt>Продолжительность</dt><dd>{runtime(film.duration_min)}</dd></div>}
                        {genres.length > 0 && <div><dt>Жанр</dt><dd>{genres.map((g, i) => <span key={g.slug}>{i > 0 && ', '}<Link to={`/?genre=${g.slug}`}>{g.name}</Link></span>)}</dd></div>}
                        {techniques.length > 0 && <div><dt>Техника</dt><dd>{techniques.map((g) => <Link key={g.slug} to={`/?technique=${g.slug}`}>{g.name}</Link>)}</dd></div>}
                    </dl>
                    <div className="ma-film__actions">
                        <FavoriteButton film={film} variant="full" />
                        <Button variant={isWatched ? 'dark' : 'outline-secondary'} aria-pressed={isWatched} onClick={markWatched}>
                            <i className={`bi ${isWatched ? 'bi-eye-fill' : 'bi-eye'} me-2`} aria-hidden="true" />
                            {isWatched ? 'Просмотрено' : 'Отметить просмотренным'}
                        </Button>
                        {film.video?.kind === 'external' && (
                            <a className="btn btn-outline-secondary" href={film.video.url} target="_blank" rel="noopener noreferrer">
                                <i className="bi bi-play-circle me-2" aria-hidden="true" />Смотреть
                            </a>
                        )}
                    </div>
                </div>
            </section>

            <nav className="ma-tabs" aria-label="Разделы страницы">
                {sections.map(([id, label]) => (
                    <a key={id} href={`#${id}`} className="ma-tabs__link"
                       onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                        {label}
                    </a>
                ))}
            </nav>

            <section className="ma-section" aria-labelledby="about">
                <SectionTitle id="about">О мультфильме</SectionTitle>
                <div className="ma-prose">
                    {paragraphs(film.summary || film.description).map((p, i) => <p key={i}>{p}</p>)}
                </div>
                {film.video?.kind === 'direct' && (
                    <video className="ma-player" controls preload="metadata" src={film.video.url} poster={film.poster?.full}>
                        Видео не поддерживается.
                    </video>
                )}
            </section>

            {film.history && (
                <section className="ma-section" aria-labelledby="history">
                    <SectionTitle id="history">История создания</SectionTitle>
                    <Expandable text={film.history} />
                </section>
            )}

            {crew.length + voices.length > 0 && (
                <section className="ma-section" aria-labelledby="creators">
                    <SectionTitle id="creators">Создатели</SectionTitle>
                    <div className="ma-creators">
                        {crew.map((group) => (
                            <div className="ma-creators__group" key={group.role}>
                                <h3 className="ma-label">{group.label}</h3>
                                {group.people.map((c) => <Link key={c.person.slug} to={`/person/${c.person.slug}`} className="ma-person"><i className="bi bi-person" aria-hidden="true" />{c.person.name}</Link>)}
                            </div>
                        ))}
                        {voices.length > 0 && (
                            <div className="ma-creators__group ma-creators__group--wide">
                                <h3 className="ma-label">Роли озвучивали</h3>
                                <ul className="ma-voices">
                                    {voices.map((c) => (
                                        <li key={`${c.person.slug}-${c.character}`}>
                                            <span className="ma-voices__role">{c.character || 'Роль'}</span>
                                            <Link to={`/person/${c.person.slug}`}>{c.person.name}</Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {images.length > 0 && (
                <section className="ma-section" aria-labelledby="gallery">
                    <SectionTitle id="gallery" count={images.length}>Галерея</SectionTitle>
                    <div className="ma-gallery">
                        {images.map((img, i) => (
                            <button type="button" key={img.id} className="ma-gallery__item" onClick={() => setViewer(i)}
                                    aria-label={`Открыть изображение ${i + 1}${img.caption ? `: ${img.caption}` : ''}`}>
                                <ArchiveImage src={img.thumb} alt={img.caption || `${film.title}, изображение ${i + 1}`} ratio={i === 0 ? 'poster' : 'frame'} />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            {film.facts.length + film.awards.length > 0 && (
                <section className="ma-section" aria-labelledby="facts">
                    <SectionTitle id="facts">Интересные факты</SectionTitle>
                    <div className="ma-facts">
                        {film.awards.map((a) => (
                            <div className="ma-fact ma-fact--award" key={a.title}>
                                <i className="bi bi-award" aria-hidden="true" />
                                <span className="ma-fact__year">{a.year}</span>
                                <p>{a.title}</p>
                            </div>
                        ))}
                        {film.facts.map((fact, i) => (
                            <div className="ma-fact" key={i}>
                                <span className="ma-fact__no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                                <p>{fact}</p>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {film.series_films.length > 0 && (
                <section className="ma-section" aria-labelledby="series">
                    <SectionTitle id="series">Серия «{film.series.name}»</SectionTitle>
                    <FilmRow films={film.series_films} label={`Серия ${film.series.name}`} />
                </section>
            )}
            {film.related.length > 0 && (
                <section className="ma-section" aria-labelledby="similar">
                    <SectionTitle id="similar">Похожие мультфильмы</SectionTitle>
                    <FilmRow films={film.related} label="Похожие мультфильмы" />
                </section>
            )}

            <Lightbox images={images} index={viewer} title={film.title} onChange={setViewer} />
        </article>
    );
}

function Expandable({ text, limit = 3 }) {
    const [open, setOpen] = useState(false);
    const parts = paragraphs(text);
    const shown = open ? parts : parts.slice(0, limit);
    return (
        <div className="ma-prose">
            {shown.map((p, i) => <p key={i}>{p}</p>)}
            {parts.length > limit && (
                <Button variant="link" className="ma-more-link" aria-expanded={open} onClick={() => setOpen(!open)}>
                    {open ? 'Свернуть' : 'Читать полностью'}<i className={`bi ${open ? 'bi-chevron-up' : 'bi-chevron-down'} ms-1`} aria-hidden="true" />
                </Button>
            )}
        </div>
    );
}

function Lightbox({ images, index, title, onChange }) {
    const show = index !== null && images.length > 0;
    const image = show ? images[index] : null;
    const go = (step) => onChange((index + step + images.length) % images.length);
    const onKey = (e) => {
        if (e.key === 'ArrowLeft') go(-1);
        if (e.key === 'ArrowRight') go(1);
    };
    return (
        <Modal show={show} onHide={() => onChange(null)} size="xl" centered className="ma-lightbox" onKeyDown={onKey}>
            <Modal.Header closeButton closeLabel="Закрыть" closeVariant="white">
                <Modal.Title as="h2">{title} <span className="ma-lightbox__count">{show ? `${index + 1} из ${images.length}` : ''}</span></Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {image && <ArchiveImage key={image.id} src={image.full || image.thumb} alt={image.caption || title} ratio="free" fit="contain" />}
                {images.length > 1 && (
                    <>
                        <button type="button" className="ma-lightbox__nav ma-lightbox__nav--prev" aria-label="Предыдущее изображение" onClick={() => go(-1)}><i className="bi bi-chevron-left" /></button>
                        <button type="button" className="ma-lightbox__nav ma-lightbox__nav--next" aria-label="Следующее изображение" onClick={() => go(1)}><i className="bi bi-chevron-right" /></button>
                    </>
                )}
            </Modal.Body>
            {image && (image.caption || image.author) && (
                <Modal.Footer className="ma-lightbox__caption">
                    {[image.caption, image.author, image.license].filter(Boolean).join(' · ')}
                </Modal.Footer>
            )}
        </Modal>
    );
}
