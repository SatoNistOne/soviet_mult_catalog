import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='Genre',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('slug', models.SlugField(unique=True)),
                ('kind', models.CharField(choices=[('genre', 'Жанр'), ('technique', 'Техника'), ('tag', 'Тег')], default='genre', max_length=20)),
            ],
            options={
                'ordering': ['kind', 'name'],
            },
        ),
        migrations.CreateModel(
            name='Person',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('slug', models.SlugField(unique=True)),
                ('search_name', models.CharField(db_index=True, editable=False, max_length=200)),
                ('birth_year', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('death_year', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('bio', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Series',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('slug', models.SlugField(unique=True)),
            ],
            options={
                'verbose_name_plural': 'series',
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Studio',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=200)),
                ('slug', models.SlugField(unique=True)),
                ('city', models.CharField(blank=True, max_length=100)),
                ('founded', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('description', models.TextField(blank=True)),
            ],
            options={
                'ordering': ['name'],
            },
        ),
        migrations.CreateModel(
            name='Film',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('slug', models.SlugField(unique=True)),
                ('search_title', models.CharField(db_index=True, editable=False, max_length=255)),
                ('year', models.PositiveSmallIntegerField(db_index=True)),
                ('duration_min', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('description', models.TextField(blank=True)),
                ('series_order', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('video_url', models.URLField(blank=True, help_text='Ссылка на легальный источник или прямой файл')),
                ('video_file', models.FileField(blank=True, upload_to='video/')),
                ('related', models.ManyToManyField(blank=True, to='catalog.film')),
                ('genres', models.ManyToManyField(blank=True, related_name='films', to='catalog.genre')),
                ('series', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='films', to='catalog.series')),
                ('studio', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='films', to='catalog.studio')),
            ],
            options={
                'ordering': ['year', 'title'],
            },
        ),
        migrations.CreateModel(
            name='Award',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('title', models.CharField(max_length=255)),
                ('year', models.PositiveSmallIntegerField(blank=True, null=True)),
                ('film', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='awards', to='catalog.film')),
            ],
            options={
                'ordering': ['year', 'id'],
            },
        ),
        migrations.CreateModel(
            name='FilmImage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('kind', models.CharField(choices=[('poster', 'Постер'), ('frame', 'Кадр')], default='frame', max_length=10)),
                ('image', models.ImageField(blank=True, upload_to='images/original/')),
                ('source_url', models.URLField(blank=True, help_text='Внешний адрес, если файла нет')),
                ('thumb', models.ImageField(blank=True, editable=False, upload_to='images/thumb/')),
                ('large', models.ImageField(blank=True, editable=False, upload_to='images/large/')),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('caption', models.CharField(blank=True, max_length=255)),
                ('author', models.CharField(blank=True, max_length=255)),
                ('license', models.CharField(blank=True, max_length=100)),
                ('source_page', models.URLField(blank=True)),
                ('film', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='images', to='catalog.film')),
            ],
            options={
                'ordering': ['kind', 'order', 'id'],
                'indexes': [models.Index(fields=['film', 'kind', 'order'], name='catalog_fil_film_id_1b5386_idx')],
            },
        ),
        migrations.CreateModel(
            name='FilmCredit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('role', models.CharField(choices=[('director', 'Режиссёр'), ('writer', 'Сценарист'), ('composer', 'Композитор'), ('artist', 'Художник'), ('voice', 'Озвучивание')], db_index=True, max_length=20)),
                ('character', models.CharField(blank=True, max_length=200)),
                ('order', models.PositiveSmallIntegerField(default=0)),
                ('film', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='credits', to='catalog.film')),
                ('person', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='credits', to='catalog.person')),
            ],
            options={
                'ordering': ['order', 'id'],
                'indexes': [models.Index(fields=['role', 'person'], name='catalog_fil_role_c34879_idx')],
                'constraints': [models.UniqueConstraint(fields=('film', 'person', 'role', 'character'), name='unique_credit')],
            },
        ),
        migrations.AddIndex(
            model_name='film',
            index=models.Index(fields=['studio', 'year'], name='catalog_fil_studio__be273c_idx'),
        ),
    ]
