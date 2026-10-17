import { useMemo, useState } from 'react';
import { Button, Form, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { FilmGrid } from '../components/FilmCard.jsx';
import { useFeedback } from '../components/Feedback.jsx';
import { Page, PageHeader } from '../components/Page.jsx';
import { EmptyState } from '../components/States.jsx';
import { filmsCount } from '../lib/format.js';
import { clear, usePersonal } from '../store/personal.js';

const SORTS = {
    added: ['Недавно добавленные', (a, b) => b.addedAt - a.addedAt],
    '-year': ['Сначала новые', (a, b) => b.year - a.year],
    year: ['Сначала старые', (a, b) => a.year - b.year],
    title: ['По названию', (a, b) => a.title.localeCompare(b.title, 'ru')],
};

export default function FavoritesPage() {
    const { favorites } = usePersonal();
    const { confirm, notify } = useFeedback();
    const [view, setView] = useState('grid');
    const [sort, setSort] = useState('added');
    const [quick, setQuick] = useState({ studio: '', country: '', decade: '' });
    const all = Object.values(favorites);

    const options = useMemo(() => {
        const studios = new Map();
        const countriesMap = new Map();
        const decades = new Set();
        for (const f of all) {
            if (f.studio) studios.set(f.studio.slug, f.studio.name);
            for (const c of f.countries || []) countriesMap.set(c.slug, c.name);
            decades.add(f.year - (f.year % 10));
        }
        return { studios: [...studios], countries: [...countriesMap], decades: [...decades].sort() };
    }, [all]);

    const films = all
        .filter((f) => !quick.studio || f.studio?.slug === quick.studio)
        .filter((f) => !quick.country || (f.countries || []).some((c) => c.slug === quick.country))
        .filter((f) => !quick.decade || f.year - (f.year % 10) === Number(quick.decade))
        .sort(SORTS[sort][1]);

    const clearAll = async () => {
        const ok = await confirm({
            title: 'Очистить избранное?',
            text: `Из коллекции будут удалены все ${filmsCount(all.length)}. Это действие нельзя отменить.`,
            confirmLabel: 'Очистить',
        });
        if (ok) {
            clear('favorites');
            notify({ text: 'Избранное очищено', icon: 'bi-trash' });
        }
    };

    return (
        <Page title="Избранное">
            <PageHeader title="Избранное" subtitle="Ваша личная коллекция анимационной классики">
                <span className="ma-counter"><strong>{all.length}</strong> {filmsCount(all.length).replace(/^\d+ /, '')}</span>
            </PageHeader>
            {all.length === 0 ? (
                <EmptyState icon="bi-heart" title="Здесь пока пусто"
                            text="Добавляйте мультфильмы в избранное, чтобы возвращаться к ним в любое время."
                            action={<Link to="/" className="btn btn-danger">Перейти в каталог</Link>} />
            ) : (
                <>
                    <div className="ma-results-bar ma-results-bar--tools">
                        <div className="ma-quick" role="group" aria-label="Быстрые фильтры">
                            <Form.Select size="sm" aria-label="Студия" value={quick.studio} onChange={(e) => setQuick({ ...quick, studio: e.target.value })}>
                                <option value="">Все студии</option>
                                {options.studios.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
                            </Form.Select>
                            <Form.Select size="sm" aria-label="Страна" value={quick.country} onChange={(e) => setQuick({ ...quick, country: e.target.value })}>
                                <option value="">Все страны</option>
                                {options.countries.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
                            </Form.Select>
                            <Form.Select size="sm" aria-label="Десятилетие" value={quick.decade} onChange={(e) => setQuick({ ...quick, decade: e.target.value })}>
                                <option value="">Все десятилетия</option>
                                {options.decades.map((d) => <option key={d} value={d}>{d}-е</option>)}
                            </Form.Select>
                            <Form.Select size="sm" aria-label="Сортировка" value={sort} onChange={(e) => setSort(e.target.value)}>
                                {Object.entries(SORTS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
                            </Form.Select>
                        </div>
                        <div className="d-flex gap-2">
                            <div className="btn-group" role="group" aria-label="Вид списка">
                                {[['grid', 'bi-grid-3x2-gap', 'Сетка'], ['list', 'bi-list-ul', 'Список']].map(([value, icon, text]) => (
                                    <OverlayTrigger key={value} overlay={<Tooltip>{text}</Tooltip>}>
                                        <Button variant={view === value ? 'dark' : 'outline-secondary'} size="sm" aria-label={text}
                                                aria-pressed={view === value} onClick={() => setView(value)}>
                                            <i className={`bi ${icon}`} aria-hidden="true" />
                                        </Button>
                                    </OverlayTrigger>
                                ))}
                            </div>
                            <Button variant="outline-danger" size="sm" onClick={clearAll}><i className="bi bi-trash me-1" aria-hidden="true" />Очистить</Button>
                        </div>
                    </div>
                    {films.length ? <FilmGrid films={films} layout={view} /> : (
                        <EmptyState icon="bi-funnel" title="Ничего не найдено" text="Под выбранные фильтры в коллекции нет мультфильмов."
                                    action={<Button variant="outline-dark" onClick={() => setQuick({ studio: '', country: '', decade: '' })}>Сбросить фильтры</Button>} />
                    )}
                </>
            )}
        </Page>
    );
}
