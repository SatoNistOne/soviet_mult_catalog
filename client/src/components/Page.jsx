import { useEffect, useRef, useState } from 'react';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import FilmCard from './FilmCard.jsx';
import { TopBar } from './Shell.jsx';

export function Page({ title, crumbs, children, wide = false }) {
    const heading = useRef(null);
    useEffect(() => {
        document.title = title ? `${title} — Мультархив` : 'Мультархив';
    }, [title]);
    return (
        <>
            <TopBar title={title} crumbs={crumbs} />
            <main className={`ma-content ${wide ? 'ma-content--wide' : ''}`} id="content" ref={heading} tabIndex={-1}>
                {children}
            </main>
        </>
    );
}

export function PageHeader({ title, subtitle, children, kicker }) {
    return (
        <header className="ma-page-head">
            <div className="ma-page-head__text">
                {kicker && <p className="ma-kicker">{kicker}</p>}
                <h1 className="ma-h1">{title}</h1>
                {subtitle && <p className="ma-page-head__sub">{subtitle}</p>}
            </div>
            {children && <div className="ma-page-head__aside">{children}</div>}
        </header>
    );
}

export function SectionTitle({ id, children, count }) {
    return (
        <h2 className="ma-h2" id={id}>
            <span>{children}</span>
            {count != null && <span className="ma-h2__count">{count}</span>}
        </h2>
    );
}

export function FilmRow({ films, label }) {
    const track = useRef(null);
    const [edges, setEdges] = useState({ start: true, end: false });
    const update = () => {
        const el = track.current;
        if (!el) return;
        setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
    };
    useEffect(update, [films]);
    const scroll = (dir) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });
    return (
        <div className="ma-row">
            <div className="ma-row__track" ref={track} onScroll={update} role="list" aria-label={label}>
                {films.map((film) => <div role="listitem" key={film.slug} className="ma-row__item"><FilmCard film={film} /></div>)}
            </div>
            {!edges.start && (
                <OverlayTrigger overlay={<Tooltip>Назад</Tooltip>}>
                    <button type="button" className="ma-row__btn ma-row__btn--prev" aria-label="Прокрутить назад" onClick={() => scroll(-1)}>
                        <i className="bi bi-chevron-left" aria-hidden="true" />
                    </button>
                </OverlayTrigger>
            )}
            {!edges.end && (
                <OverlayTrigger overlay={<Tooltip>Дальше</Tooltip>}>
                    <button type="button" className="ma-row__btn ma-row__btn--next" aria-label="Прокрутить вперёд" onClick={() => scroll(1)}>
                        <i className="bi bi-chevron-right" aria-hidden="true" />
                    </button>
                </OverlayTrigger>
            )}
        </div>
    );
}
