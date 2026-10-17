import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import { restore, toggle, usePersonal } from '../store/personal.js';
import { useFeedback } from './Feedback.jsx';

export default function FavoriteButton({ film, variant = 'icon', className = '' }) {
    const { favorites } = usePersonal();
    const { notify } = useFeedback();
    const active = Boolean(favorites[film.slug]);

    const onClick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        const saved = favorites[film.slug];
        const added = toggle('favorites', film);
        notify(added
            ? { text: `«${film.title}» добавлен в избранное`, icon: 'bi-heart-fill', tone: 'accent' }
            : {
                text: `«${film.title}» удалён из избранного`, icon: 'bi-heart',
                action: { label: 'Вернуть', onClick: () => restore('favorites', saved) },
            });
    };

    const label = active ? 'Убрать из избранного' : 'В избранное';
    if (variant === 'full') {
        return (
            <button type="button" className={`btn ${active ? 'btn-danger' : 'btn-outline-danger'} ma-fav-full ${className}`}
                    aria-pressed={active} onClick={onClick}>
                <i className={`bi ${active ? 'bi-heart-fill' : 'bi-heart'} me-2`} aria-hidden="true" />{label}
            </button>
        );
    }
    return (
        <OverlayTrigger placement="left" overlay={<Tooltip>{label}</Tooltip>}>
            <button type="button" className={`ma-fav ${active ? 'is-active' : ''} ${className}`}
                    aria-pressed={active} aria-label={`${label}: ${film.title}`} onClick={onClick}>
                <i className={`bi ${active ? 'bi-heart-fill' : 'bi-heart'}`} aria-hidden="true" />
            </button>
        </OverlayTrigger>
    );
}
