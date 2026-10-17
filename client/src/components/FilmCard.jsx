import { Link } from 'react-router-dom';
import { archiveNo, countries, runtime } from '../lib/format.js';
import { usePersonal } from '../store/personal.js';
import ArchiveImage from './ArchiveImage.jsx';
import FavoriteButton from './FavoriteButton.jsx';

export default function FilmCard({ film, layout = 'grid', note }) {
    const { watched } = usePersonal();
    const meta = [film.year, countries(film.countries), film.studio?.name].filter(Boolean).join(' · ');
    return (
        <article className={`ma-card ma-card--${layout}`}>
            <Link to={`/film/${film.slug}`} className="ma-card__link" aria-label={`${film.title}, ${film.year}`}>
                <span className="ma-card__media">
                    <ArchiveImage src={film.poster?.thumb} alt={`Постер: ${film.title}`} />
                    <span className="ma-card__overlay" aria-hidden="true">
                        <span className="ma-card__more">Подробнее <i className="bi bi-arrow-right" /></span>
                    </span>
                    {film.id != null && <span className="ma-card__no" aria-hidden="true">{archiveNo(film.id)}</span>}
                    {watched[film.slug] && (
                        <span className="ma-card__seen" title="Просмотрено"><i className="bi bi-eye-fill" aria-hidden="true" /><span className="visually-hidden">Просмотрено</span></span>
                    )}
                </span>
                <span className="ma-card__body">
                    <span className="ma-card__title">{film.title}</span>
                    {film.original_title && <span className="ma-card__original" lang="und">{film.original_title}</span>}
                    <span className="ma-card__meta">{meta}</span>
                    {(film.duration_min || film.techniques?.length > 0 || note) && (
                        <span className="ma-card__tags">
                            {film.duration_min ? <span className="ma-badge"><i className="bi bi-clock me-1" aria-hidden="true" />{runtime(film.duration_min)}</span> : null}
                            {film.techniques?.slice(0, 1).map((t) => <span className="ma-badge ma-badge--slate" key={t}>{t}</span>)}
                            {note && <span className="ma-badge ma-badge--note">{note}</span>}
                        </span>
                    )}
                    {layout === 'list' && film.description && <span className="ma-card__desc">{film.description}</span>}
                </span>
            </Link>
            <FavoriteButton film={film} className="ma-card__fav" />
        </article>
    );
}

export function FilmGrid({ films, layout = 'grid', notes }) {
    return (
        <div className={layout === 'list' ? 'ma-list' : 'ma-grid'}>
            {films.map((film) => <FilmCard key={film.slug} film={film} layout={layout} note={notes?.[film.slug]} />)}
        </div>
    );
}
