import csv
import json
from pathlib import Path
from urllib.parse import quote

from django.core.files.base import ContentFile
from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from catalog import demo_data
from catalog.management.commands.import_images import download
from catalog.models import (
    Award,
    Country,
    Film,
    FilmCredit,
    Genre,
    Person,
    Series,
    Studio,
    TimelineEvent,
)

FIXTURES = Path(__file__).resolve().parents[2] / 'fixtures'
IMAGES_CSV = FIXTURES / 'demo_images.csv'
LOGOS_CSV = FIXTURES / 'studio_logos.csv'
TEXTS_JSON = FIXTURES / 'wiki_texts.json'


def auto_facts(item, persons, films_by_director):
    facts = []
    series = item.get('series')
    if series:
        facts.append(f'{series[1]}-й фильм серии «{demo_data.SERIES[series[0]]}».')
    voices = [c for c in item['credits'] if c[0] == 'voice' and len(c) > 2]
    for _, slug, character in voices[:2]:
        facts.append(f'Голос персонажа «{character}» — {persons[slug][0]}.')
    for role, slug, *_ in item['credits']:
        if role == 'director' and films_by_director.get(slug, 0) > 1:
            n = films_by_director[slug]
            word = 'фильма' if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14) else 'фильмов'
            facts.append(f'В архиве {n} {word} режиссёра {persons[slug][0]}.')
            break
    return facts[:3]


class Command(BaseCommand):
    help = 'Create (or update) the demo animation archive and import its images.'

    def add_arguments(self, parser):
        parser.add_argument('--no-images', action='store_true', help='Skip downloading images')
        parser.add_argument('--link-only', action='store_true', help='Keep images as external links')

    def handle(self, *args, **opts):
        texts = json.loads(TEXTS_JSON.read_text(encoding='utf-8')) if TEXTS_JSON.exists() else {}
        self._seed(texts)
        self.stdout.write(self.style.SUCCESS(
            f'films: {Film.objects.count()}, persons: {Person.objects.count()}, '
            f'studios: {Studio.objects.count()}, events: {TimelineEvent.objects.count()}'))
        if opts['no_images']:
            return
        if IMAGES_CSV.exists():
            call_command('import_images', csv=str(IMAGES_CSV), link_only=opts['link_only'], stdout=self.stdout)
        if LOGOS_CSV.exists() and not opts['link_only']:
            self._logos()

    def _logos(self):
        with open(LOGOS_CSV, newline='', encoding='utf-8') as fh:
            for row in csv.DictReader(fh):
                studio = Studio.objects.filter(slug=row['studio']).first()
                if not studio or studio.logo:
                    continue
                try:
                    content = download(row['url'])
                except OSError as exc:
                    self.stderr.write(f'skip logo {row["studio"]}: {exc}')
                    continue
                ext = Path(row['url'].split('?')[0]).suffix.lower() or '.png'
                studio.logo.save(f'{studio.slug}{ext}', ContentFile(content), save=False)
                studio.logo_source = row['source_page']
                studio.save()

    @transaction.atomic
    def _seed(self, texts):
        film_texts = texts.get('films', {})
        studio_texts = texts.get('studios', {})
        countries = {
            slug: Country.objects.update_or_create(slug=slug, defaults={'name': name})[0]
            for slug, name in demo_data.COUNTRIES.items()
        }
        studios = {}
        for slug, (name, city, country, founded, closed, description) in demo_data.STUDIOS.items():
            text = studio_texts.get(slug, {})
            studios[slug] = Studio.objects.update_or_create(slug=slug, defaults={
                'name': name, 'city': city, 'country': countries[country], 'founded': founded, 'closed': closed,
                'description': description,
                'history': '\n\n'.join(filter(None, [text.get('summary'), text.get('history')])),
            })[0]
        genres = {
            slug: Genre.objects.update_or_create(slug=slug, defaults={'name': n, 'kind': k})[0]
            for slug, (n, k) in demo_data.GENRES.items()
        }
        series = {
            slug: Series.objects.update_or_create(slug=slug, defaults={'name': n})[0]
            for slug, n in demo_data.SERIES.items()
        }
        persons = {}
        for slug, (name, born, died) in demo_data.PERSONS.items():
            persons[slug] = Person.objects.update_or_create(
                slug=slug, defaults={'name': name, 'birth_year': born, 'death_year': died})[0]

        films_by_director = {}
        for item in demo_data.FILMS:
            for role, slug, *_ in item['credits']:
                if role == 'director':
                    films_by_director[slug] = films_by_director.get(slug, 0) + 1

        films = {}
        for item in demo_data.FILMS:
            series_slug, series_order = item.get('series', (None, None))
            video_search = demo_data.OFFICIAL_VIDEO_SEARCH.get(item['studio'])
            text = film_texts.get(item['slug'], {})
            film, _ = Film.objects.update_or_create(slug=item['slug'], defaults={
                'title': item['title'], 'original_title': item.get('original', ''), 'year': item['year'],
                'studio': studios[item['studio']], 'duration_min': item.get('duration'),
                'description': item['description'], 'summary': text.get('summary', ''),
                'history': text.get('history', ''),
                'facts': text.get('facts') or auto_facts(item, demo_data.PERSONS, films_by_director),
                'series': series.get(series_slug), 'series_order': series_order,
                'video_url': video_search.format(query=quote(item['title'])) if video_search else '',
            })
            country_slugs = item.get('countries') or [demo_data.STUDIOS[item['studio']][2]]
            film.countries.set([countries[c] for c in country_slugs])
            film.genres.set([genres[g] for g in item['genres']])
            film.credits.all().delete()
            FilmCredit.objects.bulk_create([
                FilmCredit(film=film, role=c[0], person=persons[c[1]],
                           character=c[2] if len(c) > 2 else '', order=i)
                for i, c in enumerate(item['credits'])
            ])
            film.awards.all().delete()
            Award.objects.bulk_create([Award(film=film, title=t, year=y) for t, y in item.get('awards', [])])
            films[film.slug] = film
        for item in demo_data.FILMS:
            if item.get('related'):
                films[item['slug']].related.set([films[s] for s in item['related']])

        TimelineEvent.objects.all().delete()
        for year, title, description, kind, country, studio, film_slugs, major in demo_data.EVENTS:
            event = TimelineEvent.objects.create(
                year=year, title=title, description=description, kind=kind, major=major,
                country=countries.get(country), studio=studios.get(studio),
            )
            event.films.set([films[s] for s in film_slugs])
