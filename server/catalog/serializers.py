from rest_framework import serializers

from .models import Award, Country, Film, FilmCredit, FilmImage, Genre, Person, Series, Studio, TimelineEvent


def absolute(request, url):
    if not url:
        return None
    return request.build_absolute_uri(url) if request and url.startswith('/') else url


class ImageSerializer(serializers.ModelSerializer):
    thumb = serializers.SerializerMethodField()
    full = serializers.SerializerMethodField()

    class Meta:
        model = FilmImage
        fields = ['id', 'kind', 'thumb', 'full', 'caption', 'author', 'license', 'source_page']

    def _url(self, obj, field):
        request = self.context.get('request')
        variant = getattr(obj, field)
        if variant:
            return absolute(request, variant.url)
        if obj.image:
            return absolute(request, obj.image.url)
        return obj.source_url or None

    def get_thumb(self, obj):
        return self._url(obj, 'thumb')

    def get_full(self, obj):
        return self._url(obj, 'large')


class CountrySerializer(serializers.ModelSerializer):
    class Meta:
        model = Country
        fields = ['slug', 'name']


class StudioRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Studio
        fields = ['slug', 'name']


class GenreSerializer(serializers.ModelSerializer):
    class Meta:
        model = Genre
        fields = ['slug', 'name', 'kind']


class SeriesSerializer(serializers.ModelSerializer):
    class Meta:
        model = Series
        fields = ['slug', 'name']


class PersonRefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['slug', 'name']


class FilmCardSerializer(serializers.ModelSerializer):

    studio = StudioRefSerializer()
    countries = CountrySerializer(many=True)
    poster = serializers.SerializerMethodField()
    directors = serializers.SerializerMethodField()
    techniques = serializers.SerializerMethodField()

    class Meta:
        model = Film
        fields = ['id', 'slug', 'title', 'original_title', 'year', 'duration_min', 'description', 'studio',
                  'countries', 'poster', 'directors', 'techniques']

    def get_techniques(self, obj):
        return [g.name for g in obj.genres.all() if g.kind == Genre.Kind.TECHNIQUE]

    def get_poster(self, obj):
        posters = getattr(obj, 'poster_list', None)
        if posters is None:
            posters = [i for i in obj.images.all() if i.kind == FilmImage.Kind.POSTER]
        return ImageSerializer(posters[0], context=self.context).data if posters else None

    def get_directors(self, obj):
        credits = getattr(obj, 'director_credits', None)
        if credits is None:
            credits = [c for c in obj.credits.all() if c.role == FilmCredit.Role.DIRECTOR]
        return [{'slug': c.person.slug, 'name': c.person.name} for c in credits]


class CreditSerializer(serializers.ModelSerializer):
    person = PersonRefSerializer()
    role_label = serializers.CharField(source='get_role_display')

    class Meta:
        model = FilmCredit
        fields = ['role', 'role_label', 'person', 'character']


class AwardSerializer(serializers.ModelSerializer):
    class Meta:
        model = Award
        fields = ['title', 'year']


class FilmDetailSerializer(FilmCardSerializer):
    genres = GenreSerializer(many=True)
    series = SeriesSerializer()
    credits = CreditSerializer(many=True)
    awards = AwardSerializer(many=True)
    frames = serializers.SerializerMethodField()
    related = serializers.SerializerMethodField()
    series_films = serializers.SerializerMethodField()
    video = serializers.SerializerMethodField()

    class Meta:
        model = Film
        fields = FilmCardSerializer.Meta.fields + [
            'summary', 'history', 'facts', 'genres', 'series', 'series_order', 'credits',
            'awards', 'frames', 'related', 'series_films', 'video',
        ]

    def get_frames(self, obj):
        frames = [i for i in obj.images.all() if i.kind == FilmImage.Kind.FRAME]
        return ImageSerializer(frames, many=True, context=self.context).data

    def get_related(self, obj):
        related = list(obj.related.all())
        seen = {f.pk for f in related} | {obj.pk}
        for film in self.context.get('similar', []):
            if film.pk not in seen and len(related) < 8:
                related.append(film)
                seen.add(film.pk)
        return FilmCardSerializer(related, many=True, context=self.context).data

    def get_series_films(self, obj):
        films = self.context.get('series_films', [])
        return FilmCardSerializer(films, many=True, context=self.context).data

    def get_video(self, obj):
        request = self.context.get('request')
        if obj.video_file:
            return {'kind': 'direct', 'url': absolute(request, obj.video_file.url)}
        if obj.video_url:
            direct = obj.video_url.lower().split('?')[0].endswith(('.mp4', '.webm', '.ogv', '.m4v'))
            return {'kind': 'direct' if direct else 'external', 'url': obj.video_url}
        return None


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['slug', 'name', 'birth_year', 'death_year', 'bio']


class StudioSerializer(serializers.ModelSerializer):
    film_count = serializers.IntegerField(read_only=True)
    country = CountrySerializer()
    logo = serializers.SerializerMethodField()

    class Meta:
        model = Studio
        fields = ['slug', 'name', 'city', 'country', 'founded', 'closed', 'description', 'logo', 'film_count']

    def get_logo(self, obj):
        return absolute(self.context.get('request'), obj.logo.url) if obj.logo else None


class EventSerializer(serializers.ModelSerializer):
    kind_label = serializers.CharField(source='get_kind_display')
    country = CountrySerializer()
    studio = StudioRefSerializer()
    films = serializers.SerializerMethodField()

    class Meta:
        model = TimelineEvent
        fields = ['id', 'year', 'title', 'description', 'kind', 'kind_label', 'major', 'country', 'studio', 'films']

    def get_films(self, obj):
        return [{'slug': f.slug, 'title': f.title} for f in obj.films.all()]
