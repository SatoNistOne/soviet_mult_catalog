from django.conf import settings
from django.contrib import admin
from django.urls import include, path, re_path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('catalog.urls')),
]

if settings.SERVE_MEDIA:
    from catalog.media import serve_media

    urlpatterns += [re_path(r'^media/(?P<path>.+)$', serve_media, name='media')]
