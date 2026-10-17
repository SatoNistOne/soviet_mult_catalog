from django.db import models

from .imaging import build_variants


def normalize(text):
    return (text or '').lower().replace('ё', 'е').strip()


class Country(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'countries'

    def __str__(self):
        return self.name


class Studio(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    city = models.CharField(max_length=100, blank=True)
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL, related_name='studios')
    founded = models.PositiveSmallIntegerField(null=True, blank=True)
    closed = models.PositiveSmallIntegerField(null=True, blank=True)
    description = models.TextField(blank=True)
    history = models.TextField(blank=True)
    logo = models.ImageField(upload_to='studios/', blank=True)
    logo_source = models.URLField(blank=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class Person(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    search_name = models.CharField(max_length=200, db_index=True, editable=False)
    birth_year = models.PositiveSmallIntegerField(null=True, blank=True)
    death_year = models.PositiveSmallIntegerField(null=True, blank=True)
    bio = models.TextField(blank=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        self.search_name = normalize(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class Genre(models.Model):
    class Kind(models.TextChoices):
        GENRE = 'genre', 'Жанр'
        TECHNIQUE = 'technique', 'Техника'
        TAG = 'tag', 'Тег'

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.GENRE)

    class Meta:
        ordering = ['kind', 'name']

    def __str__(self):
        return self.name


class Series(models.Model):
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'series'

    def __str__(self):
        return self.name


class Film(models.Model):
    title = models.CharField(max_length=255)
    original_title = models.CharField(max_length=255, blank=True)
    slug = models.SlugField(unique=True)
    search_title = models.CharField(max_length=520, db_index=True, editable=False)
    year = models.PositiveSmallIntegerField(db_index=True)
    studio = models.ForeignKey(Studio, on_delete=models.PROTECT, related_name='films')
    countries = models.ManyToManyField(Country, blank=True, related_name='films')
    duration_min = models.PositiveSmallIntegerField(null=True, blank=True)
    description = models.TextField(blank=True, help_text='Короткая аннотация для карточки')
    summary = models.TextField(blank=True, help_text='О мультфильме')
    history = models.TextField(blank=True, help_text='История создания')
    facts = models.JSONField(default=list, blank=True, help_text='Интересные факты: список строк')
    genres = models.ManyToManyField(Genre, blank=True, related_name='films')
    series = models.ForeignKey(Series, null=True, blank=True, on_delete=models.SET_NULL, related_name='films')
    series_order = models.PositiveSmallIntegerField(null=True, blank=True)
    related = models.ManyToManyField('self', blank=True, symmetrical=True)
    video_url = models.URLField(blank=True, help_text='Ссылка на легальный источник или прямой файл')
    video_file = models.FileField(upload_to='video/', blank=True)

    class Meta:
        ordering = ['year', 'title']
        indexes = [models.Index(fields=['studio', 'year'])]

    def save(self, *args, **kwargs):
        self.search_title = normalize(f'{self.title} {self.original_title}')
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.title} ({self.year})'


class FilmCredit(models.Model):
    class Role(models.TextChoices):
        DIRECTOR = 'director', 'Режиссёр'
        WRITER = 'writer', 'Сценарист'
        COMPOSER = 'composer', 'Композитор'
        ARTIST = 'artist', 'Художник'
        VOICE = 'voice', 'Озвучивание'

    film = models.ForeignKey(Film, on_delete=models.CASCADE, related_name='credits')
    person = models.ForeignKey(Person, on_delete=models.CASCADE, related_name='credits')
    role = models.CharField(max_length=20, choices=Role.choices, db_index=True)
    character = models.CharField(max_length=200, blank=True)
    order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        constraints = [
            models.UniqueConstraint(fields=['film', 'person', 'role', 'character'], name='unique_credit'),
        ]
        indexes = [models.Index(fields=['role', 'person'])]

    def __str__(self):
        return f'{self.person} — {self.get_role_display()} ({self.film})'


class Award(models.Model):
    film = models.ForeignKey(Film, on_delete=models.CASCADE, related_name='awards')
    title = models.CharField(max_length=255)
    year = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['year', 'id']

    def __str__(self):
        return self.title


class TimelineEvent(models.Model):
    class Kind(models.TextChoices):
        MILESTONE = 'milestone', 'Веха'
        TECHNOLOGY = 'technology', 'Технология'
        STUDIO = 'studio', 'Студия'
        PREMIERE = 'premiere', 'Премьера'
        AWARD = 'award', 'Награда'

    year = models.PositiveSmallIntegerField(db_index=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    kind = models.CharField(max_length=20, choices=Kind.choices, default=Kind.MILESTONE)
    major = models.BooleanField(default=False)
    country = models.ForeignKey(Country, null=True, blank=True, on_delete=models.SET_NULL, related_name='events')
    studio = models.ForeignKey(Studio, null=True, blank=True, on_delete=models.SET_NULL, related_name='events')
    films = models.ManyToManyField(Film, blank=True, related_name='events')

    class Meta:
        ordering = ['year', 'id']

    def __str__(self):
        return f'{self.year}: {self.title}'


class FilmImage(models.Model):
    class Kind(models.TextChoices):
        POSTER = 'poster', 'Постер'
        FRAME = 'frame', 'Кадр'

    film = models.ForeignKey(Film, on_delete=models.CASCADE, related_name='images')
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.FRAME)
    image = models.ImageField(upload_to='images/original/', blank=True)
    source_url = models.URLField(blank=True, help_text='Внешний адрес, если файла нет')
    thumb = models.ImageField(upload_to='images/thumb/', blank=True, editable=False)
    large = models.ImageField(upload_to='images/large/', blank=True, editable=False)
    order = models.PositiveSmallIntegerField(default=0)
    caption = models.CharField(max_length=255, blank=True)
    author = models.CharField(max_length=255, blank=True)
    license = models.CharField(max_length=100, blank=True)
    source_page = models.URLField(blank=True)

    class Meta:
        ordering = ['kind', 'order', 'id']
        indexes = [models.Index(fields=['film', 'kind', 'order'])]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._original_image = self.image.name if self.image else ''

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        current = self.image.name if self.image else ''
        if current and (current != self._original_image or not self.thumb):
            build_variants(self)
            super().save(update_fields=['thumb', 'large'])
        self._original_image = current

    def __str__(self):
        return f'{self.film.title}: {self.get_kind_display()} #{self.order}'
