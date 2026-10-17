import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { HashRouter, Link, Route, Routes, useLocation } from 'react-router-dom';
import { FeedbackProvider } from './components/Feedback.jsx';
import { Page } from './components/Page.jsx';
import { Sidebar } from './components/Shell.jsx';
import { EmptyState } from './components/States.jsx';
import CatalogPage from './pages/CatalogPage.jsx';
import FavoritesPage from './pages/FavoritesPage.jsx';
import FilmPage from './pages/FilmPage.jsx';
import PersonPage from './pages/PersonPage.jsx';
import StudioPage from './pages/StudioPage.jsx';
import StudiosPage from './pages/StudiosPage.jsx';
import TimelinePage from './pages/TimelinePage.jsx';
import { setSidebarCollapsed, usePersonal } from './store/personal.js';

function ScrollToTop() {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo(0, 0);
        document.getElementById('content')?.focus({ preventScroll: true });
    }, [pathname]);
    return null;
}

const NARROW = '(max-width: 991.98px)';
function useNarrow() {
    return useSyncExternalStore(
        (cb) => { const mq = window.matchMedia(NARROW); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
        () => window.matchMedia(NARROW).matches,
    );
}

function Shell({ children }) {
    const { sidebarCollapsed } = usePersonal();
    const narrow = useNarrow();
    const [overlay, setOverlay] = useState(false);
    const { pathname } = useLocation();
    const rail = narrow ? !overlay : sidebarCollapsed;

    useEffect(() => setOverlay(false), [pathname, narrow]);
    const toggle = useCallback(() => {
        if (narrow) setOverlay((v) => !v);
        else setSidebarCollapsed(!sidebarCollapsed);
    }, [narrow, sidebarCollapsed]);
    useEffect(() => {
        const onKey = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') { e.preventDefault(); toggle(); }
            if (e.key === 'Escape' && overlay) setOverlay(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [toggle, overlay]);

    return (
        <div className={`ma-app ${rail ? 'is-rail' : ''} ${narrow && overlay ? 'is-overlay' : ''}`}>
            <Sidebar rail={rail} onToggle={toggle} />
            {narrow && overlay && <button type="button" className="ma-backdrop" aria-label="Закрыть меню" onClick={() => setOverlay(false)} />}
            <div className="ma-main">{children}</div>
        </div>
    );
}

function NotFound() {
    return (
        <Page title="Страница не найдена">
            <EmptyState icon="bi-signpost-split" title="Страница не найдена" text="Такого раздела в архиве нет."
                        action={<Link to="/" className="btn btn-danger">Перейти в каталог</Link>} />
        </Page>
    );
}

export default function App() {
    const { theme } = usePersonal();
    useEffect(() => {
        document.documentElement.dataset.bsTheme = theme;
    }, [theme]);

    return (
        <HashRouter>
            <FeedbackProvider>
                <a className="ma-skip" href="#content" onClick={(e) => { e.preventDefault(); document.getElementById('content')?.focus(); }}>
                    К содержимому
                </a>
                <ScrollToTop />
                <Shell>
                    <Routes>
                        <Route path="/" element={<CatalogPage />} />
                        <Route path="/timeline" element={<TimelinePage />} />
                        <Route path="/favorites" element={<FavoritesPage />} />
                        <Route path="/studios" element={<StudiosPage />} />
                        <Route path="/studios/:slug" element={<StudioPage />} />
                        <Route path="/film/:slug" element={<FilmPage />} />
                        <Route path="/person/:slug" element={<PersonPage />} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Shell>
            </FeedbackProvider>
        </HashRouter>
    );
}
