from collections import Counter, OrderedDict

from django.db.models import Count, Max, Min, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Country, Film, FilmCredit, FilmImage, Genre, Person, Studio, TimelineEvent, normalize
from .serializers import (
    EventSerializer,
    FilmCardSerializer,
    FilmDetailSerializer,
    GenreSerializer,
    PersonRefSerializer,
    PersonSerializer,
    StudioSerializer,
)

ORDERINGS = {
    'year': ('year', 'search_title'),
    '-year': ('-year', 'search_title'),
    'title': ('search_title',),
    '-title': ('-search_title',),
}

ERAS = [
    ('early', 'До 1930-х', None, 1929),
    ('1930s', '1930–1940-е', 1930, 1949),
    ('1950s', '1950–1960-е', 1950, 1969),
    ('1970s', '1970–1980-е', 1970, 1989),
    ('1990s', '1990-е и позже', 1990, None),
]

STUDIO_ORDERINGS = {'name': ('name',), 'founded': ('founded', 'name'), '-founded': ('-founded', 'name')}


def card_queryset(qs=None):
    qs = Film.objects.all() if qs is None else qs
    return qs.select_related('studio').prefetch_related(
        'countries', 'genres',
        Prefetch('images', queryset=FilmImage.objects.filter(kind=FilmImage.Kind.POSTER),
                 to_attr='poster_list'),
        Prefetch('credits', queryset=FilmCredit.objects.filter(role=FilmCredit.Role.DIRECTOR)
                 .select_related('person'), to_attr='director_credits'),
    )


def _int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def filter_films(params):
    qs = Film.objects.all()
    q = normalize(params.get('q'))
    if q:
        studio_ids = [s.pk for s in Studio.objects.only('name') if q in normalize(s.name)]
        qs = qs.filter(Q(search_title__contains=q) | Q(credits__person__search_name__contains=q)
                       | Q(studio_id__in=studio_ids))
    year = _int(params.get('year'))
    if year:
        qs = qs.filter(year=year)
    decade = _int(params.get('decade'))
    if decade:
        start = decade - decade % 10
        qs = qs.filter(year__gte=start, year__lte=start + 9)
    if _int(params.get('year_from')):
        qs = qs.filter(year__gte=_int(params['year_from']))
    if _int(params.get('year_to')):
        qs = qs.filter(year__lte=_int(params['year_to']))
    if params.get('studio'):
        qs = qs.filter(studio__slug=params['studio'])
    if params.get('country'):
        qs = qs.filter(countries__slug=params['country'])
    if params.get('director'):
        qs = qs.filter(credits__role=FilmCredit.Role.DIRECTOR, credits__person__slug=params['director'])
    if params.get('person'):
        qs = qs.filter(credits__person__slug=params['person'])
    for key in ('genre', 'technique'):
        for slug in filter(None, (params.get(key) or '').split(',')):
            qs = qs.filter(genres__slug=slug)
    if params.get('series'):
        qs = qs.filter(series__slug=params['series'])
    ordering = ORDERINGS.get(params.get('ordering'), ORDERINGS['year'])
    return qs.distinct().order_by(*ordering)


class CatalogPagination(PageNumberPagination):
    page_size = 24
    page_size_query_param = 'page_size'
    max_page_size = 60


