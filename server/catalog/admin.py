from django.contrib import admin

from .models import Award, Country, Film, FilmCredit, FilmImage, Genre, Person, Series, Studio, TimelineEvent


class CreditInline(admin.TabularInline):
    model = FilmCredit
    autocomplete_fields = ['person']
    extra = 1


class ImageInline(admin.TabularInline):
    model = FilmImage
    extra = 1


class AwardInline(admin.TabularInline):
    model = Award
    extra = 0


@admin.register(Film)
class FilmAdmin(admin.ModelAdmin):
    list_display = ['title', 'year', 'studio']
    list_filter = ['studio', 'genres']
    search_fields = ['title', 'search_title']
    prepopulated_fields = {'slug': ['title']}
    filter_horizontal = ['genres', 'related', 'countries']
    inlines = [CreditInline, ImageInline, AwardInline]


@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    search_fields = ['name', 'search_name']
    prepopulated_fields = {'slug': ['name']}


@admin.register(TimelineEvent)
class EventAdmin(admin.ModelAdmin):
    list_display = ['year', 'title', 'kind', 'major']
    list_filter = ['kind', 'major']
    filter_horizontal = ['films']


@admin.register(Studio, Genre, Series, Country)
class SimpleAdmin(admin.ModelAdmin):
    search_fields = ['name']
