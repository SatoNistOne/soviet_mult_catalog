from django.urls import path

from . import views

urlpatterns = [
    path('films/', views.FilmList.as_view(), name='film-list'),
    path('films/random/', views.random_film, name='film-random'),
    path('films/suggest/', views.suggest, name='film-suggest'),
    path('films/<slug:slug>/', views.film_detail, name='film-detail'),
    path('persons/<slug:slug>/', views.person_detail, name='person-detail'),
    path('studios/', views.StudioList.as_view(), name='studio-list'),
    path('studios/<slug:slug>/', views.studio_detail, name='studio-detail'),
    path('timeline/', views.timeline, name='timeline'),
    path('facets/', views.facets, name='facets'),
]
