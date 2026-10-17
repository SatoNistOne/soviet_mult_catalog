import { Link, useParams } from 'react-router-dom';
import { FilmGrid } from '../components/FilmCard.jsx';
import { Page, PageHeader, SectionTitle } from '../components/Page.jsx';
import { ErrorState, OfflineNotice, PageSkeleton } from '../components/States.jsx';
import { api } from '../data/api.js';
import { useApi } from '../hooks/useApi.js';
import { lifespan } from '../lib/format.js';

export default function PersonPage() {
    const { slug } = useParams();
    const person = useApi((signal) => api.person(slug, { signal }), slug);
    const data = person.data?.slug === slug ? person.data : null;
    const crumbs = [{ to: '/', label: 'Каталог' }, { label: data?.name || '…' }];
    if (person.error && !data) return <Page title="Персона" crumbs={crumbs}><ErrorState error={person.error} onRetry={person.reload} /></Page>;
    if (!data) return <Page title="Персона" crumbs={crumbs}><PageSkeleton /></Page>;
    return (
        <Page title={data.name} crumbs={crumbs}>
            <OfflineNotice offline={person.offline} savedAt={person.savedAt} />
            <PageHeader kicker="Персона" title={data.name} subtitle={lifespan(data)}>
                <Link to={`/?person=${data.slug}`} className="btn btn-outline-dark">Все работы в каталоге</Link>
            </PageHeader>
            {data.bio && <p className="ma-film__lead">{data.bio}</p>}
            {data.roles.map((group) => (
                <section className="ma-section" key={group.role} aria-labelledby={`role-${group.role}`}>
                    <SectionTitle id={`role-${group.role}`} count={group.films.length}>{group.role_label}</SectionTitle>
                    <FilmGrid films={group.films} notes={Object.fromEntries(group.films.filter((f) => f.character).map((f) => [f.slug, f.character]))} />
                </section>
            ))}
        </Page>
    );
}