class FilmList(ListAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = FilmCardSerializer
    pagination_class = CatalogPagination

    def get_queryset(self):
        return card_queryset(filter_films(self.request.query_params))


def similar_films(film, limit=8):
    directors = [c.person_id for c in film.credits.all() if c.role == FilmCredit.Role.DIRECTOR]
    genre_ids = [g.pk for g in film.genres.all()]
    candidates = (Film.objects.exclude(pk=film.pk)
                  .filter(Q(credits__person_id__in=directors, credits__role=FilmCredit.Role.DIRECTOR)
                          | Q(genres__in=genre_ids) | Q(studio_id=film.studio_id))
                  .annotate(score=Count('genres', filter=Q(genres__in=genre_ids), distinct=True))
                  .distinct())
    scores = Counter()
    for f in candidates:
        scores[f.pk] = f.score + (3 if f.studio_id == film.studio_id else 0)
    for pk in Film.objects.filter(credits__person_id__in=directors, credits__role=FilmCredit.Role.DIRECTOR) \
            .exclude(pk=film.pk).values_list('pk', flat=True):
        scores[pk] += 5
    top = [pk for pk, _ in scores.most_common(limit)]
    by_pk = {f.pk: f for f in card_queryset(Film.objects.filter(pk__in=top))}
    return [by_pk[pk] for pk in top if pk in by_pk]


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def film_detail(request, slug):
    qs = card_queryset().prefetch_related(
        'awards', 'images',
        Prefetch('credits', queryset=FilmCredit.objects.select_related('person')),
        Prefetch('related', queryset=card_queryset()),
    ).select_related('series')
    film = get_object_or_404(qs, slug=slug)
    series_films = []
    if film.series_id:
        series_films = card_queryset(
            Film.objects.filter(series_id=film.series_id).exclude(pk=film.pk)
        ).order_by('series_order', 'year')
    context = {'request': request, 'series_films': series_films, 'similar': similar_films(film)}
    return Response(FilmDetailSerializer(film, context=context).data)


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def random_film(request):
    film = filter_films(request.query_params).order_by('?').first()
    if film is None:
        raise NotFound('Нет фильмов под эти условия')
    return Response({'slug': film.slug, 'title': film.title})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def suggest(request):
    q = normalize(request.query_params.get('q'))
    if not q:
        return Response({'films': [], 'persons': [], 'studios': []})
    films = card_queryset(Film.objects.filter(search_title__contains=q)).order_by('search_title')[:6]
    persons = Person.objects.filter(search_name__contains=q)[:5]
    studios = [s for s in Studio.objects.all() if q in normalize(s.name)][:4]
    return Response({
        'films': FilmCardSerializer(films, many=True, context={'request': request}).data,
        'persons': PersonRefSerializer(persons, many=True).data,
        'studios': [{'slug': s.slug, 'name': s.name} for s in studios],
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def person_detail(request, slug):
    person = get_object_or_404(Person, slug=slug)
    credits = (FilmCredit.objects.filter(person=person)
               .select_related('film').order_by('film__year'))
    films = {f.pk: f for f in card_queryset(Film.objects.filter(credits__person=person).distinct())}
    roles = OrderedDict()
    for value, label in FilmCredit.Role.choices:
        roles[value] = {'role': value, 'role_label': label, 'films': []}
    context = {'request': request}
    for credit in credits:
        entry = FilmCardSerializer(films[credit.film_id], context=context).data
        entry['character'] = credit.character
        roles[credit.role]['films'].append(entry)
    return Response({
        **PersonSerializer(person).data,
        'roles': [r for r in roles.values() if r['films']],
    })


class StudioList(ListAPIView):
    permission_classes = (permissions.AllowAny,)
    serializer_class = StudioSerializer
    pagination_class = None

    def get_queryset(self):
        params = self.request.query_params
        qs = Studio.objects.select_related('country').annotate(film_count=Count('films'))
        if params.get('country'):
            qs = qs.filter(country__slug=params['country'])
        active = _int(params.get('active_in'))
        if active:
            qs = qs.filter(Q(founded__isnull=True) | Q(founded__lte=active + 9)) \
                   .filter(Q(closed__isnull=True) | Q(closed__gte=active))
        qs = qs.order_by(*STUDIO_ORDERINGS.get(params.get('ordering'), STUDIO_ORDERINGS['name']))
        q = normalize(params.get('q'))
        return [s for s in qs if q in normalize(f'{s.name} {s.city}')] if q else qs


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def studio_detail(request, slug):
    studio = get_object_or_404(
        Studio.objects.select_related('country').annotate(film_count=Count('films')), slug=slug)
    films = card_queryset(studio.films.all()).order_by('year', 'search_title')
    creators = Counter()
    roles = {}
    for credit in FilmCredit.objects.filter(film__studio=studio).exclude(role=FilmCredit.Role.VOICE) \
            .select_related('person'):
        creators[credit.person_id] += 1
        roles.setdefault(credit.person_id, (credit.person, set()))[1].add(credit.get_role_display())
    notable = [
        {'slug': roles[pk][0].slug, 'name': roles[pk][0].name, 'roles': sorted(roles[pk][1]), 'count': n}
        for pk, n in creators.most_common(6)
    ]
    events = TimelineEvent.objects.filter(studio=studio).select_related('country', 'studio').prefetch_related('films')
    context = {'request': request}
    return Response({
        **StudioSerializer(studio, context=context).data,
        'history': studio.history,
        'logo_source': studio.logo_source,
        'notable_creators': notable,
        'milestones': EventSerializer(events, many=True).data,
        'films': FilmCardSerializer(films, many=True, context=context).data,
    })


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def timeline(request):
    params = request.query_params
    kind = params.get('kind')
    films = card_queryset(filter_films({k: params.get(k) for k in ('country', 'studio', 'technique')}))
    events = TimelineEvent.objects.select_related('country', 'studio').prefetch_related('films')
    if params.get('country'):
        events = events.filter(country__slug=params['country'])
    if params.get('studio'):
        events = events.filter(studio__slug=params['studio'])
    if params.get('technique'):
        events = events.filter(films__genres__slug=params['technique']).distinct()
    if kind == 'film':
        events = events.none()
    elif kind:
        events = events.filter(kind=kind)
        films = films.none()

    years = {}
    context = {'request': request}
    for card in FilmCardSerializer(films.order_by('year', 'search_title'), many=True, context=context).data:
        years.setdefault(card['year'], {'year': card['year'], 'films': [], 'events': []})['films'].append(card)
    for event in EventSerializer(events, many=True).data:
        years.setdefault(event['year'], {'year': event['year'], 'films': [], 'events': []})['events'].append(event)

    def era_of(year):
        return next(key for key, _, start, end in ERAS
                    if (start is None or year >= start) and (end is None or year <= end))

    ordered = [years[y] for y in sorted(years)]
    for entry in ordered:
        entry['era'] = era_of(entry['year'])
    eras = [
        {'key': key, 'label': label, 'count': sum(len(e['films']) + len(e['events'])
                                                  for e in ordered if e['era'] == key)}
        for key, label, _, _ in ERAS
    ]
    return Response({'eras': eras, 'years': ordered, 'kinds': TimelineEvent.Kind.choices})


@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def facets(request):
    bounds = Film.objects.aggregate(min=Min('year'), max=Max('year'))
    decades = OrderedDict()
    for year in Film.objects.order_by('year').values_list('year', flat=True):
        decade = year - year % 10
        decades[decade] = decades.get(decade, 0) + 1
    genres = Genre.objects.annotate(count=Count('films')).filter(count__gt=0)
    directors = (Person.objects.filter(credits__role=FilmCredit.Role.DIRECTOR)
                 .annotate(count=Count('credits__film', distinct=True)).order_by('name'))
    studios = Studio.objects.annotate(count=Count('films')).filter(count__gt=0)
    countries = Country.objects.annotate(count=Count('films', distinct=True)).filter(count__gt=0)
    return Response({
        'years': bounds,
        'decades': [{'decade': d, 'count': c} for d, c in decades.items()],
        'studios': [{'slug': s.slug, 'name': s.name, 'count': s.count} for s in studios],
        'countries': [{'slug': c.slug, 'name': c.name, 'count': c.count} for c in countries],
        'genres': [{**GenreSerializer(g).data, 'count': g.count} for g in genres],
        'directors': [{'slug': p.slug, 'name': p.name, 'count': p.count} for p in directors],
        'orderings': list(ORDERINGS),
    })
