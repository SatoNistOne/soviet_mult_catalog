import { useEffect, useRef, useState } from 'react';
import { Button, Modal, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../data/api.js';
import { cacheClear, cacheStats } from '../data/cache.js';
import { API_BASE } from '../data/config.js';
import { setTheme, usePersonal } from '../store/personal.js';
import ArchiveImage from './ArchiveImage.jsx';
import { useFeedback } from './Feedback.jsx';

const NAV = [
    { to: '/', label: 'Каталог', icon: 'bi-grid-3x3-gap', end: true },
    { to: '/timeline', label: 'Хронология', icon: 'bi-hourglass-split' },
    { to: '/favorites', label: 'Избранное', icon: 'bi-heart' },
    { to: '/studios', label: 'Студии', icon: 'bi-building' },
];

export function Logo() {
    return (
        <svg className="ma-logo__mark" viewBox="0 0 40 40" aria-hidden="true">
            <rect x="1.5" y="1.5" width="37" height="37" rx="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="20" cy="20" r="11" fill="none" stroke="var(--ma-red)" strokeWidth="3" />
            <circle cx="20" cy="13.5" r="2.4" fill="currentColor" /><circle cx="20" cy="26.5" r="2.4" fill="currentColor" />
            <circle cx="13.5" cy="20" r="2.4" fill="currentColor" /><circle cx="26.5" cy="20" r="2.4" fill="currentColor" />
            <circle cx="20" cy="20" r="2" fill="var(--ma-red)" />
            {[7, 14, 21, 28].map((y) => <rect key={y} x="4.5" y={y + 1} width="2.5" height="3" rx="0.6" fill="currentColor" opacity="0.55" />)}
            {[7, 14, 21, 28].map((y) => <rect key={`r${y}`} x="33" y={y + 1} width="2.5" height="3" rx="0.6" fill="currentColor" opacity="0.55" />)}
        </svg>
    );
}

function RailTip({ show, label, children }) {
    if (!show) return children;
    return <OverlayTrigger placement="right" overlay={<Tooltip>{label}</Tooltip>}>{children}</OverlayTrigger>;
}

export function Sidebar({ rail, onToggle }) {
    const { favorites } = usePersonal();
    const favCount = Object.keys(favorites).length;
    const toggleLabel = rail ? 'Развернуть меню' : 'Свернуть меню';
    return (
        <aside className="ma-sidebar" id="ma-sidebar" aria-label="Основная навигация">
            <div className="ma-sidebar__top">
                <Link to="/" className="ma-logo" aria-label="Мультархив — на главную">
                    <Logo />
                    <span className="ma-logo__text">Мульт<span>архив</span></span>
                </Link>
                <OverlayTrigger placement="right" overlay={<Tooltip>{toggleLabel} (Ctrl+B)</Tooltip>}>
                    <button type="button" className="ma-collapse" onClick={onToggle} aria-label={toggleLabel}
                            aria-expanded={!rail} aria-controls="ma-sidebar">
                        <i className={`bi ${rail ? 'bi-chevron-double-right' : 'bi-chevron-double-left'}`} aria-hidden="true" />
                    </button>
                </OverlayTrigger>
            </div>
            <nav>
                <ul className="ma-nav">
                    {NAV.map((item) => (
                        <li key={item.to}>
                            <RailTip show={rail} label={item.label}>
                                <NavLink to={item.to} end={item.end} className="ma-nav__link">
                                    <i className={`bi ${item.icon}`} aria-hidden="true" />
                                    <span className="ma-nav__label">{item.label}</span>
                                    {item.to === '/favorites' && favCount > 0 && (
                                        <span className="ma-nav__count" aria-label={`в избранном: ${favCount}`}>{favCount}</span>
                                    )}
                                </NavLink>
                            </RailTip>
                        </li>
                    ))}
                </ul>
            </nav>
            <div className="ma-sidebar__footer">
                <span className="ma-filmstrip" aria-hidden="true" />
                <span className="ma-sidebar__version">Версия 1.0<span> · Фонд № 1</span></span>
            </div>
        </aside>
    );
}

function SearchBox() {
    const navigate = useNavigate();
    const location = useLocation();
    const input = useRef(null);
    const [q, setQ] = useState('');
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState(null);
    const [active, setActive] = useState(-1);

    useEffect(() => {
        const onKey = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                input.current?.focus();
                input.current?.select();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    useEffect(() => {
        setOpen(false);
        setQ('');
    }, [location.pathname]);

    useEffect(() => {
        const term = q.trim();
        if (term.length < 2) {
            setResults(null);
            return undefined;
        }
        const controller = new AbortController();
        const timer = setTimeout(() => {
            api.suggest(term, { signal: controller.signal })
                .then(({ data }) => { setResults(data); setActive(-1); setOpen(true); })
                .catch(() => {});
        }, 160);
        return () => { clearTimeout(timer); controller.abort(); };
    }, [q]);

    const items = results ? [
        ...results.films.map((f) => ({ key: `f${f.slug}`, group: 'Мультфильмы', to: `/film/${f.slug}`, film: f })),
        ...results.studios.map((s) => ({ key: `s${s.slug}`, group: 'Студии', to: `/studios/${s.slug}`, label: s.name, icon: 'bi-building' })),
        ...results.persons.map((p) => ({ key: `p${p.slug}`, group: 'Режиссёры и авторы', to: `/person/${p.slug}`, label: p.name, icon: 'bi-person' })),
    ] : [];
    const showAll = { key: 'all', to: `/?q=${encodeURIComponent(q.trim())}`, label: `Все результаты по запросу «${q.trim()}»`, icon: 'bi-search' };
    const options = q.trim().length >= 2 ? [...items, showAll] : [];

    const go = (item) => {
        setOpen(false);
        navigate(item.to);
        input.current?.blur();
    };

    const onKeyDown = (event) => {
        if (event.key === 'ArrowDown') { event.preventDefault(); setOpen(true); setActive((i) => Math.min(i + 1, options.length - 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
        else if (event.key === 'Enter' && options.length) { event.preventDefault(); go(options[active >= 0 ? active : options.length - 1]); }
        else if (event.key === 'Escape') { setOpen(false); input.current?.blur(); }
    };

    let lastGroup = null;
    return (
        <div className="ma-search" role="search">
            <i className="bi bi-search ma-search__icon" aria-hidden="true" />
            <label htmlFor="global-search" className="visually-hidden">Глобальный поиск</label>
            <input ref={input} id="global-search" type="search" className="form-control ma-search__input"
                   placeholder="Поиск мультфильмов, студий и режиссёров..." value={q} autoComplete="off"
                   role="combobox" aria-expanded={open && options.length > 0} aria-controls="global-search-list"
                   aria-activedescendant={active >= 0 ? `gs-${active}` : undefined}
                   onChange={(e) => setQ(e.target.value)} onFocus={() => results && setOpen(true)}
                   onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={onKeyDown} />
            <kbd className="ma-search__kbd" aria-hidden="true">Ctrl K</kbd>
            {open && options.length > 0 && (
                <ul id="global-search-list" className="ma-search__list" role="listbox">
                    {items.length === 0 && <li className="ma-search__none">Ничего не найдено</li>}
                    {options.map((item, i) => {
                        const header = item.group && item.group !== lastGroup ? item.group : null;
                        lastGroup = item.group || lastGroup;
                        return (
                            <li key={item.key} role="presentation">
                                {header && <div className="ma-search__group">{header}</div>}
                                <div id={`gs-${i}`} role="option" aria-selected={i === active}
                                     className={`ma-search__item ${i === active ? 'is-active' : ''} ${item.key === 'all' ? 'is-all' : ''}`}
                                     onMouseDown={(e) => { e.preventDefault(); go(item); }} onMouseEnter={() => setActive(i)}>
                                    {item.film ? (
                                        <>
                                            <ArchiveImage src={item.film.poster?.thumb} alt="" ratio="thumb" />
                                            <span className="ma-search__text">
                                                <strong>{item.film.title}</strong>
                                                <small>{[item.film.year, item.film.studio?.name].join(' · ')}</small>
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <i className={`bi ${item.icon} ma-search__item-icon`} aria-hidden="true" />
                                            <span className="ma-search__text"><strong>{item.label}</strong></span>
                                        </>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function SettingsModal({ show, onHide }) {
    const { theme } = usePersonal();
    const { confirm, notify } = useFeedback();
    const [status, setStatus] = useState(null);
    const [stats, setStats] = useState({ api: 0, img: 0 });

    useEffect(() => {
        if (!show) return;
        setStatus('checking');
        api.ping().then(() => setStatus('online')).catch(() => setStatus('offline'));
        cacheStats().then(setStats);
    }, [show]);

    const clearCache = async () => {
        const ok = await confirm({
            title: 'Очистить сохранённые данные?',
            text: 'Страницы и изображения, сохранённые для работы без сети, будут удалены. Избранное останется.',
            confirmLabel: 'Очистить',
        });
        if (!ok) return;
        await cacheClear();
        setStats(await cacheStats());
        notify({ text: 'Сохранённые данные очищены', icon: 'bi-trash' });
    };

    return (
        <Modal show={show} onHide={onHide} centered className="ma-modal">
            <Modal.Header closeButton closeLabel="Закрыть"><Modal.Title as="h2">Настройки</Modal.Title></Modal.Header>
            <Modal.Body>
                <section className="mb-4">
                    <h3 className="ma-label">Оформление</h3>
                    <div className="btn-group w-100" role="group" aria-label="Тема">
                        {[['light', 'Светлая', 'bi-sun'], ['dark', 'Тёмная', 'bi-moon-stars']].map(([value, label, icon]) => (
                            <Button key={value} variant={theme === value ? 'dark' : 'outline-secondary'} aria-pressed={theme === value}
                                    onClick={() => setTheme(value)}>
                                <i className={`bi ${icon} me-2`} aria-hidden="true" />{label}
                            </Button>
                        ))}
                    </div>
                </section>
                <section className="mb-4">
                    <h3 className="ma-label">Сервер архива</h3>
                    <p className="ma-server">
                        <span className={`ma-dot ma-dot--${status}`} aria-hidden="true" />
                        {status === 'online' ? 'Подключено' : status === 'offline' ? 'Нет связи — работаем с сохранёнными данными' : 'Проверяем…'}
                    </p>
                    <p className="ma-muted small mb-0">Адрес задаётся при сборке приложения: <code>{API_BASE.replace(/\/api$/, '')}</code></p>
                </section>
                <section>
                    <h3 className="ma-label">Работа без сети</h3>
                    <p className="ma-muted small">Сохранено страниц: {stats.api}, изображений: {stats.img}.</p>
                    <Button variant="outline-danger" size="sm" onClick={clearCache}><i className="bi bi-trash me-2" />Очистить сохранённое</Button>
                </section>
            </Modal.Body>
        </Modal>
    );
}

export function TopBar({ title, crumbs }) {
    const [settings, setSettings] = useState(false);
    const navigate = useNavigate();
    const { notify } = useFeedback();

    const random = async () => {
        try {
            const { data } = await api.random();
            navigate(`/film/${data.slug}`);
        } catch {
            notify({ text: 'Не удалось выбрать мультфильм: нет связи с сервером', icon: 'bi-wifi-off' });
        }
    };

    return (
        <header className="ma-topbar">
            <div className="ma-topbar__title">
                {crumbs?.length ? (
                    <nav aria-label="Навигационная цепочка">
                        <ol className="ma-crumbs">
                            {crumbs.map((c, i) => (
                                <li key={i}>{c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}</li>
                            ))}
                        </ol>
                    </nav>
                ) : <span className="ma-topbar__page">{title}</span>}
            </div>
            <SearchBox />
            <div className="ma-topbar__actions">
                <OverlayTrigger placement="bottom" overlay={<Tooltip>Случайный мультфильм</Tooltip>}>
                    <button type="button" className="ma-icon-btn" aria-label="Случайный мультфильм" onClick={random}>
                        <i className="bi bi-shuffle" aria-hidden="true" />
                    </button>
                </OverlayTrigger>
                <OverlayTrigger placement="bottom" overlay={<Tooltip>Настройки</Tooltip>}>
                    <button type="button" className="ma-icon-btn" aria-label="Настройки" onClick={() => setSettings(true)}>
                        <i className="bi bi-gear" aria-hidden="true" />
                    </button>
                </OverlayTrigger>
            </div>
            <SettingsModal show={settings} onHide={() => setSettings(false)} />
        </header>
    );
}
