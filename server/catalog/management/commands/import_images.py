import csv
import time
import urllib.request
from pathlib import Path

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

from catalog.models import Film, FilmImage

USER_AGENT = 'SovMultCatalog/1.0 (demo data import; python-urllib)'
IMAGE_EXT = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}


def download(url, attempts=4):
    request = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    for attempt in range(attempts):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read()
            time.sleep(1)
            return data
        except OSError:
            if attempt == attempts - 1:
                raise
            time.sleep(5 * (attempt + 1))


class Command(BaseCommand):
    help = 'Import film images from a CSV file or a folder; thumbnails are built with Pillow.'

    def add_arguments(self, parser):
        parser.add_argument('--csv', help='CSV with image rows')
        parser.add_argument('--dir', help='Folder with image files')
        parser.add_argument('--link-only', action='store_true', help='Store URLs as links, do not download')
        parser.add_argument('--replace', action='store_true', help='Delete existing images of listed films first')

    def handle(self, *args, **opts):
        if not opts['csv'] and not opts['dir']:
            raise CommandError('Pass --csv and/or --dir')
        rows = self._csv_rows(opts['csv']) if opts['csv'] else self._folder_rows(Path(opts['dir']))
        films = {f.slug: f for f in Film.objects.filter(slug__in={r['film'] for r in rows})}
        if opts['replace']:
            for image in FilmImage.objects.filter(film__in=films.values()):
                for field in (image.image, image.thumb, image.large):
                    if field:
                        field.delete(save=False)
                image.delete()

        base = Path(opts['dir']) if opts['dir'] else None
        created = skipped = 0
        for row in rows:
            film = films.get(row['film'])
            if film is None:
                self.stderr.write(f'skip: unknown film {row["film"]}')
                skipped += 1
                continue
            key = row.get('source_page') or row.get('url') or row.get('file')
            if key and FilmImage.objects.filter(film=film, source_page=key).exists():
                skipped += 1
                continue
            try:
                self._create(film, row, base, opts['link_only'], key)
                created += 1
            except OSError as exc:
                self.stderr.write(f'skip: {row["film"]}: {exc}')
                skipped += 1
        self.stdout.write(self.style.SUCCESS(f'images created: {created}, skipped: {skipped}'))

    def _create(self, film, row, base, link_only, key):
        image = FilmImage(
            film=film, kind=row.get('kind') or FilmImage.Kind.FRAME, order=int(row.get('order') or 0),
            caption=row.get('caption', ''), author=row.get('author', ''), license=row.get('license', ''),
            source_page=key or '',
        )
        name = None
        if row.get('file'):
            path = (base / row['file']) if base else Path(row['file'])
            content, name = path.read_bytes(), path.name
        elif row.get('url') and not link_only:
            content, name = download(row['url']), row['url'].rsplit('/', 1)[-1].split('?')[0]
        if name:
            ext = Path(name).suffix.lower() or '.jpg'
            image.image.save(f'{film.slug}-{image.kind}-{image.order}{ext}', ContentFile(content), save=False)
        else:
            image.source_url = row.get('url', '')
        image.save()

    def _csv_rows(self, path):
        with open(path, newline='', encoding='utf-8') as fh:
            return list(csv.DictReader(fh))

    def _folder_rows(self, folder):
        rows = []
        for path in sorted(folder.iterdir()):
            if path.suffix.lower() not in IMAGE_EXT or '__' not in path.stem:
                continue
            slug, tail = path.stem.split('__', 1)
            kind = 'poster' if tail.startswith('poster') else 'frame'
            order = ''.join(ch for ch in tail if ch.isdigit()) or '0'
            rows.append({'film': slug, 'kind': kind, 'order': order, 'file': path.name})
        return rows
