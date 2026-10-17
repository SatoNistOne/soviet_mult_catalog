import { Button, Placeholder } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { savedAtLabel } from '../lib/format.js';

export function EmptyState({ title, text, action, icon = 'bi-archive' }) {
    return (
        <div className="ma-state">
            <div className="ma-state__art" aria-hidden="true">
                <span className="ma-state__reel"><i className={`bi ${icon}`} /></span>
                <span className="ma-state__strip" />
            </div>
            <h2 className="ma-state__title">{title}</h2>
            {text && <p className="ma-state__text">{text}</p>}
            {action}
        </div>
    );
}

export function ErrorState({ error, onRetry }) {
    const offline = !error?.status;
    const notFound = error?.status === 404;
    return (
        <EmptyState
            icon={offline ? 'bi-wifi-off' : notFound ? 'bi-question-circle' : 'bi-exclamation-triangle'}
            title={offline ? 'Нет связи с архивом' : notFound ? 'Не найдено' : 'Что-то пошло не так'}
            text={offline
                ? 'Сервер архива недоступен, а эта страница ещё не сохранена для работы без сети. Проверьте, что сервер запущен и устройство в той же сети.'
                : notFound ? 'Такой записи в архиве нет.' : error?.message}
            action={
                <div className="d-flex gap-2 justify-content-center flex-wrap">
                    {!notFound && onRetry && <Button variant="danger" onClick={onRetry}><i className="bi bi-arrow-clockwise me-2" />Повторить</Button>}
                    <Link className="btn btn-outline-secondary" to="/">В каталог</Link>
                </div>
            }
        />
    );
}

export function OfflineNotice({ offline, savedAt }) {
    if (!offline) return null;
    return (
        <div className="ma-offline" role="status">
            <i className="bi bi-cloud-slash" aria-hidden="true" />
            <span><strong>Нет связи с сервером.</strong> Показаны сохранённые данные{savedAt ? ` от ${savedAtLabel(savedAt)}` : ''}.</span>
        </div>
    );
}

export function CardSkeletons({ count = 8 }) {
    return (
        <div className="ma-grid" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <div className="ma-card ma-card--skeleton" key={i}>
                    <span className="ma-frame ma-frame--poster"><span className="ma-frame__placeholder" /></span>
                    <div className="ma-card__body">
                        <Placeholder as="div" animation="glow"><Placeholder xs={9} /></Placeholder>
                        <Placeholder as="div" animation="glow"><Placeholder xs={6} size="sm" /></Placeholder>
                    </div>
                </div>
            ))}
        </div>
    );
}

export function PageSkeleton() {
    return (
        <div className="ma-page-skeleton" role="status" aria-label="Загрузка">
            <Placeholder as="div" animation="glow"><Placeholder xs={5} size="lg" /></Placeholder>
            <Placeholder as="div" animation="glow"><Placeholder xs={8} /></Placeholder>
            <CardSkeletons count={4} />
        </div>
    );
}
